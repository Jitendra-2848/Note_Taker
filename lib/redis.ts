import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redisClient: Redis | null | undefined;
};

function createRedisClient(): Redis | null {
  const REDIS_URL = process.env.REDIS_URL;

  if (!REDIS_URL || REDIS_URL.trim() === '') {
    return null;
  }

  try {
    const client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) {
          return null;
        }
        return Math.min(times * 200, 1000);
      },
    });

    client.on('error', () => {});

    return client;
  } catch {
    return null;
  }
}

export const redis = globalForRedis.redisClient !== undefined 
  ? globalForRedis.redisClient 
  : createRedisClient();

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

export function isRedisActive(): boolean {
  return redis !== null && (redis.status === 'ready' || redis.status === 'connect');
}

export async function acquireRedisLock(key: string, ttlSeconds: number = 60): Promise<boolean | null> {
  if (!redis) return null;
  try {
    const result = await redis.set(`lock:${key}`, '1', 'EX', ttlSeconds, 'NX');
    return result === 'OK';
  } catch {
    return null;
  }
}

export async function checkRedisRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowSeconds: number = 900
): Promise<{ allowed: boolean; count: number } | null> {
  if (!redis) return null;
  try {
    const redisKey = `ratelimit:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSeconds);
    }
    return {
      allowed: count <= maxAttempts,
      count,
    };
  } catch {
    return null;
  }
}

export async function getCachedNote(token: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(`note:${token}`);
  } catch {
    return null;
  }
}

export async function setCachedNote(token: string, content: string, ttlSeconds: number = 300): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(`note:${token}`, content, 'EX', ttlSeconds);
  } catch {}
}

export async function invalidateCachedNote(token: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(`note:${token}`);
    await redis.del(`lock:${token}`);
  } catch {}
}
