import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';
import { apiJson, requireAuth, AuthError } from '@/lib/utils/api-response';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// POST /api/agents/[id]/favorite — Add to favorites
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(request);
    const { id: agentId } = await params;
    if (!UUID_RE.test(agentId)) return apiJson({ error: 'Invalid agent id' }, 400);

    const exists = await query('SELECT 1 FROM agents WHERE id = $1', [agentId]);
    if (exists.rowCount === 0) return apiJson({ error: '에이전트를 찾을 수 없습니다' }, 404);

    await query(
      'INSERT INTO favorites (user_id, agent_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, agentId],
    );
    return apiJson({ data: { user_id: userId, agent_id: agentId } }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiJson({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
}

// DELETE /api/agents/[id]/favorite — Remove from favorites
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const userId = requireAuth(request);
    const { id: agentId } = await params;
    if (!UUID_RE.test(agentId)) return apiJson({ error: 'Invalid agent id' }, 400);

    await query('DELETE FROM favorites WHERE user_id = $1 AND agent_id = $2', [userId, agentId]);
    return apiJson({ data: { removed: true } });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiJson({ error: err instanceof Error ? err.message : 'Server error' }, 500);
  }
}
