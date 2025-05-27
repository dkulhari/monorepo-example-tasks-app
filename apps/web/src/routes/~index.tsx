import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useKeycloak } from "@react-keycloak/web";

import RoutePending from "@/web/components/route-pending";
import { tasksQueryOptions } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";
import TaskForm from "@/web/routes/~task/components/form";
import TaskList from "@/web/routes/~task/components/list";

export const Route = createFileRoute("/")({
  component: Index,
  loader: async () => {
    try {
      return await queryClient.ensureQueryData(tasksQueryOptions);
    } catch (error) {
      // If unauthenticated, don't fail the loader
      return [];
    }
  },
  pendingComponent: RoutePending,
});

function Index() {
  const { keycloak, initialized } = useKeycloak();
  const {
    data,
  } = useSuspenseQuery(tasksQueryOptions);

  if (!initialized) {
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

  return (
    <div>
      <TaskForm />
      <TaskList tasks={data} />
    </div>
  );
}
