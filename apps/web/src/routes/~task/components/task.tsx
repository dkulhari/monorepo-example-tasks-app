import type { selectTasksSchema } from "@tasks-app/api/schema";

import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle } from "lucide-react";

type TaskProps = {
  task: selectTasksSchema;
  tenantId: string;
};

export default function Task({ task, tenantId }: TaskProps) {
  if (!tenantId) {
    console.error("Task component: tenantId is undefined!");
    return (
      <Card className="mb-3">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Circle className="h-5 w-5 text-muted-foreground" />
              <h3 className={`font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>
                {task.name}
              </h3>
            </div>
            <Button variant="outline" disabled className="opacity-50">
              View (No Tenant)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {task.done ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <h3 className={`font-medium ${task.done ? "line-through text-muted-foreground" : ""}`}>
              {task.name}
            </h3>
          </div>
          <Button variant="outline" asChild>
            <Link
              to="/task/$id"
              params={{ id: task.id.toString() }}
              search={{ tenantId }}
            >
              View
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
