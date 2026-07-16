'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WorkflowEditor } from '@/components/workflows/workflow-editor';
import type { WfDefinition } from '@/components/workflows/workflow-canvas';

const EMPTY_DEFINITION: WfDefinition = {
  nodes: [
    { id: 'input', type: 'input', position: { x: 100, y: 120 }, data: { label: '입력' } },
    { id: 'output', type: 'output', position: { x: 600, y: 120 }, data: { label: '출력' } },
  ],
  edges: [{ from: 'input', to: 'output' }],
};

function NewWorkflowInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const fromSlug = sp.get('from');

  const [initialState, setInitialState] = useState<{
    name: string;
    description: string;
    definition: WfDefinition;
    category: string;
    is_public: boolean;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromSlug) {
      setInitialState({
        name: '',
        description: '',
        definition: EMPTY_DEFINITION,
        category: 'general',
        is_public: false,
      });
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/v1/workflows/${fromSlug}`);
        if (!r.ok) {
          setInitialState({
            name: '',
            description: '',
            definition: EMPTY_DEFINITION,
            category: 'general',
            is_public: false,
          });
          return;
        }
        const j = await r.json();
        const src = j.data;
        setInitialState({
          name: `${src.name} (복제)`,
          description: src.description ?? '',
          definition: src.definition,
          category: src.category,
          is_public: false,
        });
      } catch {
        setInitialState({
          name: '',
          description: '',
          definition: EMPTY_DEFINITION,
          category: 'general',
          is_public: false,
        });
      }
    })();
  }, [fromSlug]);

  const handleSave = async (next: {
    name: string;
    description: string;
    definition: WfDefinition;
    category: string;
    is_public: boolean;
  }) => {
    if (!next.name.trim()) {
      setError('이름을 입력해주세요');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await fetch('/api/v1/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const j = await r.json();
      if (!r.ok) {
        if (r.status === 401) setError('로그인 또는 API Key 가 필요합니다');
        else setError(j.error ?? '저장 실패');
        return;
      }
      router.push(`/ko/workflows/${j.data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setSaving(false);
    }
  };

  if (!initialState) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <Link href="/ko/workflows" className="text-xs text-muted-foreground hover:underline">
          ← 목록으로
        </Link>
        <h1 className="text-2xl font-bold mt-2">새 워크플로우</h1>
        <p className="text-sm text-muted-foreground">
          좌측 팔레트에서 노드를 추가하고, 노드끼리 선으로 연결하세요. 인증 필요.
        </p>
      </div>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <WorkflowEditor initial={initialState} saving={saving} onSave={handleSave} />
    </div>
  );
}

export default function NewWorkflowPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-muted-foreground">로딩 중...</div>}>
      <NewWorkflowInner />
    </Suspense>
  );
}
