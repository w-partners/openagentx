'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

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
  const dict = useDict();
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
      // ignore stats load failure
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
        setImproveResult(dict.qualitySection.autoImproveSuccess);
        fetchStats();
      } else {
        setImproveResult(dict.qualitySection.autoImproveFailed);
      }
    } catch {
      setImproveResult(dict.qualitySection.autoImproveError);
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
    if (rating >= 4) return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">{dict.qualitySection.excellent}</Badge>;
    if (rating >= 3) return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">{dict.qualitySection.average}</Badge>;
    return <Badge variant="destructive">{dict.qualitySection.needsImprovement}</Badge>;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dict.qualitySection.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">{dict.common.loading}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quality Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Response Quality Management</CardTitle>
          <CardDescription>
            {dict.qualitySection.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">{dict.qualitySection.avgRating}</p>
              <p className={`text-2xl font-bold ${getRatingColor(stats?.avgRating ?? 0)}`}>
                {stats?.avgRating?.toFixed(1) ?? '-'} / 5
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">{dict.qualitySection.totalFeedback}</p>
              <p className="text-2xl font-bold">
                {stats?.totalFeedback?.toLocaleString() ?? 0}
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">{dict.qualitySection.reusageRate}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {reusage?.reusageRate ?? 0}%
              </p>
            </div>
            <div className="rounded-lg border p-4 text-center">
              <p className="text-xs text-muted-foreground">{dict.qualitySection.categoriesCount}</p>
              <p className="text-2xl font-bold">
                {stats?.byCategory?.length ?? 0}
              </p>
            </div>
          </div>

          {/* Rating Distribution */}
          {stats && stats.ratingDistribution.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium mb-3">{dict.qualitySection.ratingDistribution}</h4>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const item = stats.ratingDistribution.find((d) => d.rating === rating);
                  const count = item?.count ?? 0;
                  const maxCount = Math.max(...stats.ratingDistribution.map((d) => d.count), 1);
                  const width = Math.max((count / maxCount) * 100, 2);
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs w-8 text-right">{rating}pt</span>
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
                      <span className="text-xs w-10 text-muted-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quality by Category */}
      {stats && stats.byCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.qualitySection.categoryQuality}</CardTitle>
            <CardDescription>
              {dict.qualitySection.categoryQualityDesc}
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
                      Avg {cat.avgRating.toFixed(1)}
                    </span>
                    <span>{cat.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quality by Provider */}
      {stats && stats.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{dict.qualitySection.providerQuality}</CardTitle>
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
                      Avg {prov.avgRating.toFixed(1)}
                    </span>
                    <span>{prov.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Improvement */}
      <Card>
        <CardHeader>
          <CardTitle>{dict.qualitySection.autoImprove}</CardTitle>
          <CardDescription>
            {dict.qualitySection.autoImproveDesc}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <button
              onClick={handleAutoImprove}
              disabled={improving}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {improving ? dict.qualitySection.analyzing : dict.qualitySection.runAutoImprove}
            </button>
            {improveResult && (
              <span className="text-sm text-muted-foreground">{improveResult}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Only categories with 10+ feedbacks and avg rating below 3.0 are eligible for improvement.
            Runs automatically every week.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
