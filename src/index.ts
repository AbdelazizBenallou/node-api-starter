import { app } from "./app.js";
import { env } from "./framework/config/env.js";
import logger from "./framework/config/logger.js";
import { prisma } from "./framework/config/prisma.js";

const shutdown = async (signal: string) => {
    logger.info({ signal }, "shutting down");
    await prisma.$disconnect();
    process.exit(0);
};

const start = async () => {
    try {
        await prisma.$connect();
        logger.info("database connected");
        app.listen(env.PORT, () => {
            logger.info(`listening on port ${env.PORT}`);
        });
    } catch (err) {
        logger.error({ err }, "failed to start server");
        process.exit(1);
    }
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

void start();