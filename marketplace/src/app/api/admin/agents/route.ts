import { NextRequest } from 'next/server';
import { apiJson, apiError, requireAuth, AuthError } from '@/lib/utils/api-response';
import * as usersRepo from '@/lib/db/repositories/users';
import { query } from '@/lib/db/pool';

class ForbiddenError extends Error {
  constructor() {
    super('관리자 권한이 필요합니다');
  }
}

async function requireAdmin(request: NextRequest): Promise<string> {
  const userId = requireAuth(request);
  const user = await usersRepo.findById(userId);
  if (!user || user.role !== 'admin') {
    throw new ForbiddenError();
  }
  return userId;
}

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

    return apiJson({ agents: result.rows });
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

      default:
        return apiError(`Unknown action: ${action}`);
    }
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
