import { env } from "./infra/config/env";
import { createApp } from "./app";
import { connectRedis, disconnectRedis } from "./infra/cache/redisClient";
import { connectPostgres, disconnectPostgres } from "./infra/persistence/postgres/postgresClient";
import { disconnectMongo, getMongoDatabase } from "./infra/persistence/mongodb/mongoClient";
import { disconnectKafka, getKafkaProducer } from "./infra/messaging/kafkaClient";
import { startKafkaConsumer, disconnectKafkaConsumer } from "./infra/messaging/kafkaConsumer";
import { registerAuthEventHandlers } from "./infra/messaging/authEventHandlers";

async function bootstrap(): Promise<void> {
  if (env.app.runtimeMode !== "memory") {
    await connectPostgres();
    await connectRedis();
    await getMongoDatabase();

    if (env.kafka.enabled) {
      try {
        await getKafkaProducer();
        // Consumer — dëgjo eventet e auth
        registerAuthEventHandlers();
        await startKafkaConsumer(`${env.kafka.clientId}-group`);
      } catch (error) {
        console.error("Kafka connection failed during bootstrap:", error);
        if (env.app.nodeEnv === "production") {
          throw error;
        }
      }
    }
  }

  // createApp() nga app.ts — ka cookieParser, json limit, të gjitha middleware
  const app = createApp();

  const server = app.listen(env.app.port, () => {
    console.log(`Authentication Service running on port ${env.app.port} in ${env.app.runtimeMode} mode`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      try {
        if (env.app.runtimeMode !== "memory") {
          await disconnectKafkaConsumer();
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

  process.on("SIGINT", () => { void shutdown("SIGINT"); });
  process.on("SIGTERM", () => { void shutdown("SIGTERM"); });
}

bootstrap().catch((error) => {
  console.error("Failed to bootstrap application:", error);
  process.exit(1);
});
