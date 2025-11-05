import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Cog } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

const queryClient = new QueryClient();

const handleError = (error: unknown) => {
  console.log("object", error);
  if (error && typeof error === "object") {
    if ("message" in error && typeof error.message === "string")
      toast.error(error.message);
    else if ("reason" in error && typeof error.reason === "string") {
      toast.error(error.reason);
    }
  } else {
    toast.error(JSON.stringify(error));
  }
};

const RootLayout = () => {
  useEffect(() => {
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleError);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleError);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <div id="App">
        <header className="p-2 flex gap-2 flex-row items-center justify-between px-8 border-b border-border shadow-sm">
          <Link to="/" className="[&.active]:font-bold" preload="intent">
            Home
          </Link>

          <Link
            to="/settings"
            className="[&.active]:font-bold"
            preload="intent"
          >
            <Button variant="outline">
              <Cog className="size-4" />
            </Button>
          </Link>
        </header>
        <main className="h-full overflow-hidden">
          <Outlet />
        </main>
      </div>
    </QueryClientProvider>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  onError: handleError,
});
