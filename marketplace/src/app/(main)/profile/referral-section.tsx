'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface ShareReward {
  id: string;
  platform: string;
  share_url: string;
  status: string;
  reward_amount: number;
  created_at: string;
  verified_at: string | null;
}

interface ReferralData {
  code: string | null;
  totalReferrals: number;
  totalEarned: number;
  shares: ShareReward[];
}

const PLATFORM_LABELS: Record<string, string> = {
  twitter: 'Twitter / X',
  telegram: 'Telegram',
  facebook: 'Facebook',
  other: '기타',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '대기 중',
  approved: '승인됨',
  rejected: '거부됨',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

export default function ReferralSection() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharePlatform, setSharePlatform] = useState('twitter');
  const [shareUrl, setShareUrl] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/referral');
      if (res.ok) {
        const json = await res.json();
        setData(json.data ?? null);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      if (res.ok) {
        fetchData();
      } else {
        const json = await res.json();
        setError(json.error ?? '코드 생성 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  const referralUrl = data?.code ? `https://openagentx.org?ref=${data.code}` : '';

  const twitterShareUrl = data?.code
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`AI 에이전트 마켓플레이스 OpenAgentX! ${referralUrl}`)}`
    : '';

  const telegramShareUrl = data?.code
    ? `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent('AI 에이전트 마켓플레이스 OpenAgentX!')}`
    : '';

  const handleSubmitShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');
    if (!shareUrl.trim()) {
      setError('공유 URL을 입력해주세요');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'submit-share', platform: sharePlatform, shareUrl }),
      });
      const json = await res.json();
      if (res.ok) {
        setMessage('공유 인증이 제출되었습니다. 관리자 확인 후 보상이 지급됩니다.');
        setShareUrl('');
        fetchData();
      } else {
        setError(json.error ?? '제출 실패');
      }
    } catch {
      setError('네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>추천 & 공유 보상</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle>추천 코드</CardTitle>
          <CardDescription>
            친구를 초대하면 양쪽 모두 $1.00 크레딧을 받습니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {data?.code ? (
            <>
              {/* Code display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-md border bg-muted/50 px-4 py-3 font-mono text-lg font-bold tracking-wider text-center">
                  {data.code}
                </div>
                <button
                  onClick={() => handleCopy(data.code!)}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  {copied ? '복사됨!' : '복사'}
                </button>
              </div>

              {/* Share link */}
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">추천 링크</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={referralUrl}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono"
                  />
                  <button
                    onClick={() => handleCopy(referralUrl)}
                    className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-accent transition-colors whitespace-nowrap"
                  >
                    링크 복사
                  </button>
                </div>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2">
                <a
                  href={twitterShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/80 transition-colors"
                >
                  Twitter / X 공유
                </a>
                <a
                  href={telegramShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md bg-[#0088cc] text-white px-4 py-2 text-sm font-medium hover:bg-[#0088cc]/80 transition-colors"
                >
                  Telegram 공유
                </a>
                <button
                  onClick={() => handleCopy(referralUrl)}
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  링크 복사
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">초대한 사람</p>
                  <p className="text-xl font-bold">{data.totalReferrals}명</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">받은 크레딧</p>
                  <p className="text-xl font-bold text-primary">$ {data.totalEarned.toFixed(2)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-3">
                추천 코드를 생성하여 친구를 초대하세요
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {generating ? '생성 중...' : '추천 코드 생성'}
              </button>
              {error && <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SNS Share Reward */}
      <Card>
        <CardHeader>
          <CardTitle>SNS 공유 보상</CardTitle>
          <CardDescription>
            OpenAgentX를 SNS에 공유하고 $1.00 크레딧을 받으세요 (최대 5회)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmitShare} className="space-y-3">
            <div className="flex items-center gap-2">
              <select
                value={sharePlatform}
                onChange={(e) => setSharePlatform(e.target.value)}
                className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="twitter">Twitter / X</option>
                <option value="telegram">Telegram</option>
                <option value="facebook">Facebook</option>
                <option value="other">기타</option>
              </select>
              <input
                type="url"
                placeholder="공유한 게시물 URL"
                value={shareUrl}
                onChange={(e) => setShareUrl(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {submitting ? '제출 중...' : '인증 제출'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              OpenAgentX를 SNS에 공유한 뒤, 게시물 URL을 입력하여 인증해주세요.
            </p>
          </form>
          {message && <p className="text-sm text-green-600 dark:text-green-400">{message}</p>}
          {error && data?.code && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          {/* Share history */}
          {data?.shares && data.shares.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-3">공유 인증 내역</h3>
              <div className="space-y-2">
                {data.shares.map((share) => (
                  <div
                    key={share.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {PLATFORM_LABELS[share.platform] ?? share.platform}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-xs">
                        {share.share_url}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(share.created_at).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[share.status] ?? ''}`}>
                        {STATUS_LABELS[share.status] ?? share.status}
                      </span>
                      <span className="text-sm font-medium">
                        $ {Number(share.reward_amount).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
