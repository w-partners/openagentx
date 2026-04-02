'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDict } from '@/i18n/client';

interface PayPalButtonProps {
  amount: number;
  currency?: string;
  description?: string;
  jobId?: string;
  onSuccess?: (data: { order_id: string; capture_id: string; status: string }) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
}

interface PayPalNamespace {
  Buttons: (cfg: {
    style?: Record<string, unknown>;
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => { render: (el: HTMLElement) => Promise<void> };
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(clientId: string, currency: string): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (document.querySelector('script[data-paypal-sdk]')) { resolve(); return; }
    const s = document.createElement('script');
    s.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${currency}&intent=capture`;
    s.setAttribute('data-paypal-sdk', 'true');
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { sdkPromise = null; reject(new Error('PayPal SDK load failed')); };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export default function PayPalButton({ amount, currency = 'USD', description, jobId, onSuccess, onError, onCancel, disabled = false }: PayPalButtonProps) {
  const dict = useDict();
  const ref = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rendered = useRef(false);

  const api = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch('/api/payment/paypal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error ?? 'Payment processing error');
    return json;
  }, []);

  useEffect(() => {
    if (disabled || rendered.current) return;
    let cancelled = false;

    (async () => {
      try {
        const cfg = await api({ action: 'config' });
        await loadSdk((cfg.data as { client_id: string }).client_id, currency);
        if (cancelled || !ref.current) return;

        const paypal = (window as unknown as { paypal?: PayPalNamespace }).paypal;
        if (!paypal?.Buttons) throw new Error('PayPal SDK did not load correctly');

        const buttons = paypal.Buttons({
          style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'paypal', height: 45 },
          createOrder: async () => {
            const r = await api({ action: 'create-order', amount, currency, description: description ?? 'OpenAgentX Payment', job_id: jobId });
            return (r.data as { order_id: string }).order_id;
          },
          onApprove: async (data) => {
            try {
              const r = await api({ action: 'capture', order_id: data.orderID });
              onSuccess?.(r.data as { order_id: string; capture_id: string; status: string });
            } catch (e) { const m = e instanceof Error ? e.message : 'Payment capture failed'; setError(m); onError?.(m); }
          },
          onCancel: () => onCancel?.(),
          onError: (err: unknown) => { const m = err instanceof Error ? err.message : 'PayPal payment error'; setError(m); onError?.(m); },
        });
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = '';
        await buttons.render(ref.current);
        rendered.current = true;
        setLoading(false);
      } catch (e) {
        if (!cancelled) { setError(e instanceof Error ? e.message : 'PayPal initialization failed'); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [amount, currency, description, jobId, disabled, api, onSuccess, onError, onCancel]);

  if (disabled) return <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">Payment cannot be processed</div>;

  return (
    <div className="w-full">
      {loading && !error && (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          <span className="text-sm text-gray-600">Loading PayPal...</span>
        </div>
      )}
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">{error}</div>}
      <div ref={ref} className={loading || error ? 'hidden' : ''} />
    </div>
  );
}
