import { z } from "zod";
import { keysetSchema } from "../../framework/utils/pagination.js";

export const listUsersQuerySchema = z.object({
    cursor: keysetSchema.shape.cursor,
    limit: keysetSchema.shape.limit,
    search: z.string().trim().max(100).optional(),
    status: z.enum(["active", "inactive", "locked", "pending"]).optional(),
    role_id: z.coerce.number().int().positive().optional(),
});

export const userIdParamsSchema = z.object({
    id: z.coerce.number().int().positive(),
});

export const updateUserSchema = z.object({
    email: z.string().trim().email().max(255).optional(),
    status: z.enum(["active", "inactive", "locked", "pending"]).optional(),
    role_id: z.coerce.number().int().positive().optional(),
}).strict();