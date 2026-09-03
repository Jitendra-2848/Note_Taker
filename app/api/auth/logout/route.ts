import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Signed out successfully',
  });

  // Clear both Access and Refresh token cookies
  response.cookies.delete(AUTH_COOKIE_NAME);
  response.cookies.delete(REFRESH_COOKIE_NAME);

  return response;
}
