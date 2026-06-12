/**
 * [SUPERSEDED] api/disputes/route.ts에 이미 통합 구현 존재.
 * 이 파일은 보류 — 참고용. 실제 사용은 route.ts.
 *
 * Disputes Repository — PRD-OpenAgentX §4.11 결정 23 Beta 최소 구현.
 *
 * Schema: 002_phase2_schema.sql > disputes (PRD-OpenAgentX v3.1 결정 28).
 *   id, job_id (REFERENCES marketplace_jobs), claimant_id (REFERENCES users),
 *   reason, evidence_urls JSONB, status CHECK IN (open/under_review/resolved/rejected),
 *   resolution, resolved_by, refund_amount, refund_currency, created_at, updated_at.
 *
 * Beta 사양 (PRD §4.11):
 *   - POST 분쟁 신청
 *   - GET 본인 분쟁 목록
 *   - 어드민에게 이메일 알림 (ADMIN_EMAIL)
 *   - UNIQUE 제약: 1 job당 active(open|under_review) 분쟁 최대 1개
 */
import { query } from '../pool';

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export interface Dispute {
  id: string;
  job_id: string;
  claimant_id: string;
  reason: string;
  evidence_urls: string[];
  status: DisputeStatus;
  resolution: string | null;
  resolved_by: string | null;
  refund_amount: number | null;
  refund_currency: string | null;
  created_at: string;
  updated_at: string;
}

export async function createDispute(input: {
  job_id: string;
  claimant_id: string;
  reason: string;
  evidence_urls?: string[];
}): Promise<string> {
  const result = await query<{ id: string }>(
    `INSERT INTO disputes (job_id, claimant_id, reason, evidence_urls)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [
      input.job_id,
      input.claimant_id,
      input.reason,
      JSON.stringify(input.evidence_urls ?? []),
    ],
  );
  return result.rows[0].id;
}

export async function findMyDisputes(
  claimantId: string,
  opts?: { limit?: number; offset?: number; status?: DisputeStatus },
): Promise<{ disputes: Dispute[]; total: number }> {
  const limit = Math.min(opts?.limit ?? 20, 100);
  const offset = opts?.offset ?? 0;
  const conds: string[] = ['claimant_id = $1'];
  const vals: unknown[] = [claimantId];
  let i = 2;
  if (opts?.status) {
    conds.push(`status = $${i++}`);
    vals.push(opts.status);
  }
  const where = `WHERE ${conds.join(' AND ')}`;

  const [data, count] = await Promise.all([
    query<Dispute>(
      `SELECT * FROM disputes ${where}
       ORDER BY created_at DESC LIMIT $${i++} OFFSET $${i++}`,
      [...vals, limit, offset],
    ),
    query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM disputes ${where}`,
      vals,
    ),
  ]);
  return {
    disputes: data.rows,
    total: parseInt(count.rows[0].count, 10),
  };
}

export async function findDisputeById(id: string): Promise<Dispute | null> {
  const r = await query<Dispute>(`SELECT * FROM disputes WHERE id = $1`, [id]);
  return r.rows[0] ?? null;
}

export async function hasActiveDispute(jobId: string): Promise<boolean> {
  const r = await query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM disputes
       WHERE job_id = $1 AND status IN ('open','under_review')
     ) AS exists`,
    [jobId],
  );
  return r.rows[0].exists;
}
