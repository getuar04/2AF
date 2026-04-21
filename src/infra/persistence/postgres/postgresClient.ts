import { Pool } from "pg";
import { env } from "../../config/env";

let pool: Pool | null = null;

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: env.postgres.url,
    });

    pool.on("error", (error) => {
      console.error("PostgreSQL Pool Error:", error);
    });
  }

  return pool;
}

export async function connectPostgres(): Promise<void> {
  const postgresPool = getPostgresPool();
  const client = await postgresPool.connect();

  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
}

export async function disconnectPostgres(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
