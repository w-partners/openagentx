'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '@/lib/utils/constants';

const STEPS = [
  { id: 1, label: '기본 정보' },
  { id: 2, label: '서비스 설정' },
  { id: 3, label: '수수료 설정' },
  { id: 4, label: '확인 및 등록' },
] as const;

interface ServiceItem {
  name: string;
  description: string;
  price: string;
}

interface FormData {
  name: string;
  description: string;
  descriptionKo: string;
  category: string;
  tags: string[];
  logoUrl: string;
  services: ServiceItem[];
  commissionRate: number;
}

const INITIAL_FORM: FormData = {
  name: '',
  description: '',
  descriptionKo: '',
  category: '',
  tags: [],
  logoUrl: '',
  services: [{ name: '', description: '', price: '' }],
  commissionRate: 5,
};

export default function AgentRegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag) && form.tags.length < 10) {
      updateForm({ tags: [...form.tags, tag] });
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    updateForm({ tags: form.tags.filter((t) => t !== tag) });
  }

  function addService() {
    if (form.services.length < 10) {
      updateForm({ services: [...form.services, { name: '', description: '', price: '' }] });
    }
  }

  function updateService(index: number, field: keyof ServiceItem, value: string) {
    const updated = [...form.services];
    updated[index] = { ...updated[index], [field]: value };
    updateForm({ services: updated });
  }

  function removeService(index: number) {
    if (form.services.length > 1) {
      updateForm({ services: form.services.filter((_, i) => i !== index) });
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return form.name.length >= 2 && form.description.length >= 10 && form.category !== '';
      case 2:
        return form.services.every((s) => s.name.trim() && s.price.trim());
      case 3:
        return form.commissionRate >= 0 && form.commissionRate <= 50;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          description_ko: form.descriptionKo || undefined,
          category: form.category,
          tags: form.tags,
          logo_url: form.logoUrl || undefined,
          commission_rate: form.commissionRate,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitResult({ success: true, message: '에이전트가 성공적으로 등록되었습니다! 검토 후 활성화됩니다.' });
      } else {
        setSubmitResult({ success: false, message: data.error ?? '등록에 실패했습니다.' });
      }
    } catch {
      setSubmitResult({ success: false, message: '네트워크 오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">에이전트 등록</h1>
        <p className="text-muted-foreground">
          AI 에이전트를 마켓플레이스에 등록하고 수익을 창출하세요
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                step >= s.id
                  ? 'bg-primary text-primary-foreground'
                  : 'border bg-muted text-muted-foreground'
              }`}
            >
              {s.id}
            </div>
            <span
              className={`ml-2 text-sm hidden sm:inline ${
                step >= s.id ? 'font-medium' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-px w-8 sm:w-12 ${
                  step > s.id ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">에이전트 이름 *</label>
              <Input
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder="예: 마켓 센티넬"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명 (영문) *</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="에이전트의 기능과 특징을 영문으로 설명하세요 (최소 10자)"
                className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">설명 (한국어)</label>
              <textarea
                value={form.descriptionKo}
                onChange={(e) => updateForm({ descriptionKo: e.target.value })}
                placeholder="에이전트의 기능과 특징을 한국어로 설명하세요 (선택)"
                className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리 *</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => updateForm({ category: cat })}
                    className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                      form.category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    {CATEGORY_LABELS[cat] ?? cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">태그</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="태그 입력 후 Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  추가
                </Button>
              </div>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-destructive"
                      >
                        &#215;
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">로고 URL (선택)</label>
              <Input
                value={form.logoUrl}
                onChange={(e) => updateForm({ logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                type="url"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Services */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>서비스 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              에이전트가 제공하는 서비스를 등록하세요. 최소 1개 이상의 서비스가 필요합니다.
            </p>

            {form.services.map((service, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">서비스 {i + 1}</span>
                  {form.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(i)}
                      className="text-xs text-destructive hover:underline"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">서비스 이름 *</label>
                  <Input
                    value={service.name}
                    onChange={(e) => updateService(i, 'name', e.target.value)}
                    placeholder="예: 기본 분석"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">설명</label>
                  <Input
                    value={service.description}
                    onChange={(e) => updateService(i, 'description', e.target.value)}
                    placeholder="예: 단일 토큰 기술적 분석 리포트"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">가격 *</label>
                  <Input
                    value={service.price}
                    onChange={(e) => updateService(i, 'price', e.target.value)}
                    placeholder="예: 10 USDC"
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addService} className="w-full">
              + 서비스 추가
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Commission */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>수수료 설정</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              플랫폼 수수료를 설정하세요. 수수료율이 높을수록 검색 노출이 유리합니다.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">수수료율</label>
                <span className="text-2xl font-bold">{form.commissionRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={form.commissionRate}
                onChange={(e) => updateForm({ commissionRate: parseInt(e.target.value, 10) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-medium">수수료 안내</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>- 0~5%: 기본 노출</li>
                <li>- 5~15%: 카테고리 상위 노출</li>
                <li>- 15~30%: 추천 에이전트 자격</li>
                <li>- 30~50%: 프리미엄 배치 + 마케팅 지원</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>등록 정보 확인</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submitResult ? (
              <div
                className={`rounded-lg p-4 ${
                  submitResult.success
                    ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                <p className="font-medium">{submitResult.message}</p>
                {submitResult.success && (
                  <Link href="/agents" className="mt-2 inline-block text-sm underline">
                    에이전트 목록으로 이동
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">이름</span>
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">카테고리</span>
                    <span className="font-medium">{CATEGORY_LABELS[form.category] ?? form.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">수수료율</span>
                    <span className="font-medium">{form.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">서비스 수</span>
                    <span className="font-medium">{form.services.filter((s) => s.name.trim()).length}개</span>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">태그</span>
                      <div className="flex flex-wrap gap-1 justify-end">
                        {form.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-medium">등록 서비스</h4>
                  {form.services
                    .filter((s) => s.name.trim())
                    .map((s, i) => (
                      <div key={i} className="rounded-lg border p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{s.name}</span>
                          <span>{s.price}</span>
                        </div>
                        {s.description && (
                          <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                        )}
                      </div>
                    ))}
                </div>

                <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  등록 후 관리자 검토를 거쳐 마켓플레이스에 게시됩니다. 검토에는 최대 24시간이 소요될 수 있습니다.
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <div>
          {step > 1 && !submitResult?.success && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              이전
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/agents">
            <Button variant="ghost">취소</Button>
          </Link>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              다음
            </Button>
          ) : (
            !submitResult?.success && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? '등록 중...' : '에이전트 등록'}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
