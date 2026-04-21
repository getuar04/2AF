export interface CacheSetOptions {
  ttlSeconds: number;
}

export interface CacheProvider {
  set(key: string, value: string, options: CacheSetOptions): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}
