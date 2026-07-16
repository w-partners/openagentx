'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface Widget {
  id: string;
  token: string;
  name: string;
  agent_slug: string | null;
  prompt_slug: string | null;
  cors_origins: string[];
  welcome_message: string | null;
  primary_color: string;
  position: string;
  monthly_quota: number;
  is_active: boolean;
  inject_page_context: boolean;
  monthly_use: number;
  avg_duration_ms: number;
  created_at: string;
}

interface AgentOption { slug: string; name: string }
interface PromptOption { slug: string; title: string }

const POSITIONS = ['bottom-right', 'bottom-left', 'bottom-center'];

export default function DashboardWidgetsPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [agents, setAgents] = useState<AgentOption[]>([]);
  const [prompts, setPrompts] = useState<PromptOption[]>([]);
  const [justCreated, setJustCreated] = useState<Widget | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [target, setTarget] = useState<'agent' | 'prompt'>('agent');
  const [agentSlug, setAgentSlug] = useState('');
  const [promptSlug, setPromptSlug] = useState('');
  const [corsOriginsText, setCorsOriginsText] = useState('');
  const [welcome, setWelcome] = useState('안녕하세요! 무엇을 도와드릴까요?');
  const [color, setColor] = useState('#0EA5E9');
  const [position, setPosition] = useState('bottom-right');
  const [quota, setQuota] = useState(1000);
  const [injectCtx, setInjectCtx] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/dashboard/widgets');
      const j = await r.json();
      if (j.success) setWidgets(j.data ?? []);
    } catch { /* noop */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    fetch('/api/agents?limit=100&status=active')
      .then((r) => r.json())
      .then((j) => {
        const list = (j.data ?? j.agents ?? []) as { slug: string; name: string }[];
        setAgents(list.map((a) => ({ slug: a.slug, name: a.name })));
      })
      .catch(() => { /* noop */ });
    fetch('/api/prompts?limit=100')
      .then((r) => r.json())
      .then((j) => {
        const list = (j.data?.prompts ?? j.prompts ?? []) as { slug: string; title: string }[];
        setPrompts(list.map((p) => ({ slug: p.slug, title: p.title })));
      })
      .catch(() => { /* noop */ });
  }, []);

  function resetForm() {
    setName(''); setAgentSlug(''); setPromptSlug('');
    setCorsOriginsText(''); setWelcome('안녕하세요! 무엇을 도와드릴까요?');
    setColor('#0EA5E9'); setPosition('bottom-right'); setQuota(1000);
    setInjectCtx(true); setFormError('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setFormError('');
    const cors = corsOriginsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const body = {
      name,
      agent_slug: target === 'agent' ? agentSlug || null : null,
      prompt_slug: target === 'prompt' ? promptSlug || null : null,
      cors_origins: cors,
      welcome_message: welcome,
      primary_color: color,
      position,
      monthly_quota: quota,
      inject_page_context: injectCtx,
    };
    try {
      const r = await fetch('/api/dashboard/widgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (j.success) {
        setJustCreated(j.data);
        setShowForm(false);
        resetForm();
        fetchAll();
      } else {
        setFormError(j.error ?? '등록 실패');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '네트워크 오류');
    }
    setSubmitting(false);
  }

  async function toggleActive(w: Widget) {
    await fetch(`/api/dashboard/widgets/${w.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !w.is_active }),
    });
    fetchAll();
  }

  async function remove(w: Widget) {
    if (!confirm(`"${w.name}" 위젯을 삭제할까요? 모든 호출 기록도 함께 삭제됩니다.`)) return;
    await fetch(`/api/dashboard/widgets/${w.id}`, { method: 'DELETE' });
    fetchAll();
  }

  function snippet(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://openagentx.org';
    return `<script src="${origin}/embed.js?token=${token}" async></script>`;
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">임베드 위젯</h1>
          <p className="text-sm text-muted-foreground">
            외부 사이트에 1줄 script 로 AI 챗봇을 임베드하고 호출당 비용으로 운영하세요.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {showForm ? '폼 닫기' : '새 위젯'}
        </button>
      </div>

      {justCreated && (
        <Card className="border-green-500/40 bg-green-50/30 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-300">
              ✓ 위젯이 생성되었습니다
            </CardTitle>
            <CardDescription>
              아래 script 1줄을 자기 사이트의 <code>&lt;body&gt;</code> 끝에 붙여넣으면 즉시 적용됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-xs break-all">{justCreated.token}</code>
              <button onClick={() => copy(justCreated.token)} className="rounded border px-3 py-1 text-xs hover:bg-accent">토큰 복사</button>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded bg-muted p-2 text-xs break-all">{snippet(justCreated.token)}</code>
              <button onClick={() => copy(snippet(justCreated.token))} className="rounded border px-3 py-1 text-xs hover:bg-accent">snippet 복사</button>
            </div>
            <button onClick={() => setJustCreated(null)} className="text-xs text-muted-foreground underline">닫기</button>
          </CardContent>
        </Card>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>새 위젯 등록</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <label className="space-y-1">
                <div className="font-medium">이름</div>
                <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </label>

              <label className="space-y-1">
                <div className="font-medium">월 호출 한도</div>
                <input type="number" min={1} max={1000000} className="w-full rounded border px-3 py-2" value={quota} onChange={(e) => setQuota(parseInt(e.target.value, 10) || 1000)} />
              </label>

              <div className="space-y-1 md:col-span-2">
                <div className="font-medium">대상 (둘 중 하나)</div>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={target === 'agent'} onChange={() => setTarget('agent')} />
                    에이전트
                  </label>
                  <label className="flex items-center gap-1">
                    <input type="radio" checked={target === 'prompt'} onChange={() => setTarget('prompt')} />
                    프롬프트
                  </label>
                </div>
                {target === 'agent' ? (
                  <select className="w-full rounded border px-3 py-2" value={agentSlug} onChange={(e) => setAgentSlug(e.target.value)} required>
                    <option value="">— 에이전트 선택 —</option>
                    {agents.map((a) => <option key={a.slug} value={a.slug}>{a.name} ({a.slug})</option>)}
                  </select>
                ) : (
                  <select className="w-full rounded border px-3 py-2" value={promptSlug} onChange={(e) => setPromptSlug(e.target.value)} required>
                    <option value="">— 프롬프트 선택 —</option>
                    {prompts.map((p) => <option key={p.slug} value={p.slug}>{p.title} ({p.slug})</option>)}
                  </select>
                )}
              </div>

              <label className="space-y-1 md:col-span-2">
                <div className="font-medium">CORS 허용 도메인 (한 줄에 1개, * 가능)</div>
                <textarea className="w-full rounded border px-3 py-2 font-mono text-xs" rows={4}
                  placeholder="https://example.com&#10;https://www.example.com"
                  value={corsOriginsText} onChange={(e) => setCorsOriginsText(e.target.value)} />
              </label>

              <label className="space-y-1 md:col-span-2">
                <div className="font-medium">환영 메시지</div>
                <textarea className="w-full rounded border px-3 py-2" rows={2} maxLength={2000}
                  value={welcome} onChange={(e) => setWelcome(e.target.value)} />
              </label>

              <label className="space-y-1">
                <div className="font-medium">기본 색상</div>
                <div className="flex items-center gap-2">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-14 cursor-pointer rounded border" />
                  <input type="text" className="flex-1 rounded border px-3 py-2" value={color} onChange={(e) => setColor(e.target.value)} />
                </div>
              </label>

              <label className="space-y-1">
                <div className="font-medium">위치</div>
                <select className="w-full rounded border px-3 py-2" value={position} onChange={(e) => setPosition(e.target.value)}>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>

              <label className="md:col-span-2 flex items-center gap-2">
                <input type="checkbox" checked={injectCtx} onChange={(e) => setInjectCtx(e.target.checked)} />
                <span className="text-sm">현재 페이지 URL/제목을 자동으로 system prompt 에 주입</span>
              </label>

              {formError && <div className="md:col-span-2 text-red-600 text-sm">{formError}</div>}

              <div className="md:col-span-2 flex gap-2">
                <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  {submitting ? '생성 중...' : '위젯 생성'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="rounded-md border px-4 py-2 text-sm">
                  취소
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {loading && <div className="text-sm text-muted-foreground">로딩 중...</div>}
        {!loading && widgets.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              아직 등록된 위젯이 없습니다. "새 위젯" 버튼을 눌러 시작하세요.
            </CardContent>
          </Card>
        )}
        {widgets.map((w) => (
          <Card key={w.id}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full" style={{ background: w.primary_color }} />
                    {w.name}
                    {!w.is_active && <span className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase">inactive</span>}
                  </CardTitle>
                  <CardDescription>
                    {w.agent_slug ? `에이전트: ${w.agent_slug}` : `프롬프트: ${w.prompt_slug}`}
                    {' · '}
                    위치: {w.position}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => toggleActive(w)} className="rounded border px-3 py-1 text-xs hover:bg-accent">
                    {w.is_active ? '비활성화' : '활성화'}
                  </button>
                  <button onClick={() => remove(w)} className="rounded border border-red-500/40 text-red-600 px-3 py-1 text-xs hover:bg-red-50 dark:hover:bg-red-950/30">
                    삭제
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded bg-muted/40 p-2"><div className="text-muted-foreground">이번 달 사용</div><div className="font-bold">{w.monthly_use} / {w.monthly_quota}</div></div>
                <div className="rounded bg-muted/40 p-2"><div className="text-muted-foreground">평균 응답</div><div className="font-bold">{Math.round((w.avg_duration_ms || 0) / 100) / 10}s</div></div>
                <div className="rounded bg-muted/40 p-2"><div className="text-muted-foreground">CORS</div><div className="font-bold">{w.cors_origins.length}개</div></div>
                <div className="rounded bg-muted/40 p-2"><div className="text-muted-foreground">생성</div><div className="font-bold">{new Date(w.created_at).toLocaleDateString()}</div></div>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted p-2 text-xs break-all">{snippet(w.token)}</code>
                <button onClick={() => copy(snippet(w.token))} className="rounded border px-3 py-1 text-xs hover:bg-accent">복사</button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
