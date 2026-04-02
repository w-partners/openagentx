'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useDict } from '@/i18n/client';

interface BonusInfo {
  hasSignupBonus: boolean;
  amount: number;
}

/**
 * Trial credit badge — displayed to users who received a signup bonus
 */
export default function TrialCreditBadge() {
  const dict = useDict();
  const [bonus, setBonus] = useState<BonusInfo | null>(null);

  useEffect(() => {
    async function fetchBonus() {
      try {
        const res = await fetch('/api/rewards');
        if (!res.ok) return;
        const json = await res.json();
        const stats = json.data?.stats?.byType as { type: string; total: number }[] | undefined;
        if (!stats) return;

        const signupBonus = stats.find((s) => s.type === 'signup_bonus');
        if (signupBonus) {
          setBonus({ hasSignupBonus: true, amount: signupBonus.total });
        }
      } catch {
        // hide badge on fetch failure
      }
    }
    fetchBonus();
  }, []);

  if (!bonus?.hasSignupBonus) return null;

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="flex items-center gap-3 py-3">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          Trial Credit
        </span>
        <span className="text-sm text-blue-700 dark:text-blue-300">
          Signup bonus ${bonus.amount.toFixed(2)} credits have been applied.
        </span>
      </CardContent>
    </Card>
  );
}
