import { randomBytes, createHash } from 'crypto';
import { query } from '../pool';
import { createUserKey } from './user-api-keys';

export interface AuthCode {
  id: string;
  email: string;
  code: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

let _tableEnsured = false;

async function ensureTable(): Promise<void> {
  if (_tableEnsured) return;
  await query(`
    CREATE TABLE IF NOT EXISTS auth_codes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) NOT NULL,
      code VARCHAR(10) NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query('CREATE INDEX IF NOT EXISTS idx_auth_codes_email ON auth_codes(email)');
  _tableEnsured = true;
}

/**
 * Generate a 6-digit verification code and store it (5-minute expiry).
 */
export async function createAuthCode(email: string): Promise<{ code: string; expiresIn: number }> {
  await ensureTable();

  // Invalidate previous unused codes for this email
  await query(
    `UPDATE auth_codes SET used = TRUE WHERE email = $1 AND used = FALSE`,
    [email],
  );

  // Generate 6-digit code
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresIn = 300; // 5 minutes

  await query(
    `INSERT INTO auth_codes (email, code, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '5 minutes')`,
    [email, code],
  );

  return { code, expiresIn };
}

/**
 * Verify an auth code and auto-create an API key for the user.
 * Returns the API key (shown only once) and userId.
 */
export async function verifyAuthCode(
  email: string,
  code: string,
): Promise<{ apiKey: string; userId: string }> {
  await ensureTable();

  // Find valid code
  const result = await query<AuthCode>(
    `SELECT * FROM auth_codes
     WHERE email = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [email, code],
  );

  if (result.rows.length === 0) {
    throw new Error('인증코드가 유효하지 않거나 만료되었습니다');
  }

  // Mark as used
  await query('UPDATE auth_codes SET used = TRUE WHERE id = $1', [result.rows[0].id]);

  // Find or create user
  const userResult = await query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1',
    [email],
  );

  let userId: string;
  if (userResult.rows.length === 0) {
    // Create new user with minimal info
    const newUser = await query<{ id: string }>(
      `INSERT INTO users (auth_id, email, name, role)
       VALUES (gen_random_uuid(), $1, $2, 'site_member')
       RETURNING id`,
      [email, email.split('@')[0]],
    );
    userId = newUser.rows[0].id;
  } else {
    userId = userResult.rows[0].id;
  }

  // Create API key
  const { rawKey } = await createUserKey(userId, `auth-code-${new Date().toISOString().slice(0, 10)}`);

  return { apiKey: rawKey, userId };
}
