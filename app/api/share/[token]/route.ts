import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/security';
import { 
  acquireRedisLock, 
  getCachedNote, 
  setCachedNote, 
  invalidateCachedNote, 
} from '@/lib/redis';
import { memoryCache } from '@/lib/memory-cache';
import { rateLimit } from '@/lib/rate-limiter';
import { bufferViewCount, recordView } from '@/lib/view-buffer';

export const dynamic = 'force-dynamic';

function getClientMeta(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for');
  const ipAddress = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Unknown Browser';
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

/**
 * GET /api/share/[token]
 * High-throughput public resolution endpoint with 3-tier caching (L1 Node -> L2 Redis -> L3 DB)
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { ipAddress, userAgent } = getClientMeta(req);

  // Rate Limiting: 200 reads per minute per IP
  const { allowed } = await rateLimit(ipAddress, 'READ');
  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'High traffic detected. Please wait a few seconds before trying again.',
        code: 'RATE_LIMITED',
      },
      { status: 429 }
    );
  }

  try {
    // ⚡ Tier 1: In-Process Node.js V8 Heap Memory Cache (Latency: ~0.01ms)
    const inMemoryData = memoryCache.get(token);
    if (inMemoryData) {
      const memData = inMemoryData as any;
      if (memData.shareLinkId) {
        recordView(memData.shareLinkId).catch(() => {});
        recordAccessLog(memData.shareLinkId, ipAddress, userAgent, 'SUCCESS').catch(() => {});
      }

      const res = NextResponse.json({
        success: true,
        data: inMemoryData,
        cached: true,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
      res.headers.set('X-Cache-Tier', 'L1-NODE-MEMORY');
      return res;
    }

    // ⚡ Tier 2: Redis In-Memory Distributed Cache (Latency: ~1ms)
    const redisCached = await getCachedNote(token);
    if (redisCached) {
      try {
        const parsed = JSON.parse(redisCached);
        if (parsed.shareLinkId) {
          recordView(parsed.shareLinkId).catch(() => {});
          recordAccessLog(parsed.shareLinkId, ipAddress, userAgent, 'SUCCESS').catch(() => {});
        }
        memoryCache.set(token, parsed, 5); // Hydrate local L1 cache

        const res = NextResponse.json({
          success: true,
          data: parsed,
          cached: true,
        });
        res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
        res.headers.set('X-Cache-Tier', 'L2-REDIS');
        return res;
      } catch {}
    }

    // 🗄️ Tier 3: Database Lookup (Fallback when cache misses)
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
      return NextResponse.json(
        { success: false, error: 'This share link has been revoked or does not exist.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (link.isRevoked) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'REVOKED');
      return NextResponse.json(
        { success: false, error: 'This share link has been revoked by the author.', code: 'REVOKED' },
        { status: 410 }
      );
    }

    if (link.shareType === 'ONE_TIME' && link.isUsed) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'ALREADY_USED');
      return NextResponse.json(
        {
          success: false,
          error: 'This note was a one-time link and has already been consumed.',
          code: 'ALREADY_USED',
        },
        { status: 410 }
      );
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'EXPIRED');
      return NextResponse.json(
        { success: false, error: 'This share link has expired.', code: 'EXPIRED' },
        { status: 410 }
      );
    }

    // Case 1: Public Time-Based Note (Instant delivery with caching)
    if (link.shareType === 'TIME_BASED' && link.accessType === 'PUBLIC') {
      await bufferViewCount(link.id);
      await recordAccessLog(link.id, ipAddress, userAgent, 'SUCCESS');

      const responseData = {
        token: link.token,
        shareLinkId: link.id,
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

      const res = NextResponse.json({
        success: true,
        data: responseData,
      });
      res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
      res.headers.set('X-Cache-Tier', 'DB-RESOLVED');
      return res;
    }

    // Case 2: Protected Note or One-Time Note (Metadata only, ZERO note content leakage)
    const metadata = {
      token: link.token,
      title: link.note.title,
      accessType: link.accessType,
      shareType: link.shareType,
      expiresAt: link.expiresAt,
      requiresPassword: link.accessType === 'PROTECTED',
      requiresExplicitRead: link.shareType === 'ONE_TIME',
    };

    const res = NextResponse.json({
      success: true,
      data: metadata,
    });
    res.headers.set('X-Cache-Tier', 'DB-METADATA');
    return res;
  } catch (error) {
    console.error('GET /api/share/[token] error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/share/[token]
 * Atomic unlock endpoint for password-protected and one-time burn notes.
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { ipAddress, userAgent } = getClientMeta(req);

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const { password } = body;

  // Rate Limiter: Max 5 password attempts per token per IP per 15 minutes
  const unlockKey = `unlock:${token}:${ipAddress}`;
  const { allowed: unlockAllowed } = await rateLimit(unlockKey, 'UNLOCK');
  if (!unlockAllowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Too many incorrect attempts. This link is locked for 15 minutes for security.',
        code: 'RATE_LIMITED',
      },
      { status: 429 }
    );
  }

  // General traffic rate limit: 200 req/min
  const { allowed: generalAllowed } = await rateLimit(ipAddress, 'READ');
  if (!generalAllowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded.', code: 'RATE_LIMITED' },
      { status: 429 }
    );
  }

  try {
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
      return NextResponse.json(
        { success: false, error: 'This share link has been revoked or does not exist.', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    if (link.isRevoked) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'REVOKED');
      return NextResponse.json(
        { success: false, error: 'This share link has been revoked by the author.', code: 'REVOKED' },
        { status: 410 }
      );
    }

    if (link.shareType === 'ONE_TIME' && link.isUsed) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'ALREADY_USED');
      return NextResponse.json(
        {
          success: false,
          error: 'This note was a one-time link and has already been consumed.',
          code: 'ALREADY_USED',
        },
        { status: 410 }
      );
    }

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      await recordAccessLog(link.id, ipAddress, userAgent, 'EXPIRED');
      return NextResponse.json(
        { success: false, error: 'This share link has expired.', code: 'EXPIRED' },
        { status: 410 }
      );
    }

    // Password Verification for Protected Notes
    if (link.accessType === 'PROTECTED') {
      if (!password) {
        return NextResponse.json(
          { success: false, error: 'Access key is required to unlock this note', code: 'PASSWORD_REQUIRED' },
          { status: 401 }
        );
      }

      if (!link.passwordHash) {
        return NextResponse.json(
          { success: false, error: 'Note security configuration error', code: 'SERVER_ERROR' },
          { status: 500 }
        );
      }

      const isValid = await verifyPassword(password, link.passwordHash);
      if (!isValid) {
        await recordAccessLog(link.id, ipAddress, userAgent, 'WRONG_PASSWORD');
        return NextResponse.json(
          {
            success: false,
            error: 'Incorrect access key. Please verify and try again.',
            code: 'WRONG_PASSWORD',
          },
          { status: 401 }
        );
      }
    }

    // One-Time Burn: Distributed Mutex Lock + Conditional Atomic SQL
    if (link.shareType === 'ONE_TIME') {
      if (link.isUsed) {
        return NextResponse.json(
          {
            success: false,
            error: 'This note was a one-time link and has already been claimed.',
            code: 'ALREADY_USED',
          },
          { status: 410 }
        );
      }

      // 1. Acquire Distributed Redis Lock
      const lockKey = `lock:share:${token}`;
      const lockAcquired = await acquireRedisLock(lockKey, 5000);
      if (!lockAcquired) {
        return NextResponse.json(
          {
            success: false,
            error: 'This one-time note is currently being claimed by another user.',
            code: 'RACE_CONDITION_BLOCKED',
          },
          { status: 410 }
        );
      }

      // 2. Conditional Atomic SQL Update (Strict Single Winner)
      const updateResult = await db.shareLink.updateMany({
        where: {
          id: link.id,
          isUsed: false,
          isRevoked: false,
        },
        data: {
          isUsed: true,
          viewCount: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'This one-time note was already consumed by a faster concurrent request.',
            code: 'RACE_CONDITION_BLOCKED',
          },
          { status: 410 }
        );
      }

      // 3. Invalidate caches immediately
      memoryCache.del(token);
      await invalidateCachedNote(token);
    } else {
      // Time-Based note: Record view in write-behind buffer
      await recordView(link.id);
    }

    await recordAccessLog(link.id, ipAddress, userAgent, 'SUCCESS');

    return NextResponse.json({
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
    console.error('POST /api/share/[token] error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
