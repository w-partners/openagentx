'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WorkflowCanvas, type WfDefinition } from '@/components/workflows/workflow-canvas';

interface WorkflowDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  owner_id: string;
  definition: WfDefinition;
  is_public: boolean;
  is_featured: boolean;
  use_count: number;
  category: string;
  tags: string[];
}

interface StepResult {
  status: 'success' | 'error' | 'skipped';
  output?: string;
  duration_ms?: number;
  error?: string;
}

export default function WorkflowDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [wf, setWf] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [stepResults, setStepResults] = useState<Record<string, StepResult>>({});
  const [finalOutput, setFinalOutput] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/workflows/${slug}`);
        if (!r.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const j = await r.json();
        if (!cancelled) setWf(j.data);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleRun = useCallback(async () => {
    if (!input.trim() || !slug) return;
    setRunning(true);
    setStepResults({});
    setFinalOutput(null);
    setRunError(null);
    try {
      const r = await fetch(`/api/v1/workflows/${slug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const j = await r.json();
      if (!r.ok) {
        setRunError(j.error ?? '실행 실패');
        if (j.data?.step_results) setStepResults(j.data.step_results);
        return;
      }
      setStepResults(j.data?.step_results ?? {});
      setFinalOutput(j.data?.output ?? '');
    } catch (e) {
      setRunError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setRunning(false);
    }
  }, [input, slug]);

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }
  if (notFound || !wf) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">워크플로우를 찾을 수 없습니다.</p>
        <Link href="/ko/workflows" className="text-sm text-primary underline mt-4 inline-block">
          ← 목록으로
        </Link>
      </div>
    );
  }

  const stepStatuses = Object.fromEntries(
    Object.entries(stepResults).map(([id, r]) => [id, r.status]),
  );

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ko/workflows" className="text-xs text-muted-foreground hover:underline">
          ← 목록으로
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-bold">{wf.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">{wf.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Badge variant="outline">{wf.category}</Badge>
              {wf.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
              <Badge variant="secondary">{wf.use_count} uses</Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href={`/ko/workflows/${wf.slug}/edit`}>
              <Button variant="outline" size="sm">편집</Button>
            </Link>
            <Link
              href={`/ko/workflows/new?from=${wf.slug}`}
            >
              <Button variant="outline" size="sm">복제 + 편집</Button>
            </Link>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">노드 그래프</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[360px] border rounded">
            <WorkflowCanvas definition={wf.definition} readOnly stepStatuses={stepStatuses} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">워크플로우 실행</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[120px] p-3 rounded-md border bg-background text-sm font-mono"
            placeholder="입력값을 작성하세요..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={running}
          />
          <Button onClick={handleRun} disabled={running || !input.trim()}>
            {running ? '실행 중...' : '▶ 실행'}
          </Button>
          {runError && <div className="text-sm text-destructive">{runError}</div>}

          {Object.keys(stepResults).length > 0 && (
            <div className="space-y-3 mt-4">
              <h3 className="text-sm font-semibold">노드별 실행 결과</h3>
              {wf.definition.nodes.map((n) => {
                const r = stepResults[n.id];
                if (!r) return null;
                return (
                  <div
                    key={n.id}
                    className={`border rounded p-3 ${
                      r.status === 'error' ? 'border-destructive/50' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono">
                        {n.id} <span className="opacity-60">({n.type})</span>
                      </span>
                      <span
                        className={`${
                          r.status === 'success'
                            ? 'text-green-600'
                            : r.status === 'error'
                              ? 'text-red-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {r.status} · {r.duration_ms ?? 0}ms
                      </span>
                    </div>
                    {r.error && (
                      <pre className="text-xs text-destructive mt-2 whitespace-pre-wrap">{r.error}</pre>
                    )}
                    {r.output && (
                      <pre className="text-xs mt-2 whitespace-pre-wrap max-h-48 overflow-auto bg-accent/30 p-2 rounded">
                        {r.output}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {finalOutput !== null && (
            <div className="mt-4 border-2 border-primary/50 rounded p-4 bg-primary/5">
              <div className="text-xs font-semibold mb-2 text-primary">최종 출력</div>
              <pre className="text-sm whitespace-pre-wrap">{finalOutput}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
