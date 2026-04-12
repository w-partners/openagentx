'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type Category = 'feature' | 'bug' | 'improvement' | 'general';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface FeedbackItem {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  body: string;
  status: Status;
  upvote_count: number;
  admin_response: string | null;
  admin_response_at: string | null;
  author_nickname: string;
  created_at: string;
}

const STATUS_BADGE: Record<Status, string> = {
  open: 'bg-blue-500 text-white',
  in_progress: 'bg-yellow-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-gray-500 text-white',
};

const STATUS_LABEL: Record<Status, string> = {
  open: '대기',
  in_progress: '진행 중',
  resolved: '완료',
  closed: '닫힘',
};

const CATEGORY_LABEL: Record<Category, string> = {
  feature: '기능 요청',
  bug: '버그',
  improvement: '개선',
  general: '일반',
};

export default function FeedbackSection() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | Status>('all');

  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (filterStatus !== 'all') params.set('status', filterStatus);
    params.set('sort', 'recent');
    params.set('limit', '100');

    fetch(`/api/platform-feedback?${params}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
        setItems(Array.isArray(d.data) ? d.data : []);
      })
      .catch((e: Error) => {
        setError(e.message);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: string, status: Status) => {
    const res = await fetch(`/api/platform-feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? '상태 변경 실패');
      return;
    }
    load();
  };

  const submitResponse = async (id: string) => {
    const response = responseDrafts[id]?.trim();
    if (!response) return;
    const res = await fetch(`/api/platform-feedback/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ admin_response: response }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? '응답 등록 실패');
      return;
    }
    setResponseDrafts((prev) => ({ ...prev, [id]: '' }));
    load();
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold">피드백 관리</h2>
        <p className="text-muted-foreground">사용자 피드백을 확인하고 응답합니다</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">상태:</span>
        {(['all', 'open', 'in_progress', 'resolved', 'closed'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/70'
            }`}
          >
            {s === 'all' ? '전체' : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">불러오는 중...</div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">피드백이 없습니다</Card>
      ) : (
        <div className="space-y-4">
          {items.map((it) => (
            <Card key={it.id} className="p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{CATEGORY_LABEL[it.category]}</Badge>
                <Badge className={STATUS_BADGE[it.status]}>{STATUS_LABEL[it.status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {it.author_nickname} · {new Date(it.created_at).toLocaleString()} · 추천 {it.upvote_count}
                </span>
              </div>
              <h3 className="font-semibold text-lg">{it.title}</h3>
              <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">{it.body}</p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-xs text-muted-foreground self-center">상태 변경:</span>
                {(['open', 'in_progress', 'resolved', 'closed'] as Status[]).map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={it.status === s ? 'default' : 'outline'}
                    onClick={() => updateStatus(it.id, s)}
                  >
                    {STATUS_LABEL[s]}
                  </Button>
                ))}
              </div>

              {it.admin_response ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className="bg-primary text-primary-foreground">관리자 답변</Badge>
                    {it.admin_response_at && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(it.admin_response_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap text-foreground">{it.admin_response}</p>
                </div>
              ) : null}

              <div className="space-y-2 pt-2">
                <textarea
                  value={responseDrafts[it.id] ?? ''}
                  onChange={(e) =>
                    setResponseDrafts((prev) => ({ ...prev, [it.id]: e.target.value }))
                  }
                  rows={3}
                  placeholder={it.admin_response ? '응답 업데이트...' : '관리자 응답 작성...'}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => submitResponse(it.id)}
                  disabled={!responseDrafts[it.id]?.trim()}
                >
                  응답 등록
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
