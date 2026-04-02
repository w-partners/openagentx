'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';
import { useDict } from '@/i18n/client';

const STEPS = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Service Setup' },
  { id: 3, label: 'Commission Setup' },
  { id: 4, label: 'Review & Register' },
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
  serverUrl: string;
}

const PRICING_GUIDE: Record<string, { min: number; max: number; avg: number; examples: string[] }> = {
  coding: { min: 0.1, max: 50, avg: 6.67, examples: ['Simple code review: $0.5-2', 'Bug fix: $5-8', 'Full refactoring: $10-50'] },
  data_analysis: { min: 0.1, max: 30, avg: 4.50, examples: ['Chart analysis: $0.5-4', 'Data summary: $3-5', 'Full report: $10-30'] },
  content_creation: { min: 0.1, max: 20, avg: 3.00, examples: ['SNS post: $0.1-2', 'Blog post: $2-5', 'Marketing copy: $5-20'] },
  translation: { min: 0.05, max: 15, avg: 3.50, examples: ['Short text: $0.1-1', 'Document: $2-5', 'Full localization: $5-15'] },
  marketing: { min: 0.5, max: 30, avg: 4.50, examples: ['SEO audit: $3-6', 'Ad copy: $1-3', 'Full strategy: $10-30'] },
  customer_service: { min: 0.05, max: 10, avg: 1.00, examples: ['Single query: $0.05-0.5', 'Support session: $1-5', 'Full onboarding: $5-10'] },
  research: { min: 0.5, max: 50, avg: 5.00, examples: ['Quick lookup: $0.5-2', 'Research report: $5-15', 'Deep analysis: $15-50'] },
  finance: { min: 0.5, max: 50, avg: 5.00, examples: ['Portfolio check: $0.5-2', 'Investment analysis: $5-10', 'Full advisory: $10-50'] },
  crypto: { min: 0.1, max: 30, avg: 5.00, examples: ['Token scan: $0.1-2', 'Market analysis: $3-8', 'Strategy report: $10-30'] },
  design: { min: 1, max: 50, avg: 8.00, examples: ['Icon generation: $1-3', 'Banner design: $5-15', 'Full branding: $15-50'] },
  education: { min: 0.05, max: 10, avg: 1.50, examples: ['Concept explanation: $0.05-1', 'Quiz creation: $1-2', 'Full course: $5-10'] },
  automation: { min: 0.5, max: 50, avg: 7.50, examples: ['Script: $2-5', 'Workflow design: $5-10', 'Full RPA setup: $15-50'] },
};

const INITIAL_FORM: FormData = {
  name: '',
  description: '',
  descriptionKo: '',
  category: '',
  tags: [],
  logoUrl: '',
  services: [{ name: '', description: '', price: '' }],
  commissionRate: 0.5,
  serverUrl: '',
};

export default function AgentRegisterPage() {
  const dict = useDict();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);
  const [serverTestResult, setServerTestResult] = useState<{
    status: 'online' | 'offline' | 'error' | null;
    latency?: number;
    message?: string;
  }>({ status: null });
  const [isTesting, setIsTesting] = useState(false);

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

  async function testServerConnection() {
    if (!form.serverUrl) return;
    setIsTesting(true);
    setServerTestResult({ status: null });
    try {
      const startTime = Date.now();
      const healthUrl = form.serverUrl.replace(/\/$/, '') + '/health';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const response = await fetch(healthUrl, { method: 'GET', signal: controller.signal });
      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          setServerTestResult({ status: 'online', latency, message: `OK (${latency}ms)` });
        } else {
          setServerTestResult({ status: 'error', latency, message: 'Unexpected response' });
        }
      } else {
        setServerTestResult({ status: 'error', message: `HTTP ${response.status}` });
      }
    } catch {
      setServerTestResult({ status: 'offline', message: 'Connection failed or timed out' });
    } finally {
      setIsTesting(false);
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return form.name.length >= 2 && form.description.length >= 10 && form.category !== '';
      case 2:
        return form.services.every((s) => s.name.trim() && s.price.trim());
      case 3:
        return form.commissionRate >= 0 && form.commissionRate <= 1;
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
        setSubmitResult({ success: true, message: '{dict.agentRegister.successMessage}' });
      } else {
        setSubmitResult({ success: false, message: data.error ?? dict.agentRegister.failedMessage });
      }
    } catch {
      setSubmitResult({ success: false, message: dict.common.networkError + '.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{dict.agentRegister.title}</h1>
        <p className="text-muted-foreground">
          {dict.agentRegister.description}
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
            <CardTitle>{dict.agentRegister.basicInfo}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.agentRegister.agentName}</label>
              <Input
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                placeholder={dict.agentRegister.agentNamePlaceholder}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.agentRegister.descriptionEn}</label>
              <textarea
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                placeholder="Describe the agent's features and capabilities in English (min 10 chars)"
                className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.agentRegister.descriptionKo}</label>
              <textarea
                value={form.descriptionKo}
                onChange={(e) => updateForm({ descriptionKo: e.target.value })}
                placeholder="Describe the agent's features and capabilities in Korean (optional)"
                className="flex min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.agentRegister.categoryLabel}</label>
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
                    {dict.categories[cat as keyof typeof dict.categories] ?? cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{dict.agentRegister.tagsLabel}</label>
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
                  placeholder={dict.agentRegister.tagPlaceholder}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
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
              <label className="text-sm font-medium">{dict.agentRegister.logoUrl}</label>
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
            <CardTitle>{dict.agentRegister.serviceSetup}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Register the services your agent provides. At least 1 service is required.
            </p>

            {form.services.map((service, i) => (
              <div key={i} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Service {i + 1}</span>
                  {form.services.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeService(i)}
                      className="text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Service Name *</label>
                  <Input
                    value={service.name}
                    onChange={(e) => updateService(i, 'name', e.target.value)}
                    placeholder="e.g. Basic Analysis"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Description</label>
                  <Input
                    value={service.description}
                    onChange={(e) => updateService(i, 'description', e.target.value)}
                    placeholder="e.g. Single token technical analysis report"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">Price *</label>
                  <Input
                    value={service.price}
                    onChange={(e) => updateService(i, 'price', e.target.value)}
                    placeholder="e.g. $10"
                  />
                </div>
              </div>
            ))}

            <Button type="button" variant="outline" onClick={addService} className="w-full">
              + Add Service
            </Button>

            {/* Server URL */}
            <div className="rounded-lg border border-dashed p-4 space-y-3">
              <h4 className="text-sm font-medium">{dict.serverGuide.serverSection}</h4>
              <p className="text-xs text-muted-foreground">{dict.serverGuide.serverSectionDesc}</p>
              <div className="flex gap-2">
                <Input
                  value={form.serverUrl}
                  onChange={(e) => updateForm({ serverUrl: e.target.value })}
                  placeholder={dict.serverGuide.serverUrlPlaceholder}
                  type="url"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={testServerConnection}
                  disabled={!form.serverUrl || isTesting}
                  className="shrink-0"
                >
                  {isTesting ? dict.serverGuide.testing : dict.serverGuide.testConnection}
                </Button>
              </div>
              {serverTestResult.status && (
                <div className={`flex items-center gap-2 text-sm ${
                  serverTestResult.status === 'online'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  <span>{serverTestResult.status === 'online' ? '\u{1F7E2}' : '\u{1F534}'}</span>
                  <span>
                    {serverTestResult.status === 'online' ? dict.serverGuide.online : dict.serverGuide.offline}
                    {serverTestResult.latency ? ` (${serverTestResult.latency}ms)` : ''}
                  </span>
                  {serverTestResult.message && (
                    <span className="text-xs text-muted-foreground ml-2">{serverTestResult.message}</span>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Guide */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4 space-y-3">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {dict.agentRegister.pricingGuide}
              </h4>
              {form.category && PRICING_GUIDE[form.category] ? (
                <>
                  {/* Range bar */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {dict.agentRegister.pricingRange
                        .replace('{min}', String(PRICING_GUIDE[form.category].min))
                        .replace('{max}', String(PRICING_GUIDE[form.category].max))
                        .replace('{avg}', String(PRICING_GUIDE[form.category].avg))}
                    </p>
                    <div className="relative h-2 w-full rounded-full bg-blue-200 dark:bg-blue-800">
                      <div
                        className="absolute h-2 rounded-full bg-blue-500 dark:bg-blue-400"
                        style={{
                          left: `${(PRICING_GUIDE[form.category].min / PRICING_GUIDE[form.category].max) * 100}%`,
                          right: '0%',
                        }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-blue-700 dark:bg-blue-200 border-2 border-white dark:border-blue-950"
                        style={{
                          left: `${(PRICING_GUIDE[form.category].avg / PRICING_GUIDE[form.category].max) * 100}%`,
                        }}
                        title={`avg: $${PRICING_GUIDE[form.category].avg}`}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-blue-600 dark:text-blue-400">
                      <span>${PRICING_GUIDE[form.category].min}</span>
                      <span>${PRICING_GUIDE[form.category].max}</span>
                    </div>
                  </div>

                  {/* Examples */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      {dict.agentRegister.pricingExamples}
                    </p>
                    <ul className="space-y-0.5">
                      {PRICING_GUIDE[form.category].examples.map((ex, i) => (
                        <li key={i} className="text-xs text-blue-600 dark:text-blue-400">
                          - {ex}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Micro-payment note */}
                  <p className="text-[11px] text-blue-500 dark:text-blue-400 italic">
                    {dict.agentRegister.microPaymentNote}
                  </p>
                </>
              ) : (
                <p className="text-xs text-blue-500 dark:text-blue-400">
                  {dict.agentRegister.selectCategoryForGuide}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Commission */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.agentRegister.commissionSetup}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Voluntarily set your visibility commission rate (0-1%). Higher rates improve search visibility. 0% is fine — we never take a cut from your sales.
            </p>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{dict.agentRegister.commissionRate}</label>
                <span className="text-2xl font-bold">{form.commissionRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.25"
                value={form.commissionRate}
                onChange={(e) => updateForm({ commissionRate: parseFloat(e.target.value) })}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>0.5%</span>
                <span>1%</span>
              </div>
            </div>

            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h4 className="text-sm font-medium">{dict.agentRegister.commissionGuide}</h4>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>- 0%: Standard listing (0% = keep all revenue)</li>
                <li>- 0.25%: Improved visibility</li>
                <li>- 0.5%: Category highlight</li>
                <li>- 1%: Premium placement + priority exposure</li>
                <li className="text-xs text-primary mt-2">We never charge a platform fee. This commission is your voluntary investment in search visibility.</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirm */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.agentRegister.reviewTitle}</CardTitle>
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
                    {dict.agentRegister.goToList}
                  </Link>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Name</span>
                    <span className="font-medium">{form.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">{dict.categories[form.category as keyof typeof dict.categories] ?? form.category}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Commission Rate</span>
                    <span className="font-medium">{form.commissionRate}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services</span>
                    <span className="font-medium">{form.services.filter((s) => s.name.trim()).length}</span>
                  </div>
                  {form.tags.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tags</span>
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
                  <h4 className="text-sm font-medium">Registered Services</h4>
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
                  After registration, it will be reviewed by admin and published on the marketplace. Review may take up to 24 hours.
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
              Previous
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Link href="/agents">
            <Button variant="ghost">{dict.common.cancel}</Button>
          </Link>
          {step < 4 ? (
            <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
              Next
            </Button>
          ) : (
            !submitResult?.success && (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? dict.agentRegister.registering : dict.agentRegister.registerBtn}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
