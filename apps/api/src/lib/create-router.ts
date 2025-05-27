import { OpenAPIHono } from "@hono/zod-openapi";
import { defaultHook } from "stoker/openapi";

import type { AppBinding } from "./types";

export default function createRouter() {
  return new OpenAPIHono<AppBinding>({
    strict: false,
    defaultHook,
  });
}
