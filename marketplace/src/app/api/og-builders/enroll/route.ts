/**
 * OG 빌더 100명 모집 API (Beta — 결정 27).
 *
 * 정본: docs/PRD-OpenAgentX.md §4.14.
 *
 * 한정 100명 OG 빌더만 Portal 가입 + 마켓 등록 가능. 모집 종료 시 신청 거부.
 * 이후 enrollment는 GA 이후 일반 가입 흐름으로.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';

const OG_LIMIT = 100;

interface EnrollPayload {
  email: string;
  display_name: string;
  portfolio_url?: string;
  expertise: string[];     // tags
  bio: string;
}

export async function POST(request: NextRequest) {
  let body: EnrollPayload;
  try {
    body = (await request.json()) as EnrollPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const displayName = (body.display_name ?? '').trim();
  const bio = (body.bio ?? '').trim();
  const expertise = Array.isArray(body.expertise) ? body.expertise.filter((t) => typeof t === 'string').slice(0, 10) : [];

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
  }
  if (!displayName || displayName.length < 2) {
    return NextResponse.json({ error: 'display_name_required' }, { status: 400 });
  }
  if (!bio || bio.length < 30) {
    return NextResponse.json(
      { error: 'bio_too_short', message: '자기소개는 30자 이상 입력해주세요.' },
      { status: 400 },
    );
  }
  if (expertise.length === 0) {
    return NextResponse.json(
      { error: 'expertise_required', message: '전문 분야 태그를 1개 이상 입력해주세요.' },
      { status: 400 },
    );
  }

  // 모집 정원 체크
  const { rows: countRows } = await query<{ approved: number; pending: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
     FROM og_builder_enrollments`,
  );
  const { approved } = countRows[0] ?? { approved: 0, pending: 0 };
  if (approved >= OG_LIMIT) {
    return NextResponse.json(
      {
        error: 'enrollment_closed',
        message: 'OG 빌더 100명 모집이 마감되었습니다. GA에 일반 가입을 통해 참여하세요.',
        approved,
        limit: OG_LIMIT,
      },
      { status: 410 },
    );
  }

  // 중복 신청 차단
  const { rows: existing } = await query<{ id: string; status: string }>(
    `SELECT id, status FROM og_builder_enrollments WHERE email = $1 LIMIT 1`,
    [email],
  );
  if (existing.length > 0) {
    return NextResponse.json(
      { error: 'already_enrolled', status: existing[0].status, id: existing[0].id },
      { status: 409 },
    );
  }

  // 신청 row 생성 (pending)
  const { rows: inserted } = await query<{ id: string }>(
    `INSERT INTO og_builder_enrollments
        (email, display_name, portfolio_url, expertise, bio, status, created_at)
     VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
     RETURNING id`,
    [email, displayName, body.portfolio_url ?? null, JSON.stringify(expertise), bio],
  );

  return NextResponse.json(
    {
      id: inserted[0].id,
      status: 'pending',
      position: approved + 1,
      limit: OG_LIMIT,
      message: '신청이 접수되었습니다. 어드민 검토 후 이메일로 안내드립니다.',
    },
    { status: 201 },
  );
}

export async function GET() {
  const { rows } = await query<{ approved: number; pending: number }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
       COUNT(*) FILTER (WHERE status = 'pending')::int AS pending
     FROM og_builder_enrollments`,
  );
  const { approved, pending } = rows[0] ?? { approved: 0, pending: 0 };
  return NextResponse.json({
    approved,
    pending,
    limit: OG_LIMIT,
    remaining: Math.max(0, OG_LIMIT - approved),
    is_open: approved < OG_LIMIT,
  });
}
