import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { insertTasksSchema } from "@tasks-app/api/schema";

import { createTask, queryKeys } from "@/web/lib/queries";

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
    <>
      {createMutation.error && (
        <article style={{ whiteSpace: "pre-wrap" }} className="error">
          {createMutation.error.message}
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
                disabled={createMutation.isPending}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <p className="error">{field.state.meta.errors[0]}</p>
              )}
            </label>
          )}
        />

        <button type="submit" disabled={createMutation.isPending || !form.state.canSubmit}>
          Create
        </button>
      </form>
      {createMutation.isPending && <progress />}
    </>
  );
}
