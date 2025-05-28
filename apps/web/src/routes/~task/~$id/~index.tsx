import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";

import RoutePending from "@/web/components/route-pending";
import dateFormatter from "@/web/lib/date-formatter";
import { createTaskQueryOptions } from "@/web/lib/queries";
import queryClient from "@/web/lib/query-client";

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
      <div>
        <h1>Error</h1>
        <p>Tenant ID is required to view this task.</p>
        <Link to="/" role="button" className="outline">
          Back to Home
        </Link>
      </div>
    );
  }
  
  const { data } = useSuspenseQuery(createTaskQueryOptions(tenantId, id));

  return (
    <div>
      <h1>{data.name}</h1>
      <p>
        Status:
        {" "}
        {data.done ? "✅ Done" : "⏳ Pending"}
      </p>
      <p>
        Created:
        {" "}
        {dateFormatter.format(new Date(data.createdAt))}
      </p>
      <p>
        Updated:
        {" "}
        {dateFormatter.format(new Date(data.updatedAt))}
      </p>
      <div className="buttons">
        <Link to="/task/$id/edit" params={{ id }} search={{ tenantId }} role="button">
          Edit
        </Link>
        <Link to="/" role="button" className="outline">
          Back
        </Link>
      </div>
    </div>
  );
}
