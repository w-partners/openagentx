/**
 * Admin: 분쟁 해결 처리.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.11 결정 23 — 어드민 수동 환불·중재 (Beta).
 *
 * POST /api/admin/disputes/[id]/resolve
 *   body: { decision: 'resolved' | 'rejected',
 *           resolution: string,
 *           refund_amount?: number,
 *           refund_currency?: string }
 *
 * - resolved + refund_amount > 0: 잔액 환불 (별도 wallet_transactions 트랜잭션)
 * - rejected: 환불 없이 종결
 * - resolved_by = 호출 admin user id
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';

interface Body {
  decision: 'resolved' | 'rejected';
  resolution: string;
  refund_amount?: number;
  refund_currency?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let adminId: string;
  try {
    adminId = await requireAdmin(request);
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'id_required' }, { status: 400 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (body.decision !== 'resolved' && body.decision !== 'rejected') {
    return NextResponse.json(
      { error: 'invalid_decision', message: "decision must be 'resolved' or 'rejected'" },
      { status: 400 },
    );
  }

  const resolution = (body.resolution ?? '').trim();
  if (!resolution || resolution.length < 5) {
    return NextResponse.json(
      { error: 'resolution_too_short', message: '해결 사유는 5자 이상' },
      { status: 400 },
    );
  }

  const refundAmount =
    body.decision === 'resolved' && body.refund_amount !== undefined
      ? Number(body.refund_amount)
      : null;
  const refundCurrency =
    body.decision === 'resolved' && refundAmount && refundAmount > 0
      ? body.refund_currency ?? 'USDC'
      : null;

  // 분쟁 존재·상태 확인.
  const { rows: cur } = await query<{ id: string; status: string; claimant_id: string }>(
    `SELECT id, status, claimant_id FROM disputes WHERE id = $1`,
    [id],
  );
  const dispute = cur[0];
  if (!dispute) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (dispute.status === 'resolved' || dispute.status === 'rejected') {
    return NextResponse.json(
      { error: 'already_terminal', status: dispute.status },
      { status: 409 },
    );
  }

  // 트랜잭션: dispute UPDATE + (선택) wallet_transactions INSERT (환불).
  await query('BEGIN');
  try {
    await query(
      `UPDATE disputes
          SET status = $2,
              resolution = $3,
              resolved_by = $4,
              refund_amount = $5,
              refund_currency = $6,
              updated_at = NOW()
        WHERE id = $1`,
      [id, body.decision, resolution, adminId, refundAmount, refundCurrency],
    );

    if (body.decision === 'resolved' && refundAmount && refundAmount > 0) {
      // 청구인에게 환불 — wallet_transactions에 'refund' 타입 row.
      await query(
        `INSERT INTO wallet_transactions
            (user_id, type, amount, currency, reference_type, reference_id, note)
         VALUES ($1, 'refund', $2, $3, 'dispute', $4, $5)`,
        [
          dispute.claimant_id,
          refundAmount,
          refundCurrency ?? 'USDC',
          id,
          `분쟁 해결 환불: ${resolution.slice(0, 100)}`,
        ],
      );
    }
    await query('COMMIT');
  } catch (e) {
    await query('ROLLBACK');
    console.error('[admin/disputes/resolve] error:', e);
    return NextResponse.json(
      { error: 'transaction_failed', message: e instanceof Error ? e.message : 'unknown' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    id,
    status: body.decision,
    refund_amount: refundAmount,
    refund_currency: refundCurrency,
    resolved_by: adminId,
  });
}
