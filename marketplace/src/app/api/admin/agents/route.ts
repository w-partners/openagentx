import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

async function ensureColumns() {
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS boost_multiplier NUMERIC(3,1) DEFAULT 1.0`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_url VARCHAR(500)`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_status VARCHAR(20) DEFAULT 'unknown'`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_checked_at TIMESTAMPTZ`);
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureColumns();

    const { searchParams } = request.nextUrl;
    const source = searchParams.get('source') ?? 'agents'; // 'agents' | 'custom'

    if (source === 'custom') {
      // Custom agents (user-created)
      const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
      const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
      const offset = (page - 1) * limit;
      const category = searchParams.get('category') ?? '';
      const status = searchParams.get('status') ?? '';

      const conditions = ['1=1'];
      const values: unknown[] = [];
      let idx = 1;

      if (category) {
        conditions.push(`ca.category = $${idx++}`);
        values.push(category);
      }
      if (status) {
        conditions.push(`ca.status = $${idx++}`);
        values.push(status);
      }

      const where = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        query<{
          id: string;
          name: string;
          category: string;
          creator_id: string;
          creator_email: string | null;
          creator_nickname: string;
          status: string;
          price_points: number;
          usage_count: number;
          created_at: Date;
        }>(
          `SELECT ca.id, ca.name, ca.category, ca.creator_id, u.email as creator_email, u.nickname as creator_nickname,
                  ca.status, ca.price_points, ca.usage_count, ca.created_at
           FROM custom_agents ca
           LEFT JOIN users u ON u.id = ca.creator_id
           WHERE ${where}
           ORDER BY ca.created_at DESC
           LIMIT $${idx++} OFFSET $${idx++}`,
          [...values, limit, offset],
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) as count FROM custom_agents ca WHERE ${where}`,
          values,
        ),
      ]);

      return apiJson({
        agents: dataResult.rows,
        total: parseInt(countResult.rows[0].count, 10),
        page,
        limit,
        source: 'custom',
      });
    }

    // Default: platform agents
    const result = await query<{
      id: string;
      name: string;
      category: string;
      is_pinned: boolean;
      boost_multiplier: number;
      avg_rating: number;
      total_jobs: number;
      status: string;
      server_url: string | null;
      server_status: string;
      server_checked_at: string | null;
      created_at: string;
    }>(
      `SELECT id, name, category,
              COALESCE(is_pinned, false) as is_pinned,
              COALESCE(boost_multiplier, 1.0) as boost_multiplier,
              avg_rating, total_jobs, status,
              server_url,
              COALESCE(server_status, 'unknown') as server_status,
              server_checked_at,
              created_at
       FROM agents
       ORDER BY is_pinned DESC, ranking_score DESC, created_at DESC`,
    );

    return apiJson({ agents: result.rows, source: 'agents' });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureColumns();

    const body = await request.json();
    const { action, agentId, boostMultiplier } = body;

    if (!action || !agentId) {
      return apiError('action and agentId are required');
    }

    switch (action) {
      case 'togglePin': {
        await query(
          `UPDATE agents SET is_pinned = NOT COALESCE(is_pinned, false), updated_at = NOW() WHERE id = $1`,
          [agentId],
        );
        return apiJson({ message: 'Pin toggled' });
      }

      case 'updateBoost': {
        const multiplier = parseFloat(boostMultiplier);
        if (isNaN(multiplier) || multiplier < 1 || multiplier > 5) {
          return apiError('boostMultiplier must be between 1.0 and 5.0');
        }
        await query(
          `UPDATE agents SET boost_multiplier = $1, updated_at = NOW() WHERE id = $2`,
          [multiplier, agentId],
        );
        return apiJson({ message: 'Boost updated' });
      }

      case 'updateCustomStatus': {
        const { status } = body;
        if (!status || !['active', 'disabled', 'featured'].includes(status)) {
          return apiError('status는 active, disabled, featured 중 하나여야 합니다');
        }
        await query(
          `UPDATE custom_agents SET status = $1, updated_at = NOW() WHERE id = $2`,
          [status, agentId],
        );
        return apiJson({ message: '커스텀 에이전트 상태가 변경되었습니다' });
      }

      default:
        return apiError(`Unknown action: ${action}`);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
