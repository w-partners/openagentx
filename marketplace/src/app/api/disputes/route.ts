/**
 * 분쟁 신청 API (Beta — 최소 구현).
 *
 * 정본: docs/PRD-OpenAgentX.md §4.11 (결정 23) Beta.
 *
 * Beta:
 *   - POST /api/disputes      → 분쟁 신청 + 어드민 이메일 알림 (ADMIN_EMAIL)
 *   - GET  /api/disputes      → 본인 분쟁 목록
 *   - 어드민이 수동 환불·중재
 *
 * GA:
 *   - 인앱 증거 첨부
 *   - LLM 1차 권고
 *   - 어드민 UI (dashboard/admin/disputes-section.tsx)
 *   - 통계
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { getSessionUser } from '@/lib/auth/session';

interface DisputePayload {
  job_id: string;
  reason: string;
  evidence_urls?: string[];
}

// POST /api/disputes
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  let body: DisputePayload;
  try {
    body = (await request.json()) as DisputePayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body.job_id || typeof body.job_id !== 'string') {
    return NextResponse.json({ error: 'job_id_required' }, { status: 400 });
  }
  const reason = (body.reason ?? '').trim();
  if (!reason || reason.length < 10) {
    return NextResponse.json(
      { error: 'reason_too_short', message: '분쟁 사유는 10자 이상 입력해주세요.' },
      { status: 400 },
    );
  }
  if (reason.length > 4000) {
    return NextResponse.json(
      { error: 'reason_too_long', message: '분쟁 사유는 4000자를 초과할 수 없습니다.' },
      { status: 400 },
    );
  }

  // job 소유자 확인 (구매자 또는 메이커가 신청 가능)
  const jobs = await query<{
    id: string;
    buyer_id: string;
    maker_id: string;
    status: string;
    total_amount: number;
    currency: string;
  }>(
    `SELECT id, buyer_id, maker_id, status, total_amount, currency
       FROM jobs WHERE id = $1`,
    [body.job_id],
  );
  const job = jobs[0];
  if (!job) {
    return NextResponse.json({ error: 'job_not_found' }, { status: 404 });
  }
  if (job.buyer_id !== user.id && job.maker_id !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }
  if (!['completed', 'failed', 'cancelled'].includes(job.status)) {
    return NextResponse.json(
      { error: 'job_not_final', message: '완료/실패/취소된 작업에만 분쟁 신청 가능합니다.' },
      { status: 400 },
    );
  }

  // 중복 분쟁 차단 (open / under_review 상태가 이미 있으면)
  const existing = await query<{ id: string; status: string }>(
    `SELECT id, status FROM disputes
      WHERE job_id = $1 AND status IN ('open', 'under_review')
      LIMIT 1`,
    [body.job_id],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'dispute_exists', dispute_id: existing[0].id, status: existing[0].status },
      { status: 409 },
    );
  }

  // 분쟁 row 생성
  const evidence = Array.isArray(body.evidence_urls)
    ? body.evidence_urls.filter((u) => typeof u === 'string' && /^https?:\/\//.test(u)).slice(0, 10)
    : [];

  const inserted = await query<{ id: string }>(
    `INSERT INTO disputes (job_id, claimant_id, reason, evidence_urls, status, created_at)
     VALUES ($1, $2, $3, $4, 'open', NOW())
     RETURNING id`,
    [body.job_id, user.id, reason, JSON.stringify(evidence)],
  );
  const disputeId = inserted[0].id;

  // 어드민 이메일 알림 (Beta — 수동 처리)
  await notifyAdmin({
    disputeId,
    jobId: job.id,
    claimantEmail: user.email ?? `user:${user.id}`,
    role: user.id === job.buyer_id ? 'buyer' : 'maker',
    reason,
    amount: job.total_amount,
    currency: job.currency,
  });

  return NextResponse.json(
    { id: disputeId, status: 'open', message: '분쟁이 접수되었습니다. 어드민이 검토 후 연락드립니다.' },
    { status: 201 },
  );
}

// GET /api/disputes → 본인 분쟁 목록
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status'); // open|under_review|resolved|rejected
  const validStatus = ['open', 'under_review', 'resolved', 'rejected'];

  const rows = await query<{
    id: string;
    job_id: string;
    reason: string;
    status: string;
    resolution: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT d.id, d.job_id, d.reason, d.status, d.resolution, d.created_at, d.updated_at
       FROM disputes d
      WHERE d.claimant_id = $1
        ${status && validStatus.includes(status) ? 'AND d.status = $2' : ''}
      ORDER BY d.created_at DESC
      LIMIT 50`,
    status && validStatus.includes(status) ? [user.id, status] : [user.id],
  );

  return NextResponse.json({ disputes: rows });
}

// ── helpers ──────────────────────────────────────────────────────────

interface AdminNotice {
  disputeId: string;
  jobId: string;
  claimantEmail: string;
  role: 'buyer' | 'maker';
  reason: string;
  amount: number;
  currency: string;
}

async function notifyAdmin(notice: AdminNotice) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('[disputes] ADMIN_EMAIL not set — skipping email notification', notice);
    return;
  }

  const subject = `[OpenAgentX] 분쟁 신청 #${notice.disputeId.slice(0, 8)} (${notice.role})`;
  const body = [
    `분쟁 ID: ${notice.disputeId}`,
    `작업 ID: ${notice.jobId}`,
    `신청자: ${notice.claimantEmail} (${notice.role})`,
    `금액: ${notice.amount} ${notice.currency}`,
    '',
    '사유:',
    notice.reason,
    '',
    `어드민 대시보드: ${process.env.NEXT_PUBLIC_MARKET_URL ?? 'https://openagentx.org'}/admin/disputes/${notice.disputeId}`,
  ].join('\n');

  // sendMail 헬퍼는 lib/email/* 에 정의되어 있다는 가정. 없으면 로그만.
  try {
    const { sendMail } = await import('@/lib/email/send').catch(() => ({ sendMail: null as null | ((args: { to: string; subject: string; text: string }) => Promise<void>) }));
    if (sendMail) {
      await sendMail({ to: adminEmail, subject, text: body });
      return;
    }
  } catch (err) {
    console.error('[disputes] notifyAdmin send error', err);
  }
  console.warn('[disputes] sendMail unavailable; admin notice logged only', { subject });
}
