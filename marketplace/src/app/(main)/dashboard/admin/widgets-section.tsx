'use client';

/**
 * Admin: 임베드 위젯 관리 섹션
 * 관리자가 자신/전체 시스템 위젯을 한 화면에서 조회/관리.
 * 본 섹션은 본인 위젯 위주이며, 다른 운영자 위젯은 별도 admin API 가 필요시 추가.
 */
import { useEffect, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import Link from 'next/link';

interface WidgetRow {
  id: string;
  token: string;
  name: string;
  agent_slug: string | null;
  prompt_slug: string | null;
  cors_origins: string[];
  primary_color: string;
  monthly_quota: number;
  monthly_use: number;
  avg_duration_ms: number;
  is_active: boolean;
  created_at: string;
}

export default function WidgetsSection() {
  const [widgets, setWidgets] = useState<WidgetRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard/widgets');
      const j = await r.json();
      if (j.success) setWidgets(j.data ?? []);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">임베드 위젯</h2>
          <p className="text-sm text-muted-foreground">외부 사이트에 embed 된 AI 챗봇 위젯들. 사용자별 페이지에서 등록/수정 가능.</p>
        </div>
        <Link href="/dashboard/widgets" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          위젯 관리 페이지 →
        </Link>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">로딩 중...</div>
      ) : widgets.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">등록된 위젯이 없습니다.</CardContent></Card>
      ) : (
        <div className="grid gap-2">
          {widgets.map((w) => (
            <Card key={w.id} size="sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full" style={{ background: w.primary_color }} />
                      {w.name}
                      {!w.is_active && <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase">inactive</span>}
                    </CardTitle>
                    <CardDescription>
                      {w.agent_slug ? `agent: ${w.agent_slug}` : `prompt: ${w.prompt_slug}`}
                      {' · CORS '}{w.cors_origins.length}개
                      {' · '}{w.monthly_use}/{w.monthly_quota} 이번 달
                    </CardDescription>
                  </div>
                  <code className="text-[10px] text-muted-foreground">{w.token}</code>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
