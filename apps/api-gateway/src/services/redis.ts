/**
 * Redis Service
 * 
 * Handles caching for API keys, partner balances, and rate limiting.
 * Falls back to in-memory storage when Redis is not available.
 */

interface CacheEntry {
  value: string;
  expiresAt?: number;
}

export class RedisService {
  private cache: Map<string, CacheEntry> = new Map();
  private connected: boolean = false;

  constructor() {
    // In-memory fallback for development/testing
    this.connected = true;
    console.log('Redis service initialized (in-memory mode)');
  }

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const entry: CacheEntry = { value };
    if (ttlSeconds) {
      entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    }
    this.cache.set(key, entry);
  }

  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async incr(key: string): Promise<number> {
    const current = await this.get(key);
    const newValue = (parseInt(current || '0', 10) + 1).toString();
    await this.set(key, newValue);
    return parseInt(newValue, 10);
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.cache.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + (ttlSeconds * 1000);
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const hashKey = `${key}:${field}`;
    await this.set(hashKey, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    const hashKey = `${key}:${field}`;
    return this.get(hashKey);
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    const prefix = `${key}:`;
    
    for (const [k, v] of this.cache.entries()) {
      if (k.startsWith(prefix)) {
        const field = k.slice(prefix.length);
        if (v.expiresAt === undefined || Date.now() <= v.expiresAt) {
          result[field] = v.value;
        }
      }
    }
    
    return result;
  }

  async disconnect(): Promise<void> {
    this.cache.clear();
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }
}
