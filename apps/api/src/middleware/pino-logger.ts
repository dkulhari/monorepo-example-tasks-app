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
      env.NODE_ENV === "development"
        ? pretty({
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname",
            // Show stack traces in pretty format
            errorLikeObjectKeys: ["err", "error"],
          })
        : undefined,
    ),
    http: {
      reqId: () => crypto.randomUUID(),
    },
  });
}
