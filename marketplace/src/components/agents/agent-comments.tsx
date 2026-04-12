'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDict } from '@/i18n/client';

interface CommentItem {
  id: string;
  agent_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  nickname: string;
  avatar_url: string | null;
  reply_count: number;
  created_at: string;
}

interface CommentsResponse {
  comments: CommentItem[];
  replies: CommentItem[];
}

interface Props {
  agentId: string;
}

export default function AgentComments({ agentId }: Props) {
  const dict = useDict() as unknown as Record<string, Record<string, string>>;
  const cm = (dict.comments ?? {}) as Record<string, string>;
  const d = (dict.discussion ?? {}) as Record<string, string>;

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [replies, setReplies] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [viewerId, setViewerId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<string | null>(null);

  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState('');

  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.data?.id) {
          setViewerId(data.data.id);
          setViewerRole(data.data.role ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/agents/${agentId}/comments?limit=50`, { credentials: 'include' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error ?? `HTTP ${r.status}`);
        const body = data?.data as CommentsResponse;
        setComments(body?.comments ?? []);
        setReplies(body?.replies ?? []);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [agentId]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: newBody.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setNewBody('');
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentId: string) => {
    if (!replyBody.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: replyBody.trim(), parent_id: parentId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      setReplyBody('');
      setReplyTo(null);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Reply failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!confirm(cm.deleteConfirm ?? 'Delete this comment?')) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const canModify = (authorId: string) =>
    viewerId === authorId || viewerRole === 'admin';

  const renderComment = (c: CommentItem, isReply = false) => (
    <div
      key={c.id}
      className={`rounded-xl border bg-card p-4 space-y-2 ${isReply ? 'ml-6' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{c.nickname}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(c.created_at).toLocaleString()}
          </span>
          {c.is_deleted && <Badge variant="outline">{cm.deleted ?? 'deleted'}</Badge>}
        </div>
        {!c.is_deleted && canModify(c.user_id) && (
          <button
            onClick={() => handleDelete(c.id)}
            className="text-xs text-muted-foreground hover:text-destructive"
          >
            {cm.delete ?? 'Delete'}
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-foreground">{c.body}</p>
      {!c.is_deleted && !isReply && viewerId && (
        <div className="pt-1">
          {replyTo === c.id ? (
            <div className="space-y-2">
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                maxLength={2000}
                placeholder={cm.replyPlaceholder ?? 'Write a reply...'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleReply(c.id)}
                  disabled={submitting || !replyBody.trim()}
                >
                  {cm.submitReply ?? 'Reply'}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => { setReplyTo(null); setReplyBody(''); }}
                >
                  {cm.cancel ?? 'Cancel'}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setReplyTo(c.id); setReplyBody(''); }}
              className="text-xs text-primary hover:underline"
            >
              {cm.reply ?? 'Reply'}
            </button>
          )}
        </div>
      )}
    </div>
  );

  const repliesFor = (parentId: string) =>
    replies.filter((r) => r.parent_id === parentId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{d.title ?? 'Discussion'}</h2>
        <span className="text-sm text-muted-foreground">
          {comments.length + replies.length} {cm.count ?? 'comments'}
        </span>
      </div>

      {viewerId ? (
        <form onSubmit={handleSubmit} className="space-y-2 rounded-xl border bg-card p-4">
          <textarea
            value={newBody}
            onChange={(e) => setNewBody(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder={cm.placeholder ?? 'Ask a question or share your thoughts...'}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{newBody.length} / 2000</span>
            <Button type="submit" size="sm" disabled={submitting || !newBody.trim()}>
              {submitting ? (cm.submitting ?? 'Posting...') : (cm.submit ?? 'Post')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="rounded-xl border bg-muted p-4 text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            {cm.loginToComment ?? 'Log in'}
          </Link>{' '}
          {cm.loginHint ?? 'to join the discussion.'}
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-muted-foreground">{cm.loading ?? 'Loading...'}</div>
      ) : comments.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          {cm.empty ?? 'No comments yet. Be the first to discuss!'}
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="space-y-2">
              {renderComment(c)}
              {repliesFor(c.id).map((r) => renderComment(r, true))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
