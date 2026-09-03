import { Hono } from 'hono';
import { db } from './db';
import { verifyPassword } from './security';
import { 
  acquireRedisLock, 
  getCachedNote, 
  setCachedNote, 
  invalidateCachedNote, 
} from './redis';
import { memoryCache } from './memory-cache';
import { rateLimit } from './rate-limiter';
import { bufferViewCount } from './view-buffer';

export const shareApp = new Hono();

function getClientMeta(c: any) {
  const forwarded = c.req.header('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : c.req.header('x-real-ip') || '127.0.0.1';
  const userAgent = c.req.header('user-agent') || 'Unknown Browser';
  return { ipAddress, userAgent };
}

async function recordAccessLog(shareLinkId: string, ipAddress: string, userAgent: string, status: string) {
  try {
    if ((db as any).accessLog?.create) {
      await (db as any).accessLog.create({
        data: {
          shareLinkId,
          ipAddress,
          userAgent,
          status,
        },
      });
    }
  } catch {}
}

// GET /share/:token - Inspect note metadata or serve public time-based notes (1M scale optimized)
shareApp.get('/share/:token', async (c) => {
  const token = c.req.param('token');
  const { ipAddress, userAgent } = getClientMeta(c);

  // 1. READ Rate Limiting: 200 requests/minute per client IP
  const rate = await rateLimit(ipAddress, 'READ');
  if (!rate.allowed) {
    return c.json(
      {
        success: false,
        error: `High traffic detected. Please slow down. Retry in ${rate.resetInSeconds}s.`,
        code: 'RATE_LIMITED',
      },
      429
    );
  }

  try {
    // ⚡ Tier 1: In-Process Node.js V8 Heap Memory Cache (Latency: ~0.01ms)
    // Absorbs 10,000+ RPS instantly on the local process without touching Redis or PostgreSQL
    const inMemoryData = memoryCache.get(token);
    if (inMemoryData) {
      c.header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
      c.header('X-Cache-Tier', 'L1-NODE-MEMORY');
      return c.json({
        success: true,
        data: inMemoryData,
        cached: true,
      });
    }

    // ⚡ Tier 2: Redis In-Memory Distributed Cache (Latency: ~1ms)
    const redisCached = await getCachedNote(token);
    if (redisCached) {
      try {
        const parsed = JSON.parse(redisCached);
        memoryCache.set(token, parsed, 5); // Hydrate local L1 cache
        c.header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
        c.header('X-Cache-Tier', 'L2-REDIS');
        return c.json({
          success: true,
          data: parsed,
          cached: true,
        });
      } catch {}
    }

    // 🗄️ Tier 3: Database Lookup (Fallback when cache expires)
    const link = await db.shareLink.findUnique({
      where: { token },
      include: {
        note: {
          select: {
            title: true,
            content: true,
          },
        },
      },
    });

    if (!link) {
      return c.json(
        { success: false, error: 'This share link has been revoked or does not exist.', code: 'NOT_FOUND' },
        404
      );
    }

    if (link.isRevoked) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'REVOKED');
      return c.json(
        { success: false, error: 'This share link has been revoked by the author.', code: 'REVOKED' },
        410
      );
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'EXPIRED');
      return c.json(
        { success: false, error: `This share link expired on ${new Date(link.expiresAt).toLocaleString()}.`, code: 'EXPIRED' },
        410
      );
    }

    if (link.shareType === 'ONE_TIME' && link.isUsed) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'ALREADY_USED');
      return c.json(
        {
          success: false,
          error: 'This one-time note has already been opened by another recipient on a first-come, first-served basis and is no longer available.',
          code: 'ALREADY_USED',
        },
        410
      );
    }

    if (link.shareType === 'TIME_BASED' && link.accessType === 'PUBLIC') {
      await bufferViewCount(link.id);
      await recordAccessLog(link.id, ipAddress, userAgent, 'SUCCESS');

      const responseData = {
        token: link.token,
        title: link.note.title,
        content: link.note.content,
        accessType: link.accessType,
        shareType: link.shareType,
        expiresAt: link.expiresAt,
        requiresPassword: false,
        requiresExplicitRead: false,
      };

      // Populate L1 (Node RAM) & L2 (Redis RAM)
      memoryCache.set(token, responseData, 5);
      await setCachedNote(token, JSON.stringify(responseData), 300);

      c.header('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
      c.header('X-Cache-Tier', 'DB-RESOLVED');

      return c.json({
        success: true,
        data: responseData,
      });
    }

    // One-Time or Password-Protected metadata
    const metadata = {
      token: link.token,
      title: link.note.title,
      accessType: link.accessType,
      shareType: link.shareType,
      expiresAt: link.expiresAt,
      requiresPassword: link.accessType === 'PROTECTED',
      requiresExplicitRead: link.shareType === 'ONE_TIME',
    };

    return c.json({
      success: true,
      data: metadata,
    });
  } catch (error) {
    console.error('Hono GET /share/:token error:', error);
    return c.json({ success: false, error: 'Internal server error processing share link' }, 500);
  }
});

// POST /share/:token - Atomic First-Come First-Served Unlock or Explicit Read
shareApp.post('/share/:token', async (c) => {
  const token = c.req.param('token');
  const { ipAddress, userAgent } = getClientMeta(c);

  try {
    let body: any = {};
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }
    const { password } = body;

    // UNLOCK Rate Limit: Max 5 attempts per 15 minutes per token/IP
    const rate = await rateLimit(`${token}:${ipAddress}`, 'UNLOCK');
    if (!rate.allowed) {
      return c.json(
        {
          success: false,
          error: `Too many incorrect attempts. Link access is paused for security. Retry in ${Math.ceil(rate.resetInSeconds / 60)} minutes.`,
          code: 'RATE_LIMITED',
        },
        429
      );
    }

    const link = await db.shareLink.findUnique({
      where: { token },
      include: {
        note: {
          select: {
            title: true,
            content: true,
          },
        },
      },
    });

    if (!link) {
      return c.json(
        { success: false, error: 'This share link has been revoked or does not exist.', code: 'NOT_FOUND' },
        404
      );
    }

    if (link.isRevoked) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'REVOKED');
      return c.json(
        { success: false, error: 'This share link has been revoked by the author.', code: 'REVOKED' },
        410
      );
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'EXPIRED');
      return c.json(
        { success: false, error: `This share link expired on ${new Date(link.expiresAt).toLocaleString()}.`, code: 'EXPIRED' },
        410
      );
    }

    if (link.shareType === 'ONE_TIME' && link.isUsed) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'ALREADY_USED');
      return c.json(
        {
          success: false,
          error: 'This one-time note has already been opened by another recipient on a first-come, first-served basis and is no longer accessible.',
          code: 'ALREADY_USED',
        },
        410
      );
    }

    if (link.accessType === 'PROTECTED') {
      if (!password) {
        return c.json({ success: false, error: 'Access key is required to unlock this note' }, 400);
      }

      if (!link.passwordHash) {
        return c.json({ success: false, error: 'Link is not password protected' }, 400);
      }

      const isValid = await verifyPassword(password, link.passwordHash);
      if (!isValid) {
        await recordAccessLog(link.id, ipAddress, userAgent, 'WRONG_PASSWORD');
        return c.json(
          {
            success: false,
            error: 'The access key entered is incorrect. View counts remain unchanged.',
            code: 'WRONG_PASSWORD',
          },
          401
        );
      }
    }

    // Atomic One-Time Execution
    if (link.shareType === 'ONE_TIME') {
      // 1. In-memory distributed lock
      const redisLock = await acquireRedisLock(token, 60);
      if (redisLock === false) {
        await recordAccessLog(link.id, ipAddress, userAgent, 'RACE_BLOCKED');
        return c.json(
          {
            success: false,
            error: 'This one-time note was just claimed by another user on a first-come, first-served basis. Access is now closed.',
            code: 'RACE_CONDITION_BLOCKED',
          },
          410
        );
      }

      // 2. Atomic Row-Level Update in PostgreSQL
      const updated = await db.$executeRaw`
        UPDATE "ShareLink"
        SET "isUsed" = true, "viewCount" = "viewCount" + 1, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "token" = ${token} AND "isUsed" = false AND "isRevoked" = false
      `;

      if (updated === 0) {
        await recordAccessLog(link.id, ipAddress, userAgent, 'RACE_BLOCKED');
        return c.json(
          {
            success: false,
            error: 'This one-time note was just claimed by another simultaneous user on a first-come, first-served basis. Access is now closed.',
            code: 'RACE_CONDITION_BLOCKED',
          },
          410
        );
      }
    } else {
      await bufferViewCount(link.id);
    }

    // Invalidate caches
    memoryCache.del(token);
    await invalidateCachedNote(token);
    await recordAccessLog(link.id, ipAddress, userAgent, 'SUCCESS');

    return c.json({
      success: true,
      data: {
        token: link.token,
        title: link.note.title,
        content: link.note.content,
        accessType: link.accessType,
        shareType: link.shareType,
        expiresAt: link.expiresAt,
        requiresPassword: false,
      },
      message: 'Note unlocked successfully',
    });
  } catch (error) {
    console.error('Hono POST /share/:token error:', error);
    return c.json({ success: false, error: 'Internal server error verifying key' }, 500);
  }
});
