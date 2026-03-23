'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface BonusInfo {
  hasSignupBonus: boolean;
  amount: number;
}

/**
 * 체험 크레딧 배지 — 가입 보너스를 받은 사용자에게 표시
 */
export default function TrialCreditBadge() {
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
        // 조회 실패 시 배지 미표시
      }
    }
    fetchBonus();
  }, []);

  if (!bonus?.hasSignupBonus) return null;

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
      <CardContent className="flex items-center gap-3 py-3">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          체험 크레딧
        </span>
        <span className="text-sm text-blue-700 dark:text-blue-300">
          가입 보너스 ${bonus.amount.toFixed(2)} 크레딧이 지급되었습니다.
        </span>
      </CardContent>
    </Card>
  );
}
