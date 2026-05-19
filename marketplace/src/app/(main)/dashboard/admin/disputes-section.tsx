'use client';

/**
 * Admin: 분쟁 처리 섹션.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.11 결정 23 — 어드민 수동 환불·중재 (Beta+GA).
 *
 * Beta: open/under_review 목록 + resolved/rejected 처리.
 * GA: LLM 1차 권고 + 통계 + 인앱 증거 첨부 (별도 작업).
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface DisputeRow {
  id: string;
  job_id: string;
  claimant_id: string;
  claimant_email: string | null;
  claimant_name: string | null;
  reason: string;
  evidence_urls: string[];
  status: string;
  resolution: string | null;
  refund_amount: string | null;
  refund_currency: string | null;
  created_at: string;
  updated_at: string;
  job_amount: string | null;
  job_currency: string | null;
  job_status: string | null;
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  resolved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function DisputesSection() {
  const [items, setItems] = useState<DisputeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [statusFilter, setStatusFilter] = useState<string>('open');

  // Resolve form (per row).
  const [activeId, setActiveId] = useState<string | null>(null);
  const [decision, setDecision] = useState<'resolved' | 'rejected'>('resolved');
  const [resolution, setResolution] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refundCurrency, setRefundCurrency] = useState('USDC');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
    });
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/admin/disputes?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) {
          setItems(d.items);
          setTotal(Number(d.total ?? 0));
        } else {
          setError(d.error ?? 'unknown');
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [page, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const submitResolve = async (disputeId: string) => {
    if (resolution.trim().length < 5) {
      setError('해결 사유는 5자 이상 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { decision, resolution };
      if (decision === 'resolved' && refundAmount) {
        body.refund_amount = Number(refundAmount);
        body.refund_currency = refundCurrency;
      }
      const r = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d.message ?? d.error ?? `HTTP ${r.status}`);
        return;
      }
      setActiveId(null);
      setResolution('');
      setRefundAmount('');
      fetchItems();
    } catch (e) {
      setError(String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>분쟁 처리 (Beta)</CardTitle>
        <CardDescription>
          PRD §4.11 — 사용자 신청 분쟁을 검토하고 환불·기각 처리.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status filter */}
        <div className="flex gap-2 flex-wrap">
          {['open', 'under_review', 'resolved', 'rejected', ''].map((s) => (
            <Button
              key={s || 'all'}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
            >
              {s || '전체'}
            </Button>
          ))}
          <span className="text-sm text-gray-500 self-center ml-auto">
            총 {total}건
          </span>
        </div>

        {error && (
          <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded p-2">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-gray-500 text-sm">로딩 중...</div>
        ) : items.length === 0 ? (
          <div className="text-gray-500 text-sm">분쟁 내역 없음</div>
        ) : (
          <div className="space-y-3">
            {items.map((d) => (
              <div key={d.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <Badge className={STATUS_BADGE[d.status] ?? ''}>{d.status}</Badge>
                  <span className="text-xs text-gray-500 font-mono">
                    {d.id.slice(0, 8)}
                  </span>
                  <span className="text-sm font-medium">
                    {d.claimant_name ?? d.claimant_email ?? d.claimant_id.slice(0, 8)}
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">
                    {new Date(d.created_at).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className="text-sm">
                  <strong>작업:</strong>{' '}
                  <span className="font-mono">{d.job_id.slice(0, 8)}</span>{' '}
                  ({d.job_amount} {d.job_currency} — {d.job_status})
                </div>
                <div className="text-sm whitespace-pre-wrap bg-gray-50 p-2 rounded">
                  {d.reason}
                </div>
                {d.evidence_urls.length > 0 && (
                  <div className="text-xs">
                    <strong>증거:</strong>{' '}
                    {d.evidence_urls.map((u, i) => (
                      <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 mr-2">
                        링크{i + 1}
                      </a>
                    ))}
                  </div>
                )}
                {d.resolution && (
                  <div className="text-sm">
                    <strong>해결:</strong> {d.resolution}
                    {d.refund_amount && (
                      <Badge variant="outline" className="ml-2">
                        {d.refund_amount} {d.refund_currency} 환불
                      </Badge>
                    )}
                  </div>
                )}

                {/* Resolve form */}
                {!d.resolution && d.status !== 'resolved' && d.status !== 'rejected' && (
                  <>
                    {activeId === d.id ? (
                      <div className="space-y-2 border-t pt-3">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={decision === 'resolved' ? 'default' : 'outline'}
                            onClick={() => setDecision('resolved')}
                          >
                            환불·해결
                          </Button>
                          <Button
                            size="sm"
                            variant={decision === 'rejected' ? 'default' : 'outline'}
                            onClick={() => setDecision('rejected')}
                          >
                            기각
                          </Button>
                        </div>
                        <Input
                          placeholder="해결 사유 (5자+)"
                          value={resolution}
                          onChange={(e) => setResolution(e.target.value)}
                        />
                        {decision === 'resolved' && (
                          <div className="flex gap-2">
                            <Input
                              placeholder="환불 금액"
                              type="number"
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                            />
                            <Input
                              placeholder="USDC"
                              value={refundCurrency}
                              onChange={(e) => setRefundCurrency(e.target.value)}
                              className="w-24"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={submitting}
                            onClick={() => submitResolve(d.id)}
                          >
                            {submitting ? '처리중...' : '확정'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setActiveId(null);
                              setResolution('');
                              setRefundAmount('');
                              setError(null);
                            }}
                          >
                            취소
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setActiveId(d.id)}>
                        처리하기
                      </Button>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <AdminPagination
          page={page}
          totalPages={Math.max(1, Math.ceil(total / limit))}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(n) => { setLimit(n); setPage(1); }}
        />
      </CardContent>
    </Card>
  );
}
