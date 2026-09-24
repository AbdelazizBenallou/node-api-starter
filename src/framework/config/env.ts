import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z.string().min(1),
    ACCESS_SECRET: z.string().min(1),
    REFRESH_SECRET: z.string().min(1),
    ACCESS_EXPIRY: z.string().min(1).default("15m"),
    REFRESH_EXPIRY: z.string().min(1).default("7d"),
    CORS_ORIGINS: z.string().default("http://localhost:5173,http://localhost:3001"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;

export const corsOrigins =
    env.CORS_ORIGINS === "*"
        ? true
        : env.CORS_ORIGINS.split(",").map((s) => s.trim());