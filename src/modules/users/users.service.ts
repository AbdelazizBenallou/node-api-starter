import type { UserStatus } from "@prisma/client";
import { AppError } from "../../framework/utils/AppError.js";
import { keyset } from "../../framework/utils/pagination.js";
import { userRepository } from "./user.repository.js";
import { prisma } from "../../framework/config/prisma.js";

export const usersService = {
    async list(query: { cursor?: string; limit: number; search?: string; status?: UserStatus; role_id?: number }) {
        const { take, cursor } = keyset({ cursor: query.cursor, limit: query.limit });

        const users = await userRepository.findMany({
            take,
            cursor,
            search: query.search,
            status: query.status,
            role_id: query.role_id,
        });

        const hasMore = users.length > take - 1;
        const rows = hasMore ? users.slice(0, take - 1) : users;
        const last = hasMore && rows.at(-1) ? rows.at(-1) : null;
        const nextCursor = last
            ? Buffer.from(String(last.id)).toString("base64url")
            : null;

        return { rows, meta: { count: rows.length, nextCursor } };
    },

    async getById(id: number) {
        const user = await userRepository.findById(id);
        if (!user) throw new AppError("User not found", 404);
        return user;
    },

    async update(id: number, data: { email?: string; status?: UserStatus; role_id?: number }) {
        if (data.email) {
            const existing = await prisma.users.findUnique({ where: { email: data.email } });
            if (existing && existing.id !== id) throw new AppError("Email is already in use", 409);
        }

        if (data.role_id !== undefined) {
            const role = await prisma.roles.findUnique({ where: { id: data.role_id } });
            if (!role) throw new AppError("Role not found", 400);
        }

        try {
            return await userRepository.update(id, data);
        } catch {
            throw new AppError("User not found", 404);
        }
    },

    async remove(id: number) {
        try {
            await userRepository.remove(id);
        } catch {
            throw new AppError("User not found", 404);
        }
    },
};