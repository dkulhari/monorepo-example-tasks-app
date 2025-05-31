import { apiReference } from "@scalar/hono-api-reference";
import packageJSON from "../../package.json";
import { BASE_PATH } from "./constants";
export default function configureOpenAPI(app) {
    app.doc("/doc", {
        openapi: "3.0.0",
        info: {
            version: packageJSON.version,
            title: "Tasks API",
            description: "A simple tasks API with Keycloak authentication. For protected endpoints (POST, PATCH, DELETE), you need to:\n1. Login at http://localhost:5173\n2. Get your JWT token from browser dev tools\n3. Add 'Authorization: Bearer <token>' header",
        },
    });
    app.get("/reference", apiReference({
        theme: "kepler",
        layout: "classic",
        defaultHttpClient: {
            targetKey: "js",
            clientKey: "fetch",
        },
        spec: {
            url: `${BASE_PATH}/doc`,
        },
    }));
}
