'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

const BANKS = [
  { value: 'kb', label: '국민은행' },
  { value: 'shinhan', label: '신한은행' },
  { value: 'hana', label: '하나은행' },
  { value: 'woori', label: '우리은행' },
  { value: 'nh', label: '농협은행' },
  { value: 'ibk', label: '기업은행' },
  { value: 'kakao', label: '카카오뱅크' },
  { value: 'toss', label: '토스뱅크' },
];

interface WithdrawRecord {
  id: string;
  amount: number;
  bank: string;
  account_number: string;
  account_holder: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

export default function WithdrawPage() {
  const dict = useDict();
  const t = (dict as unknown as Record<string, Record<string, string>>).withdraw ?? {};

  const [balance, setBalance] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<WithdrawRecord[]>([]);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch('/api/balance');
      if (res.ok) {
        const json = await res.json();
        const b = json?.data?.balance ?? json?.balance ?? 0;
        setBalance(Number(b) || 0);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/withdraw');
      if (res.ok) {
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
        setHistory(rows);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, [fetchBalance, fetchHistory]);

  const handleWithdraw = async () => {
    const amountNum = Number(amount);
    if (amountNum < 10000) return;
    if (!bank || !accountNumber || !accountHolder) return;

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountNum,
          bank,
          account_number: accountNumber,
          account_holder: accountHolder,
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: t.success ?? '출금 요청이 완료되었습니다!' });
        fetchBalance();
        fetchHistory();
        setAmount('');
        setBank('');
        setAccountNumber('');
        setAccountHolder('');
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error ?? t.failed ?? '출금 요청에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: t.failed ?? '출금 요청에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  const statusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t.pending ?? '대기중',
      approved: t.approved ?? '승인',
      rejected: t.rejected ?? '거절',
      completed: t.completed ?? '완료',
    };
    return labels[status] ?? status;
  };

  const amountNum = Number(amount) || 0;
  const canSubmit = amountNum >= 10000 && amountNum <= balance && bank && accountNumber && accountHolder;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t.title ?? '출금'}</h1>
      </div>

      {/* Current Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">{t.currentBalance ?? '현재 잔액'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">{balance.toLocaleString()} P</p>
        </CardContent>
      </Card>

      {/* Withdraw Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t.title ?? '출금'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t.amount ?? '출금 금액'}</label>
            <Input
              type="number"
              placeholder="10,000원 이상"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={10000}
            />
            <p className="text-xs text-muted-foreground mt-1">{t.minAmount ?? '최소 10,000원'}</p>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t.bank ?? '은행'}</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
            >
              <option value="">{t.selectBank ?? '은행 선택'}</option>
              {BANKS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t.accountNumber ?? '계좌번호'}</label>
            <Input
              type="text"
              placeholder="계좌번호 입력"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">{t.accountHolder ?? '예금주'}</label>
            <Input
              type="text"
              placeholder="예금주명 입력"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
            />
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300'
                  : 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300'
              }`}
            >
              {message.text}
            </div>
          )}

          <Button
            className="w-full h-12 text-base"
            disabled={!canSubmit || loading}
            onClick={handleWithdraw}
          >
            {loading ? (t.requesting ?? '처리 중...') : (t.requestButton ?? '출금 요청')}
          </Button>
        </CardContent>
      </Card>

      {/* Withdraw History */}
      <Card>
        <CardHeader>
          <CardTitle>{t.history ?? '출금 내역'}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t.noHistory ?? '출금 내역이 없습니다.'}
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{Number(record.amount ?? 0).toLocaleString()} P</p>
                    <p className="text-xs text-muted-foreground">
                      {BANKS.find((b) => b.value === record.bank)?.label ?? record.bank} {record.account_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString('ko-KR') : ''}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={STATUS_COLORS[record.status] ?? ''}
                  >
                    {statusLabel(record.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
