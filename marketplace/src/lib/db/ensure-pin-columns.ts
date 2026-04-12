import { query } from '@/lib/db/pool';

let _ensured = false;

export async function ensurePinColumns(): Promise<void> {
  if (_ensured) return;
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_pin VARCHAR(255)`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_failed_count INTEGER DEFAULT 0`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_locked_until TIMESTAMPTZ`);
  _ensured = true;
}
