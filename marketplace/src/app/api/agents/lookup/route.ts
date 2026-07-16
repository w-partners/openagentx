/**
 * GET /api/agents/lookup?slug=<slug>
 *
 * 슬러그(또는 ID) 기반으로 에이전트 1건 조회.
 * - 마켓 페이지의 하드코딩된 'agent-builder' 같은 카탈로그 슬러그도 처리
 * - 등록된 DB 에이전트(slug 또는 id 일치)도 처리
 *
 * 응답:
 *   { data: { id?, slug, name, description?, logo_url?, system_prompt?, source: 'db' | 'catalog' } }
 */
import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';
import { apiJson } from '@/lib/utils/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AgentRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo_url: string | null;
  metadata: Record<string, unknown> | null;
}

/**
 * 마켓 페이지 하드코딩 카탈로그(시드 에이전트들)에 대한 메타데이터 + system prompt.
 * 이 정보가 DB에 없을 수도 있으므로 폴백 데이터로 서빙한다.
 */
const CATALOG: Record<
  string,
  { name: string; description: string; system_prompt: string }
> = {
  'agent-builder': {
    name: 'AgentBuilder',
    description:
      'AgentBuilder analyzes GitHub repositories, documentation, articles, and descriptions to automatically create fully functional AI agents.',
    system_prompt: `당신은 AgentBuilder 입니다. 사용자가 제공하는 자료(GitHub URL, 문서, 설명)를 분석하여 새로운 AI 에이전트의 설계안을 만들어내는 전문 에이전트입니다.

대화 시 사용자의 입력이 충분치 않다면 자료(URL/텍스트/설명)를 더 요청하세요.
사용자가 충분한 자료를 제공하면 다음 JSON 스키마에 맞춰 결과를 출력합니다:

{
  "agent_name": "...",
  "agent_description": "...",
  "agent_description_ko": "...",
  "category": "coding|data_analysis|content_creation|...",
  "tags": ["..."],
  "system_prompt": "...",
  "services": [{"name":"...","description":"...","price": <points>}],
  "estimated_complexity": "simple|moderate|complex",
  "build_notes": "..."
}

JSON만 출력해야 할 때는 마크다운 코드 펜스를 쓰지 말고 순수 JSON만 출력합니다.
일반 대화 시에는 친근하고 한국어로 응답하세요.`,
  },
  'acp-helper': {
    name: 'ACPHelper',
    description:
      'ACPHelper guides you through the entire process of selling your products on ChatGPT.',
    system_prompt: `당신은 ACPHelper 입니다. ChatGPT 커머스(ACP) 통합을 도와주는 전문 에이전트입니다.
사용자가 제공한 상품 카탈로그(URL/CSV/설명)를 받아 ACP 호환 product feed JSON 과 Stripe checkout 코드를 생성합니다.
한국어로 친절히 응답하세요.`,
  },
};

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return apiJson({ error: 'slug 파라미터가 필요합니다' }, 400);

  // 1) DB 조회 (slug 일치 → id 일치)
  let row: AgentRow | undefined;
  try {
    const bySlug = await query<AgentRow>(
      'SELECT id, slug, name, description, logo_url, metadata FROM agents WHERE slug = $1 LIMIT 1',
      [slug],
    );
    row = bySlug.rows[0];

    if (!row) {
      // id 로도 시도 (uuid 형식 가정 — 실패해도 무시)
      const byId = await query<AgentRow>(
        "SELECT id, slug, name, description, logo_url, metadata FROM agents WHERE id::text = $1 LIMIT 1",
        [slug],
      );
      row = byId.rows[0];
    }
  } catch {
    // DB 오류 — 카탈로그로 폴백
  }

  if (row) {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    return apiJson({
      data: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        logo_url: row.logo_url,
        system_prompt: typeof meta.system_prompt === 'string' ? meta.system_prompt : undefined,
        source: 'db',
      },
    });
  }

  // 2) 마켓 카탈로그 폴백
  const cat = CATALOG[slug];
  if (cat) {
    return apiJson({
      data: {
        slug,
        name: cat.name,
        description: cat.description,
        logo_url: null,
        system_prompt: cat.system_prompt,
        source: 'catalog',
      },
    });
  }

  // 3) 못 찾음 — 슬러그만 humanize 해서 반환 (UI 에 헤더 표시용)
  return apiJson(
    {
      data: {
        slug,
        name: slug,
        description: undefined,
        logo_url: null,
        system_prompt: undefined,
        source: 'unknown',
      },
    },
    200,
  );
}
