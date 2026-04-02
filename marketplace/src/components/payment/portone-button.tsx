'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDict } from '@/i18n/client';

export type PayMethod = 'card' | 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal';

interface Props {
  orderId: string; amount: number; productName: string;
  buyer: { name: string; email: string; tel?: string };
  payMethod?: PayMethod;
  onSuccess?: (res: { imp_uid: string; merchant_uid: string; paid_amount: number; status: string }) => void;
  onError?: (error: string) => void;
  className?: string; disabled?: boolean;
}

declare global {
  interface Window {
    IMP?: {
      init: (id: string) => void;
      request_pay: (params: Record<string, unknown>, cb: (res: Record<string, unknown>) => void) => void;
    };
  }
}

const LABELS: Record<PayMethod, string> = { card: 'Credit/Debit Card', kakaopay: 'KakaoPay', tosspay: 'TossPay', naverpay: 'NaverPay', paypal: 'PayPal' };
const PG: Record<PayMethod, string> = { card: 'html5_inicis', kakaopay: 'kakaopay', tosspay: 'tosspay', naverpay: 'naverpay', paypal: 'paypal_v2' };
const SDK_URL = 'https://cdn.iamport.kr/v1/iamport.js';

function loadSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.IMP) { resolve(); return; }
    const el = document.querySelector(`script[src="${SDK_URL}"]`);
    if (el) { el.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.src = SDK_URL; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('PortOne SDK load failed'));
    document.head.appendChild(s);
  });
}

export default function PortOneButton({ orderId, amount, productName, buyer, payMethod = 'card', onSuccess, onError, className, disabled = false }: Props) {
  const dict = useDict();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    loadSDK().then(() => {
      if (!initRef.current) { window.IMP?.init(process.env.NEXT_PUBLIC_PORTONE_MERCHANT_ID ?? ''); initRef.current = true; }
      setReady(true);
    }).catch((e) => onError?.(e instanceof Error ? e.message : 'SDK load failed'));
  }, [onError]);

  const pay = useCallback(() => {
    if (!window.IMP || !ready) { onError?.('Payment module not initialized'); return; }
    setLoading(true);
    const pm = ['kakaopay','tosspay','naverpay'].includes(payMethod) ? 'trans' : payMethod === 'paypal' ? 'card' : payMethod;
    window.IMP.request_pay(
      { pg: PG[payMethod], pay_method: pm, merchant_uid: orderId, name: productName, amount, buyer_name: buyer.name, buyer_email: buyer.email, buyer_tel: buyer.tel ?? '', m_redirect_url: `${window.location.origin}/payment/complete` },
      async (res) => {
        setLoading(false);
        if (!res.success) { onError?.((res.error_msg as string) ?? 'Payment failed'); return; }
        try {
          const v = await fetch('/api/payment/portone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', imp_uid: res.imp_uid, merchant_uid: res.merchant_uid, expected_amount: amount }) });
          const d = await v.json();
          if (d.success) onSuccess?.(res as unknown as { imp_uid: string; merchant_uid: string; paid_amount: number; status: string });
          else onError?.(d.error ?? 'Payment verification failed');
        } catch { onError?.('Payment verification error'); }
      },
    );
  }, [ready, payMethod, orderId, productName, amount, buyer, onSuccess, onError]);

  return (
    <button type="button" onClick={pay} disabled={disabled || loading || !ready}
      className={className ?? 'w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'}>
      {loading ? 'Processing...' : `Pay with ${LABELS[payMethod]}`}
    </button>
  );
}
