'use client';

import { useState } from 'react';
import PortOneButton from './portone-button';
import type { PayMethod } from './portone-button';
import { useDict } from '@/i18n/client';

type Method = 'usdc' | 'paypal' | 'portone' | 'payapp';

interface Props {
  orderId: string; amount: number; amountUSDC?: number; productName: string;
  buyer: { name: string; email: string; tel?: string };
  onComplete?: (method: Method, data: Record<string, unknown>) => void;
  onError?: (error: string) => void;
}

const METHODS: { id: Method; label: string; desc: string }[] = [
  { id: 'usdc', label: 'USD Balance', desc: 'Balance deduction' },
  { id: 'paypal', label: 'PayPal', desc: 'International payment' },
  { id: 'portone', label: 'Card Payment (PortOne)', desc: 'Credit/debit card, easy pay' },
  { id: 'payapp', label: 'PayApp', desc: 'Mobile easy payment' },
];

const SUBS: { id: PayMethod; label: string }[] = [
  { id: 'card', label: 'Credit/Debit Card' }, { id: 'kakaopay', label: 'KakaoPay' },
  { id: 'tosspay', label: 'TossPay' }, { id: 'naverpay', label: 'NaverPay' },
  { id: 'paypal', label: 'PayPal (PortOne)' },
];

export default function Checkout({ orderId, amount, amountUSDC, productName, buyer, onComplete, onError }: Props) {
  const dict = useDict();
  const [method, setMethod] = useState<Method>('portone');
  const [sub, setSub] = useState<PayMethod>('card');
  const [busy, setBusy] = useState(false);

  const handleOther = async () => {
    if (method === 'usdc') {
      setBusy(true);
      try {
        const r = await fetch('/api/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'withdraw', amount: amountUSDC ?? amount }) });
        const d = await r.json();
        d.success ? onComplete?.('usdc', d.data) : onError?.(d.error ?? 'Payment failed');
      } catch { onError?.(dict.checkout.usdcError); } finally { setBusy(false); }
    } else if (method === 'paypal') {
      window.location.href = `/api/stripe?action=create-payment&amount=${amount}&orderId=${orderId}`;
    } else {
      onError?.(dict.checkout.payappNotReady);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="border-b border-gray-100 pb-4">
        <h2 className="text-lg font-bold text-gray-900">{dict.checkout.title}</h2>
        <p className="mt-1 text-sm text-gray-500">{productName}</p>
        <p className="mt-2 text-2xl font-bold text-gray-900">
          {amount.toLocaleString()} KRW
          {amountUSDC != null && <span className="ml-2 text-sm font-normal text-gray-400">(${amountUSDC})</span>}
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-gray-700">{dict.checkout.selectMethod}</legend>
        {METHODS.map((m) => (
          <label key={m.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${method === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <input type="radio" name="pm" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="h-4 w-4 text-blue-600" />
            <div><span className="font-medium text-gray-900">{m.label}</span> <span className="text-xs text-gray-400">{m.desc}</span></div>
          </label>
        ))}
      </fieldset>

      {method === 'portone' && (
        <div className="space-y-2 rounded-lg bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-600">{dict.checkout.paymentMethod}</p>
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
          onSuccess={(r) => onComplete?.('portone', r as Record<string, unknown>)} onError={onError} />
      ) : (
        <button type="button" disabled={busy} onClick={handleOther}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
          {busy ? dict.common.processing : `${METHODS.find((m) => m.id === method)?.label ?? ''}`}
        </button>
      )}

      <p className="text-center text-xs text-gray-400">{dict.checkout.termsNote}</p>
    </div>
  );
}
