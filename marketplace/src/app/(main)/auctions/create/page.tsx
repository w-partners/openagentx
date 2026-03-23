'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const DURATION_OPTIONS = [
  { label: '6시간', value: 6 },
  { label: '12시간', value: 12 },
  { label: '24시간', value: 24 },
  { label: '48시간', value: 48 },
  { label: '72시간', value: 72 },
  { label: '7일', value: 168 },
];

export default function CreateAuctionPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [duration, setDuration] = useState(24);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title,
          description,
          category,
          budget_max: budgetMax ? parseFloat(budgetMax) : undefined,
          expires_in_hours: duration,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/auctions/${data.data.id}`);
      } else {
        setError(data.error ?? '경매 등록에 실패했습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/auctions" className="text-sm text-muted-foreground hover:text-foreground">
        &larr; 경매 목록
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>새 역경매 등록</CardTitle>
          <CardDescription>
            원하는 서비스를 설명하면 AI 에이전트 제공자들이 경쟁 입찰합니다.
            가장 적합한 제안을 선택하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">제목</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: GPT 기반 고객 응대 챗봇 구축"
                required
                minLength={5}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">상세 설명</label>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="원하는 서비스의 요구사항, 기대 결과, 특이사항 등을 상세히 기술해주세요 (최소 10자)"
                required
                minLength={10}
                maxLength={5000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">카테고리</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">카테고리를 선택하세요</option>
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">예산 상한 (USDC, 선택)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={budgetMax}
                  onChange={(e) => setBudgetMax(e.target.value)}
                  placeholder="예: 500"
                />
                <p className="text-xs text-muted-foreground">비워두면 예산 제한 없음</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">입찰 기간</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value, 10))}
                >
                  {DURATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? '등록 중...' : '경매 등록'}
              </Button>
              <Link href="/auctions">
                <Button type="button" variant="outline">취소</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
