import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import AppNavbar from "../components/app-navbar";

export const Route = createRootRoute({
  component: () => (
    <>
      <AppNavbar />
      <main className="container" style={{ marginTop: "1rem" }}>
        <Outlet />
        <TanStackRouterDevtools />
      </main>
    </>
  ),
});
