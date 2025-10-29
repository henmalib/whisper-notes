import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Cog } from "lucide-react";

const RootLayout = () => {
  // Just to get permissions... makes macos shut up
  navigator.mediaDevices.getUserMedia({ audio: true });

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
