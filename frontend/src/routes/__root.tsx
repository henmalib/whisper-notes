import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient } from "@tanstack/react-query";
import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { Cog } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import "../App.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: window.localStorage,
});

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
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        buster: "v1",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) =>
            q.state.status === "success" && q.meta?.persist === true,
        },
      }}
    >
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
    </PersistQueryClientProvider>
  );
};

export const Route = createRootRoute({
  component: RootLayout,
  onError: handleError,
});
