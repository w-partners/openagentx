'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ShareRewardWithUser {
  id: string;
  user_id: string;
  platform: string;
  share_url: string;
  status: string;
  reward_amount: number;
  created_at: string;
  verified_at: string | null;
  nickname: string;
  email: string | null;
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  telegram: 'Telegram',
  facebook: 'Facebook',
  other: '기타',
};

export default function AdminShareSection() {
  const [pending, setPending] = useState<ShareRewardWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pending-shares' }),
      });
      if (res.ok) {
        const json = await res.json();
        setPending(json.data?.pending ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (shareId: string) => {
    if (!confirm('이 공유 인증을 승인하시겠습니까?')) return;
    setProcessing(shareId);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve-share', shareId }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const json = await res.json();
        alert(json.error ?? '처리 중 오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (shareId: string) => {
    if (!confirm('이 공유 인증을 거부하시겠습니까?')) return;
    setProcessing(shareId);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject-share', shareId }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const json = await res.json();
        alert(json.error ?? '처리 중 오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>공유 인증 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>공유 인증 관리</CardTitle>
        <CardDescription>
          SNS 공유 인증 요청을 확인하고 승인/거부하세요 (대기 중: {pending.length}건)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            대기 중인 공유 인증이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((share) => (
              <div
                key={share.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {share.nickname}
                    {share.email && (
                      <span className="text-muted-foreground font-normal ml-2 text-xs">
                        ({share.email})
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{PLATFORM_LABELS[share.platform] ?? share.platform}</span>
                    <span>$ {Number(share.reward_amount).toFixed(2)}</span>
                    <span>{new Date(share.created_at).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <a
                    href={share.share_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block max-w-md"
                  >
                    {share.share_url}
                  </a>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleApprove(share.id)}
                    disabled={processing === share.id}
                    className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {processing === share.id ? '처리 중...' : '승인'}
                  </button>
                  <button
                    onClick={() => handleReject(share.id)}
                    disabled={processing === share.id}
                    className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    거부
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
