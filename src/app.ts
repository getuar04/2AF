import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import authRoutes from "./infra/http/routes/auth";
import adminRoutes from "./infra/http/routes/admin";
import { errorHandler } from "./infra/http/middlewares/errorHandler";
import { env } from "./infra/config/env";
import { logger } from "./infra/logger/logger";
import { getHealthStatus } from "./infra/health/healthCheck";

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: "10kb" }));
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.get("/health", async (_req, res) => {
    const health = await getHealthStatus();
    const status = health.status === "ok" ? 200 : 503;
    res.status(status).json(health);
  });

  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use(errorHandler);

  return app;
}
