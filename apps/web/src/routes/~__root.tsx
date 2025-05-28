import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import AppNavbar from "../components/app-navbar";

export const Route = createRootRoute({
  component: () => (
    <>
      <AppNavbar />
      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <Outlet />
        <TanStackRouterDevtools />
      </main>
    </>
  ),
});
