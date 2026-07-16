/**
 * /api/admin/oauth-clients/[id]
 *   DELETE — remove client (cascade revokes all tokens)
 *   PATCH  — update redirect_uris / scopes / metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';
import { VALID_SCOPES } from '@/lib/auth/oauth-provider';

const ALL_SCOPES = [...VALID_SCOPES] as string[];

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await ctx.params;
    await query('DELETE FROM oauth_clients WHERE id = $1', [id]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
}

const patchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  redirect_uris: z.array(z.string().url()).min(1).optional(),
  scopes: z.array(z.string()).optional(),
  logo_url: z.string().url().nullable().optional().or(z.literal('')),
  homepage_url: z.string().url().nullable().optional().or(z.literal('')),
});

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await ctx.params;
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (parsed.data.name !== undefined) { sets.push(`name = $${i++}`); params.push(parsed.data.name); }
    if (parsed.data.description !== undefined) { sets.push(`description = $${i++}`); params.push(parsed.data.description); }
    if (parsed.data.redirect_uris !== undefined) { sets.push(`redirect_uris = $${i++}`); params.push(parsed.data.redirect_uris); }
    if (parsed.data.scopes !== undefined) {
      const filtered = parsed.data.scopes.filter((s) => ALL_SCOPES.includes(s));
      sets.push(`scopes = $${i++}`); params.push(filtered);
    }
    if (parsed.data.logo_url !== undefined) {
      sets.push(`logo_url = $${i++}`);
      params.push(parsed.data.logo_url || null);
    }
    if (parsed.data.homepage_url !== undefined) {
      sets.push(`homepage_url = $${i++}`);
      params.push(parsed.data.homepage_url || null);
    }
    if (sets.length === 0) return NextResponse.json({ ok: true });
    sets.push(`updated_at = NOW()`);
    params.push(id);
    await query(`UPDATE oauth_clients SET ${sets.join(', ')} WHERE id = $${i}`, params);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 });
  }
}
