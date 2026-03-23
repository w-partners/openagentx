'use client';

import { useState } from 'react';
import PortOneButton from './portone-button';
import type { PayMethod } from './portone-button';

type Method = 'usdc' | 'paypal' | 'portone' | 'payapp';

interface Props {
  orderId: string; amount: number; amountUSDC?: number; productName: string;
  buyer: { name: string; email: string; tel?: string };
  onComplete?: (method: Method, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

const METHODS: { id: Method; label: string; desc: string }[] = [
  { id: 'usdc', label: 'USDC', desc: '암호화폐 잔액 차감' },
  { id: 'paypal', label: 'PayPal', desc: '해외 결제' },
  { id: 'portone', label: '카드 결제 (포트원)', desc: '신용/체크카드, 간편결제' },
  { id: 'payapp', label: 'PayApp', desc: '모바일 간편결제' },
];

const SUBS: { id: PayMethod; label: string }[] = [
  { id: 'card', label: '신용/체크카드' }, { id: 'kakaopay', label: '카카오페이' },
  { id: 'tosspay', label: '토스페이' }, { id: 'naverpay', label: '네이버페이' },
  { id: 'paypal', label: 'PayPal (포트원)' },
];

export default function Checkout({ orderId, amount, amountUSDC, productName, buyer, onComplete, onError }: Props) {
  const [method, setMethod] = useState<Method>('portone');
  const [sub, setSub] = useState<PayMethod>('card');
  const [busy, setBusy] = useState(false);

  const handleOther = async () => {
    if (method === 'usdc') {
      setBusy(true);
      try {
        const r = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw', amount: amountUSDC ?? amount }) });
        const d = await r.json();
        d.success ? onComplete?.('usdc', d.data) : onError?.(d.error ?? 'USDC 결제 실패');
      } catch { onError?.('USDC 결제 요청 오류'); } finally { setBusy(false); }
    } else if (method === 'paypal') {
      window.location.href = `/api/stripe?action=create-payment&amount=${amount}&orderId=${orderId}`;
    } else {
      onError?.('PayApp 결제는 준비 중입니다');
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">결제하기</h2>
        <p className="mt-1 text-sm text-gray-500">{productName}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {amount.toLocaleString()}원
          {amountUSDC != null && <span className="ml-2 text-sm font-normal text-gray-400">({amountUSDC} USDC)</span>}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-700">결제수단 선택</legend>
        {METHODS.map((m) => (
          <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${method === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="pm" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 text-blue-600" />
            <div><span className="font-medium text-gray-900">{m.label}</span> <span className="text-xs text-gray-400">{m.desc}</span></div>
          </label>
        ))}
      </fieldset>

      {method === 'portone' && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-600">결제 방법</p>
          <div className="flex flex-wrap gap-2">
            {SUBS.map((s) => (
              <button key={s.id} type="button" onClick={() => setSub(s.id)}
                className={`rounded-full border px-3 py-1 text-sm ${sub === s.id ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-300 bg-white text-gray-700 hover:border-blue-300'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {method === 'portone' ? (
        <PortOneButton orderId={orderId} amount={amount} productName={productName} buyer={buyer} payMethod={sub}
          onSuccess={(r) => onComplete?.('portone', r as unknown as Record<string, unknown>)} onError={onError} />
      ) : (
        <button type="button" disabled={busy} onClick={handleOther}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? '처리 중...' : `${METHODS.find((m) => m.id === method)?.label ?? ''} 결제하기`}
        </button>
      )}

      <p className="text-center text-xs text-gray-400">결제 진행 시 서비스 이용약관에 동의하는 것으로 간주됩니다</p>
    </div>
  );
}
