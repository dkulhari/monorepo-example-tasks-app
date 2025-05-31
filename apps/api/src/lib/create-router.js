import { OpenAPIHono } from "@hono/zod-openapi";
import { defaultHook } from "stoker/openapi";
export default function createRouter() {
    return new OpenAPIHono({
        strict: false,
        defaultHook,
    });
}
