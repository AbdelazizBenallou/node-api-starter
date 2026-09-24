import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { tokenHash } from "../utils/password.js";
import { response } from "../utils/response.js";

export const verifyRefreshToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const cookie = (req.cookies as { refreshToken?: string } | undefined)?.refreshToken;
    const body = (req.body as { refreshToken?: string } | undefined)?.refreshToken;
    const token = cookie ?? body;

    if (!token) {
        response.error(res, "Refresh token required", 401);
        return;
    }

    let payload: { userId: number };
    try {
        payload = jwt.verify(token, env.REFRESH_SECRET) as { userId: number };
    } catch {
        response.error(res, "Invalid or expired refresh token", 401);
        return;
    }

    const stored = await prisma.refresh_tokens.findUnique({
        where: { token_hash: tokenHash(token) },
        select: { user_id: true, expires_at: true, revoked: true },
    });

    if (!stored || stored.user_id !== payload.userId || stored.revoked || stored.expires_at < new Date()) {
        response.error(res, "Invalid or expired refresh token", 401);
        return;
    }

    req.refreshToken = token;
    req.refreshPayload = { userId: payload.userId };
    next();
};