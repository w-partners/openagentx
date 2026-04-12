'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useDict } from '@/i18n/client';

type Category = 'feature' | 'bug' | 'improvement' | 'general';
type Status = 'open' | 'in_progress' | 'resolved' | 'closed';
type Sort = 'votes' | 'recent';

interface FeedbackItem {
  id: string;
  user_id: string;
  category: Category;
  title: string;
  body: string;
  status: Status;
  upvote_count: number;
  admin_response: string | null;
  author_nickname: string;
  author_avatar_url: string | null;
  has_voted?: boolean;
  created_at: string;
}

const CATEGORIES: ('all' | Category)[] = ['all', 'feature', 'bug', 'improvement', 'general'];
const STATUSES: ('all' | Status)[] = ['all', 'open', 'in_progress', 'resolved', 'closed'];

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

export default function FeedbackListPage() {
  const dict = useDict() as unknown as Record<string, Record<string, string>>;
  const fb = (dict.feedback ?? {}) as Record<string, string>;
  const fbCat = ((dict.feedback as unknown as Record<string, Record<string, string>>)?.category ?? {}) as Record<string, string>;
  const fbSt = ((dict.feedback as unknown as Record<string, Record<string, string>>)?.status ?? {}) as Record<string, string>;

  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [category, setCategory] = useState<'all' | Category>('all');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [sort, setSort] = useState<Sort>('votes');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    if (status !== 'all') params.set('status', status);
    params.set('sort', sort);
    params.set('limit', '50');

    fetch(`/api/platform-feedback?${params}`, { credentials: 'include' })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d?.error ?? `HTTP ${r.status}`);
        setItems(Array.isArray(d.data) ? d.data : []);
      })
      .catch((e: Error) => {
        console.error('feedback load error:', e);
        setError(e.message);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [category, status, sort]);

  useEffect(() => { load(); }, [load]);

  const handleVote = async (id: string) => {
    const res = await fetch(`/api/platform-feedback/${id}/vote`, {
      method: 'POST',
      credentials: 'include',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error ?? 'Vote failed');
      return;
    }
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? { ...it, upvote_count: data.data.upvote_count, has_voted: data.data.voted }
          : it,
      ),
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{fb.title ?? 'Feedback'}</h1>
          <p className="text-muted-foreground">
            {fb.description ?? 'Share your ideas and report issues'}
          </p>
        </div>
        <Link
          href="/feedback/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {fb.newButton ?? 'New Feedback'}
        </Link>
      </div>

      <div className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {fb.categoryLabel ?? 'Category'}:
          </span>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                category === c
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {c === 'all' ? (fb.all ?? 'All') : (fbCat[c] ?? c)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {fb.statusLabel ?? 'Status'}:
          </span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                status === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {s === 'all' ? (fb.all ?? 'All') : (fbSt[s] ?? s)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {fb.sortLabel ?? 'Sort'}:
          </span>
          {(['votes', 'recent'] as Sort[]).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                sort === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/70'
              }`}
            >
              {s === 'votes' ? (fb.sortVotes ?? 'Top Voted') : (fb.sortRecent ?? 'Recent')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">{fb.loading ?? 'Loading...'}</div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">{fb.empty ?? 'No feedback yet. Be the first to share!'}</Card>
      ) : (
        <div className="space-y-3">
          {items.map((it) => (
            <Card key={it.id} className="flex gap-4 p-5">
              <button
                onClick={() => handleVote(it.id)}
                className={`flex w-14 flex-col items-center justify-center rounded-lg border py-2 text-sm font-semibold transition-colors shrink-0 ${
                  it.has_voted
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background text-foreground hover:bg-muted'
                }`}
                aria-label="Upvote"
              >
                <span className="text-lg leading-none">▲</span>
                <span>{it.upvote_count}</span>
              </button>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={CATEGORY_BADGE[it.category]} variant="outline">
                    {fbCat[it.category] ?? it.category}
                  </Badge>
                  <Badge className={STATUS_BADGE[it.status]}>
                    {fbSt[it.status] ?? it.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {it.author_nickname} · {new Date(it.created_at).toLocaleDateString()}
                  </span>
                </div>
                <Link href={`/feedback/${it.id}`} className="block">
                  <h3 className="text-lg font-semibold hover:text-primary transition-colors">{it.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{it.body}</p>
                </Link>
                {it.admin_response && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-2 text-xs text-foreground">
                    <span className="font-semibold text-primary">{fb.adminResponse ?? 'Admin'}:</span>{' '}
                    {it.admin_response}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
