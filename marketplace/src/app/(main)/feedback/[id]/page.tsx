'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

type Category = 'feature' | 'bug' | 'improvement' | 'general';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';

interface FeedbackDetail {
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
  author_avatar_url: string | null;
  has_voted?: boolean;
  created_at: string;
}

const STATUS_BADGE: Record<Status, string> = {
  open: 'bg-blue-500 text-white',
  in_progress: 'bg-yellow-500 text-white',
  resolved: 'bg-green-500 text-white',
  closed: 'bg-gray-500 text-white',
};

const CATEGORY_BADGE: Record<Category, string> = {
  feature: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30',
  bug: 'bg-red-500/10 text-red-600 dark:text-red-300 border-red-500/30',
  improvement: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
  general: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/30',
};

export default function FeedbackDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const dict = useDict() as unknown as Record<string, Record<string, string>>;
  const fb = (dict.feedback ?? {}) as Record<string, string>;
  const fbCat = ((dict.feedback as unknown as Record<string, Record<string, string>>)?.category ?? {}) as Record<string, string>;
  const fbSt = ((dict.feedback as unknown as Record<string, Record<string, string>>)?.status ?? {}) as Record<string, string>;

  const [item, setItem] = useState<FeedbackDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/platform-feedback/${id}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
        setItem(d.data);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async () => {
    const res = await fetch(`/api/platform-feedback/${id}/vote`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? 'Vote failed');
      return;
    }
    setItem((prev) =>
      prev
        ? { ...prev, upvote_count: data.data.upvote_count, has_voted: data.data.voted }
        : prev,
    );
  };

  if (loading) {
    return <div className="py-16 text-center text-muted-foreground">{fb.loading ?? 'Loading...'}</div>;
  }

  if (error || !item) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-muted-foreground">{error ?? (fb.notFound ?? 'Feedback not found')}</p>
        <Link href="/feedback" className="text-primary underline">
          {fb.backToList ?? 'Back to list'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/feedback" className="text-sm text-muted-foreground hover:text-foreground">
        ← {fb.backToList ?? 'Back to list'}
      </Link>

      <Card className="p-6 space-y-5">
        <div className="flex gap-4">
          <button
            onClick={handleVote}
            className={`flex w-16 flex-col items-center justify-center rounded-lg border py-3 text-sm font-semibold transition-colors shrink-0 ${
              item.has_voted
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-foreground hover:bg-muted'
            }`}
          >
            <span className="text-xl leading-none">▲</span>
            <span className="text-base">{item.upvote_count}</span>
          </button>
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={CATEGORY_BADGE[item.category]} variant="outline">
                {fbCat[item.category] ?? item.category}
              </Badge>
              <Badge className={STATUS_BADGE[item.status]}>
                {fbSt[item.status] ?? item.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {item.author_nickname} · {new Date(item.created_at).toLocaleDateString()}
              </span>
            </div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
              {item.body}
            </p>
          </div>
        </div>
      </Card>

      {item.admin_response && (
        <Card className="p-5 border-primary/30 bg-primary/5 space-y-2">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary text-primary-foreground">
              {fb.adminResponse ?? 'Admin Response'}
            </Badge>
            {item.admin_response_at && (
              <span className="text-xs text-muted-foreground">
                {new Date(item.admin_response_at).toLocaleString()}
              </span>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed">
            {item.admin_response}
          </p>
        </Card>
      )}
    </div>
  );
}
