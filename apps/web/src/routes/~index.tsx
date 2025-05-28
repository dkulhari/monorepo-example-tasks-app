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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!keycloak.authenticated) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome to Tasks App</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Please sign in to manage your tasks</p>
          <Button onClick={() => keycloak.login()}>Sign In</Button>
        </CardContent>
      </Card>
    );
  }

  if (!currentTenant) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">No Tenant Selected</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">Please create or join a tenant to manage tasks</p>
          <TenantSelector />
        </CardContent>
      </Card>
    );
  }

  return <TasksContent tenantId={currentTenant.id} />;
}

function TasksContent({ tenantId }: { tenantId: string }) {
  const {
    data,
  } = useSuspenseQuery(tasksQueryOptions(tenantId));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Task Management</h1>
        <TenantSelector />
      </div>
      <TaskForm tenantId={tenantId} />
      <TaskList tasks={data} tenantId={tenantId} />
    </div>
  );
}
