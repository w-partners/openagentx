'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AgentCard } from '@/components/agents/agent-card';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';
import { useDict } from '@/i18n/client';
import { type PointConfig, type PaymentMode, DEFAULT_POINT_CONFIG, usdcToPoints, formatPoints } from '@/lib/utils/points';

interface ApiAgent {
  id: string;
  name: string;
  description: string;
  description_ko?: string | null;
  category: string;
  tags?: string[];
  avg_rating?: number | string;
  total_jobs?: number;
  commission_rate?: number | string;
  status?: string;
}

interface NormalizedAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  avgRating: number;
  totalJobs: number;
  commissionRate: number;
  priceRange: string;
  tags: string[];
  operationalStatus: 'active' | 'dev';
}

function AgentsContent() {
  const dict = useDict();
  const t = dict.agentsPage;
  const searchParams = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const categoryParam = searchParams.get('category') ?? '';

  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [sortBy, setSortBy] = useState<string>('ranking_score');
  const [minRating, setMinRating] = useState(0);
  const [rankingWeights, setRankingWeights] = useState({ rating: 40, transactions: 30, commission: 15, recency: 15 });
  const [pointConfig, setPointConfig] = useState<PointConfig>(DEFAULT_POINT_CONFIG);
  const [apiAgents, setApiAgents] = useState<ApiAgent[] | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.settings?.ranking_weights) {
          setRankingWeights(d.settings.ranking_weights);
        }
        if (d?.settings?.point_config) {
          setPointConfig({ ...DEFAULT_POINT_CONFIG, ...d.settings.point_config });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (queryParam) params.set('q', queryParam);
    if (selectedCategory) params.set('category', selectedCategory);
    if (sortBy && sortBy !== 'ranking_score') params.set('sort', sortBy);

    fetch(`/api/agents?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setApiAgents(Array.isArray(d?.data) ? d.data : []))
      .catch(() => setApiAgents([]));
  }, [queryParam, selectedCategory, sortBy]);

  const SORT_OPTIONS = [
    { value: 'ranking_score', label: t.sortRecommended },
    { value: 'avg_rating', label: t.sortRating },
    { value: 'total_jobs', label: t.sortJobs },
    { value: 'created_at', label: t.sortNewest },
  ] as const;

  const ab = (dict as unknown as Record<string, Record<string, string>>).agentBuilder;
  const statusLabels = {
    active: (dict.common as Record<string, string>).statusActive ?? 'Active',
    dev: (dict.common as Record<string, string>).statusDev ?? 'In Dev',
  };

  const MOCK_AGENTS = [
    {
      id: 'agent-builder',
      name: 'AgentBuilder',
      description: ab?.description ?? 'AI Agent that builds other AI agents',
      category: 'automation',
      avgRating: 5.0,
      totalJobs: 0,
      commissionRate: 0.5,
      priceRange: '$5',
      tags: ['AgentBuilder', 'AI', 'GitHub'],
      operationalStatus: 'active' as const,
    },
    {
      id: 'acp-helper',
      name: 'ACPHelper',
      description: ab?.description ?? 'ChatGPT commerce setup assistant',
      category: 'automation',
      avgRating: 5.0,
      totalJobs: 0,
      commissionRate: 0.5,
      priceRange: '$5',
      tags: ['ACP', 'ChatGPT', 'Stripe'],
      operationalStatus: 'active' as const,
    },
    {
      id: 'code-master',
      name: t.codeMaster,
      description: t.codeMasterDesc,
      category: 'coding',
      avgRating: 4.9,
      totalJobs: 512,
      commissionRate: 0.5,
      priceRange: '$5',
      tags: [dict.categories.coding, 'Full-stack', 'Code Review'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'content-craft',
      name: t.contentCraft,
      description: t.contentCraftDesc,
      category: 'content_creation',
      avgRating: 4.7,
      totalJobs: 389,
      commissionRate: 0.75,
      priceRange: '$3',
      tags: [dict.categories.content_creation, 'Copywriting', 'SNS'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'data-insight',
      name: t.dataInsight,
      description: t.dataInsightDesc,
      category: 'data_analysis',
      avgRating: 4.8,
      totalJobs: 267,
      commissionRate: 1,
      priceRange: '$10',
      tags: [dict.categories.data_analysis, 'Visualization', 'Statistics'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'crypto-analyzer',
      name: t.cryptoAnalyzer,
      description: t.cryptoAnalyzerDesc,
      category: 'crypto',
      avgRating: 4.6,
      totalJobs: 198,
      commissionRate: 0.5,
      priceRange: '$5',
      tags: [dict.categories.crypto, 'Market Analysis', 'On-chain'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'translingua',
      name: t.translingua,
      description: t.translinguaDesc,
      category: 'translation',
      avgRating: 4.5,
      totalJobs: 156,
      commissionRate: 0.25,
      priceRange: '$2',
      tags: [dict.categories.translation, 'Multilingual'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'seo-booster',
      name: t.seoBooster,
      description: t.seoBoosterDesc,
      category: 'marketing',
      avgRating: 4.4,
      totalJobs: 89,
      commissionRate: 0.75,
      priceRange: '$8',
      tags: ['SEO', dict.categories.marketing],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'auto-flow',
      name: t.autoFlow,
      description: t.autoFlowDesc,
      category: 'automation',
      avgRating: 4.7,
      totalJobs: 134,
      commissionRate: 0.5,
      priceRange: '$15',
      tags: [dict.categories.automation, 'RPA'],
      operationalStatus: 'dev' as const,
    },
    {
      id: 'finance-guru',
      name: t.financeGuru,
      description: t.financeGuruDesc,
      category: 'finance',
      avgRating: 4.6,
      totalJobs: 112,
      commissionRate: 1,
      priceRange: '$10',
      tags: [dict.categories.finance, 'Portfolio'],
      operationalStatus: 'dev' as const,
    },
  ];

  const normalizedApiAgents: NormalizedAgent[] | null = useMemo(() => {
    if (!apiAgents) return null;
    return apiAgents.map((a) => ({
      id: a.id,
      name: a.name,
      description: a.description_ko ?? a.description,
      category: a.category,
      avgRating: Number(a.avg_rating ?? 0),
      totalJobs: Number(a.total_jobs ?? 0),
      commissionRate: Number(a.commission_rate ?? 0),
      priceRange: '$5',
      tags: a.tags ?? [],
      operationalStatus: 'active' as const,
    }));
  }, [apiAgents]);

  const sourceAgents: NormalizedAgent[] =
    normalizedApiAgents && normalizedApiAgents.length > 0
      ? normalizedApiAgents
      : MOCK_AGENTS;

  const filteredAgents = useMemo(() => {
    let agents = [...sourceAgents];

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
      default: {
        // ranking_score: composite using admin-configured weights
        const rw = rankingWeights;
        const totalW = (rw.rating + rw.transactions + rw.commission + rw.recency) || 100;
        const score = (a: typeof agents[0]) =>
          (a.avgRating / 5) * (rw.rating / totalW) +
          Math.min(a.totalJobs / 500, 1) * (rw.transactions / totalW) +
          (1 - a.commissionRate / 100) * (rw.commission / totalW) +
          0.5 * (rw.recency / totalW); // mock recency
        agents.sort((a, b) => score(b) - score(a));
      }
    }

    // Always show active (working) agents first, regardless of sort
    agents.sort((a, b) => {
      if (a.operationalStatus === 'active' && b.operationalStatus !== 'active') return -1;
      if (a.operationalStatus !== 'active' && b.operationalStatus === 'active') return 1;
      return 0;
    });

    return agents;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceAgents, selectedCategory, queryParam, sortBy, minRating, rankingWeights, t]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">
            {t.description}
          </p>
        </div>
        <Link href="/agents/register">
          <Button>{t.registerAgent}</Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="secondary" className="text-[10px]">AI</Badge>
          <span>{(t as Record<string, string>).aiHint ?? '자연어로 물어보세요 — AI가 가장 알맞은 에이전트를 찾아드립니다'}</span>
        </div>
        <Suspense fallback={<div className="h-8 w-80" />}>
          <SearchBar />
        </Suspense>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Filter Sidebar */}
        <aside className="w-full shrink-0 space-y-6 lg:w-64">
          {/* Category Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t.category}</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('')}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {t.all}
              </button>
              {SERVICE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat === selectedCategory ? '' : cat)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    selectedCategory === cat ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {dict.categories[cat as keyof typeof dict.categories] ?? cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rating Filter */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t.minRating}</h3>
            <div className="flex gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    minRating === r ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                  }`}
                >
                  {r === 0 ? t.all : `${r}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">{t.sort}</h3>
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
              {t.agentCount.replace('{count}', String(filteredAgents.length))}
            </p>
            {queryParam && (
              <Badge variant="secondary">
                {t.searchResults.replace('{query}', queryParam)}
              </Badge>
            )}
          </div>

          {filteredAgents.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center">
              <p className="text-lg font-medium">{t.noResults}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t.noResultsHint}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => {
                const usdcNum = parseFloat(agent.priceRange.replace(/[^0-9.]/g, '')) || 0;
                const showUsdc = pointConfig.paymentMode === 'usdc' || pointConfig.paymentMode === 'both';
                const showPoints = pointConfig.enabled && (pointConfig.paymentMode === 'points' || pointConfig.paymentMode === 'both');
                return (
                  <AgentCard
                    key={agent.id}
                    id={agent.id}
                    name={agent.name}
                    description={agent.description}
                    category={dict.categories[agent.category as keyof typeof dict.categories] ?? agent.category}
                    avgRating={agent.avgRating}
                    totalJobs={agent.totalJobs}
                    commissionRate={agent.commissionRate}
                    priceRange={showUsdc ? agent.priceRange : undefined}
                    priceRangePoints={showPoints ? formatPoints(usdcToPoints(usdcNum)) : undefined}
                    tags={agent.tags}
                    completedLabel={t.completed.replace('{count}', String(agent.totalJobs))}
                    commissionLabel={t.commission.replace('{rate}', String(agent.commissionRate))}
                    operationalStatus={agent.operationalStatus}
                    operationalLabel={statusLabels[agent.operationalStatus]}
                  />
                );
              })}
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
