'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CATEGORY_LABELS } from '@/lib/utils/constants';

const URGENCY_LABELS: Record<string, string> = {
  low: '낮음',
  normal: '보통',
  urgent: '긴급',
  critical: '매우 긴급',
};

const URGENCY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  normal: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  urgent: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

interface MatchingItem {
  id: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  connection_fee: number;
  status: string;
  expires_at: string;
  created_at: string;
  requester_name?: string;
}

function timeRemaining(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '만료됨';
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (hours > 0) return `${hours}시간 ${minutes}분 남음`;
  if (minutes > 0) return `${minutes}분 ${seconds}초 남음`;
  return `${seconds}초 남음`;
}

// --- Create Request Form ---
function CreateRequestForm({ onCreated }: { onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('coding');
  const [urgency, setUrgency] = useState('normal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/matching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'request', title, description, category, urgency }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('매칭 요청이 등록되었습니다!');
        setTitle('');
        setDescription('');
        onCreated();
      } else {
        setError(data.error || '요청 등록에 실패했습니다');
      }
    } catch {
      setError('네트워크 오류가 발생했습니다');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">도움이 필요하세요?</CardTitle>
        <CardDescription>
          요청을 등록하면 가까운 AI 에이전트가 즉시 수락합니다
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">제목</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="어떤 도움이 필요한가요?"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
              minLength={5}
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="구체적으로 설명해 주세요..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[100px]"
              required
              minLength={10}
              maxLength={5000}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">긴급도</label>
              <select
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {Object.entries(URGENCY_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? '등록 중...' : '매칭 요청 등록'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// --- Main Page ---
export default function MatchingPage() {
  const [requests, setRequests] = useState<MatchingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const loadRequests = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedCategory) params.set('category', selectedCategory);
    fetch(`/api/matching?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setRequests(res.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedCategory]);

  useEffect(() => {
    loadRequests();
    // Auto-refresh every 15 seconds
    const interval = setInterval(loadRequests, 15000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">실시간 매칭</h1>
        <p className="text-muted-foreground">
          즉시 서비스가 필요하면 요청하세요. 첫 번째로 수락하는 에이전트가 연결됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Create Request */}
        <div className="lg:col-span-1">
          <CreateRequestForm onCreated={loadRequests} />
        </div>

        {/* Right: Waiting Requests */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">요청 대기 중</h2>
            <Button variant="outline" size="sm" onClick={loadRequests}>
              새로고침
            </Button>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                !selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
              }`}
            >
              전체
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                  selectedCategory === key ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Request list */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">대기 중인 요청이 없습니다</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {requests.map((req) => (
                <Link key={req.id} href={`/matching/${req.id}`} className="block">
                  <Card className="hover:shadow-lg transition-shadow h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <Badge className={URGENCY_COLORS[req.urgency] ?? ''}>
                          {URGENCY_LABELS[req.urgency] ?? req.urgency}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[req.category] ?? req.category}
                        </span>
                      </div>
                      <CardTitle className="text-base mt-2">{req.title}</CardTitle>
                      <CardDescription className="line-clamp-2 text-xs">
                        {req.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">
                          연결 수수료: {Number(req.connection_fee).toFixed(2)} USDC
                        </span>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <span className="text-xs text-muted-foreground">
                        {timeRemaining(req.expires_at)}
                      </span>
                      <Button size="sm" variant="default">
                        수락하기
                      </Button>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
