import { useForm } from "@tanstack/react-form";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { patchTasksSchema } from "@tasks-app/api/schema";
import { z } from "zod";

import RoutePending from "@/web/components/route-pending";
import { createTaskQueryOptions, deleteTask, queryKeys, updateTask } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

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
      <Card>
        <CardContent className="p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">Tenant ID is required to edit this task.</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Edit Task</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {error}
          </div>
        )}
        
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-4"
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
              <div className="space-y-2">
                <Label htmlFor={field.name}>Task Name</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={pending}
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />

          <form.Field
            name="done"
            children={(field) => (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                  disabled={pending}
                />
                <Label htmlFor={field.name}>Mark as completed</Label>
              </div>
            )}
          />

          <div className="flex space-x-2 pt-4">
            <Button 
              type="submit" 
              disabled={pending}
            >
              {pending ? "Updating..." : "Update Task"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => deleteMutation.mutate()}
            >
              {pending ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" asChild>
              <Link to="/task/$id" params={{ id }} search={{ tenantId }}>
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
