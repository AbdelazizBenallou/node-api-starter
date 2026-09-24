import type { Response } from "express";

interface SuccessBody<T> {
    success: true;
    message: string;
    data?: T;
}

interface ErrorBody {
    success: false;
    message: string;
    errors?: unknown;
}

interface PaginatedMeta {
    count: number;
    nextCursor: string | null;
}

interface PaginatedBody<T> {
    success: true;
    message: string;
    data: T[];
    meta: PaginatedMeta;
}

export const response = {
    /** 200 OK — data returned */
    success<T>(res: Response, data: T, message = "Success", statusCode = 200): void {
        const body: SuccessBody<T> = { success: true, message, data };
        res.status(statusCode).json(body);
    },

    /** 201 Created — use statusCode 201 */
    created<T>(res: Response, data: T, message = "Created"): void {
        const body: SuccessBody<T> = { success: true, message, data };
        res.status(201).json(body);
    },

    /** Error reply for any 4xx/5xx status */
    error(res: Response, message = "Something went wrong", statusCode = 500, errors?: unknown): void {
        const body: ErrorBody = { success: false, message };
        if (errors !== undefined) body.errors = errors;
        res.status(statusCode).json(body);
    },

    /** 200 with keyset-paginated list */
    paginated<T>(res: Response, data: T[], meta: PaginatedMeta, message = "Success"): void {
        const body: PaginatedBody<T> = { success: true, message, data, meta };
        res.status(200).json(body);
    },
};