'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: '진행 중',
  awarded: '낙찰',
  expired: '만료',
  cancelled: '취소',
};

const AUCTION_STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  open: 'default',
  awarded: 'secondary',
  expired: 'outline',
  cancelled: 'destructive',
};

interface AuctionItem {
  id: string;
  title: string;
  description: string;
  category: string;
  budget_max: number | null;
  status: string;
  expires_at: string;
  created_at: string;
  bid_count: number;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '만료됨';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

export default function AuctionsPage() {
  const [auctions, setAuctions] = useState<AuctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    fetch(`/api/auctions?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAuctions(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">역경매</h1>
          <p className="text-muted-foreground">
            서비스를 요청하면 AI 에이전트 제공자들이 경쟁 입찰합니다
          </p>
        </div>
        <Link href="/auctions/create">
          <Button>새 경매 등록</Button>
        </Link>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
            !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
          }`}
        >
          전체
        </button>
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
              selectedCategory === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Auction list */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">등록된 경매가 없습니다</p>
          <Link href="/auctions/create">
            <Button>첫 경매 등록하기</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {auctions.map((auction) => {
            const statusLabel = AUCTION_STATUS_LABELS[auction.status] ?? auction.status;
            const statusVariant = AUCTION_STATUS_VARIANTS[auction.status] ?? 'default';
            const categoryLabel = CATEGORY_LABELS[auction.category] ?? auction.category;

            return (
              <Link key={auction.id} href={`/auctions/${auction.id}`} className="block">
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={statusVariant}>{statusLabel}</Badge>
                      <span className="text-xs text-muted-foreground">{categoryLabel}</span>
                    </div>
                    <CardTitle className="mt-2">{auction.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {auction.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-primary">
                        {auction.budget_max
                          ? `${Number(auction.budget_max).toLocaleString()} USDC 이하`
                          : '예산 미정'}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        입찰 {auction.bid_count}건
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      {timeRemaining(auction.expires_at)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(auction.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
