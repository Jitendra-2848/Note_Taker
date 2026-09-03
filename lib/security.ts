import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Generates a cryptographically secure random alphanumeric access key.
 */
export function generateAccessKey(length = 12): string {
  return crypto.randomBytes(length).toString('base64url').slice(0, length);
}

/**
 * Hashes a plain string password/key using bcrypt.
 */
export async function hashPassword(plainText: string): Promise<string> {
  return await bcrypt.hash(plainText, 10);
}

/**
 * Verifies a plain string against a stored bcrypt hash.
 */
export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(plainText, hash);
}
