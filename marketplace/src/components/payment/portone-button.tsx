'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

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

const LABELS: Record<PayMethod, string> = { card: '신용/체크카드', kakaopay: '카카오페이', tosspay: '토스페이', naverpay: '네이버페이', paypal: 'PayPal' };
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
    s.onerror = () => reject(new Error('포트원 SDK 로드 실패'));
    document.head.appendChild(s);
  });
}

export default function PortOneButton({ orderId, amount, productName, buyer, payMethod = 'card', onSuccess, onError, className, disabled = false }: Props) {
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    loadSDK().then(() => {
      if (!initRef.current) { window.IMP?.init(process.env.NEXT_PUBLIC_PORTONE_MERCHANT_ID ?? ''); initRef.current = true; }
      setReady(true);
    }).catch((e) => onError?.(e instanceof Error ? e.message : 'SDK 로드 실패'));
  }, [onError]);

  const pay = useCallback(() => {
    if (!window.IMP || !ready) { onError?.('결제 모듈 미초기화'); return; }
    setLoading(true);
    const pm = ['kakaopay','tosspay','naverpay'].includes(payMethod) ? 'trans' : payMethod === 'paypal' ? 'card' : payMethod;
    window.IMP.request_pay(
      { pg: PG[payMethod], pay_method: pm, merchant_uid: orderId, name: productName, amount, buyer_name: buyer.name, buyer_email: buyer.email, buyer_tel: buyer.tel ?? '', m_redirect_url: `${window.location.origin}/payment/complete` },
      async (res) => {
        setLoading(false);
        if (!res.success) { onError?.((res.error_msg as string) ?? '결제 실패'); return; }
        try {
          const v = await fetch('/api/payment/portone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'verify', imp_uid: res.imp_uid, merchant_uid: res.merchant_uid, expected_amount: amount }) });
          const d = await v.json();
          if (d.success) onSuccess?.(res as unknown as { imp_uid: string; merchant_uid: string; paid_amount: number; status: string });
          else onError?.(d.error ?? '결제 검증 실패');
        } catch { onError?.('결제 검증 요청 오류'); }
      },
    );
  }, [ready, payMethod, orderId, productName, amount, buyer, onSuccess, onError]);

  return (
    <button type="button" onClick={pay} disabled={disabled || loading || !ready}
      className={className ?? 'w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'}>
      {loading ? '결제 처리 중...' : `${LABELS[payMethod]}로 결제하기`}
    </button>
  );
}
