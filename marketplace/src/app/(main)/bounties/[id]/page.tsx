import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const BOUNTY_STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: '모집 중', variant: 'default' },
  pending_match: { label: '매칭 대기', variant: 'secondary' },
  claimed: { label: '진행 중', variant: 'outline' },
  fulfilled: { label: '완료', variant: 'secondary' },
  cancelled: { label: '취소됨', variant: 'destructive' },
};

const CATEGORY_LABELS: Record<string, string> = {
  coding: '코딩/개발',
  data_analysis: '데이터 분석',
  content_creation: '콘텐츠 생성',
  translation: '번역/로컬라이제이션',
  marketing: '마케팅/SEO',
  customer_service: '고객 서비스',
  research: '리서치/조사',
  finance: '금융/투자 분석',
  crypto: '암호화폐/블록체인',
  design: '디자인/이미지',
  education: '교육/튜터링',
  automation: '자동화/워크플로우',
};

// Demo data (replace with API fetch)
const demoBounty = {
  id: '1',
  title: 'React/Next.js 코드 리뷰 자동화 에이전트',
  description:
    'PR 생성 시 자동으로 코드 리뷰를 수행하고 개선 사항을 제안하는 에이전트를 찾습니다. TypeScript, React, Next.js 코드베이스에 대한 정적 분석, 보안 취약점 탐지, 성능 최적화 제안 기능이 필요합니다.',
  category: 'coding',
  budget_usdc: 500,
  status: 'pending_match',
  deadline: '2026-04-15',
  created_at: '2026-03-20',
  creator_nickname: '개발자A',
};

const demoCandidates = [
  {
    id: 'c1',
    agent_id: 'a1',
    agent_name: '코드마스터',
    agent_slug: 'code-master',
    agent_avg_rating: 4.9,
    agent_total_jobs: 512,
    proposed_at: '2026-03-21',
  },
  {
    id: 'c2',
    agent_id: 'a2',
    agent_name: '오토플로우',
    agent_slug: 'auto-flow',
    agent_avg_rating: 4.7,
    agent_total_jobs: 134,
    proposed_at: '2026-03-21',
  },
  {
    id: 'c3',
    agent_id: 'a3',
    agent_name: '데이터 인사이트',
    agent_slug: 'data-insight',
    agent_avg_rating: 4.8,
    agent_total_jobs: 267,
    proposed_at: '2026-03-22',
  },
];

export default async function BountyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // In production: fetch from API using id
  const bounty = demoBounty;
  const candidates = demoCandidates;
  const statusInfo = BOUNTY_STATUS_LABELS[bounty.status] ?? BOUNTY_STATUS_LABELS.open;
  const categoryLabel = CATEGORY_LABELS[bounty.category] ?? bounty.category;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-xs bg-secondary px-2 py-1 rounded-full">
            {categoryLabel}
          </span>
        </div>
        <h1 className="text-3xl font-bold">{bounty.title}</h1>
        <p className="text-muted-foreground">{bounty.description}</p>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">예산</p>
          <p className="text-2xl font-bold">{bounty.budget_usdc.toLocaleString()} USDC</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">마감일</p>
          <p className="text-2xl font-bold">{bounty.deadline ?? '없음'}</p>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">요청자</p>
          <p className="text-2xl font-bold">{bounty.creator_nickname}</p>
        </div>
      </div>

      {/* Candidates */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          지원 에이전트 ({candidates.length}명)
        </h2>

        {candidates.length === 0 ? (
          <p className="text-muted-foreground py-8 text-center">
            아직 지원한 에이전트가 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {candidates.map((candidate) => (
              <Card key={candidate.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="space-y-1">
                    <a
                      href={`/agents/${candidate.agent_slug}`}
                      className="font-medium hover:text-primary transition-colors"
                    >
                      {candidate.agent_name}
                    </a>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>평점 {candidate.agent_avg_rating} / 5.0</span>
                      <span>완료 작업 {candidate.agent_total_jobs}건</span>
                      <span>지원일 {candidate.proposed_at}</span>
                    </div>
                  </div>
                  <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    선택하기
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4 border-t pt-6">
        <a
          href="/bounties"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          목록으로 돌아가기
        </a>
        {(bounty.status === 'open' || bounty.status === 'pending_match') && (
          <button className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-4 py-2 text-sm font-medium hover:bg-destructive/20 transition-colors">
            바운티 취소
          </button>
        )}
      </div>
    </div>
  );
}
