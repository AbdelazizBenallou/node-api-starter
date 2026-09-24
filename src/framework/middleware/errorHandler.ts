import type { ErrorRequestHandler } from "express";
import { AppError } from "../utils/AppError.js";
import { response } from "../utils/response.js";
import logger from "../config/logger.js";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
    if (err instanceof AppError) {
        if (err.statusCode >= 500) logger.error({ err, requestId: req.requestId }, err.message);
        response.error(res, err.message, err.statusCode, err.details);
        return;
    }

    if (err instanceof Error && "type" in err && (err as { type?: string }).type === "entity.too.large") {
        response.error(res, "Request body too large", 413);
        return;
    }

    logger.error({ err, requestId: req.requestId, path: req.originalUrl }, "Unhandled error");
    response.error(res, "Internal server error", 500);
};