import apiClient from "@tasks-app/api-client";

import keycloak from "./keycloak";

const client = apiClient("/", {
  fetch: (input: RequestInfo | URL, requestInit?: RequestInit) => {
    const token = keycloak.token;
    const headers = new Headers(requestInit?.headers);
    
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    return fetch(input, {
      ...requestInit,
      headers,
    });
  },
});

export default client;
