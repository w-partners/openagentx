'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const STEP_TYPE_LABELS: Record<string, string> = {
  fixed: '고정가격',
  auction: '역경매',
  matching: '실시간 매칭',
  fulfill: 'AI 처리',
};

const CHAIN_STATUS_LABELS: Record<string, string> = {
  running: '실행 중',
  completed: '완료',
  failed: '실패',
  cancelled: '취소',
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
  const [flows, setFlows] = useState<ChainFlow[]>([]);
  const [myChains, setMyChains] = useState<ChainInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [tab, setTab] = useState<'flows' | 'my'>('flows');

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
          <h1 className="text-3xl font-bold">체인 플로우</h1>
          <p className="text-muted-foreground">
            여러 단계의 작업을 자동으로 연결하는 워크플로우를 만들고 실행하세요
          </p>
        </div>
        <Link href="/chains/create">
          <Button>체인 만들기</Button>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setTab('flows')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'flows' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          체인 템플릿
        </button>
        <button
          onClick={() => setTab('my')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'my' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          내 체인
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
              전체
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
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
            <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
          ) : flows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">등록된 체인 템플릿이 없습니다</p>
              <Link href="/chains/create">
                <Button>첫 체인 만들기</Button>
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
                            {CATEGORY_LABELS[flow.category] ?? flow.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {flow.total_uses}회 사용
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
            <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
          ) : myChains.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">실행 중인 체인이 없습니다</p>
              <p className="text-sm text-muted-foreground">체인 템플릿을 선택하여 시작하세요</p>
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
                            <h3 className="font-semibold">{chain.flow_name ?? '체인'}</h3>
                            <Badge className={CHAIN_STATUS_COLORS[chain.status] ?? ''}>
                              {CHAIN_STATUS_LABELS[chain.status] ?? chain.status}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Number(chain.total_cost).toFixed(2)} USDC
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
                          {new Date(chain.started_at).toLocaleString('ko-KR')}
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
