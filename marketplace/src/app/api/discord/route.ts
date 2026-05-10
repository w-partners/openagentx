import { NextRequest, NextResponse } from 'next/server';
import {
  handleDiscordInteraction,
  verifyDiscordSignature,
  DISCORD_PUBLIC_KEY,
} from '@/lib/discord/bot';

/**
 * POST /api/discord — Discord Interactions webhook
 * Verifies Ed25519 signature, then dispatches to bot handler.
 */
export async function POST(request: NextRequest) {
  if (!DISCORD_PUBLIC_KEY) {
    return NextResponse.json(
      { error: 'Discord bot not configured (DISCORD_PUBLIC_KEY missing)' },
      { status: 503 },
    );
  }

  const signature = request.headers.get('x-signature-ed25519');
  const timestamp = request.headers.get('x-signature-timestamp');
  const rawBody = await request.text();

  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature headers' }, { status: 401 });
  }

  const valid = await verifyDiscordSignature(rawBody, signature, timestamp);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let interaction;
  try {
    interaction = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const response = await handleDiscordInteraction(interaction);
  return NextResponse.json(response);
}
