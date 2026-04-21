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

export const env = {
  app: {
    nodeEnv: getEnv("NODE_ENV", "development"),
    port: getNumberEnv("PORT", 5000),
    internalApiKey: getEnv("INTERNAL_API_KEY", "local-internal-key"),
    runtimeMode: getEnv("APP_RUNTIME_MODE", "memory"),
  },
  jwt: {
    secret: getEnv("JWT_SECRET", "supersecret"),
    expiresIn: getEnv("JWT_EXPIRES_IN", "1h"),
  },
  redis: {
    url: getEnv("REDIS_URL", "redis://localhost:6379"),
  },
  security: {
    twoFaExpiresSeconds: Number(process.env.TWO_FA_EXPIRES_SECONDS ?? 300),
  },
  kafka: {
    enabled: getOptionalEnv("KAFKA_ENABLED", "false") === "true",
    brokers: getEnv("KAFKA_BROKERS", "localhost:9092")
      .split(",")
      .map((broker) => broker.trim())
      .filter(Boolean),
    clientId: getEnv("KAFKA_CLIENT_ID", "authentication-service"),
    authTopic: getEnv("KAFKA_AUTH_TOPIC", "auth.events"),
  },
  postgres: {
    url: getEnv(
      "POSTGRES_URL",
      "postgresql://postgres:postgres@localhost:5432/2af",
    ),
  },
  mongodb: {
    url: getEnv("MONGODB_URL", "mongodb://localhost:27017"),
    dbName: getEnv("MONGODB_DB_NAME", "authentication_service"),
    auditCollection: getEnv("MONGODB_AUDIT_COLLECTION", "auth_audit_logs"),
  },
};
