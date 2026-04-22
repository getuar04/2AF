import express from "express";
import authRoutes from "./infra/http/routes/auth";
import adminRoutes from "./infra/http/routes/admin";
import { errorHandler } from "./infra/http/middlewares/errorHandler";
import { env } from "./infra/config/env";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "authentication-service",
      environment: env.app.nodeEnv,
      runtimeMode: env.app.runtimeMode,
      kafkaEnabled: env.kafka.enabled
    });
  });

  app.use("/auth", authRoutes);
  app.use("/admin", adminRoutes);
  app.use(errorHandler);

  return app;
}
