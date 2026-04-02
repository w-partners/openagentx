'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDict } from '@/i18n/client';

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
  other: 'Other',
};

export default function AdminShareSection() {
  const dict = useDict();
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
    if (!confirm('Approve?')) return;
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
        alert(json.error ?? 'Error');
      }
    } catch {
      alert(dict.common.networkError);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (shareId: string) => {
    if (!confirm('Reject?')) return;
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
        alert(json.error ?? 'Error occurred');
      }
    } catch {
      alert('Network error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.adminShare.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Verification Management</CardTitle>
        <CardDescription>
          Review and approve/reject SNS share verification requests (Pending: {pending.length})
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pending.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            {dict.adminShare.noPending}
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
                    <span>{new Date(share.created_at).toLocaleDateString('en-US')}</span>
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
                    {processing === share.id ? dict.common.processing : dict.adminPage.approve}
                  </button>
                  <button
                    onClick={() => handleReject(share.id)}
                    disabled={processing === share.id}
                    className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                  >
                    Reject
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
