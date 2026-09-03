import { db } from './db';

/**
 * Serverless-compatible atomic view count increment.
 * Executes atomically on PostgreSQL without relying on background timer loops
 * that could freeze in serverless lambda environments.
 */
export async function incrementViewCount(shareLinkId: string): Promise<void> {
  try {
    await db.shareLink.update({
      where: { id: shareLinkId },
      data: { viewCount: { increment: 1 } },
    });
  } catch (err: any) {
    console.warn('View count increment error:', err.message);
  }
}

export const bufferViewCount = incrementViewCount;
