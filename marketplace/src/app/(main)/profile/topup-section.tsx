'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface TopupRequest {
  id: string;
  amount: number;
  status: string;
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거부됨',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function TopupSection() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [requests, setRequests] = useState<TopupRequest[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/topup');
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests ?? []);
      }
    } catch {
      // ignore fetch errors silently
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 1 || numAmount > 1000) {
      setError('충전 금액은 $1 ~ $1,000 범위여야 합니다');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', amount: numAmount }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('충전 요청이 제출되었습니다. 관리자 승인을 기다려주세요.');
        setAmount('');
        fetchHistory();
      } else {
        setError(data.error ?? '요청 처리 중 오류가 발생했습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>크레딧 충전하기</CardTitle>
        <CardDescription>
          충전 금액을 입력하고 요청하세요. 관리자가 입금 확인 후 잔액이 충전됩니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Top-up form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="topup-amount" className="text-sm font-medium">
              충전 금액 (달러)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold">$</span>
              <input
                id="topup-amount"
                type="number"
                min="1"
                max="1000"
                step="0.01"
                placeholder="충전할 금액 입력"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex h-10 w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? '요청 중...' : '충전 요청'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              최소 $1 ~ 최대 $1,000
            </p>
          </div>
          {message && (
            <p className="text-sm text-green-600 dark:text-green-400">{message}</p>
          )}
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </form>

        {/* Quick amount buttons */}
        <div className="flex flex-wrap gap-2">
          {[10, 50, 100, 500].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setAmount(String(v))}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors"
            >
              $ {v}
            </button>
          ))}
        </div>

        {/* Top-up history */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold mb-3">충전 요청 내역</h3>
          {fetching ? (
            <p className="text-sm text-muted-foreground">불러오는 중...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">충전 요청 내역이 없습니다</p>
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">$ {Number(req.amount).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.created_at).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[req.status] ?? ''}`}>
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                    {req.admin_note && (
                      <span className="text-xs text-muted-foreground" title={req.admin_note}>
                        ({req.admin_note})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
