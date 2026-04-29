import { env } from "./infra/config/env";
import { createApp } from "./app";
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
import {
  startKafkaConsumer,
  disconnectKafkaConsumer,
} from "./infra/messaging/kafkaConsumer";
import { registerAuthEventHandlers } from "./infra/messaging/authEventHandlers";
import { logger } from "./infra/logger/logger";

async function bootstrap(): Promise<void> {
  if (env.app.runtimeMode !== "memory") {
    await connectPostgres();
    await connectRedis();
    await getMongoDatabase();

    if (env.kafka.enabled) {
      try {
        await getKafkaProducer();
        registerAuthEventHandlers();
        await startKafkaConsumer(`${env.kafka.clientId}-group`);
      } catch (error) {
        logger.error(
          { err: error },
          "Kafka connection failed during bootstrap",
        );
        if (env.app.nodeEnv === "production") {
          throw error;
        }
      }
    }
  }

  const app = createApp();

  const server = app.listen(env.app.port, () => {
    logger.info(
      {
        port: env.app.port,
        mode: env.app.runtimeMode,
        env: env.app.nodeEnv,
      },
      "Authentication service started",
    );
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down gracefully...");
    server.close(async () => {
      try {
        if (env.app.runtimeMode !== "memory") {
          await disconnectKafkaConsumer();
          await disconnectKafka();
          await disconnectMongo();
          await disconnectRedis();
          await disconnectPostgres();
        }
        logger.info("Shutdown completed successfully");
        process.exit(0);
      } catch (error) {
        logger.error({ err: error }, "Shutdown error");
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
  logger.error({ err: error }, "Failed to bootstrap application");
  process.exit(1);
});
