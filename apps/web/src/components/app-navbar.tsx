import { useKeycloak } from "@react-keycloak/web";
import { Link, useLocation } from "@tanstack/react-router";

import { logout } from "@/web/lib/keycloak";
import { useTenant } from "@/web/lib/tenant-context";

import { TenantSelector } from "./tenant-selector";

export default function AppNavbar() {
  const location = useLocation();
  const { keycloak, initialized } = useKeycloak();
  const { currentTenant } = useTenant();

  return (
    <nav className="container">
      <ul>
        <li><strong>Tasks App</strong></li>
        {currentTenant && (
          <li>
            <small style={{ color: "#666" }}>
              Tenant:
              {" "}
              {currentTenant.name}
            </small>
          </li>
        )}
      </ul>
      <ul>
        {location.pathname !== "/" && (
          <li>
            <Link to="/">Home</Link>
          </li>
        )}
        {initialized && keycloak.authenticated && currentTenant && (
          <li>
            <TenantSelector />
          </li>
        )}
        {initialized && keycloak.authenticated && (
          <>
            <li>
              <p>{keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.email}</p>
            </li>
            <li>
              <button
                type="button"
                className="outline contrast"
                onClick={() => logout()}
              >
                Sign Out
              </button>
            </li>
          </>
        )}
        {initialized && !keycloak.authenticated && (
          <li>
            <button
              type="button"
              className="outline"
              onClick={() => keycloak.login({
                redirectUri: window.location.origin,
              })}
            >
              Sign In
            </button>
          </li>
        )}
      </ul>
    </nav>
  );
}
