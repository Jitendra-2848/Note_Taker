import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { 
  verifyRefreshToken, 
  signAccessToken, 
  signRefreshToken, 
  AUTH_COOKIE_NAME, 
  REFRESH_COOKIE_NAME 
} from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE_NAME)?.value;

  if (!refreshToken) {
    return NextResponse.json({ success: false, error: 'No refresh token provided' }, { status: 401 });
  }

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) {
    return NextResponse.json({ success: false, error: 'Invalid or expired refresh token' }, { status: 401 });
  }

  try {
    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const newAccessToken = signAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user.id, email: user.email });

    const response = NextResponse.json({
      success: true,
      data: { user },
      message: 'Tokens refreshed successfully',
    });

    // Set refreshed Access Token (15 minutes)
    response.cookies.set(AUTH_COOKIE_NAME, newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    // Set refreshed Refresh Token (7 days)
    response.cookies.set(REFRESH_COOKIE_NAME, newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Token refresh error:', error);
    return NextResponse.json({ success: false, error: 'Failed to refresh token' }, { status: 500 });
  }
}
