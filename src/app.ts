import express from "express";
import authRoutes from "./infra/http/routes/auth";
import { errorHandler } from "./infra/http/middlewares/errorHandler";
import { env } from "./infra/config/env";

export function createApp() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok", service: "authentication-service", runtimeMode: env.app.runtimeMode });
  });

  app.use("/auth", authRoutes);
  app.use(errorHandler);
  return app;
}
