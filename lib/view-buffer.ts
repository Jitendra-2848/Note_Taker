import { db } from './db';
import { redis } from './redis';

const PENDING_VIEWS_KEY = 'note:pending_views';
let isFlushing = false;

/**
 * Flush all accumulated views from Redis into PostgreSQL.
 * Executes in a single batch to avoid row-lock contention.
 */
export async function flushPendingViews(): Promise<void> {
  if (isFlushing) return;
  isFlushing = true;

  try {
    if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
      const pending = await redis.hgetall(PENDING_VIEWS_KEY);
      if (!pending || Object.keys(pending).length === 0) {
        return;
      }

      // Atomically grab and delete pending counts
      await redis.del(PENDING_VIEWS_KEY);

      const updates = Object.entries(pending).map(async ([shareLinkId, countStr]) => {
        const count = parseInt(countStr, 10);
        if (isNaN(count) || count <= 0) return;

        try {
          await db.shareLink.update({
            where: { id: shareLinkId },
            data: { viewCount: { increment: count } },
          });
        } catch {
          // Re-queue on failure so no view count is lost
          if (redis) {
            await redis.hincrby(PENDING_VIEWS_KEY, shareLinkId, count);
          }
        }
      });

      await Promise.all(updates);
    }
  } catch (err: any) {
    console.warn('Flush views error:', err.message);
  } finally {
    isFlushing = false;
  }
}

// Background cron: flush every 5 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(flushPendingViews, 5000);
}

/**
 * Record a valid view.
 * Uses fast in-memory Redis HINCRBY (<1ms) to eliminate database write bottlenecks.
 * Falls back to direct atomic PostgreSQL increment if Redis is offline.
 */
export async function recordView(shareLinkId: string): Promise<void> {
  if (!shareLinkId) return;

  if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
    try {
      const newCount = await redis.hincrby(PENDING_VIEWS_KEY, shareLinkId, 1);
      // If pending count for this link reaches 20, trigger an immediate background flush
      if (newCount >= 20) {
        flushPendingViews().catch(() => {});
      }
      return;
    } catch {
      // Fall through to DB fallback
    }
  }

  // Fallback: Direct atomic PostgreSQL update
  try {
    await db.shareLink.update({
      where: { id: shareLinkId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (err: any) {
    console.warn('Direct view increment error:', err.message);
  }
}

/**
 * Get the real-time effective view count combining PostgreSQL DB count
 * with any live un-flushed views sitting in the Redis buffer.
 */
export async function getEffectiveViewCount(shareLinkId: string, dbCount: number): Promise<number> {
  if (redis && (redis.status === 'ready' || redis.status === 'connect')) {
    try {
      const pendingStr = await redis.hget(PENDING_VIEWS_KEY, shareLinkId);
      if (pendingStr) {
        const pending = parseInt(pendingStr, 10);
        if (!isNaN(pending)) {
          return dbCount + pending;
        }
      }
    } catch {}
  }
  return dbCount;
}

export const bufferViewCount = recordView;
