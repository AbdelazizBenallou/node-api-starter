import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { response } from "../utils/response.js";

export const zodValidate =
    (schema: ZodTypeAny) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            response.error(res, "Validation failed", 422, result.error.flatten().fieldErrors);
            return;
        }

        req.body = result.data;
        next();
    };