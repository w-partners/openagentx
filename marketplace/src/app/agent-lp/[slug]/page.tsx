/**
 * Agent Landing Page (subdomain rewrite target).
 *
 * URL 흐름:
 *   <slug>.openagentx.org/  →  middleware rewrite  →  /agent-lp/<slug>
 *
 * Server Component — DB 에서 에이전트 메타를 조회한다.
 * 못 찾으면 시드 카탈로그(AgentBuilder/ACPHelper 등)에서 폴백.
 */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { query } from '@/lib/db/pool';

interface AgentLPRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  description_ko: string | null;
  category: string;
  tags: string[] | null;
  logo_url: string | null;
  avg_rating: number | null;
  total_jobs: number | null;
  total_reviews: number | null;
}

interface AgentService {
  name: string;
  description: string;
  price_usdc: number;
}

const CATALOG: Record<
  string,
  {
    name: string;
    description: string;
    description_ko: string;
    category: string;
    tags: string[];
    services: { name: string; description: string; price_usdc: number }[];
  }
> = {
  'agent-builder': {
    name: 'AgentBuilder',
    description:
      'AgentBuilder analyzes GitHub repositories, documentation, articles, and descriptions to automatically create fully functional AI agents.',
    description_ko:
      'GitHub 저장소, 문서, 기사, 설명을 분석해 완전 동작하는 AI 에이전트를 자동 생성합니다. 자료(URL/문서/설명)만 제공하면 시스템 프롬프트, 서비스, 가격, 마켓 등록까지 한 번에 처리합니다.',
    category: 'Automation',
    tags: ['agent', 'builder', 'github', 'automation'],
    services: [
      { name: 'Basic Agent Build', description: '간단한 에이전트 1개 생성', price_usdc: 5 },
      { name: 'Advanced Agent Build', description: '복잡 저장소 분석 + 멀티 서비스', price_usdc: 20 },
      { name: 'Agent Chain Build', description: '워크플로우 체인 + 다중 에이전트', price_usdc: 50 },
    ],
  },
  'acp-helper': {
    name: 'ACPHelper',
    description:
      'ACPHelper guides you through the entire process of selling your products on ChatGPT.',
    description_ko:
      'ChatGPT 커머스(ACP) 통합을 처음부터 끝까지 안내합니다. 상품 카탈로그를 받아 ACP product feed JSON 과 Stripe checkout 코드를 자동 생성합니다.',
    category: 'Automation',
    tags: ['acp', 'chatgpt', 'commerce', 'stripe'],
    services: [
      { name: 'Product Feed Generation', description: 'ACP-호환 상품 피드 JSON 생성', price_usdc: 5 },
      { name: 'Stripe Checkout Endpoint', description: 'Stripe checkout 코드 생성', price_usdc: 10 },
    ],
  },
};

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function loadAgent(slug: string): Promise<{
  agent: AgentLPRow | null;
  services: AgentService[];
  fromCatalog: boolean;
}> {
  // DB 조회 (slug 또는 id)
  try {
    const rs = await query<AgentLPRow>(
      `SELECT id, slug, name, description, description_ko, category, tags, logo_url,
              avg_rating, total_jobs, total_reviews
       FROM agents
       WHERE slug = $1 OR id::text = $1
       LIMIT 1`,
      [slug],
    );
    const row = rs.rows[0];
    if (row) {
      let services: AgentService[] = [];
      try {
        const sv = await query<{ name: string; description: string; price_usdc: number }>(
          `SELECT name, description, price_usdc FROM agent_services WHERE agent_id = $1 AND is_active = TRUE ORDER BY price_usdc ASC LIMIT 10`,
          [row.id],
        );
        services = sv.rows.map((r) => ({
          name: r.name,
          description: r.description,
          price_usdc: Number(r.price_usdc) || 0,
        }));
      } catch {
        services = [];
      }
      return { agent: row, services, fromCatalog: false };
    }
  } catch {
    // DB 오류 → 카탈로그 폴백
  }

  const cat = CATALOG[slug];
  if (cat) {
    const fakeAgent: AgentLPRow = {
      id: '',
      slug,
      name: cat.name,
      description: cat.description,
      description_ko: cat.description_ko,
      category: cat.category,
      tags: cat.tags,
      logo_url: null,
      avg_rating: 5.0,
      total_jobs: 0,
      total_reviews: 0,
    };
    return { agent: fakeAgent, services: cat.services, fromCatalog: true };
  }

  return { agent: null, services: [], fromCatalog: false };
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const { agent } = await loadAgent(slug);
  if (!agent) {
    return { title: 'Agent not found — OpenAgentX' };
  }
  return {
    title: `${agent.name} — OpenAgentX`,
    description: agent.description_ko ?? agent.description,
  };
}

export default async function AgentLandingPage({ params }: PageProps) {
  const { slug } = await params;
  const { agent, services } = await loadAgent(slug);

  if (!agent) {
    notFound();
  }

  const headline = agent.description_ko ?? agent.description;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
      {/* Header */}
      <header className="space-y-4 text-center">
        {agent.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={agent.logo_url}
            alt={agent.name}
            className="mx-auto h-20 w-20 rounded-2xl object-cover border border-border"
          />
        ) : (
          <div className="mx-auto h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
            {agent.name.charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-4xl font-bold tracking-tight">{agent.name}</h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {headline}
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
          <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-xs font-medium">
            {agent.category}
          </span>
          {(agent.tags ?? []).slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* Big CTA */}
      <div className="flex flex-col items-center gap-3">
        <Link
          href={`/chat?agent=${encodeURIComponent(agent.slug)}`}
          className="inline-flex items-center justify-center rounded-2xl bg-primary px-10 py-5 text-lg font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg"
        >
          💬 지금 채팅하기
        </Link>
        <p className="text-xs text-muted-foreground">
          1-클릭으로 {agent.name} 와 대화 시작
        </p>
      </div>

      {/* Stats */}
      {(agent.avg_rating !== null || agent.total_jobs !== null) && (
        <section className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">평점</p>
            <p className="text-2xl font-bold mt-1">
              {agent.avg_rating !== null ? Number(agent.avg_rating).toFixed(1) : '—'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">완료 작업</p>
            <p className="text-2xl font-bold mt-1">{agent.total_jobs ?? 0}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">리뷰</p>
            <p className="text-2xl font-bold mt-1">{agent.total_reviews ?? 0}</p>
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">서비스 & 가격</h2>
          <div className="grid gap-3">
            {services.map((svc, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="space-y-1 pr-4">
                  <p className="font-medium">{svc.name}</p>
                  <p className="text-sm text-muted-foreground">{svc.description}</p>
                </div>
                <span className="text-lg font-bold whitespace-nowrap">
                  ${svc.price_usdc}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer link */}
      <footer className="pt-8 border-t border-border text-center space-y-2">
        <Link
          href={`https://openagentx.org/ko/agents/${encodeURIComponent(agent.slug)}`}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
        >
          원본 마켓플레이스로 가기 →
        </Link>
        <p className="text-xs text-muted-foreground/60">Powered by OpenAgentX</p>
      </footer>
    </main>
  );
}
