import { pinoLogger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";

import env from "../env";

export function createPinoLogger() {
  return pinoLogger({
    pino: pino(
      {
        level: env.LOG_LEVEL,
      },
      env.NODE_ENV === "development" ? pretty() : undefined,
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
