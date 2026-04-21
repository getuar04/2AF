import { CacheProvider, CacheSetOptions } from "../../app/ports/cacheProvider";

interface CacheEntry { value: string; expiresAt: number; }

export class MemoryCacheProvider implements CacheProvider {
  private readonly store = new Map<string, CacheEntry>();

  async set(key: string, value: string, options: CacheSetOptions): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + options.ttlSeconds * 1000 });
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}
