import pino from "pino";
import { env } from "../config/env";

export const logger = pino({
  level: env.app.nodeEnv === "production" ? "info" : "debug",
  transport:
    env.app.nodeEnv !== "production"
      ? { target: "pino-pretty", options: { colorize: true } }
      : undefined,
  base: {
    service: "authentication-service",
    env: env.app.nodeEnv,
  },
});
