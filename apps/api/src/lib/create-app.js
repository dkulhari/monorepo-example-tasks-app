import { notFound } from "stoker/middlewares";
import { errorHandler } from "../middleware/error-handler";
import { optionalKeycloakAuth } from "../middleware/keycloak";
import { createPinoLogger } from "../middleware/pino-logger";
import { BASE_PATH } from "./constants";
import createRouter from "./create-router";
export default function createApp() {
    const app = createRouter()
        .use(createPinoLogger())
        .use("*", async (c, next) => {
        if (c.req.path.startsWith(BASE_PATH)) {
            return next();
        }
        // SPA redirect - redirect to web app using request origin
        const requestUrl = new URL(c.req.url);
        const webAppUrl = `${requestUrl.protocol}//${requestUrl.hostname}:5173`;
        return c.redirect(webAppUrl);
    })
        .basePath(BASE_PATH);
    app
        .use("*", (c, next) => {
        return optionalKeycloakAuth()(c, next);
    })
        .notFound(notFound)
        .onError(errorHandler);
    return app;
}
export function createTestApp(router) {
    return createApp().route("/", router);
}
