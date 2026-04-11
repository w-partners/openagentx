'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface CustomAgentRow {
  id: string;
  name: string;
  category: string;
  creator_id: string;
  creator_email: string | null;
  creator_nickname: string;
  status: string;
  price_points: number;
  usage_count: number;
  created_at: string;
  source?: 'custom' | 'default' | 'platform';
}

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  featured: 'default',
  disabled: 'destructive',
};

export default function AgentsSection() {
  const [agents, setAgents] = useState<CustomAgentRow[]>([]);
  const [defaultAgents, setDefaultAgents] = useState<CustomAgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAgents = useCallback(() => {
    setLoading(true);

    // Fetch custom agents
    const params = new URLSearchParams({
      source: 'custom',
      page: String(page),
      limit: String(limit),
    });
    if (categoryFilter) params.set('category', categoryFilter);
    if (statusFilter) params.set('status', statusFilter);

    // Fetch both custom and default agents
    Promise.all([
      fetch(`/api/admin/agents?${params}`).then((r) => r.json()),
      fetch('/api/admin/agents?source=agents').then((r) => r.json()),
    ])
      .then(([customData, platformData]) => {
        if (customData.agents) {
          setAgents(customData.agents);
          setTotal(customData.total ?? customData.agents.length);
        }
        if (platformData.agents) {
          setDefaultAgents(
            platformData.agents.map((a: Record<string, unknown>) => ({
              ...a,
              source: 'platform' as const,
              creator_nickname: '시스템',
              creator_email: null,
              price_points: 0,
              usage_count: (a.total_jobs as number) ?? 0,
            })),
          );
        }
      })
      .catch((e) => console.error('Agents fetch error:', e))
      .finally(() => setLoading(false));
  }, [page, limit, categoryFilter, statusFilter]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleStatusChange = async (agentId: string, newStatus: string) => {
    const res = await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateCustomStatus', agentId, status: newStatus }),
    });
    if (res.ok) fetchAgents();
    else {
      const d = await res.json();
      alert(d.error ?? '오류 발생');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Default / Platform Agents */}
      <div>
        <h2 className="text-2xl font-bold">기본 에이전트</h2>
        <p className="text-muted-foreground mb-3">플랫폼에 등록된 기본 에이전트 목록</p>
        {loading ? (
          <p className="text-muted-foreground py-4 text-center">로딩 중...</p>
        ) : defaultAgents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">등록된 플랫폼 에이전트가 없습니다</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              <div className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
                <span>이름</span>
                <span>카테고리</span>
                <span>상태</span>
                <span>사용수</span>
                <span>생성일</span>
              </div>
              {defaultAgents.map((agent) => (
                <div key={agent.id} className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-2 px-4 py-3 border-b items-center text-sm">
                  <span className="truncate font-medium">
                    {agent.name}
                    <Badge variant="outline" className="ml-2 text-[10px]">기본</Badge>
                  </span>
                  <span>
                    <Badge variant="secondary">{agent.category}</Badge>
                  </span>
                  <span>
                    <Badge variant={STATUS_COLORS[agent.status] ?? 'secondary'}>
                      {agent.status === 'featured' ? '추천' : agent.status === 'active' ? '활성' : agent.status ?? '활성'}
                    </Badge>
                  </span>
                  <span className="font-mono text-xs">{agent.usage_count.toLocaleString()}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(agent.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Custom Agents */}
      <div>
        <h2 className="text-2xl font-bold">커스텀 에이전트 관리</h2>
        <p className="text-muted-foreground">사용자가 등록한 에이전트 관리 및 상태 변경</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-white dark:bg-zinc-900 text-foreground px-3 text-sm [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
        >
          <option value="">전체 카테고리</option>
          <option value="general">일반</option>
          <option value="content">콘텐츠</option>
          <option value="analysis">분석</option>
          <option value="trading">트레이딩</option>
          <option value="utility">유틸리티</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-white dark:bg-zinc-900 text-foreground px-3 text-sm [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
        >
          <option value="">전체 상태</option>
          <option value="active">활성</option>
          <option value="featured">추천</option>
          <option value="disabled">비활성</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : agents.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">등록된 커스텀 에이전트가 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[960px]">
            <div className="grid grid-cols-[1fr_80px_1fr_80px_80px_80px_100px_240px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
              <span>이름</span>
              <span>카테고리</span>
              <span>제작자</span>
              <span>상태</span>
              <span>가격</span>
              <span>사용수</span>
              <span>생성일</span>
              <span>관리</span>
            </div>
            {agents.map((agent) => (
              <div key={agent.id} className="grid grid-cols-[1fr_80px_1fr_80px_80px_80px_100px_240px] gap-2 px-4 py-3 border-b items-center text-sm">
                <span className="truncate font-medium">{agent.name}</span>
                <span>
                  <Badge variant="secondary">{agent.category}</Badge>
                </span>
                <span className="truncate text-xs">
                  {agent.creator_nickname}
                  {agent.creator_email && (
                    <span className="text-muted-foreground ml-1">({agent.creator_email})</span>
                  )}
                </span>
                <span>
                  <Badge variant={STATUS_COLORS[agent.status] ?? 'secondary'}>
                    {agent.status === 'featured' ? '추천' : agent.status === 'active' ? '활성' : '비활성'}
                  </Badge>
                </span>
                <span className="font-mono text-xs">{agent.price_points.toLocaleString()}</span>
                <span className="font-mono text-xs">{agent.usage_count.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(agent.created_at).toLocaleDateString('ko-KR')}
                </span>
                <div className="flex gap-1 flex-wrap">
                  {agent.status !== 'featured' && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => handleStatusChange(agent.id, 'featured')}>
                      추천
                    </Button>
                  )}
                  {agent.status !== 'active' && (
                    <Button variant="outline" size="sm" className="text-xs h-7 px-2" onClick={() => handleStatusChange(agent.id, 'active')}>
                      활성
                    </Button>
                  )}
                  {agent.status !== 'disabled' && (
                    <Button variant="destructive" size="sm" className="text-xs h-7 px-2" onClick={() => handleStatusChange(agent.id, 'disabled')}>
                      비활성
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination for custom agents */}
      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />
    </div>
  );
}
