import type { Request, Response } from "express";
import { response } from "../utils/response.js";

export const notFound = (req: Request, res: Response): void => {
    response.error(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
};