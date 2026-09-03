import { db } from '../lib/db';
import { hashPassword } from '../lib/security';

async function main() {
  console.log('Seeding initial demo data for Note-Taking System...');

  const email = 'demo@example.com';
  const passwordHash = await hashPassword('Password123!');
  
  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Demo User',
      passwordHash,
    },
  });

  console.log(`Demo User Created: ${user.email} (ID: ${user.id})`);

  const sampleNote = await db.note.create({
    data: {
      title: 'Full-Stack PERN System Architecture Spec',
      content: `# System Architecture & Concurrency Control\n\nThis note demonstrates the secure expiring share link system built for technical evaluation.\n\n### Security Highlights:\n- **Atomic Transactions**: Prevents double-consumption of one-time links.\n- **Dynamic Password Generation**: High-entropy bcrypt hashed access keys.\n- **Force Invalidation**: Real-time link revocation.\n- **Distributed Lock**: Sub-millisecond in-memory race protection with Redis.`,
      userId: user.id,
    },
  });

  const publicLink = await db.shareLink.create({
    data: {
      noteId: sampleNote.id,
      shareType: 'TIME_BASED',
      accessType: 'PUBLIC',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const plainKey = 'SecretKey123';
  const protectedLink = await db.shareLink.create({
    data: {
      noteId: sampleNote.id,
      shareType: 'ONE_TIME',
      accessType: 'PROTECTED',
      plainKey,
      passwordHash: await hashPassword(plainKey),
    },
  });

  console.log(`Public Share Link: /share/${publicLink.token}`);
  console.log(`Protected One-Time Share Link: /share/${protectedLink.token} (Key: ${plainKey})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
