import React from "react";

import { useTenant } from "../lib/tenant-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TenantSelector() {
  const { currentTenant, tenants, switchTenant, loading } = useTenant();

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading tenants...</div>;
  }

  if (!tenants.length) {
    return <div className="text-sm text-muted-foreground">No tenants available</div>;
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-muted-foreground">Tenant:</span>
      <Select
        value={currentTenant?.slug || ""}
        onValueChange={switchTenant}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select tenant" />
        </SelectTrigger>
        <SelectContent>
          {tenants.map(tenant => (
            <SelectItem key={tenant.id} value={tenant.slug}>
              {tenant.name} ({tenant.userRole})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
