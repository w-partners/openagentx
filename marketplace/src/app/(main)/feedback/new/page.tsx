'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDict } from '@/i18n/client';

type Category = 'feature' | 'bug' | 'improvement' | 'general';
const CATEGORIES: Category[] = ['feature', 'bug', 'improvement', 'general'];

export default function FeedbackNewPage() {
  const router = useRouter();
  const dict = useDict() as unknown as Record<string, Record<string, string>>;
  const fb = (dict.feedback ?? {}) as Record<string, string>;
  const fbCat = ((dict.feedback as unknown as Record<string, Record<string, string>>)?.category ?? {}) as Record<string, string>;

  const [category, setCategory] = useState<Category>('feature');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setIsAuthed(!!d?.data?.id);
      })
      .catch(() => setIsAuthed(false))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError(fb.validation ?? 'Title and body are required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/platform-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category, title: title.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      router.push(`/feedback/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <div className="py-16 text-center text-muted-foreground">{fb.loading ?? 'Loading...'}</div>;
  }

  if (!isAuthed) {
    return (
      <Card className="mx-auto max-w-lg p-8 text-center space-y-4">
        <h1 className="text-2xl font-bold">{fb.loginRequired ?? 'Login required'}</h1>
        <p className="text-muted-foreground">{fb.loginRequiredDesc ?? 'Please sign in to submit feedback.'}</p>
        <Link
          href={`/login?next=${encodeURIComponent('/feedback/new')}`}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {fb.loginCta ?? 'Go to Login'}
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{fb.newTitle ?? 'Submit Feedback'}</h1>
        <p className="text-muted-foreground">{fb.newDesc ?? 'Share your thoughts with the team'}</p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {fb.categoryLabel ?? 'Category'}
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    category === c
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  }`}
                >
                  {fbCat[c] ?? c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {fb.titleLabel ?? 'Title'}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={fb.titlePlaceholder ?? 'Brief summary of your feedback'}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {fb.bodyLabel ?? 'Details'}
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={5000}
              rows={8}
              placeholder={fb.bodyPlaceholder ?? 'Describe in detail...'}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">{body.length} / 5000</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? (fb.submitting ?? 'Submitting...') : (fb.submit ?? 'Submit')}
            </Button>
            <Link
              href="/feedback"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              {fb.cancel ?? 'Cancel'}
            </Link>
          </div>
        </form>
      </Card>
    </div>
  );
}
