import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/security';
import { 
  signAccessToken, 
  signRefreshToken, 
  AUTH_COOKIE_NAME, 
  REFRESH_COOKIE_NAME 
} from '@/lib/auth';
import { rateLimit, getClientIp } from '@/lib/rate-limiter';

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const rate = await rateLimit(ip, 'AUTH');

  if (!rate.allowed) {
    return NextResponse.json(
      { 
        success: false, 
        error: `Too many registration attempts. Please try again in ${rate.resetInSeconds} seconds.`,
        code: 'RATE_LIMITED' 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(rate.resetInSeconds),
          'X-RateLimit-Limit': '10',
          'X-RateLimit-Remaining': '0',
        }
      }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name: name || null,
      },
    });

    const accessToken = signAccessToken({ userId: user.id, email: user.email });
    const refreshToken = signRefreshToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      data: { id: user.id, email: user.email, name: user.name },
      message: 'Account created successfully',
    });

    response.cookies.set(AUTH_COOKIE_NAME, accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    });

    response.cookies.set(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
