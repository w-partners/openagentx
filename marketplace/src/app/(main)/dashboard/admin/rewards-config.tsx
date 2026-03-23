'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ConfigItem {
  id: string;
  value: number;
  description: string | null;
  updated_at: string;
}

const CONFIG_LABELS: Record<string, string> = {
  signup_referral_reward: '추천인 가입 보상 ($)',
  signup_referred_reward: '신규 가입 보상 ($)',
  sns_share_reward: 'SNS 공유 보상 ($)',
  max_share_rewards: '최대 공유 보상 횟수',
  purchase_cashback_rate: '구매 캐시백 비율',
  review_reward: '리뷰 작성 보상 ($)',
  referral_level1_rate: '1단계 추천 보상 비율',
  referral_level2_rate: '2단계 추천 보상 비율',
  referral_level3_rate: '3단계 추천 보상 비율',
  max_referral_depth: '최대 추천 단계',
};

export default function RewardsConfigSection() {
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
      setError(err instanceof Error ? err.message : '설정을 불러오지 못했습니다');
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
      setError('유효한 숫자를 입력해주세요');
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

      setSuccess(`${CONFIG_LABELS[id] ?? id} 설정이 저장되었습니다`);
      await fetchConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
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
        <CardTitle>리워드 설정</CardTitle>
        <CardDescription>
          다단계 추천 보상 및 캐시백 비율을 관리합니다
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
          <p className="text-muted-foreground text-center py-4">불러오는 중...</p>
        ) : configs.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">설정 항목이 없습니다</p>
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
                      현재: {formatDisplay(item.id, item.value)}
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
                      {saving === item.id ? '저장 중...' : '저장'}
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
