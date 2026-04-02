'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useDict } from '@/i18n/client';

interface TopupRequestWithUser {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  admin_note: string | null;
  approved_by: string | null;
  created_at: string;
  approved_at: string | null;
  nickname: string;
  email: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminTopupSection() {
  const dict = useDict();
  const [pending, setPending] = useState<TopupRequestWithUser[]>([]);
  const [history, setHistory] = useState<TopupRequestWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/topup');
      if (res.ok) {
        const data = await res.json();
        setPending(data.pending ?? []);
        setHistory(data.history ?? []);
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

  const handleApprove = async (requestId: string) => {
    if (!confirm('Approve?')) return;
    setProcessing(requestId);
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Error occurred');
      }
    } catch {
      alert('Network error');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', requestId, reason: rejectReason }),
      });
      if (res.ok) {
        setRejectTarget(null);
        setRejectReason('');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error ?? 'Error occurred');
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
          <CardTitle>{dict.adminTopup.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{dict.common.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Pending top-up requests */}
      <Card>
        <CardHeader>
          <CardTitle>Top-up Request Management</CardTitle>
          <CardDescription>
            Review and approve/reject user top-up requests (Pending: {pending.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {dict.adminTopup.noPending}
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {req.nickname}
                      {req.email && (
                        <span className="text-muted-foreground font-normal ml-2 text-xs">
                          ({req.email})
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        $ {Number(req.amount).toLocaleString()}
                      </span>
                      <span>{new Date(req.created_at).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rejectTarget === req.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={dict.adminTopup.rejectReason}
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex h-8 w-40 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={processing === req.id}
                          className="inline-flex items-center justify-center rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={processing === req.id}
                          className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {processing === req.id ? dict.common.processing : dict.adminPage.approve}
                        </button>
                        <button
                          onClick={() => setRejectTarget(req.id)}
                          disabled={processing === req.id}
                          className="inline-flex items-center justify-center rounded-md bg-destructive/10 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent top-up history */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.adminTopup.historyTitle}</CardTitle>
            <CardDescription>{dict.adminTopup.historyDesc}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history
                .filter((r) => r.status !== 'pending')
                .slice(0, 20)
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{req.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        $ {Number(req.amount).toLocaleString()} |{' '}
                        {new Date(req.created_at).toLocaleDateString('en-US')}
                        {req.approved_at && (
                          <> | Processed: {new Date(req.approved_at).toLocaleDateString('en-US')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] ?? ''}`}>
                        {STATUS_LABELS[req.status] ?? req.status}
                      </span>
                      {req.admin_note && (
                        <span className="text-xs text-muted-foreground">({req.admin_note})</span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
