import { RateLimiterMemory } from "rate-limiter-flexible";
import type { Request, Response, NextFunction } from "express";
import { response } from "../utils/response.js";

const limiters = {
    global: new RateLimiterMemory({ points: 60, duration: 60, keyPrefix: "rl:global" }),
    auth: new RateLimiterMemory({ points: 20, duration: 60, keyPrefix: "rl:auth" }),
    login: new RateLimiterMemory({ points: 10, duration: 60, keyPrefix: "rl:login" }),
    register: new RateLimiterMemory({ points: 5, duration: 3600, keyPrefix: "rl:register" }),
    refresh: new RateLimiterMemory({ points: 60, duration: 60, keyPrefix: "rl:refresh" }),
    sensitive: new RateLimiterMemory({ points: 30, duration: 60, keyPrefix: "rl:sensitive" }),
};

export type RateLimitKind = keyof typeof limiters;

export const rateLimit =
    (kind: RateLimitKind) =>
    (req: Request, res: Response, next: NextFunction): void => {
        limiters[kind]
            .consume(req.ip ?? "unknown")
            .then(() => next())
            .catch(() => {
                response.error(res, "Too many requests, please try again later", 429);
            });
    };