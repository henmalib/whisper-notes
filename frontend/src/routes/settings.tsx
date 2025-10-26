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

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
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
  return (
    <main>
      <Table>
        <TableCaption>Open Source Components and Licenses</TableCaption>
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
              <TableRow>
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
