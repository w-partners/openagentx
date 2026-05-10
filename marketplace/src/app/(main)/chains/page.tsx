'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const STEP_TYPE_LABELS: Record<string, string> = {
  fixed: 'Fixed Price',
  auction: 'Reverse Auction',
  matching: 'Live Matching',
  fulfill: 'AI Processing',
};

const CHAIN_STATUS_LABELS: Record<string, string> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

const CHAIN_STATUS_COLORS: Record<string, string> = {
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  cancelled: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

interface ChainFlow {
  id: string;
  name: string;
  description: string | null;
  category: string;
  steps: { name: string; type: string }[];
  total_uses: number;
  created_at: string;
  tags?: string[];
  is_featured?: boolean;
}

interface ChainInstance {
  id: string;
  flow_name?: string;
  flow_category?: string;
  flow_steps?: { name: string; type: string }[];
  current_step: number;
  status: string;
  total_cost: number;
  started_at: string;
  completed_at: string | null;
}

export default function ChainsPage() {
  const dict = useDict();
  const [flows, setFlows] = useState<ChainFlow[]>([]);
  const [featured, setFeatured] = useState<ChainFlow[]>([]);
  const [myChains, setMyChains] = useState<ChainInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<'flows' | 'my'>('flows');

  useEffect(() => {
    fetch('/api/chains?featured=true&limit=6')
      .then((r) => r.json())
      .then((res) => { if (res.success) setFeatured(res.data ?? []); })
      .catch(() => {});
  }, []);

  const loadFlows = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ flows: 'true' });
    if (selectedCategory) params.set('category', selectedCategory);
    fetch(`/api/chains?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setFlows(res.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  const loadMyChains = useCallback(() => {
    setLoading(true);
    fetch('/api/chains?my=true')
      .then((r) => r.json())
      .then((res) => { if (res.success) setMyChains(res.data ?? []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'flows') loadFlows();
    else loadMyChains();
  }, [tab, loadFlows, loadMyChains]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{dict.chainsPage.title}</h1>
            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
              {(dict.common as Record<string, string>).statusDev ?? 'In Dev'}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {dict.chainsPage.description}
          </p>
        </div>
        <Link href="/chains/create">
          <Button>{dict.chainsPage.createChain}</Button>
        </Link>
      </div>

      {/* Featured Packs */}
      {featured.length > 0 && tab === 'flows' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">✨ 추천 팩</h2>
            <Badge variant="secondary" className="text-[10px]">Featured</Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featured.map((flow) => {
              const steps = typeof flow.steps === 'string' ? JSON.parse(flow.steps) : flow.steps;
              const stepsArr = Array.isArray(steps) ? steps : [];
              return (
                <Link key={flow.id} href={`/chains/${flow.id}`} className="block">
                  <Card className="border-primary/30 bg-primary/5 transition-shadow hover:shadow-lg">
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant="outline">
                          {dict.categories[flow.category as keyof typeof dict.categories] ?? flow.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {`프롬프트 ${stepsArr.length}개`}
                        </Badge>
                      </div>
                      <CardTitle className="mt-2 text-lg">{flow.name}</CardTitle>
                      {flow.description && (
                        <CardDescription className="line-clamp-2">
                          {flow.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex flex-wrap gap-1">
                        {stepsArr.slice(0, 5).map((step: { name: string }, i: number) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            {i > 0 && <span className="text-muted-foreground mx-0.5">→</span>}
                            <span className="rounded bg-accent px-2 py-0.5 text-xs">{step.name}</span>
                          </span>
                        ))}
                      </div>
                      {flow.tags && flow.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {flow.tags.slice(0, 4).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="text-xs text-muted-foreground">
                      {dict.chainsPage.timesUsed.replace('{count}', String(flow.total_uses))}
                    </CardFooter>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('flows')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'flows' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {dict.chainsPage.chainTemplates}
        </button>
        <button
          onClick={() => setTab('my')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'my' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          My Chains
        </button>
      </div>

      {/* Flows tab */}
      {tab === 'flows' && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              All
            </button>
            {Object.entries(dict.categories).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                  selectedCategory === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{dict.chainsPage.noTemplates}</p>
              <Link href="/chains/create">
                <Button>{dict.chainsPage.createFirst}</Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {flows.map((flow) => {
                const steps = typeof flow.steps === 'string' ? JSON.parse(flow.steps) : flow.steps;
                return (
                  <Link key={flow.id} href={`/chains/${flow.id}`} className="block">
                    <Card className="hover:shadow-lg transition-shadow h-full">
                      <CardHeader>
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">
                            {dict.categories[flow.category as keyof typeof dict.categories] ?? flow.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {dict.chainsPage.timesUsed.replace('{count}', String(flow.total_uses))}
                          </span>
                        </div>
                        <CardTitle className="mt-2 text-lg">{flow.name}</CardTitle>
                        {flow.description && (
                          <CardDescription className="line-clamp-2">
                            {flow.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(steps) ? steps : []).map((step: { name: string; type: string }, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1">
                              {i > 0 && <span className="text-muted-foreground mx-0.5">&rarr;</span>}
                              <span className="text-xs bg-accent rounded px-2 py-0.5">
                                {step.name}
                              </span>
                            </span>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <div className="flex flex-wrap gap-1">
                          {(Array.isArray(steps) ? steps : []).map((step: { type: string }, i: number) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {STEP_TYPE_LABELS[step.type] ?? step.type}
                            </Badge>
                          ))}
                        </div>
                      </CardFooter>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* My chains tab */}
      {tab === 'my' && (
        <>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>
          ) : myChains.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">{dict.chainsPage.noRunning}</p>
              <p className="text-sm text-muted-foreground">{dict.chainsPage.startFromTemplate}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myChains.map((chain) => {
                const steps = chain.flow_steps
                  ? (typeof chain.flow_steps === 'string' ? JSON.parse(chain.flow_steps as unknown as string) : chain.flow_steps)
                  : [];
                return (
                  <Link key={chain.id} href={`/chains/${chain.id}`} className="block">
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{chain.flow_name ?? dict.chainsPage.chain}</h3>
                            <Badge className={CHAIN_STATUS_COLORS[chain.status] ?? ''}>
                              {CHAIN_STATUS_LABELS[chain.status] ?? chain.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ${Number(chain.total_cost).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 overflow-x-auto">
                          {(Array.isArray(steps) ? steps : []).map((step: { name: string }, i: number) => (
                            <span key={i} className="inline-flex items-center gap-1 shrink-0">
                              {i > 0 && <span className="text-muted-foreground">&rarr;</span>}
                              <span className={`text-xs rounded px-2 py-1 ${
                                i < chain.current_step
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                                  : i === chain.current_step && chain.status === 'running'
                                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                    : 'bg-accent text-muted-foreground'
                              }`}>
                                {i < chain.current_step ? '[v] ' : i === chain.current_step && chain.status === 'running' ? '... ' : ''}
                                {step.name}
                              </span>
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(chain.started_at).toLocaleString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
