import { query, transaction } from '../pool';

export type PromptStatus = 'active' | 'draft' | 'archived' | 'suspended';

export interface Prompt {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  description: string;
  description_ko: string | null;
  system_prompt: string;
  category: string;
  tags: string[];
  author_id: string | null;
  is_featured: boolean;
  is_public: boolean;
  status: PromptStatus;
  use_count: number;
  like_count: number;
  example_input: string | null;
  example_output: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
  updated_at: Date;
}

const SELECT_COLS = `id, slug, title, title_ko, description, description_ko, system_prompt,
  category, tags, author_id, is_featured, is_public, status, use_count, like_count,
  example_input, example_output, metadata, created_at, updated_at`;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export async function findAll(filters: {
  q?: string;
  category?: string;
  is_featured?: boolean;
  is_public?: boolean;
  author_id?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<{ prompts: Prompt[]; total: number }> {
  const conditions: string[] = ["status = 'active'"];
  const values: unknown[] = [];
  let idx = 1;

  if (filters.is_public !== undefined) {
    conditions.push(`is_public = $${idx++}`);
    values.push(filters.is_public);
  } else {
    // default: only public
    conditions.push('is_public = TRUE');
  }
  if (filters.category) {
    conditions.push(`category = $${idx++}`);
    values.push(filters.category);
  }
  if (filters.is_featured !== undefined) {
    conditions.push(`is_featured = $${idx++}`);
    values.push(filters.is_featured);
  }
  if (filters.author_id) {
    conditions.push(`author_id = $${idx++}`);
    values.push(filters.author_id);
  }
  if (filters.q) {
    // 한글 포함 시 tsvector('simple') 토큰화가 부실하므로 ILIKE/trigram 폴백을 OR 결합한다.
    // 영문/한글 어느 쪽 검색어라도 둘 다 시도해 0건 케이스를 줄인다.
    const hasHangul = /[ㄱ-힝]/u.test(filters.q);
    const tsIdx = idx++;
    const likeIdx = idx++;
    if (hasHangul) {
      // 한글: title_ko / description_ko / tags ILIKE 폴백 우선, ts 도 같이 OR
      conditions.push(
        `(search_vector @@ plainto_tsquery('simple', $${tsIdx})
          OR title_ko ILIKE $${likeIdx}
          OR description_ko ILIKE $${likeIdx}
          OR title ILIKE $${likeIdx}
          OR description ILIKE $${likeIdx}
          OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $${likeIdx}))`,
      );
    } else {
      conditions.push(
        `(search_vector @@ plainto_tsquery('simple', $${tsIdx})
          OR title ILIKE $${likeIdx}
          OR description ILIKE $${likeIdx}
          OR title_ko ILIKE $${likeIdx}
          OR description_ko ILIKE $${likeIdx}
          OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE t ILIKE $${likeIdx}))`,
      );
    }
    values.push(filters.q);
    values.push(`%${filters.q}%`);
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const limit = Math.min(filters.limit ?? 20, 100);
  const offset = Math.max(filters.offset ?? 0, 0);

  const [dataResult, countResult] = await Promise.all([
    query<Prompt>(
      `SELECT ${SELECT_COLS} FROM prompts ${where}
       ORDER BY is_featured DESC, use_count DESC, created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM prompts ${where}`,
      values,
    ),
  ]);

  return {
    prompts: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function findBySlug(slug: string): Promise<Prompt | null> {
  const r = await query<Prompt>(
    `SELECT ${SELECT_COLS} FROM prompts WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  return r.rows[0] ?? null;
}

export async function findById(id: string): Promise<Prompt | null> {
  const r = await query<Prompt>(
    `SELECT ${SELECT_COLS} FROM prompts WHERE id = $1 LIMIT 1`,
    [id],
  );
  return r.rows[0] ?? null;
}

export async function create(input: {
  slug?: string;
  title: string;
  title_ko?: string;
  description: string;
  description_ko?: string;
  system_prompt: string;
  category?: string;
  tags?: string[];
  author_id?: string | null;
  example_input?: string;
  example_output?: string;
  is_featured?: boolean;
  is_public?: boolean;
  metadata?: Record<string, unknown>;
}): Promise<Prompt> {
  let slug = input.slug ? slugify(input.slug) : slugify(input.title);
  if (!slug) slug = `prompt-${Date.now().toString(36)}`;

  // ensure uniqueness — append timestamp if slug taken
  const exists = await findBySlug(slug);
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;

  const r = await query<Prompt>(
    `INSERT INTO prompts (
       slug, title, title_ko, description, description_ko, system_prompt,
       category, tags, author_id, example_input, example_output,
       is_featured, is_public, metadata
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING ${SELECT_COLS}`,
    [
      slug,
      input.title,
      input.title_ko ?? null,
      input.description,
      input.description_ko ?? null,
      input.system_prompt,
      input.category ?? 'general',
      input.tags ?? [],
      input.author_id ?? null,
      input.example_input ?? null,
      input.example_output ?? null,
      input.is_featured ?? false,
      input.is_public ?? true,
      input.metadata ?? null,
    ],
  );
  return r.rows[0];
}

export async function updateBySlug(slug: string, updates: Partial<{
  title: string;
  title_ko: string;
  description: string;
  description_ko: string;
  system_prompt: string;
  category: string;
  tags: string[];
  example_input: string;
  example_output: string;
  is_featured: boolean;
  is_public: boolean;
  status: PromptStatus;
}>): Promise<Prompt | null> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue;
    sets.push(`${k} = $${idx++}`);
    values.push(v);
  }
  if (sets.length === 0) return findBySlug(slug);

  values.push(slug);
  const r = await query<Prompt>(
    `UPDATE prompts SET ${sets.join(', ')} WHERE slug = $${idx} RETURNING ${SELECT_COLS}`,
    values,
  );
  return r.rows[0] ?? null;
}

export async function deleteBySlug(slug: string): Promise<boolean> {
  const r = await query('DELETE FROM prompts WHERE slug = $1', [slug]);
  return (r.rowCount ?? 0) > 0;
}

export async function incrementUseCount(id: string): Promise<void> {
  await query('UPDATE prompts SET use_count = use_count + 1 WHERE id = $1', [id]);
}

export async function listCategories(): Promise<{ category: string; count: number }[]> {
  const r = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*)::text AS count
     FROM prompts
     WHERE status='active' AND is_public = TRUE
     GROUP BY category
     ORDER BY count DESC`,
  );
  return r.rows.map((row) => ({ category: row.category, count: parseInt(row.count, 10) }));
}

export async function logRun(input: {
  prompt_id: string;
  user_id?: string | null;
  input_text: string;
  output_text?: string | null;
  status?: 'success' | 'failed';
  error_msg?: string | null;
  duration_ms?: number;
}): Promise<string> {
  const r = await query<{ id: string }>(
    `INSERT INTO prompt_runs (prompt_id, user_id, input_text, output_text, status, error_msg, duration_ms)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [
      input.prompt_id,
      input.user_id ?? null,
      input.input_text,
      input.output_text ?? null,
      input.status ?? 'success',
      input.error_msg ?? null,
      input.duration_ms ?? 0,
    ],
  );
  return r.rows[0].id;
}

/**
 * Toggle like — returns { liked, like_count } after toggle.
 */
export async function toggleLike(userId: string, slug: string): Promise<{ liked: boolean; like_count: number } | null> {
  return transaction(async (client) => {
    const p = await client.query<{ id: string }>(
      'SELECT id FROM prompts WHERE slug = $1',
      [slug],
    );
    if (p.rows.length === 0) return null;
    const promptId = p.rows[0].id;

    const exists = await client.query(
      'SELECT 1 FROM prompt_likes WHERE user_id = $1 AND prompt_id = $2',
      [userId, promptId],
    );

    let liked: boolean;
    if (exists.rows.length > 0) {
      await client.query('DELETE FROM prompt_likes WHERE user_id = $1 AND prompt_id = $2', [userId, promptId]);
      await client.query('UPDATE prompts SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1', [promptId]);
      liked = false;
    } else {
      await client.query('INSERT INTO prompt_likes (user_id, prompt_id) VALUES ($1,$2)', [userId, promptId]);
      await client.query('UPDATE prompts SET like_count = like_count + 1 WHERE id = $1', [promptId]);
      liked = true;
    }

    const r = await client.query<{ like_count: number }>(
      'SELECT like_count FROM prompts WHERE id = $1',
      [promptId],
    );
    return { liked, like_count: r.rows[0].like_count };
  });
}

export async function hasLiked(userId: string, slug: string): Promise<boolean> {
  const r = await query(
    `SELECT 1 FROM prompt_likes pl JOIN prompts p ON p.id = pl.prompt_id
     WHERE pl.user_id = $1 AND p.slug = $2`,
    [userId, slug],
  );
  return r.rows.length > 0;
}
