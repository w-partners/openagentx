'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const STEP_TYPES = [
  { value: 'fixed', label: '고정가격', desc: '특정 에이전트에 고정 금액으로 요청' },
  { value: 'auction', label: '역경매', desc: '에이전트들이 경쟁 입찰' },
  { value: 'matching', label: '실시간 매칭', desc: '가장 먼저 수락하는 에이전트와 연결' },
  { value: 'fulfill', label: 'AI 처리', desc: 'AI가 직접 처리 (Dynamic Factory)' },
];

interface StepForm {
  name: string;
  type: string;
  category: string;
  description: string;
  auto_trigger: boolean;
  config: {
    max_price?: number;
    timeout_minutes?: number;
    urgency?: string;
    connection_fee?: number;
  };
}

const defaultStep = (): StepForm => ({
  name: '',
  type: 'fixed',
  category: 'coding',
  description: '',
  auto_trigger: true,
  config: {},
});

export default function CreateChainPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [steps, setSteps] = useState<StepForm[]>([defaultStep(), defaultStep()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addStep = () => {
    if (steps.length >= 20) return;
    setSteps([...steps, defaultStep()]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 2) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, updates: Partial<StepForm>) => {
    setSteps(steps.map((s, i) => i === index ? { ...s, ...updates } : s));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    const newSteps = [...steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    setSteps(newSteps);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (steps.some((s) => !s.name || !s.description)) {
      setError('모든 단계의 이름과 설명을 입력하세요');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/chains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-flow',
          name,
          description: description || undefined,
          category,
          steps,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        router.push(`/chains/${json.data.id}`);
      } else {
        setError(json.error ?? '체인 생성에 실패했습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">체인 만들기</h1>
        <p className="text-muted-foreground">
          여러 단계로 구성된 자동화 워크플로우를 정의하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">체인 이름</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 콘텐츠 제작 파이프라인"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
                minLength={2}
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">설명 (선택)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="이 체인의 용도를 설명하세요..."
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                maxLength={5000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">단계 ({steps.length}개)</h2>
            <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={steps.length >= 20}>
              단계 추가
            </Button>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {steps.map((step, i) => (
              <span key={i} className="inline-flex items-center gap-1 shrink-0">
                {i > 0 && <span className="text-muted-foreground">&rarr;</span>}
                <Badge variant="outline" className="text-xs">
                  {step.name || `단계 ${i + 1}`}
                </Badge>
              </span>
            ))}
          </div>

          {steps.map((step, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">단계 {i + 1}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => moveStep(i, -1)} disabled={i === 0}>
                      ↑
                    </Button>
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>
                      ↓
                    </Button>
                    <Button type="button" variant="ghost" size="sm"
                      onClick={() => removeStep(i)} disabled={steps.length <= 2}
                      className="text-red-500 hover:text-red-700">
                      삭제
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">단계 이름</label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(i, { name: e.target.value })}
                      placeholder="예: 기획 작성"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">실행 방식</label>
                    <select
                      value={step.type}
                      onChange={(e) => updateStep(i, { type: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {STEP_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      {STEP_TYPES.find((t) => t.value === step.type)?.desc}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">설명</label>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(i, { description: e.target.value })}
                    placeholder="이 단계에서 수행할 작업을 설명하세요..."
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">카테고리</label>
                    <select
                      value={step.category}
                      onChange={(e) => updateStep(i, { category: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">최대 금액 (USDC)</label>
                    <input
                      type="number"
                      value={step.config.max_price ?? ''}
                      onChange={(e) => updateStep(i, {
                        config: { ...step.config, max_price: e.target.value ? Number(e.target.value) : undefined },
                      })}
                      placeholder="선택 사항"
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      min={0}
                      step={0.01}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`auto-${i}`}
                    checked={step.auto_trigger}
                    onChange={(e) => updateStep(i, { auto_trigger: e.target.checked })}
                    className="rounded border"
                  />
                  <label htmlFor={`auto-${i}`} className="text-sm">
                    이전 단계 완료 시 자동 실행
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? '생성 중...' : '체인 생성'}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/chains')}>
            취소
          </Button>
        </div>
      </form>
    </div>
  );
}
