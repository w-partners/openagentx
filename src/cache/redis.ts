import IORedis from 'ioredis';
const Redis = IORedis.default ?? IORedis;
import { config } from '../config/env.js';

const redis = new Redis({
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  db: config.REDIS_DB,
  retryStrategy(times: number) {
    const delay = Math.min(times * 500, 5_000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redis.on('error', (err: Error) => {
  console.error('Redis error:', err.message);
});

/** Connect (call once at startup) */
export async function connectRedis(): Promise<void> {
  await redis.connect();
}

/** Get parsed JSON value */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** Set JSON value with TTL in seconds */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

/** Delete a key */
export async function cacheDel(key: string): Promise<void> {
  await redis.del(key);
}

/** Delete all keys matching a pattern (use sparingly) */
export async function cacheDelPattern(pattern: string): Promise<number> {
  const keys = await redis.keys(pattern);
  if (keys.length === 0) return 0;
  return redis.del(...keys);
}

/**
 * Get-or-fetch: check cache first, call fetcher on miss, store result.
 * Central cache pattern — use this instead of manual get/set.
 */
export async function getOrFetch<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/** Health check */
export async function checkRedis(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/** Graceful shutdown */
export async function closeRedis(): Promise<void> {
  await redis.quit();
}
