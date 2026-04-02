'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDict } from '@/i18n/client';

interface ConfigItem {
  id: string;
  value: number;
  description: string | null;
  updated_at: string;
}

const CONFIG_LABELS: Record<string, string> = {
  signup_referral_reward: 'Referral Signup Reward ($)',
  signup_referred_reward: 'New User Signup Reward ($)',
  sns_share_reward: 'SNS Share Reward ($)',
  max_share_rewards: 'Max Share Rewards Count',
  purchase_cashback_rate: 'Purchase Cashback Rate',
  review_reward: 'Review Reward ($)',
  referral_level1_rate: 'Level 1 Referral Rate',
  referral_level2_rate: 'Level 2 Referral Rate',
  referral_level3_rate: 'Level 3 Referral Rate',
  max_referral_depth: 'Max Referral Depth',
};

export default function RewardsConfigSection() {
  const dict = useDict();
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rewards?admin=true');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setConfigs(json.data);
      const values: Record<string, string> = {};
      for (const item of json.data) {
        values[item.id] = String(item.value);
      }
      setEditValues(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (id: string) => {
    const newValue = parseFloat(editValues[id]);
    if (isNaN(newValue)) {
      setError(dict.rewardsConfig.invalidNumber);
      return;
    }

    try {
      setSaving(id);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/rewards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-config', id, value: newValue }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      setSuccess(`${CONFIG_LABELS[id] ?? id} setting saved`);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const formatDisplay = (id: string, value: number): string => {
    if (id.includes('rate')) return `${(value * 100).toFixed(2)}%`;
    if (id.includes('reward') || id === 'sns_share_reward') return `$${value.toFixed(2)}`;
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.rewardsConfig.title}</CardTitle>
        <CardDescription>
          {dict.rewardsConfig.description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-md bg-green-100 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-center py-4">{dict.common.loading}</p>
        ) : configs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">{dict.rewardsConfig.noConfigs}</p>
        ) : (
          <div className="space-y-3">
            {configs.map((item) => {
              const original = configs.find((c) => c.id === item.id);
              const currentVal = editValues[item.id] ?? '';
              const changed = original && String(original.value) !== currentVal;

              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 py-3 border-b last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {CONFIG_LABELS[item.id] ?? item.id}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.description ?? item.id}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Current: {formatDisplay(item.id, item.value)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="any"
                      value={currentVal}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-32 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    />
                    <button
                      onClick={() => handleSave(item.id)}
                      disabled={saving === item.id || !changed}
                      className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {saving === item.id ? dict.rewardsConfig.saving : dict.common.save}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
