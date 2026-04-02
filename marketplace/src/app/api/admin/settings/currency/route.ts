import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { DEFAULT_CURRENCY_CONFIG } from '@/lib/utils/currency';

/**
 * Public GET — returns currency_config for the CurrencySwitcher.
 * No auth required (users need to know available currencies).
 */
export async function GET() {
  try {
    const result = await query<{ value: unknown }>(
      "SELECT value FROM site_settings WHERE key = 'currency_config'",
    );
    const config = result.rows[0]?.value ?? DEFAULT_CURRENCY_CONFIG;
    return NextResponse.json({ config });
  } catch {
    return NextResponse.json({ config: DEFAULT_CURRENCY_CONFIG });
  }
}
