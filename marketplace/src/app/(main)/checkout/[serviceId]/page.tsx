'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

interface ServiceInfo {
  id: string;
  name: string;
  description: string;
  price: number;
  agentName: string;
  agentId: string;
}

// Demo service data (fallback when API unavailable)
const DEMO_SERVICES: Record<string, ServiceInfo> = {
  'code-review': {
    id: 'code-review',
    name: 'Code Review',
    description: 'Code quality analysis and improvement suggestions',
    price: 500,
    agentName: 'CodeMaster',
    agentId: 'code-master',
  },
  'bug-fix': {
    id: 'bug-fix',
    name: 'Bug Fix',
    description: 'Bug detection and fix patch generation',
    price: 1000,
    agentName: 'CodeMaster',
    agentId: 'code-master',
  },
  'full-stack': {
    id: 'full-stack',
    name: 'Full-stack Development',
    description: 'End-to-end feature design and implementation',
    price: 5000,
    agentName: 'CodeMaster',
    agentId: 'code-master',
  },
  'blog-post': {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'SEO-optimized blog article writing',
    price: 300,
    agentName: 'Content Craft',
    agentId: 'content-craft',
  },
  'sns-pack': {
    id: 'sns-pack',
    name: 'SNS Content Pack',
    description: 'Instagram/Twitter/LinkedIn content set',
    price: 500,
    agentName: 'Content Craft',
    agentId: 'content-craft',
  },
  'marketing-copy': {
    id: 'marketing-copy',
    name: 'Marketing Copy',
    description: 'Ad copy + landing page text',
    price: 1000,
    agentName: 'Content Craft',
    agentId: 'content-craft',
  },
  'quick-scan': {
    id: 'quick-scan',
    name: 'Quick Scan',
    description: 'Single token technical analysis report',
    price: 200,
    agentName: 'Crypto Analyzer',
    agentId: 'crypto-analyzer',
  },
  'deep-analysis': {
    id: 'deep-analysis',
    name: 'Deep Analysis',
    description: 'Multi-indicator comprehensive analysis + trading signals',
    price: 1000,
    agentName: 'Crypto Analyzer',
    agentId: 'crypto-analyzer',
  },
};

export default function CheckoutPage() {
  const dict = useDict();
  const t = (dict as unknown as Record<string, Record<string, string>>).purchase ?? {};
  const params = useParams();
  const router = useRouter();
  const serviceId = params.serviceId as string;

  const [service, setService] = useState<ServiceInfo | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => {
    fetchBalance();

    // Try to fetch from API, fallback to demo data
    const fetchService = async () => {
      try {
        const res = await fetch(`/api/agents?serviceId=${serviceId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.service) {
            setService(data.service);
            return;
          }
        }
      } catch {
        // ignore
      }
      // Fallback to demo
      setService(DEMO_SERVICES[serviceId] ?? null);
    };
    fetchService();
  }, [serviceId, fetchBalance]);

  const handlePurchase = async () => {
    if (!service) return;
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: service.id,
          agentId: service.agentId,
          inputData: {},
        }),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: t.success ?? '구매가 완료되었습니다!' });
        fetchBalance();
        setTimeout(() => router.push('/orders'), 2000);
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage({ type: 'error', text: data.error ?? t.failed ?? '구매에 실패했습니다.' });
      }
    } catch {
      setMessage({ type: 'error', text: t.failed ?? '구매에 실패했습니다.' });
    } finally {
      setLoading(false);
    }
  };

  if (!service) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16 space-y-4">
        <h1 className="text-2xl font-bold">서비스를 찾을 수 없습니다</h1>
        <Link
          href="/agents"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          에이전트 목록으로
        </Link>
      </div>
    );
  }

  const canPurchase = balance >= service.price;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t.title ?? '서비스 구매'}</h1>
      </div>

      {/* Service Info */}
      <Card>
        <CardHeader>
          <CardTitle>{service.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{service.description}</p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{service.agentName}</Badge>
          </div>

          <div className="rounded-lg bg-muted/50 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span>{t.price ?? '가격'}</span>
              <span className="font-bold text-lg">{service.price.toLocaleString()} P</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>{t.balance ?? '내 잔액'}</span>
              <span className={`font-bold text-lg ${canPurchase ? 'text-primary' : 'text-red-500'}`}>
                {balance.toLocaleString()} P
              </span>
            </div>
            {!canPurchase && (
              <div className="pt-2 border-t">
                <p className="text-sm text-red-500 mb-2">{t.insufficientBalance ?? '잔액이 부족합니다'}</p>
                <Link href="/charge">
                  <Button variant="outline" size="sm">
                    {t.goCharge ?? '포인트 충전하기'}
                  </Button>
                </Link>
              </div>
            )}
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
            disabled={!canPurchase || loading}
            onClick={handlePurchase}
          >
            {loading ? (t.purchasing ?? '처리 중...') : (t.purchaseButton ?? '구매하기')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
