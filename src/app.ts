import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { corsOrigins } from "./framework/config/env.js";
import { requestId } from "./framework/middleware/requestId.js";
import authRoutes from "./modules/auth/auth.routes.js";
import usersRoutes from "./modules/users/users.routes.js";
import profilesRoutes from "./modules/profiles/profiles.routes.js";
import { notFound } from "./framework/middleware/notFound.js";
import { errorHandler } from "./framework/middleware/errorHandler.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(requestId);

app.get("/health", (_req, res) =>
    res.json({ success: true, message: "ok", data: { uptime: process.uptime() } }),
);

app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/profiles", profilesRoutes);

app.use(notFound);
app.use(errorHandler);

export { app };