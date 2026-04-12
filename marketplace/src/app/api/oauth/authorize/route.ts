import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const clientId = searchParams.get('client_id') ?? '';
  const redirectUri = searchParams.get('redirect_uri') ?? '';
  const state = searchParams.get('state') ?? '';
  const responseType = searchParams.get('response_type') ?? '';

  const origin = process.env.NEXTAUTH_URL ?? 'https://openagentx.org';
  const loginUrl = new URL('/oauth/login', origin);
  loginUrl.searchParams.set('client_id', clientId);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  loginUrl.searchParams.set('state', state);
  loginUrl.searchParams.set('response_type', responseType);

  return NextResponse.redirect(loginUrl);
}
