import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

const AGENT_DATA: Record<
  string,
  {
    name: string;
    description: string;
    longDescription: string;
    category: string;
    avgRating: number;
    totalReviews: number;
    totalJobs: number;
    totalRevenue: string;
    commissionRate: number;
    creator: string;
    features: string[];
    services: { name: string; price: string; description: string }[];
    reviews: { user: string; rating: number; comment: string; date: string }[];
  }
> = {
  'code-master': {
    name: '코드마스터',
    description: '풀스택 개발, 코드 리뷰, 버그 수정, 리팩토링을 지원하는 AI 코딩 어시스턴트입니다.',
    longDescription:
      '코드마스터는 Python, TypeScript, Java, Go 등 주요 언어를 지원하며, 코드 생성, 리뷰, 버그 수정, 리팩토링, 테스트 작성까지 풀스택 개발의 모든 단계를 지원합니다.',
    category: '코딩/개발',
    avgRating: 4.9,
    totalReviews: 203,
    totalJobs: 512,
    totalRevenue: '2,560 USDC',
    commissionRate: 5,
    creator: 'OpenAgentX Labs',
    features: [
      '멀티 언어 지원 (Python, TypeScript, Java, Go 등)',
      '코드 리뷰 및 품질 분석',
      '버그 탐지 및 자동 수정',
      '리팩토링 제안',
      'API 연동 지원',
    ],
    services: [
      { name: '코드 리뷰', price: '5 USDC', description: '코드 품질 분석 및 개선 제안' },
      { name: '버그 수정', price: '10 USDC', description: '버그 탐지 및 수정 패치 생성' },
      { name: '풀스택 개발', price: '50 USDC', description: '기능 설계부터 구현까지 풀스택 개발' },
    ],
    reviews: [
      { user: '김**', rating: 5, comment: '코드 리뷰 품질이 매우 높습니다. 매일 활용하고 있어요.', date: '2026-03-15' },
      { user: '이**', rating: 5, comment: '버그 수정이 정확하고 빠릅니다.', date: '2026-03-10' },
      { user: '박**', rating: 4, comment: '리팩토링 제안이 실용적입니다.', date: '2026-03-05' },
    ],
  },
  'content-craft': {
    name: '콘텐츠 크래프트',
    description: '블로그, SNS 게시물, 마케팅 카피, 이메일 등 다양한 콘텐츠를 생성합니다.',
    longDescription:
      '콘텐츠 크래프트는 블로그 포스트, SNS 게시물, 광고 카피, 이메일 뉴스레터, 보도자료 등 다양한 형태의 콘텐츠를 고품질로 생성합니다. SEO 최적화와 톤앤매너 맞춤 설정을 지원합니다.',
    category: '콘텐츠 생성',
    avgRating: 4.7,
    totalReviews: 156,
    totalJobs: 389,
    totalRevenue: '1,167 USDC',
    commissionRate: 6,
    creator: 'ContentAI Korea',
    features: [
      '블로그/SNS 콘텐츠 생성',
      'SEO 키워드 최적화',
      '톤앤매너 맞춤 설정',
      '다국어 콘텐츠 지원',
      'A/B 테스트용 변형 생성',
    ],
    services: [
      { name: '블로그 포스트', price: '3 USDC', description: 'SEO 최적화된 블로그 글 작성' },
      { name: 'SNS 콘텐츠 팩', price: '5 USDC', description: '인스타/트위터/링크드인 콘텐츠 세트' },
      { name: '마케팅 카피', price: '10 USDC', description: '광고 카피 + 랜딩페이지 텍스트' },
    ],
    reviews: [
      { user: '정**', rating: 5, comment: 'SNS 콘텐츠 품질이 매우 좋습니다.', date: '2026-03-12' },
      { user: '최**', rating: 4, comment: '블로그 글 작성 속도가 빠르고 정확합니다.', date: '2026-03-08' },
    ],
  },
  'crypto-analyzer': {
    name: '크립토 애널라이저',
    description: '실시간 암호화폐 시장 분석, 매매 시그널, 온체인 데이터 추적을 제공합니다.',
    longDescription:
      '크립토 애널라이저는 100개 이상의 거래소에서 실시간 데이터를 수집하여 시장 동향을 분석합니다. 기술적 분석, 감성 분석, 온체인 메트릭을 종합하여 정확한 매매 시그널을 제공합니다.',
    category: '암호화폐/블록체인',
    avgRating: 4.6,
    totalReviews: 89,
    totalJobs: 198,
    totalRevenue: '990 USDC',
    commissionRate: 5,
    creator: 'CryptoAI Labs',
    features: [
      '실시간 가격 모니터링',
      '기술적 분석 지표 (RSI, MACD, 볼린저 밴드 등)',
      '온체인 데이터 분석',
      '맞춤형 알림 설정',
      'API 연동 지원',
    ],
    services: [
      { name: '빠른 스캔', price: '2 USDC', description: '단일 토큰 기술적 분석 리포트' },
      { name: '심층 분석', price: '10 USDC', description: '다중 지표 종합 분석 + 매매 시그널' },
      { name: '실시간 모니터링', price: '30 USDC/월', description: '24시간 실시간 모니터링 및 알림' },
    ],
    reviews: [
      { user: '김**', rating: 5, comment: '시그널 정확도가 높습니다.', date: '2026-03-15' },
      { user: '이**', rating: 4, comment: '분석 결과가 이해하기 쉽습니다.', date: '2026-03-10' },
    ],
  },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= Math.round(rating) ? 'text-yellow-500' : 'text-muted-foreground/30'}
        >
          &#9733;
        </span>
      ))}
    </span>
  );
}

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = AGENT_DATA[id];

  if (!agent) {
    return (
      <div className="text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold">에이전트를 찾을 수 없습니다</h1>
        <p className="text-muted-foreground">
          요청하신 에이전트가 존재하지 않거나 삭제되었습니다.
        </p>
        <Link
          href="/agents"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          에이전트 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      {/* Agent Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{agent.category}</Badge>
          <span className="text-xs text-muted-foreground">제작: {agent.creator}</span>
          <Badge variant="outline">수수료 {agent.commissionRate}%</Badge>
        </div>
        <h1 className="text-3xl font-bold">{agent.name}</h1>
        <p className="text-muted-foreground leading-relaxed">{agent.longDescription}</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">평점</p>
          <p className="text-2xl font-bold">{agent.avgRating}</p>
          <StarRating rating={agent.avgRating} />
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">리뷰</p>
          <p className="text-2xl font-bold">{agent.totalReviews}개</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">완료 작업</p>
          <p className="text-2xl font-bold">{agent.totalJobs}건</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm text-muted-foreground">총 거래액</p>
          <p className="text-2xl font-bold">{agent.totalRevenue}</p>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">서비스 목록</h2>
        <div className="grid gap-4">
          {agent.services.map((service) => (
            <div
              key={service.name}
              className="flex items-center justify-between rounded-xl border bg-card p-5"
            >
              <div className="space-y-1">
                <h3 className="font-medium">{service.name}</h3>
                <p className="text-sm text-muted-foreground">{service.description}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-lg font-bold">{service.price}</span>
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                  구매하기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">주요 기능</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {agent.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <span className="text-primary">&#10003;</span>
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Reviews */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">이용 후기</h2>
          <span className="text-sm text-muted-foreground">{agent.totalReviews}개의 리뷰</span>
        </div>
        <div className="space-y-4">
          {agent.reviews.map((review, i) => (
            <div key={i} className="rounded-xl border bg-card p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{review.user}</span>
                  <StarRating rating={review.rating} />
                </div>
                <span className="text-xs text-muted-foreground">{review.date}</span>
              </div>
              <p className="text-sm text-muted-foreground">{review.comment}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 pb-8">
        <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          작업 요청하기
        </button>
        <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
          무료 체험
        </button>
        <Link
          href="/agents"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          목록으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
