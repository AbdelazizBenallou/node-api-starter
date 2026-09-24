import type { UserStatus } from "@prisma/client";
import { prisma } from "../../framework/config/prisma.js";

export const userRepository = {
    findMany(args: {
        take: number;
        cursor?: number;
        search?: string;
        status?: string;
        role_id?: number;
    }) {
        return prisma.users.findMany({
            take: args.take,
            ...(args.cursor !== undefined && { cursor: { id: args.cursor }, skip: 1 }),
            where: {
                ...(args.search && {
                    email: { contains: args.search, mode: "insensitive" },
                }),
                ...(args.status && { status: args.status as never }),
                ...(args.role_id !== undefined && { role_id: args.role_id }),
            },
            orderBy: { id: "asc" },
            select: {
                id: true,
                email: true,
                status: true,
                role_id: true,
                created_at: true,
                updated_at: true,
                roles: { select: { name: true } },
            },
        });
    },

    findById(id: number) {
        return prisma.users.findUnique({
            where: { id },
            select: {
                id: true,
                email: true,
                status: true,
                role_id: true,
                created_at: true,
                updated_at: true,
                roles: { select: { name: true } },
                profile: true,
            },
        });
    },

    update(id: number, data: { email?: string; status?: UserStatus; role_id?: number }) {
        const updateData = {
            ...(data.email !== undefined && { email: data.email }),
            ...(data.status !== undefined && { status: data.status }),
            ...(data.role_id !== undefined && { role_id: data.role_id }),
        };

        return prisma.users.update({ where: { id }, data: updateData });
    },

    remove(id: number) {
        return prisma.users.delete({ where: { id } });
    },
};