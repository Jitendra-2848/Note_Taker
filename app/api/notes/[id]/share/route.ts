import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword, generateAccessKey } from '@/lib/security';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const note = await db.note.findFirst({
      where: { id, userId: user.id },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    const body = await req.json();
    const { shareType, accessType, customPassword, expiresInHours, customExpiresAt } = body;

    const typeShare = shareType === 'ONE_TIME' ? 'ONE_TIME' : 'TIME_BASED';
    const typeAccess = accessType === 'PROTECTED' ? 'PROTECTED' : 'PUBLIC';

    let plainKey: string | null = null;
    let passwordHash: string | null = null;

    if (typeAccess === 'PROTECTED') {
      const keyToHash =
        customPassword && typeof customPassword === 'string' && customPassword.trim() !== ''
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

    const newLink = await db.shareLink.create({
      data: {
        noteId: note.id,
        shareType: typeShare,
        accessType: typeAccess,
        passwordHash,
        plainKey,
        expiresAt,
      },
    });

    return NextResponse.json({
      success: true,
      data: newLink,
      message: 'New share link created for this note',
    });
  } catch (error) {
    console.error('Create additional share link error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create share link' }, { status: 500 });
  }
}
