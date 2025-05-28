import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertTasksSchema } from "@tasks-app/api/schema";

import { createTask, queryKeys } from "@/web/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskFormProps = {
  tenantId: string;
};

export default function TaskForm({ tenantId }: TaskFormProps) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (task: insertTasksSchema) => createTask(tenantId, task),
    onSuccess: () => {
      form.reset();
      queryClient.invalidateQueries(queryKeys.LIST_TASKS(tenantId));
    },
  });

  const form = useForm({
    defaultValues: {
      name: "",
      done: false,
    },
    onSubmit: async ({ value }) => {
      // Validate with Zod before submitting
      const result = insertTasksSchema.safeParse(value);
      if (!result.success) {
        // Handle validation errors
        console.error("Validation errors:", result.error);
        return;
      }
      createMutation.mutate(result.data);
    },
  });

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Create New Task</CardTitle>
      </CardHeader>
      <CardContent>
        {createMutation.error && (
          <div className="mb-4 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
            {createMutation.error.message}
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
                  disabled={createMutation.isPending}
                  placeholder="Enter task name..."
                />
                {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0]}</p>
                )}
              </div>
            )}
          />

          <Button 
            type="submit" 
            disabled={createMutation.isPending || !form.state.canSubmit}
            className="w-full"
          >
            {createMutation.isPending ? "Creating..." : "Create Task"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
