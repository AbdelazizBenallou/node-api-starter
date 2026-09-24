import { z } from "zod";

export const offsetSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

export const keysetSchema = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(10),
});

const toNumber = (cursor: string): number => Number(Buffer.from(cursor, "base64url").toString());

export const keyset = (parsed: { cursor?: string; limit: number }) => {
    const cursor = parsed.cursor ? toNumber(parsed.cursor) : undefined;
    return { take: parsed.limit + 1, cursor };
};

export const buildCursorMeta = <T extends { id: number }>(items: T[], take: number) => {
    const hasMore = items.length > take - 1;
    const rows = hasMore ? items.slice(0, take - 1) : items;
    const last = rows.at(-1);
    const nextCursor = hasMore && last ? Buffer.from(String(last.id)).toString("base64url") : null;
    return { count: rows.length, nextCursor };
};