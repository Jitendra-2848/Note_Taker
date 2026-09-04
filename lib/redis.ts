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

// In-memory fallback stores when Redis is unreachable
const memoryBlockedIps = new Map<string, number>(); // ip -> expiresAt timestamp
const memoryFailedAttempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Check if a client IP is currently blocked in Redis
 */
export async function isIpBlocked(ip: string): Promise<{ blocked: boolean; remainingTtl: number }> {
  const blockKey = `block:ip:${ip}`;

  if (isRedisActive() && redis) {
    try {
      const ttl = await redis.ttl(blockKey);
      if (ttl > 0) {
        return { blocked: true, remainingTtl: ttl };
      }
      return { blocked: false, remainingTtl: 0 };
    } catch {
      // Fallback to in-memory store
    }
  }

  const expiresAt = memoryBlockedIps.get(ip);
  if (expiresAt) {
    const now = Date.now();
    if (expiresAt > now) {
      return { blocked: true, remainingTtl: Math.ceil((expiresAt - now) / 1000) };
    }
    memoryBlockedIps.delete(ip);
  }

  return { blocked: false, remainingTtl: 0 };
}

/**
 * Record a failed password attempt for a given IP in Redis.
 * If failed attempts reach maxAttempts (default 5), blocks the IP for blockDurationSeconds (default 15 min / 900s).
 */
export async function recordFailedPasswordAttempt(
  ip: string,
  maxAttempts: number = 5,
  blockDurationSeconds: number = 900
): Promise<{ blocked: boolean; attempts: number; remainingAttempts: number; blockDurationSeconds: number }> {
  const blockKey = `block:ip:${ip}`;
  const attemptsKey = `failed_attempts:ip:${ip}`;

  // 1. Try Redis
  if (isRedisActive() && redis) {
    try {
      const currentTtl = await redis.ttl(blockKey);
      if (currentTtl > 0) {
        return {
          blocked: true,
          attempts: maxAttempts,
          remainingAttempts: 0,
          blockDurationSeconds: currentTtl,
        };
      }

      const count = await redis.incr(attemptsKey);
      if (count === 1) {
        await redis.expire(attemptsKey, blockDurationSeconds);
      }

      if (count >= maxAttempts) {
        // Block the IP in Redis
        await redis.set(blockKey, '1', 'EX', blockDurationSeconds);
        return {
          blocked: true,
          attempts: count,
          remainingAttempts: 0,
          blockDurationSeconds,
        };
      }

      return {
        blocked: false,
        attempts: count,
        remainingAttempts: Math.max(0, maxAttempts - count),
        blockDurationSeconds,
      };
    } catch {
      // Fall through to in-memory fallback
    }
  }

  // 2. In-Memory Fallback
  const now = Date.now();
  const expiresAt = memoryBlockedIps.get(ip);
  if (expiresAt && expiresAt > now) {
    return {
      blocked: true,
      attempts: maxAttempts,
      remainingAttempts: 0,
      blockDurationSeconds: Math.ceil((expiresAt - now) / 1000),
    };
  }

  const record = memoryFailedAttempts.get(ip);
  if (!record || now > record.resetAt) {
    memoryFailedAttempts.set(ip, {
      count: 1,
      resetAt: now + blockDurationSeconds * 1000,
    });
    return {
      blocked: false,
      attempts: 1,
      remainingAttempts: maxAttempts - 1,
      blockDurationSeconds,
    };
  }

  record.count += 1;
  if (record.count >= maxAttempts) {
    memoryBlockedIps.set(ip, now + blockDurationSeconds * 1000);
    memoryFailedAttempts.delete(ip);
    return {
      blocked: true,
      attempts: record.count,
      remainingAttempts: 0,
      blockDurationSeconds,
    };
  }

  return {
    blocked: false,
    attempts: record.count,
    remainingAttempts: Math.max(0, maxAttempts - record.count),
    blockDurationSeconds,
  };
}

/**
 * Clear failed password attempts for an IP (e.g. after successful password unlock)
 */
export async function clearFailedPasswordAttempts(ip: string): Promise<void> {
  const attemptsKey = `failed_attempts:ip:${ip}`;
  if (isRedisActive() && redis) {
    try {
      await redis.del(attemptsKey);
    } catch {}
  }
  memoryFailedAttempts.delete(ip);
}

/**
 * Unblock an IP manually
 */
export async function unblockIp(ip: string): Promise<void> {
  const blockKey = `block:ip:${ip}`;
  const attemptsKey = `failed_attempts:ip:${ip}`;
  if (isRedisActive() && redis) {
    try {
      await redis.del(blockKey);
      await redis.del(attemptsKey);
    } catch {}
  }
  memoryBlockedIps.delete(ip);
  memoryFailedAttempts.delete(ip);
}

