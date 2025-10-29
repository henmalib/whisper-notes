import { createFileRoute } from "@tanstack/react-router";
import licenses from "../assets/licenses.json";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BrowserOpenURL } from "@wailsjs/runtime/runtime";
import { Dialog, DialogTrigger } from "@radix-ui/react-dialog";
import React from "react";
import { DialogContent } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UpdateConfig, GetConfig } from "@wailsjs/go/config/ConfigHelper";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  async loader() {
    const config = await GetConfig();
    let deviceId = config.MicrophoneId;

    if (!deviceId) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const track = stream.getAudioTracks()[0];
      const settings = track.getSettings();

      deviceId = settings.deviceId!;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices
      .filter((d) => d.kind === "audioinput")
      .map((d) => {
        return {
          ...d.toJSON(),
          selected: d.deviceId === deviceId,
        };
      });
  },
});

const LicenseTextDialog = ({
  text,
  children,
}: React.PropsWithChildren<{ text: string }>) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px] overflow-y-scroll max-h-[80vh]">
        {text}
      </DialogContent>
    </Dialog>
  );
};

// TODO: make it pretty
function SettingsPage() {
  const devices = Route.useLoaderData();

  return (
    <main>
      <div className="flex flex-col gap-2">
        <RadioGroup
          onValueChange={(deviceId) => UpdateConfig("MicrophoneId", deviceId)}
          defaultValue={devices.find((d) => d.selected)?.deviceId}
        >
          {devices.map((device) => (
            <div key={device.deviceId} className="flex flex-row gap-2">
              <RadioGroupItem value={device.deviceId} id={device.deviceId} />
              <Label htmlFor={device.deviceId}>{device.label}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <h4 className="mt-16">Open Source Components and Licenses</h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Package</TableHead>
            <TableHead>License</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {licenses
            .filter((license) => license.package !== "whisper-notes-frontend")
            .map((license) => (
              <TableRow key={license.package}>
                <TableCell
                  className="cursor-pointer hover:underline"
                  onClick={() => license.url && BrowserOpenURL(license.url)}
                >
                  {license.package}
                </TableCell>

                <LicenseTextDialog text={license.licenseText || ""}>
                  <TableCell>{license.licenses.join(" ,")}</TableCell>
                </LicenseTextDialog>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </main>
  );
}
