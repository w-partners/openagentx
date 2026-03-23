import { query } from '../pool';

export interface User {
  id: string;
  email: string | null;
  nickname: string;
  avatar_url: string | null;
  role: string;
  wallet_address: string | null;
  is_verified: boolean;
  balance_usdc: number;
  created_at: Date;
  updated_at: Date;
}

export async function findById(id: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] ?? null;
}

export async function findByWallet(address: string): Promise<User | null> {
  const result = await query<User>('SELECT * FROM users WHERE wallet_address = $1', [address.toLowerCase()]);
  return result.rows[0] ?? null;
}

export async function updateProfile(id: string, updates: Partial<{
  nickname: string;
  avatar_url: string;
  wallet_address: string;
}>): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (updates.nickname !== undefined) { sets.push(`nickname = $${idx++}`); values.push(updates.nickname); }
  if (updates.avatar_url !== undefined) { sets.push(`avatar_url = $${idx++}`); values.push(updates.avatar_url); }
  if (updates.wallet_address !== undefined) { sets.push(`wallet_address = $${idx++}`); values.push(updates.wallet_address.toLowerCase()); }

  if (sets.length === 0) return;
  values.push(id);
  await query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${idx}`, values);
}

export async function updateBalance(id: string, amount: number): Promise<void> {
  const result = await query(
    'UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2 AND balance_usdc + $1 >= 0 RETURNING id',
    [amount, id],
  );
  if (result.rowCount === 0) throw new Error('잔액이 부족합니다');
}

export async function getBalance(id: string): Promise<number> {
  const result = await query<{ balance_usdc: string }>('SELECT balance_usdc FROM users WHERE id = $1', [id]);
  if (result.rows.length === 0) throw new Error('사용자를 찾을 수 없습니다');
  return parseFloat(result.rows[0].balance_usdc);
}

// Favorites
export async function addFavorite(userId: string, agentId: string): Promise<void> {
  await query(
    'INSERT INTO favorites (user_id, agent_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [userId, agentId],
  );
}

export async function removeFavorite(userId: string, agentId: string): Promise<void> {
  await query('DELETE FROM favorites WHERE user_id = $1 AND agent_id = $2', [userId, agentId]);
}

export async function getFavorites(userId: string): Promise<string[]> {
  const result = await query<{ agent_id: string }>(
    'SELECT agent_id FROM favorites WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
  );
  return result.rows.map((r) => r.agent_id);
}
