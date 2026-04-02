'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDict } from '@/i18n/client';

interface RewardItem {
  id: string;
  type: string;
  amount: number;
  referral_level: number | null;
  created_at: string;
}

interface RewardStats {
  totalEarned: number;
  byType: { type: string; total: number; count: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  referral_commission: 'Referral Commission',
  purchase_cashback: 'Purchase Cashback',
  review_reward: 'Review Reward',
  signup_referral: 'Signup Referral Bonus',
};

export default function RewardSection() {
  const dict = useDict();
  const [rewards, setRewards] = useState<RewardItem[]>([]);
  const [stats, setStats] = useState<RewardStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchRewards = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rewards');
      const json = await res.json();
      if (!json.success) return;
      setRewards(json.data.rewards ?? []);
      setStats(json.data.stats ?? null);
      setTotal(json.data.total ?? 0);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.rewardSection.title}</CardTitle>
        <CardDescription>{dict.rewardSection.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-center py-4">{dict.common.loading}</p>
        ) : (
          <div className="space-y-6">
            {/* Stats summary */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="rounded-lg border p-3 text-center">
                  <p className="text-xs text-muted-foreground">{dict.rewardSection.totalEarned}</p>
                  <p className="text-lg font-bold text-primary">
                    ${stats.totalEarned.toFixed(2)}
                  </p>
                </div>
                {stats.byType.map((bt) => (
                  <div key={bt.type} className="rounded-lg border p-3 text-center">
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[bt.type] ?? bt.type}
                    </p>
                    <p className="text-sm font-semibold">${bt.total.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">{bt.count} times</p>
                  </div>
                ))}
              </div>
            )}

            {/* Reward history */}
            {rewards.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {dict.rewardSection.noRewards}
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {total} reward records total
                </p>
                {rewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {TYPE_LABELS[reward.type] ?? reward.type}
                        {reward.referral_level != null && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (Lv.{reward.referral_level})
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(reward.created_at)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +${Number(reward.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
