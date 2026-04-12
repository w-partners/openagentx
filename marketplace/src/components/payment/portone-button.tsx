'use client';

import { useCallback, useEffect, useState } from 'react';
import { useDict } from '@/i18n/client';

export type PayMethod = 'card' | 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal';

interface Props {
  orderId: string; amount: number; productName: string;
  buyer: { name: string; email: string; tel?: string };
  payMethod?: PayMethod;
  onSuccess?: (res: { paymentId: string; paid_amount: number; status: string }) => void;
  onError?: (error: string) => void;
  className?: string; disabled?: boolean;
}

declare global {
  interface Window {
    PortOne?: {
      requestPayment: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  }
}

const LABELS: Record<PayMethod, string> = {
  card: 'Credit/Debit Card',
  kakaopay: 'KakaoPay',
  tosspay: 'TossPay',
  naverpay: 'NaverPay',
  paypal: 'PayPal',
};

/** V2 payMethod 매핑 */
const V2_PAY_METHOD: Record<PayMethod, string> = {
  card: 'CARD',
  kakaopay: 'EASY_PAY',
  tosspay: 'EASY_PAY',
  naverpay: 'EASY_PAY',
  paypal: 'CARD',
};

/** 간편결제 easyPay provider 매핑 */
const EASY_PAY_PROVIDER: Record<string, string> = {
  kakaopay: 'KAKAOPAY',
  tosspay: 'TOSSPAY',
  naverpay: 'NAVERPAY',
};

/** PG사별 채널키 환경변수 매핑 */
const CHANNEL_KEY_MAP: Record<PayMethod, string | undefined> = {
  card: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_CARD,
  kakaopay: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_KAKAOPAY,
  tosspay: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_TOSSPAY,
  naverpay: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_NAVERPAY,
  paypal: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_CARD,
};

const SDK_URL = 'https://cdn.portone.io/v2/browser-sdk.js';

function loadSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PortOne) { resolve(); return; }
    const el = document.querySelector(`script[src="${SDK_URL}"]`);
    if (el) { el.addEventListener('load', () => resolve()); return; }
    const s = document.createElement('script');
    s.src = SDK_URL; s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('PortOne V2 SDK load failed'));
    document.head.appendChild(s);
  });
}

export default function PortOneButton({ orderId, amount, productName, buyer, payMethod = 'card', onSuccess, onError, className, disabled = false }: Props) {
  const dict = useDict();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSDK().then(() => {
      setReady(true);
    }).catch((e) => onError?.(e instanceof Error ? e.message : 'SDK load failed'));
  }, [onError]);

  const pay = useCallback(async () => {
    if (!window.PortOne || !ready) { onError?.('Payment module not initialized'); return; }
    setLoading(true);

    try {
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
      if (!storeId) { onError?.('Store ID not configured'); setLoading(false); return; }

      const channelKey = CHANNEL_KEY_MAP[payMethod];

      const params: Record<string, unknown> = {
        storeId,
        paymentId: orderId,
        orderName: productName,
        totalAmount: amount,
        currency: 'CURRENCY_KRW',
        payMethod: V2_PAY_METHOD[payMethod],
        customer: {
          fullName: buyer.name,
          email: buyer.email,
          phoneNumber: buyer.tel ?? '',
        },
        redirectUrl: `${window.location.origin}/payment/complete`,
      };

      // 채널키가 있으면 사용, 없으면 pgProvider 방식 (테스트모드 호환)
      if (channelKey) {
        params.channelKey = channelKey;
      }

      // 간편결제인 경우 easyPay provider 지정
      const easyPayProvider = EASY_PAY_PROVIDER[payMethod];
      if (easyPayProvider) {
        params.easyPay = { provider: easyPayProvider };
      }

      const response = await window.PortOne.requestPayment(params);

      setLoading(false);

      if (response.code != null) {
        // 에러 발생
        onError?.((response.message as string) ?? 'Payment failed');
        return;
      }

      // 성공: 서버에서 결제 검증
      try {
        const v = await fetch('/api/payment/portone', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'verify',
            paymentId: response.paymentId ?? orderId,
            expected_amount: amount,
          }),
        });
        const d = await v.json();
        if (d.success) {
          onSuccess?.({
            paymentId: (response.paymentId as string) ?? orderId,
            paid_amount: amount,
            status: 'paid',
          });
        } else {
          onError?.(d.error ?? 'Payment verification failed');
        }
      } catch {
        onError?.('Payment verification error');
      }
    } catch (err) {
      setLoading(false);
      onError?.(err instanceof Error ? err.message : 'Payment error');
    }
  }, [ready, payMethod, orderId, productName, amount, buyer, onSuccess, onError]);

  return (
    <button type="button" onClick={pay} disabled={disabled || loading || !ready}
      className={className ?? 'w-full rounded-lg bg-blue-600 px-4 py-3 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'}>
      {loading ? 'Processing...' : `Pay with ${LABELS[payMethod]}`}
    </button>
  );
}
