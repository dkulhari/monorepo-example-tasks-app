import { serve } from "@hono/node-server";
import pino from "pino";
import app from "./app";
import env from "./env";
const port = env.PORT;
// Create a logger for global error handling
const logger = pino({
    level: env.LOG_LEVEL,
    serializers: {
        err: pino.stdSerializers.err,
    },
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
    logger.error({
        err: reason,
        promise,
    }, "Unhandled Promise Rejection");
    // Exit gracefully
    process.exit(1);
});
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger.error({
        err: error,
        stack: error.stack,
    }, "Uncaught Exception");
    // Exit gracefully
    process.exit(1);
});
logger.info(`Server is running on port ${port}`);
serve({
    fetch: app.fetch,
    port,
});
