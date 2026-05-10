'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const STEP_TYPES = [
  { value: 'fixed', label: 'Fixed Price', desc: 'Request a specific agent at a fixed price' },
  { value: 'auction', label: 'Reverse Auction', desc: 'Agents compete with bids' },
  { value: 'matching', label: 'Live Matching', desc: 'Connect with the first agent to accept' },
  { value: 'fulfill', label: 'AI Processing', desc: 'AI processes directly (Dynamic Factory)' },
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
  const dict = useDict();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [steps, setSteps] = useState<StepForm[]>([defaultStep(), defaultStep()]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };
  const removeTag = (t: string) => setTags(tags.filter((x) => x !== t));

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
      setError(dict.chainCreate.allStepsRequired);
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
          tags: tags.length > 0 ? tags : undefined,
          is_featured: isFeatured || undefined,
        }),
      });
      const json = await res.json();
      if (json.success && json.data?.id) {
        router.push(`/chains/${json.data.id}`);
      } else {
        setError(json.error ?? dict.chainCreate.createFailed);
      }
    } catch {
      setError(dict.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.chainCreate.title}</h1>
        <p className="text-muted-foreground">
          {dict.chainCreate.description}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <Card>
          <CardHeader>
            <CardTitle>{dict.chainCreate.basicInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">{dict.chainCreate.chainName}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={dict.chainCreate.chainNamePlaceholder}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                required
                minLength={2}
                maxLength={200}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{dict.chainCreate.descriptionLabel}</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={dict.chainCreate.descriptionPlaceholder}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                maxLength={5000}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{dict.chainCreate.categoryLabel}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(dict.categories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">태그 ({tags.length}/10)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="태그 입력 후 Enter"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                  maxLength={50}
                />
                <Button type="button" variant="outline" size="sm" onClick={addTag} disabled={tags.length >= 10}>
                  추가
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {tags.map((t) => (
                    <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => removeTag(t)}>
                      {t} ✕
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="h-4 w-4"
              />
              <span>추천 팩으로 표시 (관리자만 적용됨)</span>
            </label>
          </CardContent>
        </Card>

        {/* Steps */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{dict.chainCreate.steps.replace('{count}', String(steps.length))}</h2>
            <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={steps.length >= 20}>
              {dict.chainCreate.addStep}
            </Button>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-2 overflow-x-auto py-2">
            {steps.map((step, i) => (
              <span key={i} className="inline-flex items-center gap-1 shrink-0">
                {i > 0 && <span className="text-muted-foreground">&rarr;</span>}
                <Badge variant="outline" className="text-xs">
                  {step.name || dict.chainCreate.stepN.replace('{n}', String(i + 1))}
                </Badge>
              </span>
            ))}
          </div>

          {steps.map((step, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{dict.chainCreate.stepN.replace('{n}', String(i + 1))}</CardTitle>
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
                      {dict.chainCreate.deleteStep}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{dict.chainCreate.stepName}</label>
                    <input
                      type="text"
                      value={step.name}
                      onChange={(e) => updateStep(i, { name: e.target.value })}
                      placeholder={dict.chainCreate.stepNamePlaceholder}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{dict.chainCreate.executionMethod}</label>
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
                  <label className="block text-sm font-medium mb-1">{dict.chainCreate.stepDescription}</label>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(i, { description: e.target.value })}
                    placeholder={dict.chainCreate.stepDescPlaceholder}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[60px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">{dict.chainCreate.categoryLabel}</label>
                    <select
                      value={step.category}
                      onChange={(e) => updateStep(i, { category: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      {Object.entries(dict.categories).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">{dict.chainCreate.maxAmount}</label>
                    <input
                      type="number"
                      value={step.config.max_price ?? ''}
                      onChange={(e) => updateStep(i, {
                        config: { ...step.config, max_price: e.target.value ? Number(e.target.value) : undefined },
                      })}
                      placeholder={dict.chainCreate.optional}
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
                    {dict.chainCreate.autoTrigger}
                  </label>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex-1">
            {submitting ? dict.chainCreate.creating : dict.chainCreate.createBtn}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/chains')}>
            {dict.common.cancel}
          </Button>
        </div>
      </form>
    </div>
  );
}
