import { useKeycloak } from "@react-keycloak/web";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { routeTree } from "@/web/route-tree.gen";

import { TenantProvider } from "./lib/tenant-context";

const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  const { keycloak, initialized } = useKeycloak();

  if (!initialized) {
    return <div>Loading authentication...</div>;
  }

  if (!keycloak.authenticated) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <button onClick={() => keycloak.login()}>Login</button>
      </div>
    );
  }

  return (
    <TenantProvider>
      <RouterProvider router={router} />
    </TenantProvider>
  );
}
