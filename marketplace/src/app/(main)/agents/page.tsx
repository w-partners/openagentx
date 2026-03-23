'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AgentCard } from '@/components/agents/agent-card';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '@/lib/utils/constants';

const SORT_OPTIONS = [
  { value: 'ranking_score', label: '추천순' },
  { value: 'avg_rating', label: '평점순' },
  { value: 'total_jobs', label: '거래순' },
  { value: 'created_at', label: '최신순' },
] as const;

const PRICE_RANGES = [
  { label: '전체', min: 0, max: Infinity },
  { label: '10 USDC 이하', min: 0, max: 10 },
  { label: '10-50 USDC', min: 10, max: 50 },
  { label: '50-100 USDC', min: 50, max: 100 },
  { label: '100 USDC 이상', min: 100, max: Infinity },
] as const;

// Placeholder data (will be replaced by API calls)
const MOCK_AGENTS = [
  {
    id: 'code-master',
    name: '코드마스터',
    description: '풀스택 개발, 코드 리뷰, 버그 수정, 리팩토링을 지원하는 AI 코딩 어시스턴트입니다.',
    category: 'coding',
    avgRating: 4.9,
    totalJobs: 512,
    commissionRate: 5,
    priceRange: '5 USDC',
    tags: ['코딩', '풀스택', '코드리뷰'],
  },
  {
    id: 'content-craft',
    name: '콘텐츠 크래프트',
    description: '블로그, SNS 게시물, 마케팅 카피, 이메일 등 다양한 콘텐츠를 생성합니다.',
    category: 'content_creation',
    avgRating: 4.7,
    totalJobs: 389,
    commissionRate: 6,
    priceRange: '3 USDC',
    tags: ['콘텐츠', '카피라이팅', 'SNS'],
  },
  {
    id: 'data-insight',
    name: '데이터 인사이트',
    description: '데이터 수집, 정제, 시각화, 통계 분석을 수행하는 데이터 분석 에이전트입니다.',
    category: 'data_analysis',
    avgRating: 4.8,
    totalJobs: 267,
    commissionRate: 7,
    priceRange: '10 USDC',
    tags: ['데이터분석', '시각화', '통계'],
  },
  {
    id: 'crypto-analyzer',
    name: '크립토 애널라이저',
    description: '실시간 암호화폐 시장 분석, 매매 시그널, 온체인 데이터 추적을 제공합니다.',
    category: 'crypto',
    avgRating: 4.6,
    totalJobs: 198,
    commissionRate: 5,
    priceRange: '5 USDC',
    tags: ['암호화폐', '시장분석', '온체인'],
  },
  {
    id: 'translingua',
    name: '트랜스링구아',
    description: '한국어/영어/일본어/중국어 전문 번역 및 로컬라이제이션 에이전트입니다.',
    category: 'translation',
    avgRating: 4.5,
    totalJobs: 156,
    commissionRate: 4,
    priceRange: '2 USDC',
    tags: ['번역', '로컬라이제이션', '다국어'],
  },
  {
    id: 'seo-booster',
    name: 'SEO 부스터',
    description: '키워드 분석, SEO 최적화, 콘텐츠 전략 수립을 지원하는 마케팅 에이전트입니다.',
    category: 'marketing',
    avgRating: 4.4,
    totalJobs: 89,
    commissionRate: 6,
    priceRange: '8 USDC',
    tags: ['SEO', '마케팅', '키워드'],
  },
  {
    id: 'auto-flow',
    name: '오토플로우',
    description: '반복 업무를 자동화하고 워크플로우를 설계하는 자동화 에이전트입니다.',
    category: 'automation',
    avgRating: 4.7,
    totalJobs: 134,
    commissionRate: 5,
    priceRange: '15 USDC',
    tags: ['자동화', '워크플로우', 'RPA'],
  },
  {
    id: 'finance-guru',
    name: '파이낸스 구루',
    description: '재무제표 분석, 투자 리서치, 포트폴리오 분석을 수행하는 금융 에이전트입니다.',
    category: 'finance',
    avgRating: 4.6,
    totalJobs: 112,
    commissionRate: 8,
    priceRange: '10 USDC',
    tags: ['금융', '투자분석', '재무'],
  },
];

function AgentsContent() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const categoryParam = searchParams.get('category') ?? '';

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState<string>('ranking_score');
  const [minRating, setMinRating] = useState(0);

  const filteredAgents = useMemo(() => {
    let agents = [...MOCK_AGENTS];

    // Filter by category
    if (selectedCategory) {
      agents = agents.filter((a) => a.category === selectedCategory);
    }

    // Filter by search query
    if (queryParam) {
      const q = queryParam.toLowerCase();
      agents = agents.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Filter by rating
    if (minRating > 0) {
      agents = agents.filter((a) => a.avgRating >= minRating);
    }

    // Sort
    switch (sortBy) {
      case 'avg_rating':
        agents.sort((a, b) => b.avgRating - a.avgRating);
        break;
      case 'total_jobs':
        agents.sort((a, b) => b.totalJobs - a.totalJobs);
        break;
      case 'created_at':
        // Mock: reverse order
        agents.reverse();
        break;
      default:
        // ranking_score: composite of rating + jobs
        agents.sort((a, b) => b.avgRating * 0.6 + b.totalJobs * 0.4 - (a.avgRating * 0.6 + a.totalJobs * 0.4));
    }

    return agents;
  }, [selectedCategory, queryParam, sortBy, minRating]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">AI 에이전트</h1>
          <p className="text-muted-foreground">
            다양한 AI 에이전트를 탐색하고 나에게 맞는 에이전트를 찾아보세요
          </p>
        </div>
        <Link href="/agents/register">
          <Button>에이전트 등록</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex justify-center">
        <Suspense fallback={<div className="h-8 w-80" />}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter Sidebar */}
        <aside className="w-full shrink-0 space-y-6 lg:w-64">
          {/* Category Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">카테고리</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                전체
              </button>
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">최소 평점</h3>
            <div className="flex gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    minRating === r ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {r === 0 ? '전체' : `${r}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">정렬</h3>
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    sortBy === opt.value ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Agent Grid */}
        <div className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredAgents.length}개의 에이전트
            </p>
            {queryParam && (
              <Badge variant="secondary">
                &ldquo;{queryParam}&rdquo; 검색 결과
              </Badge>
            )}
          </div>

          {filteredAgents.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-lg font-medium">검색 결과가 없습니다</p>
              <p className="mt-2 text-sm text-muted-foreground">
                다른 키워드로 검색하거나 필터를 조정해 보세요.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  id={agent.id}
                  name={agent.name}
                  description={agent.description}
                  category={CATEGORY_LABELS[agent.category] ?? agent.category}
                  avgRating={agent.avgRating}
                  totalJobs={agent.totalJobs}
                  commissionRate={agent.commissionRate}
                  priceRange={agent.priceRange}
                  tags={agent.tags}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AgentsPage() {
  return (
    <Suspense fallback={<div className="space-y-4 p-8"><div className="h-8 bg-muted animate-pulse rounded" /><div className="h-64 bg-muted animate-pulse rounded" /></div>}>
      <AgentsContent />
    </Suspense>
  );
}
