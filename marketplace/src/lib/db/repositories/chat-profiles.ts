import { query } from '../pool';

export type UserMode = 'user' | 'provider' | 'both';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ChatProfile {
  id: string;
  user_id: string | null;
  display_name: string;
  gemini_key_encrypted: string;
  passcode_hash: string;
  user_mode: UserMode;
  onboarding_completed: boolean;
  chat_history: ChatMessage[];
  preferences: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
}

export async function create(data: {
  user_id?: string;
  display_name: string;
  gemini_key_encrypted?: string;
  passcode_hash: string;
  user_mode: UserMode;
}): Promise<ChatProfile> {
  const result = await query<ChatProfile>(
    `INSERT INTO chat_profiles (user_id, display_name, gemini_key_encrypted, passcode_hash, user_mode, onboarding_completed)
     VALUES ($1, $2, $3, $4, $5, TRUE)
     RETURNING *`,
    [data.user_id ?? null, data.display_name, data.gemini_key_encrypted ?? '', data.passcode_hash, data.user_mode],
  );
  return result.rows[0];
}

export async function findById(id: string): Promise<ChatProfile | null> {
  const result = await query<ChatProfile>('SELECT * FROM chat_profiles WHERE id = $1', [id]);
  return result.rows[0] ?? null;
}

export async function findByUserId(userId: string): Promise<ChatProfile | null> {
  const result = await query<ChatProfile>(
    'SELECT * FROM chat_profiles WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function findByName(name: string): Promise<ChatProfile | null> {
  const result = await query<ChatProfile>(
    'SELECT * FROM chat_profiles WHERE display_name = $1 ORDER BY updated_at DESC LIMIT 1',
    [name],
  );
  return result.rows[0] ?? null;
}

export async function appendHistory(id: string, messages: ChatMessage[]): Promise<void> {
  await query(
    `UPDATE chat_profiles
     SET chat_history = (
       SELECT jsonb_agg(elem)
       FROM (
         SELECT elem FROM jsonb_array_elements(chat_history) elem
         UNION ALL
         SELECT elem FROM jsonb_array_elements($2::jsonb) elem
       ) combined
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [id, JSON.stringify(messages)],
  );
}

export async function updateMode(id: string, mode: UserMode): Promise<void> {
  await query('UPDATE chat_profiles SET user_mode = $1, updated_at = NOW() WHERE id = $2', [mode, id]);
}

export async function trimHistory(id: string, keepLast: number = 50): Promise<void> {
  await query(
    `UPDATE chat_profiles
     SET chat_history = (
       SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb)
       FROM (
         SELECT elem FROM jsonb_array_elements(chat_history) WITH ORDINALITY AS t(elem, ord)
         ORDER BY ord DESC LIMIT $2
       ) sub
     ),
     updated_at = NOW()
     WHERE id = $1`,
    [id, keepLast],
  );
}

export async function getHistory(id: string, limit: number = 50): Promise<ChatMessage[]> {
  const result = await query<{ messages: ChatMessage[] }>(
    `SELECT COALESCE(
       (SELECT jsonb_agg(elem) FROM (
         SELECT elem FROM jsonb_array_elements(chat_history) WITH ORDINALITY AS t(elem, ord)
         ORDER BY ord DESC LIMIT $2
       ) sub), '[]'::jsonb
     ) as messages
     FROM chat_profiles WHERE id = $1`,
    [id, limit],
  );
  if (result.rows.length === 0) return [];
  const msgs = result.rows[0].messages;
  return Array.isArray(msgs) ? msgs.reverse() : [];
}
