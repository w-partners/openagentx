'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import type { WfDefinition } from '@/components/workflows/workflow-canvas';

interface WorkflowDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  definition: WfDefinition;
  is_public: boolean;
  category: string;
}

export default function WorkflowEditPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params?.slug;

  const [wf, setWf] = useState<WorkflowDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const r = await fetch(`/api/v1/workflows/${slug}`);
      if (!r.ok) {
        if (!cancelled) setError('워크플로우를 찾을 수 없습니다');
        setLoading(false);
        return;
      }
      const j = await r.json();
      if (!cancelled) setWf(j.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading || !wf) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {loading ? '로딩 중...' : error}
      </div>
    );
  }

  const handleSave = async (next: {
    name: string;
    description: string;
    definition: WfDefinition;
    category: string;
    is_public: boolean;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/v1/workflows/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? '저장 실패');
        return;
      }
      router.push(`/ko/workflows/${slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/ko/workflows/${slug}`} className="text-xs text-muted-foreground hover:underline">
          ← 상세로
        </Link>
        <h1 className="text-2xl font-bold mt-2">워크플로우 편집</h1>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <WorkflowEditor
        initial={{
          name: wf.name,
          description: wf.description ?? '',
          definition: wf.definition,
          category: wf.category,
          is_public: wf.is_public,
        }}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
}
