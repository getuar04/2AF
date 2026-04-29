import { env } from "../config/env";

async function checkPostgres(): Promise<"ok" | "error"> {
  if (env.app.runtimeMode === "memory") return "ok";
  try {
    const { getPostgresPool } =
      await import("../persistence/postgres/postgresClient");
    await getPostgresPool().query("SELECT 1");
    return "ok";
  } catch {
    return "error";
  }
}

async function checkRedis(): Promise<"ok" | "error"> {
  if (env.app.runtimeMode === "memory") return "ok";
  try {
    const { getRedisClient } = await import("../cache/redisClient");
    await getRedisClient().ping();
    return "ok";
  } catch {
    return "error";
  }
}

async function checkMongo(): Promise<"ok" | "error"> {
  if (env.app.runtimeMode === "memory") return "ok";
  try {
    const { getMongoDatabase } =
      await import("../persistence/mongodb/mongoClient");
    await (await getMongoDatabase()).command({ ping: 1 });
    return "ok";
  } catch {
    return "error";
  }
}

export async function getHealthStatus() {
  const [postgres, redis, mongodb] = await Promise.all([
    checkPostgres(),
    checkRedis(),
    checkMongo(),
  ]);

  const allOk = postgres === "ok" && redis === "ok" && mongodb === "ok";

  return {
    status: allOk ? "ok" : "degraded",
    service: "authentication-service",
    environment: env.app.nodeEnv,
    runtimeMode: env.app.runtimeMode,
    kafkaEnabled: env.kafka.enabled,
    services: { postgres, redis, mongodb },
  };
}
