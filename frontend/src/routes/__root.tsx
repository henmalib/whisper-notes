import { Toaster } from "@/components/ui/sonner";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";

const RootLayout = () => (
  <div id="App">
    <Toaster />
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>

      <Link to="/settings" className="[&.active]:font-bold">
        Settings
      </Link>
    </div>
    <hr />
    <Outlet />
  </div>
);

export const Route = createRootRoute({ component: RootLayout });
