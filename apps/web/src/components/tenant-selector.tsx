import React from "react";

import { useTenant } from "../lib/tenant-context";

export function TenantSelector() {
  const { currentTenant, tenants, switchTenant, loading } = useTenant();

  if (loading) {
    return <div>Loading tenants...</div>;
  }

  if (!tenants.length) {
    return <div>No tenants available</div>;
  }

  return (
    <div className="tenant-selector">
      <label htmlFor="tenant-select">Current Tenant:</label>
      <select
        id="tenant-select"
        value={currentTenant?.slug || ""}
        onChange={e => switchTenant(e.target.value)}
        className="ml-2 p-2 border rounded"
      >
        {tenants.map(tenant => (
          <option key={tenant.id} value={tenant.slug}>
            {tenant.name}
            {" "}
            (
            {tenant.userRole}
            )
          </option>
        ))}
      </select>
    </div>
  );
}
