'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';
import { SERVICE_CATEGORIES } from '@/lib/utils/constants';

/* ─── Types ─── */
interface RankingWeights {
  rating: number;
  transactions: number;
  commission: number;
  recency: number;
}

interface NewAgentBoostConfig {
  days: number;
  multiplier: number;
}

interface AdminAgent {
  id: string;
  name: string;
  category: string;
  is_pinned: boolean;
  boost_multiplier: number;
  avg_rating: number;
  total_jobs: number;
  status: string;
}

const DEFAULT_WEIGHTS: RankingWeights = { rating: 40, transactions: 30, commission: 15, recency: 15 };
const DEFAULT_NEW_BOOST: NewAgentBoostConfig = { days: 7, multiplier: 1.5 };

/* ─── Ranking Weights Section ─── */
function RankingWeightsSection({ dict }: { dict: ReturnType<typeof useDict> }) {
  const t = (dict.adminPanel as Record<string, Record<string, string>>).algorithm;
  const [weights, setWeights] = useState<RankingWeights>(DEFAULT_WEIGHTS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.ranking_weights) {
          setWeights(d.settings.ranking_weights as RankingWeights);
        }
      })
      .catch(() => {});
  }, []);

  const total = weights.rating + weights.transactions + weights.commission + weights.recency;

  const updateWeight = (key: keyof RankingWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: Math.max(0, Math.min(100, value)) }));
    setSaved(false);
  };

  const save = async () => {
    if (total !== 100) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ranking_weights', value: weights }),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof RankingWeights; label: string }[] = [
    { key: 'rating', label: t.ratingWeight },
    { key: 'transactions', label: t.transactionWeight },
    { key: 'commission', label: t.commissionWeight },
    { key: 'recency', label: t.recencyWeight },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.rankingWeights}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-4">
            <label className="w-48 text-sm font-medium">{label}</label>
            <input
              type="range"
              min={0}
              max={100}
              value={weights[key]}
              onChange={(e) => updateWeight(key, parseInt(e.target.value))}
              className="flex-1"
            />
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                max={100}
                value={weights[key]}
                onChange={(e) => updateWeight(key, parseInt(e.target.value) || 0)}
                className="w-16 rounded border px-2 py-1 text-sm text-center bg-background"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between pt-2 border-t">
          <span className={`text-sm font-medium ${total !== 100 ? 'text-destructive' : 'text-green-600'}`}>
            {t.currentTotal.replace('{total}', String(total))}
            {total !== 100 && ` — ${t.totalMustBe100}`}
          </span>
          <Button onClick={save} disabled={saving || total !== 100} size="sm">
            {saving ? t.saving : saved ? t.saved : t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Agent Boost Section ─── */
function AgentBoostSection({ dict }: { dict: ReturnType<typeof useDict> }) {
  const t = (dict.adminPanel as Record<string, Record<string, string>>).algorithm;
  const [agents, setAgents] = useState<AdminAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = useCallback(() => {
    setLoading(true);
    fetch('/api/admin/agents')
      .then((r) => r.json())
      .then((d) => {
        if (d.agents) setAgents(d.agents);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const togglePin = async (agentId: string) => {
    await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'togglePin', agentId }),
    });
    fetchAgents();
  };

  const updateBoost = async (agentId: string, boostMultiplier: number) => {
    await fetch('/api/admin/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateBoost', agentId, boostMultiplier }),
    });
    fetchAgents();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.agentBoost}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">{dict.common.loading}</p>
        ) : agents.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">{t.noAgents}</p>
        ) : (
          <div className="space-y-0">
            {/* Header */}
            <div className="grid grid-cols-[1fr_80px_80px_60px_120px_100px] gap-2 px-3 py-2 bg-muted rounded-t-md text-xs font-medium">
              <span>{t.agentName}</span>
              <span>{t.category}</span>
              <span>{t.rating}</span>
              <span>{t.jobs}</span>
              <span>{t.boost}</span>
              <span>{t.actions}</span>
            </div>
            {/* Rows */}
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="grid grid-cols-[1fr_80px_80px_60px_120px_100px] gap-2 px-3 py-2 border-b items-center text-sm"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="truncate">{agent.name}</span>
                  {agent.is_pinned && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">{t.pinned}</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground truncate">{agent.category}</span>
                <span className="text-xs">{Number(agent.avg_rating).toFixed(1)}</span>
                <span className="text-xs">{agent.total_jobs}</span>
                <select
                  value={Number(agent.boost_multiplier).toFixed(1)}
                  onChange={(e) => updateBoost(agent.id, parseFloat(e.target.value))}
                  className="h-7 rounded border px-1 text-xs bg-white dark:bg-zinc-900 text-foreground [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
                >
                  {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((v) => (
                    <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}x</option>
                  ))}
                </select>
                <Button
                  variant={agent.is_pinned ? 'default' : 'outline'}
                  size="sm"
                  className="text-xs h-7 px-2"
                  onClick={() => togglePin(agent.id)}
                >
                  {agent.is_pinned ? t.pinned : t.pin}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── New Agent Boost Section ─── */
function NewAgentBoostSection({ dict }: { dict: ReturnType<typeof useDict> }) {
  const t = (dict.adminPanel as Record<string, Record<string, string>>).algorithm;
  const [config, setConfig] = useState<NewAgentBoostConfig>(DEFAULT_NEW_BOOST);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.new_agent_boost) {
          setConfig(d.settings.new_agent_boost as NewAgentBoostConfig);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'new_agent_boost', value: config }),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.newAgentBoost}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="w-48 text-sm font-medium">{t.boostDuration}</label>
          <input
            type="number"
            min={1}
            max={90}
            value={config.days}
            onChange={(e) => { setConfig((p) => ({ ...p, days: parseInt(e.target.value) || 1 })); setSaved(false); }}
            className="w-24 rounded border px-2 py-1 text-sm text-center bg-background"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="w-48 text-sm font-medium">{t.boostMultiplierLabel}</label>
          <select
            value={config.multiplier.toFixed(1)}
            onChange={(e) => { setConfig((p) => ({ ...p, multiplier: parseFloat(e.target.value) })); setSaved(false); }}
            className="w-24 rounded border px-2 py-1 text-sm bg-white dark:bg-zinc-900 text-foreground [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
          >
            {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map((v) => (
              <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}x</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end pt-2 border-t">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? t.saving : saved ? t.saved : t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Category Priority Section ─── */
function CategoryPrioritySection({ dict }: { dict: ReturnType<typeof useDict> }) {
  const t = (dict.adminPanel as Record<string, Record<string, string>>).algorithm;
  const [categories, setCategories] = useState<string[]>([...SERVICE_CATEGORIES]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((d) => {
        if (d.settings?.category_priority && Array.isArray(d.settings.category_priority)) {
          setCategories(d.settings.category_priority as string[]);
        }
      })
      .catch(() => {});
  }, []);

  const moveUp = (index: number) => {
    if (index === 0) return;
    setCategories((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setSaved(false);
  };

  const moveDown = (index: number) => {
    if (index >= categories.length - 1) return;
    setCategories((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'category_priority', value: categories }),
      });
      if (res.ok) setSaved(true);
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.categoryPriority}</CardTitle>
        <p className="text-sm text-muted-foreground">{t.dragToReorder}</p>
      </CardHeader>
      <CardContent className="space-y-1">
        {categories.map((cat, i) => (
          <div key={cat} className="flex items-center gap-2 px-3 py-2 border rounded-md">
            <span className="w-6 text-xs text-muted-foreground font-mono">{i + 1}</span>
            <span className="flex-1 text-sm font-medium capitalize">
              {dict.categories[cat as keyof typeof dict.categories] ?? cat}
            </span>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveUp(i)} disabled={i === 0}>
              {t.moveUp}
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => moveDown(i)} disabled={i === categories.length - 1}>
              {t.moveDown}
            </Button>
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} size="sm">
            {saving ? t.saving : saved ? t.saved : t.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Main Algorithm Tab ─── */
export default function AlgorithmSection() {
  const dict = useDict();
  const t = (dict.adminPanel as Record<string, Record<string, string>>).algorithm;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t.title}</h2>
        <p className="text-muted-foreground">{t.description}</p>
      </div>
      <RankingWeightsSection dict={dict} />
      <AgentBoostSection dict={dict} />
      <NewAgentBoostSection dict={dict} />
      <CategoryPrioritySection dict={dict} />
    </div>
  );
}
