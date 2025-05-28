import { useForm } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { patchTasksSchema } from "@tasks-app/api/schema";
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

  const form = useForm({
    defaultValues: {
      name: data.name,
      done: data.done,
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod before submitting
      const result = patchTasksSchema.safeParse(value);
      if (!result.success) {
        console.error("Validation errors:", result.error);
        return;
      }
      
      updateMutation.mutate(result.data);
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) => {
              if (!value || value.length === 0) {
                return "Name is required";
              }
              if (value.length > 500) {
                return "Name must be less than 500 characters";
              }
              return undefined;
            },
          }}
          children={(field) => (
            <label>
              Name
              <input
                name={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={pending}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="error">{field.state.meta.errors[0]}</p>
              )}
            </label>
          )}
        />

        <form.Field
          name="done"
          children={(field) => (
            <label>
              <input
                type="checkbox"
                name={field.name}
                checked={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
                disabled={pending}
              />
              Done
            </label>
          )}
        />

        <div className="buttons">
          <button 
            type="submit" 
            disabled={pending}
          >
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
