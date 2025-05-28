import type { insertTasksSchema, patchTasksSchema } from "@tasks-app/api/schema";

import { queryOptions } from "@tanstack/react-query";

import apiClient from "./api-client";
import formatApiError from "./format-api-error";

export const queryKeys = {
  LIST_TASKS: (tenantId: string) => ({ queryKey: ["list-tasks", tenantId] }),
  LIST_TASK: (tenantId: string, id: string) => ({ queryKey: [`list-task-${id}`, tenantId] }),
};

export const tasksQueryOptions = (tenantId: string) => queryOptions({
  ...queryKeys.LIST_TASKS(tenantId),
  queryFn: async () => {
    const response = await apiClient.api.tenants[":tenantId"].tasks.$get({
      param: { tenantId },
    });
    return response.json();
  },
});

export const createTaskQueryOptions = (tenantId: string, id: string) => queryOptions({
  ...queryKeys.LIST_TASK(tenantId, id),
  queryFn: async () => {
    const response = await apiClient.api.tenants[":tenantId"].tasks[":id"].$get({
      param: {
        tenantId,
        // @ts-expect-error allow strings for error messages
        id,
      },
    });
    const json = await response.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    if ("success" in json) {
      const message = formatApiError(json);
      throw new Error(message);
    }
    return json;
  },
});

export const createTask = async (tenantId: string, task: insertTasksSchema) => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  const response = await apiClient.api.tenants[":tenantId"].tasks.$post({
    param: { tenantId },
    json: task,
  });
  const json = await response.json();
  if ("success" in json) {
    const message = formatApiError(json);
    throw new Error(message);
  }
  return json;
};

export const deleteTask = async (tenantId: string, id: string) => {
  const response = await apiClient.api.tenants[":tenantId"].tasks[":id"].$delete({
    param: {
      tenantId,
      // @ts-expect-error allow to show server error
      id,
    },
  });
  if (response.status !== 204) {
    const json = await response.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    const message = formatApiError(json);
    throw new Error(message);
  }
};

export const updateTask = async ({ tenantId, id, task }: { tenantId: string; id: string; task: patchTasksSchema }) => {
  const response = await apiClient.api.tenants[":tenantId"].tasks[":id"].$patch({
    param: {
      tenantId,
      // @ts-expect-error allow to show server error
      id,
    },
    json: task,
  });
  if (response.status !== 200) {
    const json = await response.json();
    if ("message" in json) {
      throw new Error(json.message);
    }
    const message = formatApiError(json);
    throw new Error(message);
  }
};
