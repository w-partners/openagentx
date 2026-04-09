'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';

interface Attachment {
  type: string;
  url: string;
  name: string;
}

interface AgentService {
  id: string;
  name: string;
  description: string;
  price_usdc: number;
}

interface BuildJob {
  id: string;
  status: string;
  input_data: Record<string, unknown>;
  result_data: Record<string, unknown> | null;
  payment_amount: number;
  created_at: string;
}

interface BuildResultSpec {
  agent_name: string;
  agent_description: string;
  agent_description_ko: string;
  category: string;
  tags: string[];
  system_prompt: string;
  services: { name: string; description: string; price: number }[];
  estimated_complexity: string;
  build_notes: string;
}

const URGENCY_OPTIONS = ['low', 'normal', 'high', 'critical'] as const;
const ATTACHMENT_TYPES = ['md', 'html', 'pdf', 'image', 'other'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  deposited: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const SERVICE_TIERS = [
  { key: 'basic', nameKey: 'basicBuild', descKey: 'basicBuildDesc', icon: '🔧' },
  { key: 'advanced', nameKey: 'advancedBuild', descKey: 'advancedBuildDesc', icon: '⚙️' },
  { key: 'chain', nameKey: 'chainBuild', descKey: 'chainBuildDesc', icon: '🔗' },
] as const;

export default function AgentBuilderPage() {
  const dict = useDict();
  const t = (dict as unknown as Record<string, Record<string, string>>).agentBuilder ?? {};
  const rt = (dict as unknown as Record<string, Record<string, string>>).requestAgent ?? {};

  // AgentBuilder info
  const [agentId, setAgentId] = useState<string | null>(null);
  const [services, setServices] = useState<AgentService[]>([]);
  const [selectedServiceIdx, setSelectedServiceIdx] = useState(0);
  const [loadingAgent, setLoadingAgent] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [urgency, setUrgency] = useState<string>('normal');
  const [sourceUrls, setSourceUrls] = useState<string[]>(['']);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Build result
  const [buildResult, setBuildResult] = useState<{
    agent_name: string;
    agent_id: string | null;
    category: string;
    services_count: number;
    build_notes: string;
    provider?: string;
    spec?: BuildResultSpec;
  } | null>(null);

  // Build history
  const [jobs, setJobs] = useState<BuildJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  const urgencyLabel = (u: string) => {
    const map: Record<string, string> = {
      low: rt.urgencyLow ?? 'Low',
      normal: rt.urgencyNormal ?? 'Normal',
      high: rt.urgencyHigh ?? 'High',
      critical: rt.urgencyCritical ?? 'Critical',
    };
    return map[u] ?? u;
  };

  // Fetch AgentBuilder agent info
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/agents?q=agent-builder');
        if (res.ok) {
          const json = await res.json();
          const agents = json.data ?? [];
          const ab = agents.find((a: { slug: string }) => a.slug === 'agent-builder');
          if (ab) {
            setAgentId(ab.id);
            // Fetch services
            const svcRes = await fetch(`/api/agents/${ab.id}/services`);
            if (svcRes.ok) {
              const svcJson = await svcRes.json();
              setServices(svcJson.data ?? []);
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoadingAgent(false);
      }
    })();
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs?role=buyer');
      if (res.ok) {
        const json = await res.json();
        // Filter to only AgentBuilder jobs
        const allJobs: BuildJob[] = json.data ?? [];
        const abJobs = agentId
          ? allJobs.filter((j: BuildJob & { agent_id?: string }) => (j as unknown as { agent_id: string }).agent_id === agentId)
          : allJobs;
        setJobs(abJobs);
      }
    } catch {
      // ignore
    } finally {
      setLoadingJobs(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (!loadingAgent) fetchJobs();
  }, [loadingAgent, fetchJobs]);

  const addSourceUrl = () => setSourceUrls((prev) => [...prev, '']);
  const removeSourceUrl = (idx: number) => setSourceUrls((prev) => prev.filter((_, i) => i !== idx));
  const updateSourceUrl = (idx: number, val: string) =>
    setSourceUrls((prev) => prev.map((u, i) => (i === idx ? val : u)));

  const addAttachment = () =>
    setAttachments((prev) => [...prev, { type: 'other', url: '', name: '' }]);
  const removeAttachment = (idx: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  const updateAttachment = (idx: number, field: keyof Attachment, val: string) =>
    setAttachments((prev) => prev.map((a, i) => (i === idx ? { ...a, [field]: val } : a)));

  const selectedService = services[selectedServiceIdx] ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agentId || !selectedService) {
      setMessage({ type: 'error', text: 'AgentBuilder not loaded' });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    setBuildResult(null);

    try {
      const filteredUrls = sourceUrls.filter((u) => u.trim() !== '');
      const filteredAttachments = attachments.filter((a) => a.url.trim() !== '' && a.name.trim() !== '');

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          service_id: selectedService.id,
          input_data: {
            title,
            description,
            source_urls: filteredUrls,
            attachments: filteredAttachments,
            category,
            urgency,
          },
          payment_amount: selectedService.price_usdc * 100, // USDC to points
        }),
      });

      const json = await res.json();
      if (res.ok && json.data?.status === 'completed') {
        setMessage({ type: 'success', text: t.buildComplete ?? 'Agent Build Complete!' });
        setBuildResult(json.data.result);
        // Reset form
        setTitle('');
        setDescription('');
        setCategory('general');
        setUrgency('normal');
        setSourceUrls(['']);
        setAttachments([]);
        fetchJobs();
      } else if (res.status === 401) {
        setMessage({ type: 'error', text: t.loginRequired ?? 'Login required to build agents' });
      } else if (res.status === 402) {
        setMessage({ type: 'error', text: t.insufficientBalance ?? 'Insufficient balance' });
      } else {
        setMessage({ type: 'error', text: json.error ?? json.data?.error ?? (t.buildFailed ?? 'Build Failed') });
      }
    } catch {
      setMessage({ type: 'error', text: t.buildFailed ?? 'Build Failed' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">{t.title ?? 'AgentBuilder'}</h1>
        <p className="text-lg text-muted-foreground">{t.subtitle ?? 'The Agent that Builds Agents'}</p>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {t.description ?? 'Provide a GitHub repo, documentation, or description and get a fully working AI agent automatically'}
        </p>
      </div>

      {/* Service Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t.selectService ?? 'Select Service'}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SERVICE_TIERS.map((tier, idx) => {
              const svc = services[idx];
              const isSelected = selectedServiceIdx === idx;
              return (
                <button
                  key={tier.key}
                  type="button"
                  onClick={() => setSelectedServiceIdx(idx)}
                  className={`rounded-xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="text-2xl mb-2">{tier.icon}</div>
                  <div className="font-semibold text-sm">{t[tier.nameKey] ?? tier.nameKey}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {t[tier.descKey] ?? tier.descKey}
                  </div>
                  {svc && (
                    <div className="mt-2 text-sm font-bold text-primary">
                      {(svc.price_usdc * 100).toLocaleString()}P
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Build Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t.title ?? 'AgentBuilder'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t.description ?? 'Provide source materials to auto-generate an AI agent'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.formTitle ?? 'Title'}</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={rt.formTitlePlaceholder ?? 'e.g. GitHub Repo Analyzer Agent'}
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.formDescription ?? 'Description'}</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={rt.formDescriptionPlaceholder ?? 'Describe what the agent should do'}
                required
              />
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.category ?? 'Category'}</label>
              <div className="flex flex-wrap gap-2">
                {SERVICE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      category === cat
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary'
                    }`}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.urgency ?? 'Urgency'}</label>
              <div className="flex gap-3">
                {URGENCY_OPTIONS.map((u) => (
                  <label key={u} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="urgency"
                      value={u}
                      checked={urgency === u}
                      onChange={(e) => setUrgency(e.target.value)}
                      className="accent-primary"
                    />
                    <span className="text-sm">{urgencyLabel(u)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Source URLs */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.sourceUrls ?? 'Reference URLs'}</label>
              {sourceUrls.map((url, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => updateSourceUrl(idx, e.target.value)}
                    placeholder={rt.sourceUrlPlaceholder ?? 'https://github.com/...'}
                    type="url"
                  />
                  {sourceUrls.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeSourceUrl(idx)}>
                      X
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addSourceUrl}>
                + {rt.addUrl ?? 'Add URL'}
              </Button>
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{rt.attachments ?? 'Attachments'}</label>
              {attachments.map((att, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <Input
                    value={att.name}
                    onChange={(e) => updateAttachment(idx, 'name', e.target.value)}
                    placeholder={rt.attachmentName ?? 'Name'}
                    className="w-1/4"
                  />
                  <Input
                    value={att.url}
                    onChange={(e) => updateAttachment(idx, 'url', e.target.value)}
                    placeholder={rt.attachmentUrl ?? 'URL'}
                    type="url"
                    className="flex-1"
                  />
                  <select
                    value={att.type}
                    onChange={(e) => updateAttachment(idx, 'type', e.target.value)}
                    className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
                  >
                    {ATTACHMENT_TYPES.map((tp) => (
                      <option key={tp} value={tp}>{tp}</option>
                    ))}
                  </select>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeAttachment(idx)}>
                    X
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addAttachment}>
                + {rt.addAttachment ?? 'Add Attachment'}
              </Button>
            </div>

            {/* Message */}
            {message && (
              <div className={`rounded-md px-4 py-3 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={submitting || !title || !description || loadingAgent}
              className="w-full"
            >
              {submitting
                ? (t.building ?? 'Building...')
                : (t.buildNow ?? 'Build Agent')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Build Result */}
      {buildResult && (
        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-900/10">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">
              {t.buildComplete ?? 'Agent Build Complete!'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground">Agent Name</span>
                <div className="font-semibold">{buildResult.agent_name}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Category</span>
                <div className="font-semibold">{buildResult.category}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Services</span>
                <div className="font-semibold">{buildResult.services_count}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Provider</span>
                <div className="font-semibold">{buildResult.provider ?? 'AI'}</div>
              </div>
            </div>

            {buildResult.build_notes && (
              <div className="rounded-md bg-background p-3 text-sm">
                <span className="font-medium">Build Notes:</span>
                <p className="mt-1 text-muted-foreground">{buildResult.build_notes}</p>
              </div>
            )}

            {buildResult.agent_id && (
              <Link
                href={`/agents/${buildResult.agent_id}`}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t.viewAgent ?? 'View Created Agent'}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Build History */}
      <Card>
        <CardHeader>
          <CardTitle>{t.buildHistory ?? 'Build History'}</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingJobs ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t.noBuildHistory ?? 'No build history yet'}</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const inputTitle = typeof job.input_data?.title === 'string' ? job.input_data.title : 'Untitled';
                const resultAgentName = (job.result_data as Record<string, unknown> | null)?.agent_spec
                  ? ((job.result_data as Record<string, Record<string, string>>).agent_spec?.agent_name ?? '')
                  : '';
                return (
                  <div key={job.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-1">
                      <div className="font-medium">{inputTitle}</div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {resultAgentName && <span>→ {resultAgentName}</span>}
                        <span>{new Date(job.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-800'}>
                      {job.status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
