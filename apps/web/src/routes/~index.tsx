import { useKeycloak } from "@react-keycloak/web";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import RoutePending from "@/web/components/route-pending";
import { TenantSelector } from "@/web/components/tenant-selector";
import { tasksQueryOptions } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";
import { useTenant } from "@/web/lib/tenant-context";
import TaskForm from "@/web/routes/~task/components/form";
import TaskList from "@/web/routes/~task/components/list";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    // We can't access tenant context in the loader, so we'll handle loading in the component
    return null;
  },
  pendingComponent: RoutePending,
});

function Index() {
  const { keycloak, initialized } = useKeycloak();
  const { currentTenant, loading: tenantLoading } = useTenant();

  if (!initialized || tenantLoading) {
    return <div>Loading...</div>;
  }

  if (!keycloak.authenticated) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>Welcome to Tasks App</h2>
        <p>Please sign in to manage your tasks</p>
        <button onClick={() => keycloak.login()}>Sign In</button>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2>No Tenant Selected</h2>
        <p>Please create or join a tenant to manage tasks</p>
        <TenantSelector />
      </div>
    );
  }

  return <TasksContent tenantId={currentTenant.id} />;
}

function TasksContent({ tenantId }: { tenantId: string }) {
  const {
    data,
  } = useSuspenseQuery(tasksQueryOptions(tenantId));

  return (
    <div>
      <TenantSelector />
      <TaskForm tenantId={tenantId} />
      <TaskList tasks={data} tenantId={tenantId} />
    </div>
  );
}
