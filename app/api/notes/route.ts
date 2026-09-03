import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword, generateAccessKey } from '@/lib/security';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const notes = await db.note.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        shareLinks: {
          select: {
            id: true,
            token: true,
            shareType: true,
            accessType: true,
            expiresAt: true,
            isUsed: true,
            isRevoked: true,
            viewCount: true,
            plainKey: true,
            createdAt: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: notes });
  } catch (error) {
    console.error('Fetch notes error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { rateLimit } = await import('@/lib/rate-limiter');
  const rate = await rateLimit(user.id, 'MUTATION');
  if (!rate.allowed) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Rate limit reached. Please wait ${rate.resetInSeconds} seconds before creating more notes.`,
        code: 'RATE_LIMITED' 
      },
      { 
        status: 429,
        headers: { 'Retry-After': String(rate.resetInSeconds) }
      }
    );
  }

  try {
    const body = await req.json();
    const { title, content, shareType, accessType, customPassword, expiresInHours, customExpiresAt } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const typeShare = shareType === 'ONE_TIME' ? 'ONE_TIME' : 'TIME_BASED';
    const typeAccess = accessType === 'PROTECTED' ? 'PROTECTED' : 'PUBLIC';

    let plainKey: string | null = null;
    let passwordHash: string | null = null;

    if (typeAccess === 'PROTECTED') {
      const keyToHash = customPassword && typeof customPassword === 'string' && customPassword.trim() !== ''
        ? customPassword.trim()
        : generateAccessKey(12);
      plainKey = keyToHash;
      passwordHash = await hashPassword(keyToHash);
    }

    let expiresAt: Date | null = null;
    if (customExpiresAt) {
      const parsed = new Date(customExpiresAt);
      if (!isNaN(parsed.getTime()) && parsed.getTime() > Date.now()) {
        expiresAt = parsed;
      }
    } else if (expiresInHours && typeof expiresInHours === 'number' && expiresInHours > 0) {
      expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    }

    // Create Note and Share Link in transaction
    const note = await db.note.create({
      data: {
        title,
        content,
        userId: user.id,
        shareLinks: {
          create: {
            shareType: typeShare,
            accessType: typeAccess,
            passwordHash,
            plainKey,
            expiresAt,
          },
        },
      },
      include: {
        shareLinks: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: note,
      message: 'Note and share link created successfully',
    });
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create note' }, { status: 500 });
  }
}
