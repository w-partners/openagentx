'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: 'In Progress',
  awarded: 'Awarded',
  expired: 'Expired',
  cancelled: 'Cancelled',
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

function timeRemaining(expiresAt: string, t: Record<string, string>): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return t.expired ?? 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return (t.daysHoursRemaining ?? '{days}d {hours}h remaining').replace('{days}', String(Math.floor(hours / 24))).replace('{hours}', String(hours % 24));
  if (hours > 0) return (t.hoursMinutesRemaining ?? '{hours}h {minutes}m remaining').replace('{hours}', String(hours)).replace('{minutes}', String(minutes));
  return (t.minutesRemaining ?? '{minutes}m remaining').replace('{minutes}', String(minutes));
}

export default function AuctionsPage() {
  const dict = useDict();
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
          <h1 className="text-3xl font-bold">{dict.auctionsPage.title}</h1>
          <p className="text-muted-foreground">
            {dict.auctionsPage.description}
          </p>
        </div>
        <Link href="/auctions/create">
          <Button>{dict.auctionsPage.createAuction}</Button>
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
          All
        </button>
        {Object.entries(dict.categories).map(([key, label]) => (
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
        <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>
      ) : auctions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">{dict.auctionsPage.noAuctions}</p>
          <Link href="/auctions/create">
            <Button>{dict.auctionsPage.createFirst}</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {auctions.map((auction) => {
            const statusLabel = AUCTION_STATUS_LABELS[auction.status] ?? auction.status;
            const statusVariant = AUCTION_STATUS_VARIANTS[auction.status] ?? 'default';
            const categoryLabel = dict.categories[auction.category as keyof typeof dict.categories] ?? auction.category;

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
                          ? dict.auctionsPage.budgetUnder.replace('{amount}', Number(auction.budget_max).toLocaleString())
                          : dict.auctionsPage.budgetUndecided}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {dict.auctionsPage.bidCount.replace('{count}', String(auction.bid_count))}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <span className="text-xs text-muted-foreground">
                      {timeRemaining(auction.expires_at, dict.auctionsPage as unknown as Record<string, string>)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(auction.created_at).toLocaleDateString()}
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
