import { useKeycloak } from "@react-keycloak/web";
import { Link, useLocation } from "@tanstack/react-router";

import { logout } from "@/web/lib/keycloak";
import { useTenant } from "@/web/lib/tenant-context";
import { Button } from "@/components/ui/button";

import { TenantSelector } from "./tenant-selector";

export default function AppNavbar() {
  const location = useLocation();
  const { keycloak, initialized } = useKeycloak();
  const { currentTenant } = useTenant();

  return (
    <nav className="border-b bg-background px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold">Tasks App</h1>
          {currentTenant && (
            <span className="text-sm text-muted-foreground">
              Tenant: {currentTenant.name}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {location.pathname !== "/" && (
            <Button variant="ghost" asChild>
              <Link to="/">Home</Link>
            </Button>
          )}
          
          {initialized && keycloak.authenticated && currentTenant && (
            <TenantSelector />
          )}
          
          {initialized && keycloak.authenticated && (
            <>
              <span className="text-sm text-muted-foreground">
                {keycloak.tokenParsed?.preferred_username || keycloak.tokenParsed?.email}
              </span>
              <Button
                variant="outline"
                onClick={() => logout()}
              >
                Sign Out
              </Button>
            </>
          )}
          
          {initialized && !keycloak.authenticated && (
            <Button
              onClick={() => keycloak.login({
                redirectUri: window.location.origin,
              })}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
