'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

interface IMPResponse {
  success: boolean;
  imp_uid?: string;
  error_msg?: string;
}

interface IMPInstance {
  init: (code: string) => void;
  request_pay: (params: Record<string, unknown>, callback: (response: IMPResponse) => void) => void;
}

function getIMP(): IMPInstance | undefined {
  return (window as unknown as { IMP?: IMPInstance }).IMP;
}

const PRESET_AMOUNTS = [1000, 5000, 10000, 50000, 100000];
const MARKUP_RATE = 0.10; // 10%

interface ChargeRecord {
  id: string;
  amount: number;
  points: number;
  status: string;
  created_at: string;
}

function calcPoints(amount: number): number {
  return Math.floor(amount * (1 + MARKUP_RATE));
}

export default function ChargePage() {
  const dict = useDict();
  const t = (dict as unknown as Record<string, Record<string, string>>).charge ?? {};

  const [balance, setBalance] = useState<number>(0);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [history, setHistory] = useState<ChargeRecord[]>([]);

  const activeAmount = selectedAmount ?? (customAmount ? Number(customAmount) : 0);

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
      const res = await fetch('/api/charge');
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

    // Load PortOne SDK
    if (!document.querySelector('script[src*="iamport"]')) {
      const script = document.createElement('script');
      script.src = 'https://cdn.iamport.kr/v1/iamport.js';
      script.async = true;
      document.head.appendChild(script);
    }
  }, [fetchBalance, fetchHistory]);

  const handleCharge = async () => {
    if (!activeAmount || activeAmount < 100) return;

    const IMP = getIMP();
    if (!IMP) {
      setMessage({ type: 'error', text: 'Payment SDK not loaded. Please try again.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    // Initialize PortOne
    const merchantCode = process.env.NEXT_PUBLIC_PORTONE_MERCHANT_CODE ?? 'imp00000000';
    IMP.init(merchantCode);

    IMP.request_pay(
      {
        pg: 'html5_inicis',
        pay_method: 'card',
        merchant_uid: `charge_${Date.now()}`,
        name: 'OpenAgentX Point Charge',
        amount: activeAmount,
      },
      async (response) => {
        if (response.success && response.imp_uid) {
          try {
            const res = await fetch('/api/charge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: response.imp_uid,
                amount: activeAmount,
                currency: 'KRW',
              }),
            });
            if (res.ok) {
              setMessage({ type: 'success', text: t.success ?? '충전이 완료되었습니다!' });
              fetchBalance();
              fetchHistory();
              setSelectedAmount(null);
              setCustomAmount('');
            } else {
              setMessage({ type: 'error', text: t.failed ?? '충전에 실패했습니다.' });
            }
          } catch {
            setMessage({ type: 'error', text: t.failed ?? '충전에 실패했습니다.' });
          }
        } else {
          setMessage({ type: 'error', text: response.error_msg ?? t.failed ?? '충전에 실패했습니다.' });
        }
        setLoading(false);
      },
    );
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t.title ?? '포인트 충전'}</h1>
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

      {/* Amount Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t.selectAmount ?? '충전 금액 선택'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {PRESET_AMOUNTS.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? 'default' : 'outline'}
                className="h-12"
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount('');
                }}
              >
                ₩{amount.toLocaleString()}
              </Button>
            ))}
            <div className="col-span-3">
              <label className="text-sm text-muted-foreground mb-1 block">
                {t.customAmount ?? '직접 입력'}
              </label>
              <Input
                type="number"
                placeholder="₩"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value);
                  setSelectedAmount(null);
                }}
                min={100}
              />
            </div>
          </div>

          {activeAmount > 0 && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.amount ?? '금액'}</span>
                <span>₩{activeAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span>{t.pointsToReceive ?? '받을 포인트'}</span>
                <span className="text-primary">{calcPoints(activeAmount).toLocaleString()} P</span>
              </div>
              <p className="text-xs text-muted-foreground">
                (10% bonus points included)
              </p>
            </div>
          )}

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
            disabled={!activeAmount || activeAmount < 100 || loading}
            onClick={handleCharge}
          >
            {loading ? (t.charging ?? '처리 중...') : (t.chargeButton ?? '충전하기')}
          </Button>
        </CardContent>
      </Card>

      {/* Charge History */}
      <Card>
        <CardHeader>
          <CardTitle>{t.history ?? '충전 내역'}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {t.noHistory ?? '충전 내역이 없습니다.'}
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">
                      ₩{Number(record.amount ?? 0).toLocaleString()} → {Number(record.points ?? 0).toLocaleString()} P
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {record.created_at ? new Date(record.created_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                  <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                    {record.status}
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
