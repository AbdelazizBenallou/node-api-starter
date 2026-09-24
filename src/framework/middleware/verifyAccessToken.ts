import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { response } from "../utils/response.js";

export const verifyAccessToken = async (
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> => {
    const header = req.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const cookie = (req.cookies as { accessToken?: string } | undefined)?.accessToken;
    const token = bearer ?? cookie;

    if (!token) {
        response.error(res, "Access token required", 401);
        return;
    }

    let payload: { userId: number };
    try {
        payload = jwt.verify(token, env.ACCESS_SECRET) as { userId: number };
    } catch {
        response.error(res, "Invalid or expired access token", 401);
        return;
    }

    const user = await prisma.users.findUnique({
        where: { id: payload.userId },
        select: {
            id: true,
            email: true,
            status: true,
            roles: { select: { name: true } },
        },
    });

    if (!user || user.status !== "active") {
        response.error(res, "Unauthorized", 401);
        return;
    }

    req.user = {
        userId: user.id,
        email: user.email,
        role: user.roles.name,
    };
    next();
};