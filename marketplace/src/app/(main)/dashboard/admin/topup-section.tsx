'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TopupRequestRow {
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
  pending: '대기',
  approved: '승인',
  rejected: '거부',
  completed: '완료',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
  completed: 'default',
};

export default function TopupSection() {
  const [pending, setPending] = useState<TopupRequestRow[]>([]);
  const [history, setHistory] = useState<TopupRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/topup');
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

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (requestId: string) => {
    if (!confirm('승인하시겠습니까?')) return;
    setProcessing(requestId);
    try {
      const res = await fetch('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', requestId }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error ?? '오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setProcessing(requestId);
    try {
      const res = await fetch('/api/admin/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', requestId, reason: rejectReason }),
      });
      if (res.ok) {
        setRejectTarget(null);
        setRejectReason('');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error ?? '오류 발생');
      }
    } catch {
      alert('네트워크 오류');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return <p className="text-muted-foreground py-8 text-center">로딩 중...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">충전 요청 관리</h2>
        <p className="text-muted-foreground">사용자 충전 요청 승인/거부</p>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <CardTitle>대기 중인 요청</CardTitle>
          <CardDescription>승인 대기 중인 충전 요청 ({pending.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">대기 중인 요청이 없습니다</p>
          ) : (
            <div className="space-y-3">
              {pending.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {req.nickname}
                      {req.email && (
                        <span className="text-muted-foreground font-normal ml-2 text-xs">({req.email})</span>
                      )}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        $ {Number(req.amount).toLocaleString()}
                      </span>
                      <span>{new Date(req.created_at).toLocaleString('ko-KR')}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rejectTarget === req.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="거부 사유"
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          className="flex h-8 w-40 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                        <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={processing === req.id} onClick={() => handleReject(req.id)}>
                          확인
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>
                          취소
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button size="sm" className="h-8 text-xs" disabled={processing === req.id} onClick={() => handleApprove(req.id)}>
                          {processing === req.id ? '처리 중...' : '승인'}
                        </Button>
                        <Button variant="destructive" size="sm" className="h-8 text-xs" disabled={processing === req.id} onClick={() => setRejectTarget(req.id)}>
                          거부
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {history.filter((r) => r.status !== 'pending').length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>처리 완료 내역</CardTitle>
            <CardDescription>최근 처리된 충전 요청</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history
                .filter((r) => r.status !== 'pending')
                .slice(0, 30)
                .map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">{req.nickname}</p>
                      <p className="text-xs text-muted-foreground">
                        $ {Number(req.amount).toLocaleString()} | {new Date(req.created_at).toLocaleString('ko-KR')}
                        {req.approved_at && (
                          <> | 처리: {new Date(req.approved_at).toLocaleString('ko-KR')}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={STATUS_COLORS[req.status] ?? 'secondary'}>
                        {STATUS_LABELS[req.status] ?? req.status}
                      </Badge>
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
    </div>
  );
}
