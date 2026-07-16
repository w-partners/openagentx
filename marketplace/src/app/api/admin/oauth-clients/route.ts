/**
 * /api/admin/oauth-clients
 *   GET   — list all clients
 *   POST  — create client (returns client_secret ONCE)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';
import {
  generateClientId,
  generateClientSecret,
  hashSecret,
  VALID_SCOPES,
} from '@/lib/auth/oauth-provider';

const ALL_SCOPES = [...VALID_SCOPES] as string[];

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const r = await query<{
      id: string;
      client_id: string;
      name: string;
      description: string | null;
      redirect_uris: string[];
      scopes: string[];
      owner_id: string;
      logo_url: string | null;
      homepage_url: string | null;
      is_confidential: boolean;
      created_at: Date;
    }>(
      `SELECT id, client_id, name, description, redirect_uris, scopes, owner_id,
              logo_url, homepage_url, is_confidential, created_at
         FROM oauth_clients ORDER BY created_at DESC`,
    );
    return NextResponse.json({ clients: r.rows });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
}

const createSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  redirect_uris: z.array(z.string().url()).min(1),
  scopes: z.array(z.string()).optional(),
  logo_url: z.string().url().optional().or(z.literal('')),
  homepage_url: z.string().url().optional().or(z.literal('')),
});

export async function POST(request: NextRequest) {
  try {
    const adminId = await requireAdmin(request);
    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const { name, description, redirect_uris, scopes, logo_url, homepage_url } = parsed.data;

    // Filter scopes to known set
    const scopeList = (scopes && scopes.length ? scopes : ['agents:read', 'agents:execute', 'balance:read'])
      .filter((s) => ALL_SCOPES.includes(s));
    if (scopeList.length === 0) {
      return NextResponse.json({ error: '유효한 scope 가 없습니다' }, { status: 400 });
    }

    const clientId = generateClientId();
    const clientSecret = generateClientSecret();
    const secretHash = await hashSecret(clientSecret);

    const r = await query<{ id: string }>(
      `INSERT INTO oauth_clients
         (client_id, client_secret_hash, name, description, redirect_uris, scopes,
          owner_id, logo_url, homepage_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        clientId,
        secretHash,
        name,
        description ?? null,
        redirect_uris,
        scopeList,
        adminId,
        logo_url || null,
        homepage_url || null,
      ],
    );

    return NextResponse.json({
      id: r.rows[0].id,
      client_id: clientId,
      client_secret: clientSecret, // ONLY returned at creation
      name,
      redirect_uris,
      scopes: scopeList,
    });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'unknown' },
      { status: 400 },
    );
  }
}
