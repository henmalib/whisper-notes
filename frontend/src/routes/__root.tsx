import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Cog } from "lucide-react";
import { GetAudioDevices } from "@wailsjs/go/audio/Audio";

const RootLayout = () => {
  GetAudioDevices().then(console.log);

  navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
    stream.getTracks().forEach((track) => track.stop());
  });

  return (
    <div id="App">
      <Toaster />
      <div className="p-2 flex gap-2 flex-row items-center justify-between px-8">
        <Link to="/" className="[&.active]:font-bold">
          Home
        </Link>

        <Link to="/settings" className="[&.active]:font-bold">
          <Button variant="outline">
            <Cog className="size-4" />
          </Button>
        </Link>
      </div>
      <hr />
      <main className="px-8 py-4">
        <Outlet />
      </main>
    </div>
  );
};

export const Route = createRootRoute({ component: RootLayout });
