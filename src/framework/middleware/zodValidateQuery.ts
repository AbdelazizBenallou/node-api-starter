import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { response } from "../utils/response.js";

export const zodValidateQuery =
    (schema: ZodTypeAny) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            response.error(res, "Validation failed", 422, result.error.flatten().fieldErrors);
            return;
        }

        Object.defineProperty(req, "query", {
            value: result.data,
            configurable: true,
            enumerable: true,
            writable: true,
        });
        next();
    };