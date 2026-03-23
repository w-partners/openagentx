'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface FeedbackStats {
  avgRating: number;
  totalFeedback: number;
  byCategory: { category: string; avgRating: number; count: number }[];
  byProvider: { provider: string; avgRating: number; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
}

interface ReusageStats {
  totalResponses: number;
  reusedResponses: number;
  reusageRate: number;
}

export default function QualitySection() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [reusage, setReusage] = useState<ReusageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [improving, setImproving] = useState(false);
  const [improveResult, setImproveResult] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setReusage(data.reusage);
      }
    } catch {
      // 통계 로드 실패 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  async function handleAutoImprove() {
    setImproving(true);
    setImproveResult(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto-improve' }),
      });

      if (res.ok) {
        setImproveResult('자동 개선이 완료되었습니다.');
        fetchStats();
      } else {
        setImproveResult('자동 개선에 실패했습니다.');
      }
    } catch {
      setImproveResult('오류가 발생했습니다.');
    } finally {
      setImproving(false);
    }
  }

  function getRatingColor(rating: number): string {
    if (rating >= 4) return 'text-green-600 dark:text-green-400';
    if (rating >= 3) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }

  function getRatingBadge(rating: number) {
    if (rating >= 4) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">우수</Badge>;
    if (rating >= 3) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">보통</Badge>;
    return <Badge variant="destructive">개선 필요</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>응답 품질 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">로딩 중...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 품질 개요 */}
      <Card>
        <CardHeader>
          <CardTitle>응답 품질 관리</CardTitle>
          <CardDescription>
            AI 응답 피드백 분석 및 프롬프트 자동 개선 시스템
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">평균 평점</p>
              <p className={`text-2xl font-bold ${getRatingColor(stats?.avgRating ?? 0)}`}>
                {stats?.avgRating?.toFixed(1) ?? '-'} / 5
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">총 피드백</p>
              <p className="text-2xl font-bold">
                {stats?.totalFeedback?.toLocaleString() ?? 0}건
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">재사용률</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {reusage?.reusageRate ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">카테고리</p>
              <p className="text-2xl font-bold">
                {stats?.byCategory?.length ?? 0}개
              </p>
            </div>
          </div>

          {/* 평점 분포 */}
          {stats && stats.ratingDistribution.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">평점 분포</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const item = stats.ratingDistribution.find((d) => d.rating === rating);
                  const count = item?.count ?? 0;
                  const maxCount = Math.max(...stats.ratingDistribution.map((d) => d.count), 1);
                  const width = Math.max((count / maxCount) * 100, 2);
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs w-8 text-right">{rating}점</span>
                      <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            rating >= 4
                              ? 'bg-green-500'
                              : rating === 3
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-xs w-10 text-muted-foreground">{count}건</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리별 품질 */}
      {stats && stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 품질</CardTitle>
            <CardDescription>
              낮은 평점 카테고리는 자동 개선 대상입니다
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byCategory.map((cat) => (
                <div
                  key={cat.category}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{cat.category}</span>
                    {getRatingBadge(cat.avgRating)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className={getRatingColor(cat.avgRating)}>
                      평균 {cat.avgRating.toFixed(1)}
                    </span>
                    <span>{cat.count}건</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 프로바이더별 품질 */}
      {stats && stats.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>AI 프로바이더별 품질</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byProvider.map((prov) => (
                <div
                  key={prov.provider}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{prov.provider}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className={getRatingColor(prov.avgRating)}>
                      평균 {prov.avgRating.toFixed(1)}
                    </span>
                    <span>{prov.count}건</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 자동 개선 */}
      <Card>
        <CardHeader>
          <CardTitle>프롬프트 자동 개선</CardTitle>
          <CardDescription>
            낮은 평점 카테고리의 시스템 프롬프트를 AI가 자동으로 분석하고 개선합니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button
              onClick={handleAutoImprove}
              disabled={improving}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {improving ? '분석 중...' : '자동 개선 실행'}
            </button>
            {improveResult && (
              <span className="text-sm text-muted-foreground">{improveResult}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            피드백 10건 이상, 평균 평점 3.0 이하인 카테고리만 개선 대상입니다.
            매주 자동으로 실행됩니다.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
