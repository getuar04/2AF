import { CacheProvider, CacheSetOptions } from "../../app/ports/cacheProvider";
import { getRedisClient } from "./redisClient";

export class RedisCacheProvider implements CacheProvider {
  async set(key: string, value: string, options: CacheSetOptions): Promise<void> {
    const client = getRedisClient();
    await client.set(key, value, { EX: options.ttlSeconds });
  }

  async get(key: string): Promise<string | null> {
    return getRedisClient().get(key);
  }

  async delete(key: string): Promise<void> {
    await getRedisClient().del(key);
  }
}
