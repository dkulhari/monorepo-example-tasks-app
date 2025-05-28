import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import RoutePending from "@/web/components/route-pending";
import dateFormatter from "@/web/lib/date-formatter";
import { createTaskQueryOptions } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Calendar, Clock } from "lucide-react";

const searchSchema = z.object({
  tenantId: z.string(),
});

export const Route = createFileRoute("/task/$id/")({
  validateSearch: searchSchema,
  loader: ({ params, search }) => {
    // If search is undefined or doesn't have tenantId, skip the loader
    // The component will handle loading the data when search params are available
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
  
  // If tenantId is not available, show an error
  if (!tenantId) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <h1 className="text-xl font-semibold mb-2">Error</h1>
          <p className="text-muted-foreground mb-4">Tenant ID is required to view this task.</p>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const { data } = useSuspenseQuery(createTaskQueryOptions(tenantId, id));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-3">
          {data.done ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <Circle className="h-6 w-6 text-muted-foreground" />
          )}
          <CardTitle className={data.done ? "line-through text-muted-foreground" : ""}>
            {data.name}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Status:</span>
          <Badge variant={data.done ? "default" : "secondary"}>
            {data.done ? "Completed" : "Pending"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {dateFormatter.format(new Date(data.createdAt))}</span>
          </div>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Updated: {dateFormatter.format(new Date(data.updatedAt))}</span>
          </div>
        </div>
        
        <div className="flex space-x-2 pt-4">
          <Button asChild>
            <Link to="/task/$id/edit" params={{ id }} search={{ tenantId }}>
              Edit Task
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/">Back to Tasks</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
