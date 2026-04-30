import dotenv from "dotenv";

dotenv.config();

function getEnv(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function getNumberEnv(name: string, fallback?: number): number {
  const rawValue =
    process.env[name] ??
    (fallback !== undefined ? String(fallback) : undefined);
  if (rawValue === undefined || rawValue === "") {
    throw new Error(`Missing required numeric environment variable: ${name}`);
  }
  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }
  return parsed;
}

// Postgres URL: mbështet POSTGRES_URL ose DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME
function getPostgresUrl(): string {
  if (process.env.POSTGRES_URL) return process.env.POSTGRES_URL;
  const host = process.env.DB_HOST ?? "localhost";
  const port = process.env.DB_PORT ?? "5432";
  const user = process.env.DB_USER ?? "postgres";
  const pass = process.env.DB_PASSWORD ?? "postgres";
  const name = process.env.DB_NAME ?? "2af";
  return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

// MongoDB URL: mbështet MONGODB_URL ose MONGO_URI
function getMongoUrl(): string {
  return (
    process.env.MONGODB_URL ??
    process.env.MONGO_URI ??
    "mongodb://localhost:27017"
  );
}

// Kafka brokers: mbështet KAFKA_BROKERS ose KAFKA_BROKER
function getKafkaBrokers(): string[] {
  const raw =
    process.env.KAFKA_BROKERS ?? process.env.KAFKA_BROKER ?? "localhost:9092";
  return raw
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
}

export const env = {
  app: {
    nodeEnv: getEnv("NODE_ENV", "development"),
    port: getNumberEnv("PORT", 5000),
    internalApiKey: getEnv("INTERNAL_API_KEY"), // SEC-02: pa fallback
    runtimeMode: getEnv("APP_RUNTIME_MODE", "memory"),
    adminEmails: getOptionalEnv("ADMIN_EMAILS", "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  },
  jwt: {
    accessSecret: getEnv("JWT_ACCESS_SECRET"), // SEC-01: pa fallback
    accessExpiresIn: getEnv(
      "JWT_ACCESS_EXPIRES_IN",
      getOptionalEnv("JWT_EXPIRES_IN", "15m"),
    ),
    refreshSecret: getEnv("JWT_REFRESH_SECRET"), // SEC-01: pa fallback
    refreshExpiresIn: getEnv("JWT_REFRESH_EXPIRES_IN", "7d"),
  },
  redis: {
    url: getEnv("REDIS_URL", "redis://localhost:6379"),
  },
  security: {
    twoFaExpiresSeconds: Number(process.env.TWO_FA_EXPIRES_SECONDS ?? 300),
  },
  kafka: {
    enabled: getOptionalEnv("KAFKA_ENABLED", "false") === "true",
    brokers: getKafkaBrokers(),
    clientId: getEnv("KAFKA_CLIENT_ID", "authentication-service"),
    authTopic: getEnv(
      "KAFKA_AUTH_TOPIC",
      getOptionalEnv("KAFKA_TOPIC_AUTH", "auth.events"),
    ),
  },
  postgres: {
    url: getPostgresUrl(),
  },
  mongodb: {
    url: getMongoUrl(),
    dbName: getEnv(
      "MONGODB_DB_NAME",
      getOptionalEnv("MONGO_DB_NAME", "authentication_service"),
    ),
    auditCollection: getEnv(
      "MONGODB_AUDIT_COLLECTION",
      getOptionalEnv("MONGO_AUDIT_COLLECTION", "auth_audit_logs"),
    ),
  },
};
