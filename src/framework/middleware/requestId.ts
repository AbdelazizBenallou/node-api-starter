import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();

    req.requestId = id;
    res.setHeader("X-Request-Id", id);
    next();
};