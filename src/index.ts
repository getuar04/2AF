import express from "express";
import { env } from "./infra/config/env";
import authRoutes from "./infra/http/routes/auth";
import { errorHandler } from "./infra/http/middlewares/errorHandler";
import { connectRedis, disconnectRedis } from "./infra/cache/redisClient";
import {
  connectPostgres,
  disconnectPostgres,
} from "./infra/persistence/postgres/postgresClient";
import {
  disconnectMongo,
  getMongoDatabase,
} from "./infra/persistence/mongodb/mongoClient";
import {
  disconnectKafka,
  getKafkaProducer,
} from "./infra/messaging/kafkaClient";

async function bootstrap(): Promise<void> {
  if (env.app.runtimeMode !== "memory") {
    await connectPostgres();
    await connectRedis();
    await getMongoDatabase();

    if (env.kafka.enabled) {
      try {
        await getKafkaProducer();
      } catch (error) {
        console.error("Kafka connection failed during bootstrap:", error);

        if (env.app.nodeEnv === "production") {
          throw error;
        }
      }
    }
  }

  const app = express();

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.status(200).json({
      status: "ok",
      service: "authentication-service",
      environment: env.app.nodeEnv,
      runtimeMode: env.app.runtimeMode,
      kafkaEnabled: env.kafka.enabled,
    });
  });

  app.use("/auth", authRoutes);
  app.use(errorHandler);

  const server = app.listen(env.app.port, () => {
    console.log(
      `Authentication Service running on port ${env.app.port} in ${env.app.runtimeMode} mode`,
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}. Shutting down gracefully...`);

    server.close(async () => {
      try {
        if (env.app.runtimeMode !== "memory") {
          await disconnectKafka();
          await disconnectMongo();
          await disconnectRedis();
          await disconnectPostgres();
        }

        console.log("Shutdown completed successfully");
        process.exit(0);
      } catch (error) {
        console.error("Shutdown error:", error);
        process.exit(1);
      }
    });
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap application:", error);
  process.exit(1);
});
