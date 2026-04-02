import { NextRequest } from 'next/server';
import { apiJson } from '@/lib/utils/api-response';
import { query } from '@/lib/db/pool';

/**
 * Lightweight public endpoint for middleware to check enabled languages.
 * No auth required - only returns language config, not sensitive data.
 * Only accessible from internal requests (x-internal header) or any request.
 */
export async function GET(_request: NextRequest) {
  try {
    // Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const result = await query<{ key: string; value: unknown }>(
      "SELECT key, value FROM site_settings WHERE key IN ('enabled_languages', 'default_language')"
    );

    let enabled_languages: string[] = ['en', 'ko', 'ja', 'zh', 'es', 'fr'];
    let default_language = 'en';

    for (const row of result.rows) {
      if (row.key === 'enabled_languages' && Array.isArray(row.value)) {
        enabled_languages = row.value as string[];
      }
      if (row.key === 'default_language' && typeof row.value === 'string') {
        default_language = row.value;
      }
    }

    return apiJson({ enabled_languages, default_language });
  } catch {
    // On error, return all languages enabled (safe fallback)
    return apiJson({
      enabled_languages: ['en', 'ko', 'ja', 'zh', 'es', 'fr'],
      default_language: 'en',
    });
  }
}
