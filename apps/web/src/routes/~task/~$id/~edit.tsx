import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { patchTasksSchema } from "@tasks-app/api/schema";
import { useForm } from "react-hook-form";
import { z } from "zod";

import RoutePending from "@/web/components/route-pending";
import { createTaskQueryOptions, deleteTask, queryKeys, updateTask } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";

const searchSchema = z.object({
  tenantId: z.string(),
});

export const Route = createFileRoute("/task/$id/edit")({
  validateSearch: searchSchema,
  loader: ({ params, search }) => {
    if (!search || !search.tenantId) {
      return null;
    }
    return queryClient.ensureQueryData(createTaskQueryOptions(search.tenantId, params.id));
  },
  component: RouteComponent,
  pendingComponent: RoutePending,
});

function RouteComponent() {
  const { id } = Route.useParams();
  const { tenantId } = Route.useSearch();
  const navigate = useNavigate();
  
  if (!tenantId) {
    return (
      <div>
        <h1>Error</h1>
        <p>Tenant ID is required to edit this task.</p>
        <Link to="/" role="button" className="outline">
          Back to Home
        </Link>
      </div>
    );
  }
  
  const { data } = useSuspenseQuery(createTaskQueryOptions(tenantId, id));

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<patchTasksSchema>({
    defaultValues: data,
    resolver: zodResolver(patchTasksSchema),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteTask(tenantId, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries(queryKeys.LIST_TASKS(tenantId));
      navigate({ to: "/" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (task: patchTasksSchema) => updateTask({ tenantId, id, task }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [
          ...queryKeys.LIST_TASKS(tenantId).queryKey,
          ...queryKeys.LIST_TASK(tenantId, id).queryKey,
        ],
      });
      navigate({ to: "/task/$id", params: { id }, search: { tenantId } });
    },
  });

  const pending = deleteMutation.isPending || updateMutation.isPending;
  const error = deleteMutation.error?.message || updateMutation.error?.message;

  return (
    <div>
      <h1>Edit Task</h1>
      {error && (
        <article style={{ whiteSpace: "pre-wrap" }} className="error">
          {error}
        </article>
      )}
      <form onSubmit={handleSubmit(data => updateMutation.mutate(data))}>
        <label>
          Name
          <input {...register("name")} disabled={pending} />
          <p className="error">{errors.name?.message}</p>
        </label>

        <label>
          <input type="checkbox" {...register("done")} disabled={pending} />
          Done
        </label>

        <div className="buttons">
          <button type="submit" disabled={pending || !isDirty}>
            Update
          </button>
          <button
            type="button"
            className="outline contrast"
            disabled={pending}
            onClick={() => deleteMutation.mutate()}
          >
            Delete
          </button>
          <Link to="/task/$id" params={{ id }} search={{ tenantId }} role="button" className="outline">
            Cancel
          </Link>
        </div>
      </form>
      {pending && <progress />}
    </div>
  );
}
