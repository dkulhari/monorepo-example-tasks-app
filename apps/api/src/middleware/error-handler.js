import { HTTPException } from "hono/http-exception";
import * as HttpStatusCodes from "stoker/http-status-codes";
export const errorHandler = (err, c) => {
    const logger = c.get("logger");
    if (err instanceof HTTPException) {
        // Log HTTP exceptions with their status and message
        logger.warn({
            err,
            status: err.status,
            message: err.message,
            path: c.req.path,
            method: c.req.method,
        }, "HTTP Exception");
        return c.json({
            error: err.message,
            status: err.status,
        }, err.status);
    }
    // Log unhandled exceptions with full stack trace
    logger.error({
        err,
        stack: err.stack,
        message: err.message,
        path: c.req.path,
        method: c.req.method,
    }, "Unhandled Exception");
    // Return generic error response for unhandled exceptions
    return c.json({
        error: "Internal Server Error",
        status: HttpStatusCodes.INTERNAL_SERVER_ERROR,
    }, HttpStatusCodes.INTERNAL_SERVER_ERROR);
};
