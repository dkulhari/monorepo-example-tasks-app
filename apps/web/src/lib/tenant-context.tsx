import { useKeycloak } from "@react-keycloak/web";
import React, { createContext, useContext, useEffect, useState } from "react";

import apiClient from "./api-client";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  userRole: string;
};

type TenantContextType = {
  currentTenant: Tenant | null;
  tenants: Tenant[];
  switchTenant: (tenantSlug: string) => void;
  loading: boolean;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { keycloak, initialized } = useKeycloak();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserTenants = async () => {
    try {
      // Fetch user's tenants from API
      const response = await apiClient.api.tenants.$get();
      const userTenants = await response.json();

      if (Array.isArray(userTenants)) {
        setTenants(userTenants);

        // Set current tenant from URL or default to first
        const currentSlug = getCurrentTenantSlug();
        const tenant = userTenants.find((t: Tenant) => t.slug === currentSlug) || userTenants[0];
        setCurrentTenant(tenant);
      }
    }
    catch (error) {
      console.error("Failed to load tenants:", error);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      loadUserTenants();
    }
    else if (initialized && !keycloak.authenticated) {
      setLoading(false);
    }
  }, [initialized, keycloak.authenticated]);

  const switchTenant = (tenantSlug: string) => {
    const tenant = tenants.find(t => t.slug === tenantSlug);
    if (tenant) {
      setCurrentTenant(tenant);
      // For now, just update the current tenant without redirecting
      // In a real app, you might want to update the URL or localStorage
    }
  };

  return (
    <TenantContext value={{ currentTenant, tenants, switchTenant, loading }}>
      {children}
    </TenantContext>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

function getCurrentTenantSlug(): string | null {
  // Extract from subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts[0];
  }
  return null;
}
