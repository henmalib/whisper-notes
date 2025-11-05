import { createFileRoute } from "@tanstack/react-router";
import licenses from "../assets/licenses.json";
import {
  Table,
  TableBody,
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
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { GetAudioDevices } from "@wailsjs/go/audio/Audio";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  async loader() {
    const config = await GetConfig();
    const devices = await GetAudioDevices();

    let deviceId = config.MicrophoneId;

    if (!deviceId) {
      deviceId = devices.find((d) => d.isDefault)?.deviceId || "";
    }

    return devices.map((d) => {
      return {
        ...d,
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

function SettingsPage() {
  const devices = Route.useLoaderData();

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex flex-col gap-2">
        <RadioGroup
          onValueChange={(deviceId) => UpdateConfig("MicrophoneId", deviceId)}
          value={devices.find((d) => d.selected)?.deviceId}
        >
          {devices.map((device) => (
            <div key={device.deviceId} className="flex flex-row gap-2">
              <RadioGroupItem value={device.deviceId} id={device.deviceId} />
              <Label htmlFor={device.deviceId}>{device.name}</Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      <Collapsible className="w-full mt-16 data-[state=open]:flex-1 data-[state=open]:flex data-[state=open]:flex-col data-[state=open]:min-h-0">
        <CollapsibleTrigger className="w-full">
          <div className="flex flex-row items-center justify-between p-2 px-4">
            <div>Open Source Components and Licenses</div>
            <div>
              <ChevronDown />
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package</TableHead>
                <TableHead>License</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {licenses
                .filter(
                  (license) => license.package !== "whisper-notes-frontend",
                )
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
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
