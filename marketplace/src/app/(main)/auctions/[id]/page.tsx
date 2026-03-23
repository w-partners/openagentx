'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const AUCTION_STATUS_LABELS: Record<string, string> = {
  open: '진행 중',
  awarded: '낙찰',
  expired: '만료',
  cancelled: '취소',
};

const BID_STATUS_LABELS: Record<string, string> = {
  pending: '대기',
  selected: '낙찰',
  rejected: '미선정',
  refunded: '환불됨',
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
  if (diff <= 0) return '만료됨';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)}일 ${hours % 24}시간 남음`;
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  return `${minutes}분 남음`;
}

export default function AuctionDetailPage() {
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
        else setError(res.error ?? '경매를 불러올 수 없습니다');
      })
      .catch(() => setError('네트워크 오류'))
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
        setFormMsg('입찰이 완료되었습니다!');
        setBidFee('0');
        setOfferPrice('');
        setOfferDesc('');
        setAgentId('');
        setEstimatedTime('');
        fetchAuction();
      } else {
        setFormMsg(data.error ?? '입찰에 실패했습니다');
      }
    } catch {
      setFormMsg('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectBid = async (bidId: string) => {
    if (!confirm('이 입찰을 선택하시겠습니까?')) return;
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
        alert('낙찰이 완료되었습니다!');
        fetchAuction();
      } else {
        alert(data.error ?? '선택에 실패했습니다');
      }
    } catch {
      alert('네트워크 오류');
    }
  };

  if (loading) {
    return <div className="text-center py-12 text-muted-foreground">로딩 중...</div>;
  }

  if (error || !auction) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error || '경매를 찾을 수 없습니다'}</p>
        <Link href="/auctions"><Button variant="outline">목록으로</Button></Link>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABELS[auction.category] ?? auction.category;
  const isOpen = auction.status === 'open';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Back link */}
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; 경매 목록
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
              <span className="text-muted-foreground">예산: </span>
              <span className="font-semibold">
                {auction.budget_max ? `${Number(auction.budget_max).toLocaleString()} USDC` : '미정'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">입찰 수: </span>
              <span className="font-semibold">{auction.bid_count}건</span>
            </div>
            <div>
              <span className="text-muted-foreground">등록일: </span>
              <span>{new Date(auction.created_at).toLocaleDateString('ko-KR')}</span>
            </div>
            <div>
              <span className="text-muted-foreground">마감일: </span>
              <span>{new Date(auction.expires_at).toLocaleString('ko-KR')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bids list */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">입찰 목록 ({auction.bids.length}건)</h2>
        {auction.bids.length === 0 ? (
          <p className="text-muted-foreground py-4">아직 입찰이 없습니다</p>
        ) : (
          <div className="space-y-3">
            {auction.bids.map((bid) => (
              <Card key={bid.id} className={bid.status === 'selected' ? 'border-primary border-2' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-semibold">
                          {bid.agent_name ?? '에이전트'}
                        </span>
                        {bid.agent_slug && (
                          <Link
                            href={`/agents/${bid.agent_slug}`}
                            className="text-xs text-primary hover:underline"
                          >
                            프로필 보기
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
                          <span className="text-muted-foreground">제안가: </span>
                          <span className="font-semibold text-primary">
                            {Number(bid.offer_price).toLocaleString()} USDC
                          </span>
                        </span>
                        <span>
                          <span className="text-muted-foreground">입찰 수수료: </span>
                          <span className="font-semibold">
                            {Number(bid.bid_fee).toLocaleString()} USDC
                          </span>
                        </span>
                        {bid.estimated_time && (
                          <span>
                            <span className="text-muted-foreground">예상 소요: </span>
                            <span>{bid.estimated_time}</span>
                          </span>
                        )}
                        <span className="text-muted-foreground">
                          {bid.provider_name ?? '제공자'}
                        </span>
                      </div>
                    </div>
                    {isOpen && bid.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => handleSelectBid(bid.id)}
                      >
                        선택
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
            <CardTitle>입찰하기</CardTitle>
            <CardDescription>
              입찰 수수료를 지불하고 서비스를 제안하세요. 수수료가 높을수록 상위 노출됩니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePlaceBid} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">에이전트 ID</label>
                  <Input
                    value={agentId}
                    onChange={(e) => setAgentId(e.target.value)}
                    placeholder="에이전트 UUID"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">입찰 수수료 (USDC)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={bidFee}
                    onChange={(e) => setBidFee(e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-muted-foreground">높을수록 상위 노출 (잔액에서 차감)</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">제안 가격 (USDC)</label>
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
                  <label className="text-sm font-medium">예상 소요 시간</label>
                  <Input
                    value={estimatedTime}
                    onChange={(e) => setEstimatedTime(e.target.value)}
                    placeholder="예: 2시간, 1일"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">제안 설명</label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={offerDesc}
                  onChange={(e) => setOfferDesc(e.target.value)}
                  placeholder="어떤 서비스를 어떻게 제공할 수 있는지 설명해주세요 (최소 10자)"
                  required
                  minLength={10}
                />
              </div>
              {formMsg && (
                <p className={`text-sm ${formMsg.includes('완료') ? 'text-green-600' : 'text-red-600'}`}>
                  {formMsg}
                </p>
              )}
              <Button type="submit" disabled={submitting}>
                {submitting ? '처리 중...' : '입찰하기'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
