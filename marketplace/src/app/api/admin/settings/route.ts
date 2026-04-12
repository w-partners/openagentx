import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

const DEFAULT_SETTINGS: Record<string, unknown> = {
  enabled_pages: [
    'agents',
    'bounties',
    'auctions',
    'matching',
    'chains',
    'dashboard',
    'about',
    'docs',
    'profile',
    'builders',
  ],
  enabled_languages: ['en', 'ko', 'ja', 'zh', 'es', 'fr'],
  default_language: 'en',
};

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureTable();

    const result = await query<{ key: string; value: unknown }>(
      'SELECT key, value FROM site_settings',
    );

    const settings: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    return apiJson({ settings });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureTable();

    const body = await request.json();
    const { key, value } = body;

    if (!key || value === undefined) {
      return apiError('key and value are required');
    }

    await query(
      `INSERT INTO site_settings (key, value, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(value)],
    );

    return apiJson({ message: 'Setting updated' });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
