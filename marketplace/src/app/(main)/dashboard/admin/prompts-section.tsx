'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminPrompt {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  category: string;
  is_featured: boolean;
  is_public: boolean;
  status: string;
  use_count: number;
  like_count: number;
}

export default function PromptsSection() {
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'featured'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/admin/prompts');
      const j = await r.json();
      if (r.ok) setPrompts(j.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(slug: string, body: Record<string, unknown>) {
    const r = await fetch(`/api/admin/prompts/${slug}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) load();
  }

  async function remove(slug: string) {
    if (!confirm(`정말 "${slug}" 를 삭제하시겠습니까?`)) return;
    const r = await fetch(`/api/admin/prompts/${slug}`, { method: 'DELETE' });
    if (r.ok) load();
  }

  const filtered = prompts.filter((p) => {
    if (filter === 'public') return p.is_public;
    if (filter === 'private') return !p.is_public;
    if (filter === 'featured') return p.is_featured;
    return true;
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle>프롬프트 관리</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'public' | 'private' | 'featured')}
              className="px-3 py-1.5 border rounded-md bg-background text-sm"
            >
              <option value="all">전체</option>
              <option value="public">공개</option>
              <option value="private">비공개</option>
              <option value="featured">추천</option>
            </select>
            <Link href="/ko/prompts/new">
              <Button size="sm">+ 새 프롬프트</Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground py-4">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">결과가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left p-2">제목</th>
                  <th className="text-left p-2">슬러그</th>
                  <th className="text-left p-2">카테고리</th>
                  <th className="text-left p-2">상태</th>
                  <th className="text-right p-2">사용</th>
                  <th className="text-right p-2">♡</th>
                  <th className="text-right p-2">액션</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-accent/30">
                    <td className="p-2">
                      <Link href={`/ko/prompts/${p.slug}`} className="hover:underline">
                        {p.title_ko ?? p.title}
                      </Link>
                    </td>
                    <td className="p-2 font-mono text-xs">{p.slug}</td>
                    <td className="p-2">
                      <Badge variant="outline" className="text-xs">{p.category}</Badge>
                    </td>
                    <td className="p-2 space-x-1">
                      {p.is_featured && <Badge className="text-[10px]">⭐</Badge>}
                      <Badge variant={p.is_public ? 'default' : 'secondary'} className="text-[10px]">
                        {p.is_public ? '공개' : '비공개'}
                      </Badge>
                      <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="p-2 text-right">{p.use_count}</td>
                    <td className="p-2 text-right">{p.like_count}</td>
                    <td className="p-2 text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(p.slug, { is_featured: !p.is_featured })}
                      >
                        {p.is_featured ? '추천 해제' : '추천'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(p.slug, { is_public: !p.is_public })}
                      >
                        {p.is_public ? '비공개' : '공개'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => patch(p.slug, { status: p.status === 'active' ? 'archived' : 'active' })}
                      >
                        {p.status === 'active' ? '아카이브' : '활성화'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => remove(p.slug)}
                      >
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
