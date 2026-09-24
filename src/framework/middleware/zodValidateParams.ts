import type { Request, Response, NextFunction } from "express";
import type { ZodTypeAny } from "zod";
import { response } from "../utils/response.js";

export const zodValidateParams =
    (schema: ZodTypeAny) =>
    (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            response.error(res, "Validation failed", 422, result.error.flatten().fieldErrors);
            return;
        }

        next();
    };