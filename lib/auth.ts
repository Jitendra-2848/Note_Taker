import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { db } from './db';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return 'temporary-build-time-secret-at-least-32-characters-long';
  }
  return secret;
}

function getJwtRefreshSecret(): string {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    return 'temporary-build-time-refresh-secret-32-characters-long';
  }
  return secret;
}

export const AUTH_COOKIE_NAME = 'auth_token';
export const REFRESH_COOKIE_NAME = 'refresh_token';

export interface TokenPayload {
  userId: string;
  email: string;
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '15m' });
}

export function signRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, getJwtRefreshSecret(), { expiresIn: '7d' });
}

export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtRefreshSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

export const signAuthToken = signAccessToken;
export const verifyAuthToken = verifyAccessToken;

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (accessToken) {
    const payload = verifyAccessToken(accessToken);
    if (payload) {
      try {
        const user = await db.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, name: true, createdAt: true },
        });
        if (user) return user;
      } catch {}
    }
  }

  if (refreshToken) {
    const refreshPayload = verifyRefreshToken(refreshToken);
    if (refreshPayload) {
      try {
        const user = await db.user.findUnique({
          where: { id: refreshPayload.userId },
          select: { id: true, email: true, name: true, createdAt: true },
        });
        if (user) return user;
      } catch {
        return null;
      }
    }
  }

  return null;
}
