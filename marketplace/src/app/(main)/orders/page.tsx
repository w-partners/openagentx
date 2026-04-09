'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

interface OrderRecord {
  id: string;
  agent_name?: string;
  service_name?: string;
  payment_amount?: number | string;
  amount?: number | string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function OrdersPage() {
  const dict = useDict();
  const t = (dict as unknown as Record<string, Record<string, string>>).orders ?? {};

  const [orders, setOrders] = useState<OrderRecord[]>([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/purchase');
        if (res.ok) {
          const json = await res.json();
          const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
          setOrders(rows);
        }
      } catch {
        // ignore
      }
    };
    fetchOrders();
  }, []);

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.pending ?? '대기중',
      processing: t.processing ?? '처리중',
      completed: t.completed ?? '완료',
      failed: t.failed ?? '실패',
    };
    return labels[status] ?? status;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t.title ?? '구매 내역'}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t.title ?? '구매 내역'}</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t.noOrders ?? '구매 내역이 없습니다.'}
            </p>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{order.agent_name ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">{order.service_name ?? '-'}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[order.status] ?? ''}
                    >
                      {statusLabel(order.status)}
                    </Badge>
                    <span className="text-sm font-medium whitespace-nowrap">
                      {Number(order.payment_amount ?? order.amount ?? 0).toLocaleString()} P
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
