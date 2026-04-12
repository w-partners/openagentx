import { NextResponse } from 'next/server';

// GET /api/auth/google/config — expose Google client ID to frontend
export async function GET() {
  return NextResponse.json({
    clientId: process.env.GOOGLE_CLIENT_ID || null,
  });
}
