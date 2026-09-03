import { redis } from './redis';

export type RateLimitTier = 'AUTH' | 'MUTATION' | 'READ' | 'UNLOCK';

interface TierConfig {
  max: number;
  windowSeconds: number;
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  AUTH: { max: 10, windowSeconds: 60 },       // 10 attempts / min for login & register
  MUTATION: { max: 30, windowSeconds: 60 },   // 30 note creations / min
  READ: { max: 200, windowSeconds: 60 },      // 200 reads / min per client
  UNLOCK: { max: 5, windowSeconds: 900 },     // 5 password attempts / 15 min
};

// In-memory sliding window fallback
const localStore = new Map<string, { count: number; resetAt: number }>();

export async function rateLimit(
  key: string,
  tier: RateLimitTier
): Promise<{ allowed: boolean; remaining: number; resetInSeconds: number }> {
  const config = TIER_CONFIGS[tier];
  const redisKey = `ratelimit:${tier}:${key}`;

  // 1. Try Redis first
  if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
    try {
      const count = await redis.incr(redisKey);
      if (count === 1) {
        await redis.expire(redisKey, config.windowSeconds);
      }
      const ttl = await redis.ttl(redisKey);
      const remaining = Math.max(0, config.max - count);
      return {
        allowed: count <= config.max,
        remaining,
        resetInSeconds: ttl > 0 ? ttl : config.windowSeconds,
      };
    } catch {
      // Non-blocking fallback to localStore
    }
  }

  // 2. In-Memory Fallback
  const now = Date.now();
  const entry = localStore.get(redisKey);

  if (!entry || now > entry.resetAt) {
    localStore.set(redisKey, {
      count: 1,
      resetAt: now + config.windowSeconds * 1000,
    });
    return {
      allowed: true,
      remaining: config.max - 1,
      resetInSeconds: config.windowSeconds,
    };
  }

  entry.count += 1;
  const remaining = Math.max(0, config.max - entry.count);
  const resetInSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));

  return {
    allowed: entry.count <= config.max,
    remaining,
    resetInSeconds,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.headers.get('x-real-ip') || '127.0.0.1';
}
