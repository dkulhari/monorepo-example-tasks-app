import type { selectTasksSchema } from "@tasks-app/api/schema";

import Task from "./task";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TaskListProps = {
  tasks: selectTasksSchema[];
  tenantId: string;
};

export default function TaskList({ tasks, tenantId }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No tasks yet. Create your first task above!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Your Tasks</h2>
      {tasks.map(task => (
        <Task task={task} tenantId={tenantId} key={task.id} />
      ))}
    </div>
  );
}
