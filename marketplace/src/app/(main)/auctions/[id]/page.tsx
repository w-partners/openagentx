'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDict } from '@/i18n/client';

const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: 'In Progress',
  awarded: 'Awarded',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const BID_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  selected: 'Awarded',
  rejected: 'Not Selected',
  refunded: 'Refunded',
};

interface AuctionBid {
  id: string;
  provider_id: string;
  agent_id: string;
  bid_fee: number;
  offer_price: number;
  offer_description: string;
  estimated_time: string | null;
  rank: number | null;
  status: string;
  created_at: string;
  agent_name?: string;
  agent_slug?: string;
  provider_name?: string;
}

interface AuctionDetail {
  id: string;
  requester_id: string | null;
  title: string;
  description: string;
  category: string;
  budget_max: number | null;
  status: string;
  expires_at: string;
  created_at: string;
  bids: AuctionBid[];
  bid_count: number;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}

export default function AuctionDetailPage() {
  const dict = useDict();
  const params = useParams();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Bid form state
  const [bidFee, setBidFee] = useState('0');
  const [offerPrice, setOfferPrice] = useState('');
  const [offerDesc, setOfferDesc] = useState('');
  const [agentId, setAgentId] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState('');

  const fetchAuction = () => {
    fetch(`/api/auctions?id=${auctionId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAuction(res.data);
        else setError(res.error ?? '{dict.auctionDetail.loadError}');
      })
      .catch(() => setError(dict.common.networkError))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAuction();
  }, [auctionId]);

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMsg('');

    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bid',
          auction_id: auctionId,
          agent_id: agentId,
          bid_fee: parseFloat(bidFee) || 0,
          offer_price: parseFloat(offerPrice),
          offer_description: offerDesc,
          estimated_time: estimatedTime || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFormMsg(dict.auctionDetail.bidComplete);
        setBidFee('0');
        setOfferPrice('');
        setOfferDesc('');
        setAgentId('');
        setEstimatedTime('');
        fetchAuction();
      } else {
        setFormMsg(data.error ?? dict.auctionDetail.bidFailed);
      }
    } catch {
      setFormMsg(dict.common.networkError);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectBid = async (bidId: string) => {
    if (!confirm(dict.auctionDetail.confirmSelect)) return;
    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'select',
          auction_id: auctionId,
          bid_id: bidId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(dict.auctionDetail.awardComplete);
        fetchAuction();
      } else {
        alert(data.error ?? dict.auctionDetail.selectFailed);
      }
    } catch {
      alert(dict.common.networkError);
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">{dict.common.loading}</div>;
  }

  if (error || !auction) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error || '{dict.auctionDetail.notFound}'}</p>
        <Link href="/auctions"><Button variant="outline">{dict.common.backToList}</Button></Link>
      </div>
    );
  }

  const categoryLabel = dict.categories[auction.category as keyof typeof dict.categories] ?? auction.category;
  const isOpen = auction.status === 'open';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        {dict.auctionDetail.backToList}
      </Link>

      {/* Auction info */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {AUCTION_STATUS_LABELS[auction.status] ?? auction.status}
            </Badge>
            <span className="text-sm text-muted-foreground">{categoryLabel}</span>
            {isOpen && (
              <span className="text-sm text-muted-foreground ml-auto">
                {timeRemaining(auction.expires_at)}
              </span>
            )}
          </div>
          <CardTitle className="text-2xl mt-2">{auction.title}</CardTitle>
          <CardDescription className="whitespace-pre-wrap mt-2">
            {auction.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Budget: </span>
              <span className="font-semibold">
                {auction.budget_max ? `$${Number(auction.budget_max).toLocaleString()}` : 'TBD'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Bids: </span>
              <span className="font-semibold">{auction.bid_count}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Created: </span>
              <span>{new Date(auction.created_at).toLocaleDateString('en-US')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Deadline: </span>
              <span>{new Date(auction.expires_at).toLocaleString('en-US')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bids list */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Bid List ({auction.bids.length})</h2>
        {auction.bids.length === 0 ? (
          <p className="text-muted-foreground py-4">{dict.auctionDetail.noBids}</p>
        ) : (
          <div className="space-y-3">
            {auction.bids.map((bid) => (
              <Card key={bid.id} className={bid.status === 'selected' ? 'border-primary border-2' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold">
                          {bid.agent_name ?? 'Agent'}
                        </span>
                        {bid.agent_slug && (
                          <Link
                            href={`/agents/${bid.agent_slug}`}
                            className="text-xs text-primary hover:underline"
                          >
                            {dict.auctionDetail.viewProfile}
                          </Link>
                        )}
                        <Badge variant="outline">#{bid.rank ?? '-'}</Badge>
                        <Badge variant={bid.status === 'selected' ? 'default' : 'outline'}>
                          {BID_STATUS_LABELS[bid.status] ?? bid.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {bid.offer_description}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span>
                          <span className="text-muted-foreground">Offer: </span>
                          <span className="font-semibold text-primary">
                            ${Number(bid.offer_price).toLocaleString()}
                          </span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">Bid Fee: </span>
                          <span className="font-semibold">
                            ${Number(bid.bid_fee).toLocaleString()}
                          </span>
                        </span>
                        {bid.estimated_time && (
                          <span>
                            <span className="text-muted-foreground">Est. Time: </span>
                            <span>{bid.estimated_time}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {bid.provider_name ?? 'Provider'}
                        </span>
                      </div>
                    </div>
                    {isOpen && bid.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleSelectBid(bid.id)}
                      >
                        Select
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Place bid form */}
      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.auctionDetail.placeBid}</CardTitle>
            <CardDescription>
              Pay a bid fee and propose your service. Higher fees get better visibility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.auctionDetail.agentId}</label>
                  <Input
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder={dict.auctionDetail.agentIdPlaceholder}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.auctionDetail.bidFeeLabel}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidFee}
                    onChange={(e) => setBidFee(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">{dict.auctionDetail.bidFeeNote}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.auctionDetail.offerPriceLabel}</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="100.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{dict.auctionDetail.estimatedTimeLabel}</label>
                  <Input
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder={dict.auctionDetail.estimatedTimePlaceholder}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{dict.auctionDetail.offerDescLabel}</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={offerDesc}
                  onChange={(e) => setOfferDesc(e.target.value)}
                  placeholder="Describe what service you can provide and how (min 10 chars)"
                  required
                  minLength={10}
                />
              </div>
              {formMsg && (
                <p className={`text-sm ${formMsg.includes('success') || formMsg.includes('complete') ? 'text-green-600' : 'text-red-600'}`}>
                  {formMsg}
                </p>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? dict.common.processing : dict.auctionDetail.submitBid}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
