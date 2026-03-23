import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BOUNTY_STATUS_LABELS, CATEGORY_LABELS } from '@/lib/utils/constants';

const BOUNTY_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  pending_match: 'secondary',
  claimed: 'outline',
  fulfilled: 'secondary',
  cancelled: 'destructive',
};

// Demo bounties for SSR (replace with API fetch)
const demoBounties = [
  {
    id: '1',
    title: 'React/Next.js 코드 리뷰 자동화 에이전트',
    description: 'PR 생성 시 자동으로 코드 리뷰를 수행하고 개선 사항을 제안하는 에이전트를 찾습니다.',
    category: 'coding',
    budget_usdc: 500,
    status: 'open',
    deadline: '2026-04-15',
    created_at: '2026-03-20',
  },
  {
    id: '2',
    title: '다국어 콘텐츠 번역 에이전트 (한/영/일)',
    description: '마케팅 콘텐츠를 한국어, 영어, 일본어로 자연스럽게 번역하는 에이전트가 필요합니다.',
    category: 'translation',
    budget_usdc: 300,
    status: 'pending_match',
    deadline: '2026-04-20',
    created_at: '2026-03-18',
  },
  {
    id: '3',
    title: 'SNS 마케팅 콘텐츠 자동 생성',
    description: '브랜드 톤에 맞는 인스타그램, 트위터 콘텐츠를 자동으로 생성하는 에이전트를 구합니다.',
    category: 'marketing',
    budget_usdc: 400,
    status: 'claimed',
    deadline: null,
    created_at: '2026-03-15',
  },
  {
    id: '4',
    title: '데이터 시각화 리포트 자동 생성',
    description: 'CSV/Excel 데이터를 분석하고 인사이트가 담긴 시각화 리포트를 자동 생성하는 에이전트가 필요합니다.',
    category: 'data_analysis',
    budget_usdc: 600,
    status: 'fulfilled',
    deadline: '2026-03-10',
    created_at: '2026-03-01',
  },
  {
    id: '5',
    title: '암호화폐 포트폴리오 리밸런싱 에이전트',
    description: '포트폴리오 자산 배분을 분석하고 최적의 리밸런싱 전략을 제안하는 에이전트를 찾습니다.',
    category: 'crypto',
    budget_usdc: 800,
    status: 'open',
    deadline: '2026-05-01',
    created_at: '2026-03-21',
  },
];

export default function BountiesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">바운티</h1>
        <p className="text-muted-foreground">
          원하는 AI 에이전트를 요청하고 적합한 에이전트를 매칭받으세요
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['전체', ...Object.values(CATEGORY_LABELS)].map((cat) => (
          <button
            key={cat}
            className="rounded-full border px-4 py-1.5 text-sm hover:bg-accent transition-colors"
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(BOUNTY_STATUS_LABELS).map(([key, label]) => (
          <button
            key={key}
            className="rounded-full border px-3 py-1 text-xs hover:bg-accent transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Bounty list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {demoBounties.map((bounty) => {
          const statusLabel = BOUNTY_STATUS_LABELS[bounty.status] ?? BOUNTY_STATUS_LABELS.open;
          const statusVariant = BOUNTY_STATUS_VARIANTS[bounty.status] ?? 'default';
          const categoryLabel = CATEGORY_LABELS[bounty.category] ?? bounty.category;

          return (
            <a
              key={bounty.id}
              href={`/bounties/${bounty.id}`}
              className="block"
            >
              <Card className="hover:shadow-lg transition-shadow h-full">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={statusVariant}>{statusLabel}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabel}
                    </span>
                  </div>
                  <CardTitle className="mt-2">{bounty.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {bounty.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-primary">
                      {bounty.budget_usdc.toLocaleString()} USDC
                    </span>
                    {bounty.deadline && (
                      <span className="text-muted-foreground text-xs">
                        마감: {bounty.deadline}
                      </span>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <span className="text-xs text-muted-foreground">
                    등록일: {bounty.created_at}
                  </span>
                </CardFooter>
              </Card>
            </a>
          );
        })}
      </div>

      {/* CTA */}
      <div className="text-center py-8">
        <a
          href="/api/bounties"
          className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          새 바운티 등록하기
        </a>
      </div>
    </div>
  );
}
