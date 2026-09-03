import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await params;

  try {
    const link = await db.shareLink.findUnique({
      where: { token },
      include: { note: true },
    });

    if (!link) {
      return NextResponse.json({ success: false, error: 'Share link not found' }, { status: 404 });
    }

    if (link.note.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to revoke this link' },
        { status: 403 }
      );
    }

    // Remove the revoked link completely from the database and active views
    await db.shareLink.delete({
      where: { id: link.id },
    });

    // Invalidate any Redis cached copies
    try {
      const { invalidateCachedNote } = await import('@/lib/redis');
      await invalidateCachedNote(token);
    } catch {
      // Non-blocking
    }

    return NextResponse.json({
      success: true,
      message: 'Share link has been revoked and removed successfully',
    });
  } catch (error) {
    console.error('Revoke share link error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke and remove share link' },
      { status: 500 }
    );
  }
}
