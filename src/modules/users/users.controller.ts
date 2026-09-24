import type { Request, Response } from "express";
import { asyncHandler } from "../../framework/middleware/asyncHandler.js";
import { response } from "../../framework/utils/response.js";
import { usersService } from "./users.service.js";

export const usersController = {
    list: asyncHandler(async (req: Request, res: Response) => {
        const { cursor, limit, search, status, role_id } = req.query as unknown as {
            cursor?: string;
            limit: number;
            search?: string;
            status?: "active" | "inactive" | "locked" | "pending";
            role_id?: number;
        };

        const { rows, meta } = await usersService.list({
                cursor,
                limit,
                search,
                status,
                role_id,
            });

        response.paginated(res, rows, meta);
    }),

    getById: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params as unknown as { id: number };
        const user = await usersService.getById(Number(id));
        response.success(res, user, "User retrieved");
    }),

    update: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params as unknown as { id: number };
        const user = await usersService.update(Number(id), req.body);
        response.success(res, user, "User updated");
    }),

    remove: asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params as unknown as { id: number };
        await usersService.remove(Number(id));
        response.success(res, null, "User deleted");
    }),
};