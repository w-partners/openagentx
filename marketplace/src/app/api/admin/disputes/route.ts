/**
 * Admin: 분쟁 목록 + 통계.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.11 (결정 23) Beta+GA.
 *
 * GET /api/admin/disputes
 *   ?status=open|under_review|resolved|rejected (선택)
 *   ?limit=20 (default)
 *   ?offset=0 (default)
 *
 * 응답: { total, items: [{id, job_id, claimant_email, claimant_name, reason,
 *                       status, amount, currency, created_at, evidence_urls}] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';

const VALID_STATUS = new Set(['open', 'under_review', 'resolved', 'rejected']);

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
  const offset = Math.max(Number(url.searchParams.get('offset') ?? 0), 0);

  const where: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (status && VALID_STATUS.has(status)) {
    where.push(`d.status = $${idx++}`);
    params.push(status);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // Total count
  const { rows: countRows } = await query<{ total: string }>(
    `SELECT COUNT(*)::text AS total FROM disputes d ${whereClause}`,
    params,
  );
  const total = Number(countRows[0]?.total ?? 0);

  // Items + join users + jobs
  const { rows } = await query<{
    id: string;
    job_id: string;
    claimant_id: string;
    claimant_email: string | null;
    claimant_name: string | null;
    reason: string;
    evidence_urls: string[];
    status: string;
    resolution: string | null;
    refund_amount: string | null;
    refund_currency: string | null;
    created_at: string;
    updated_at: string;
    job_amount: string | null;
    job_currency: string | null;
    job_status: string | null;
  }>(
    `SELECT d.id, d.job_id, d.claimant_id,
            u.email AS claimant_email, u.name AS claimant_name,
            d.reason, d.evidence_urls, d.status, d.resolution,
            d.refund_amount, d.refund_currency,
            d.created_at, d.updated_at,
            j.total_amount AS job_amount,
            j.currency     AS job_currency,
            j.status       AS job_status
       FROM disputes d
       JOIN users u ON u.id = d.claimant_id
       LEFT JOIN jobs j ON j.id = d.job_id
       ${whereClause}
      ORDER BY d.created_at DESC
      LIMIT ${limit} OFFSET ${offset}`,
    params,
  );

  return NextResponse.json({ total, limit, offset, items: rows });
}
