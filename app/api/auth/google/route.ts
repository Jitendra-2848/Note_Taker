import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  const clientId = process.env.GOOGLE_CLIENT_ID;

  // Check if live Google credentials are provided or if running in local simulator mode
  const isConfigured = clientId && clientId.trim() !== '' && !clientId.includes('your-google-client-id');

  if (isConfigured) {
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', clientId!);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    googleAuthUrl.searchParams.set('access_type', 'offline');
    googleAuthUrl.searchParams.set('prompt', 'consent');

    return NextResponse.redirect(googleAuthUrl.toString());
  }

  // Local environment simulator: provides instant seamless OAuth verification without requiring GCP setup
  const mockCallbackUrl = new URL(redirectUri);
  mockCallbackUrl.searchParams.set('code', 'mock_google_oauth_code');
  return NextResponse.redirect(mockCallbackUrl.toString());
}
