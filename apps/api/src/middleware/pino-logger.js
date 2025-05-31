import { pinoLogger } from "hono-pino";
import pino from "pino";
import pretty from "pino-pretty";
import env from "../env";
export function createPinoLogger() {
    return pinoLogger({
        pino: pino({
            level: env.LOG_LEVEL,
            // Include stack traces for errors
            serializers: {
                err: pino.stdSerializers.err,
                error: pino.stdSerializers.err,
            },
            // Format error objects to include stack traces
            formatters: {
                level: (label) => {
                    return { level: label };
                },
            },
        }, env.NODE_ENV === "development"
            ? pretty({
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
                // Show stack traces in pretty format
                errorLikeObjectKeys: ["err", "error"],
            })
            : undefined),
        http: {
            reqId: () => crypto.randomUUID(),
        },
    });
}
