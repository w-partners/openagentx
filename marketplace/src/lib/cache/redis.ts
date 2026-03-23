import Redis from 'ioredis';
import { config } from '../config/env';

// Phase 2 uses Redis DB 1 (Phase 1 uses DB 0)
const REDIS_DB = 1;

// Prevent hot-reload connection leaks in Next.js dev mode
const globalForRedis = globalThis as unknown as {
  __redis: Redis | undefined;
};

function createRedis(): Redis {
  if (globalForRedis.__redis) {
    return globalForRedis.__redis;
  }

  const instance = new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    db: REDIS_DB,
    retryStrategy(times: number) {
      return Math.min(times * 500, 5_000);
    },
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  instance.on('error', (err: Error) => {
    console.error('Redis error:', err.message);
  });

  globalForRedis.__redis = instance;

  return instance;
}

const redis = createRedis();

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

/** Atomic rate-limit check using INCR + EXPIRE */
export async function rateLimitIncr(key: string, windowSec: number, max: number): Promise<boolean> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSec);
  }
  return current <= max;
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
