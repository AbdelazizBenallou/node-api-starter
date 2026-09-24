import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/prisma.js";
import { response } from "../utils/response.js";

const CACHE_TTL_MS = 60_000;

const cache = new Map<string, { permissions: Set<string>; expiresAt: number }>();

const getRolePermissions = async (roleName: string): Promise<Set<string>> => {
    const cached = cache.get(roleName);
    if (cached && cached.expiresAt > Date.now()) return cached.permissions;

    const role = await prisma.roles.findUnique({
        where: { name: roleName },
        select: {
            role_permissions: {
                select: {
                    permissions: { select: { name: true } },
                },
            },
        },
    });

    const permissions = new Set(role?.role_permissions.map((rp) => rp.permissions.name) ?? []);
    cache.set(roleName, { permissions, expiresAt: Date.now() + CACHE_TTL_MS });
    return permissions;
};

export const checkPermission =
    (required: string) =>
        async (req: Request, res: Response, next: NextFunction): Promise<void> => {
            if (!req.user) {
                response.error(res, "Unauthorized", 401);
                return;
            }

            const permissions = await getRolePermissions(req.user.role);

            if (!permissions.has(required)) {
                response.error(res, "You do not have permission to perform this action", 403);
                return;
            }

            next();
        };