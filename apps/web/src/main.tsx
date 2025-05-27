import { QueryClientProvider } from "@tanstack/react-query";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import { StrictMode } from "react";

import "./index.css";

import { createRoot } from "react-dom/client";

import queryClient from "@/web/lib/query-client";
import keycloak, { keycloakInitOptions } from "@/web/lib/keycloak";

import App from "./app";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ReactKeycloakProvider authClient={keycloak} initOptions={keycloakInitOptions}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ReactKeycloakProvider>
  </StrictMode>,
);
