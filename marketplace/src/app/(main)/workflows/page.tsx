'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface WorkflowItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  tags: string[];
  is_featured: boolean;
  use_count: number;
  node_count: number;
}

export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const url = new URL('/api/v1/workflows', window.location.origin);
        if (q) url.searchParams.set('q', q);
        url.searchParams.set('limit', '60');
        const r = await fetch(url.toString().replace(window.location.origin, ''));
        const j = await r.json();
        if (!cancelled) setWorkflows(j.data ?? []);
      } catch {
        if (!cancelled) setWorkflows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  const top5 = [...workflows].sort((a, b) => b.use_count - a.use_count).slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">비주얼 워크플로우</h1>
          <p className="text-sm text-muted-foreground mt-1">
            드래그앤드롭으로 프롬프트와 에이전트를 연결해 자동화 파이프라인을 만들고 실행하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="검색..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <Link href="/ko/workflows/new">
            <Button>+ 새 워크플로우</Button>
          </Link>
        </div>
      </div>

      {top5.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">🔥 인기 TOP 5</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {top5.map((w) => (
              <Link key={w.id} href={`/ko/workflows/${w.slug}`}>
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{w.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    {w.node_count} nodes · {w.use_count} uses
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-3">전체 목록</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">로딩 중...</div>
        ) : workflows.length === 0 ? (
          <div className="text-sm text-muted-foreground py-12 text-center border rounded-md">
            아직 등록된 워크플로우가 없습니다.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((w) => (
              <Link key={w.id} href={`/ko/workflows/${w.slug}`}>
                <Card className="h-full hover:border-primary/60 transition-colors">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{w.name}</CardTitle>
                      {w.is_featured && (
                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                          ⭐
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {w.description ?? '설명 없음'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {(w.tags ?? []).slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground flex justify-between">
                    <span>{w.category}</span>
                    <span>
                      {w.node_count} nodes · {w.use_count} uses
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
