'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AdminPagination from '@/components/admin/pagination';

interface PaymentRow {
  id: string;
  user_id: string;
  payment_type: string;
  amount: number;
  currency: string;
  status: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  user_email: string | null;
  user_nickname: string;
}

const TYPE_LABELS: Record<string, string> = {
  deposit: '입금',
  withdrawal: '출금',
  job_payment: '작업결제',
  settlement: '정산',
  refund: '환불',
  admin_grant: '관리자 지급',
  admin_revoke: '관리자 차감',
  portone_card: '카드결제',
  portone_cancel: '카드취소',
  paypal_order: 'PayPal',
  stripe_card: 'Stripe',
};

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  completed: 'default',
  pending: 'secondary',
  failed: 'destructive',
  cancelled: 'destructive',
  escrowed: 'secondary',
};

export default function PaymentsSection() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [typeFilter, setTypeFilter] = useState('');

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (typeFilter) params.set('type', typeFilter);

    fetch(`/api/admin/payments?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.payments) {
          setPayments(d.payments);
          setTotal(d.total ?? 0);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, limit, typeFilter]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">결제 내역</h2>
        <p className="text-muted-foreground">전체 결제/정산/환불 내역 조회</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="h-9 rounded-md border border-input bg-white dark:bg-zinc-900 text-foreground px-3 text-sm [&>option]:bg-white dark:[&>option]:bg-zinc-900 [&>option]:text-foreground"
        >
          <option value="">전체 유형</option>
          <option value="deposit">입금</option>
          <option value="withdrawal">출금</option>
          <option value="job_payment">작업결제</option>
          <option value="settlement">정산</option>
          <option value="refund">환불</option>
          <option value="admin_grant">관리자 지급</option>
          <option value="admin_revoke">관리자 차감</option>
        </select>
      </div>

      {loading ? (
        <p className="text-muted-foreground py-8 text-center">로딩 중...</p>
      ) : payments.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">결제 내역이 없습니다</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-[1fr_100px_100px_80px_80px_120px] gap-2 px-4 py-2 bg-muted rounded-t-md text-sm font-medium">
              <span>사용자</span>
              <span>유형</span>
              <span>금액</span>
              <span>통화</span>
              <span>상태</span>
              <span>일시</span>
            </div>
            {payments.map((p) => (
              <div key={p.id} className="grid grid-cols-[1fr_100px_100px_80px_80px_120px] gap-2 px-4 py-3 border-b items-center text-sm">
                <span className="truncate">
                  <span className="font-medium">{p.user_nickname}</span>
                  {p.user_email && (
                    <span className="text-muted-foreground text-xs ml-1">({p.user_email})</span>
                  )}
                </span>
                <span>
                  <Badge variant="secondary" className="text-xs">
                    {TYPE_LABELS[p.payment_type] ?? p.payment_type}
                  </Badge>
                </span>
                <span className="font-mono text-xs">{Number(p.amount).toLocaleString()}</span>
                <span className="text-xs">{p.currency}</span>
                <span>
                  <Badge variant={STATUS_COLORS[p.status] ?? 'secondary'} className="text-xs">
                    {p.status}
                  </Badge>
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AdminPagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        onLimitChange={(newLimit) => { setLimit(newLimit); setPage(1); }}
      />
    </div>
  );
}
