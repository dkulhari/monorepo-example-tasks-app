import type { selectTasksSchema } from "@tasks-app/api/schema";

import Task from "./task";

type TaskListProps = {
  tasks: selectTasksSchema[];
  tenantId: string;
};

export default function TaskList({ tasks, tenantId }: TaskListProps) {
  return tasks.map(task => (
    <Task task={task} tenantId={tenantId} key={task.id} />
  ));
}
