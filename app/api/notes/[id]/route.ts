import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { flushPendingViews } from '@/lib/view-buffer';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // Non-blocking background flush
  flushPendingViews().catch(() => {});

  try {
    const note = await db.note.findFirst({
      where: { id, userId: user.id },
      include: {
        shareLinks: {
          include: {
            accessLogs: {
              orderBy: { accessedAt: 'desc' },
              take: 20,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!note) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    const { getEffectiveViewCount } = await import('@/lib/view-buffer');
    const shareLinksWithViews = await Promise.all(
      note.shareLinks.map(async (link) => ({
        ...link,
        viewCount: await getEffectiveViewCount(link.id, link.viewCount),
      }))
    );

    return NextResponse.json({ success: true, data: { ...note, shareLinks: shareLinksWithViews } });
  } catch (error) {
    console.error('Fetch note details error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch note' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const existingNote = await db.note.findFirst({
      where: { id, userId: user.id },
    });

    if (!existingNote) {
      return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });
    }

    const updatedNote = await db.note.update({
      where: { id },
      data: {
        title: title.trim(),
        content,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedNote,
      message: 'Note saved successfully',
    });
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    await db.note.delete({ where: { id } });

    return NextResponse.json({ success: true, message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete note' }, { status: 500 });
  }
}

