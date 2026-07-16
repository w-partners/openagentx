'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PromptItem {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  description: string;
  description_ko: string | null;
  category: string;
  tags: string[];
  is_featured: boolean;
  use_count: number;
  like_count: number;
}

interface CategoryItem {
  category: string;
  count: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  general: '일반',
  coding: '코딩',
  data: '데이터',
  writing: '글쓰기',
  marketing: '마케팅',
  translation: '번역',
  education: '교육',
  productivity: '생산성',
};

function PromptsListInner() {
  const searchParams = useSearchParams();
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [popular, setPopular] = useState<PromptItem[]>([]);
  const [cats, setCats] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const initialQ = searchParams.get('q') ?? '';
  const initialCat = searchParams.get('category') ?? '';
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState(initialCat);

  useEffect(() => {
    fetch('/api/prompts/categories')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setCats(d.data ?? []))
      .catch(() => {});
  }, []);

  // 🔥 인기 TOP 5 — 검색/필터 무관, 한번만 로드
  useEffect(() => {
    fetch('/api/v1/prompts?limit=5')
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => {
        const items: PromptItem[] = d.data ?? [];
        // use_count DESC 로 재정렬 (서버 ORDER 가 is_featured DESC, use_count DESC 라 대체로 만족)
        const sorted = [...items].sort((a, b) => b.use_count - a.use_count).slice(0, 5);
        setPopular(sorted);
      })
      .catch(() => setPopular([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    const url = new URL('/api/v1/prompts', window.location.origin);
    if (q) url.searchParams.set('q', q);
    if (cat) url.searchParams.set('category', cat);
    url.searchParams.set('limit', '60');

    fetch(url.toString())
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setPrompts(d.data ?? []))
      .catch(() => setPrompts([]))
      .finally(() => setLoading(false));
  }, [q, cat]);

  const totalCount = useMemo(
    () => cats.reduce((acc, c) => acc + c.count, 0),
    [cats],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">프롬프트 모음집</h1>
          <p className="text-sm text-muted-foreground mt-1">
            엄선된 시스템 프롬프트 라이브러리. 클릭 한 번으로 사용하거나 ChatGPT GPT Actions / cURL 로 호출할 수 있습니다.
          </p>
        </div>
        <Link href="/ko/prompts/new">
          <Button>+ 새 프롬프트 등록</Button>
        </Link>
      </div>

      {/* 🔥 인기 TOP 5 */}
      {popular.length > 0 && !q && !cat && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="text-sm font-semibold mb-3">🔥 인기 TOP 5</div>
          <div className="grid gap-2 md:grid-cols-5">
            {popular.map((p, i) => {
              const title = p.title_ko ?? p.title;
              return (
                <Link
                  key={p.id}
                  href={`/ko/prompts/${p.slug}`}
                  className="rounded-md bg-background border px-3 py-2 hover:bg-accent transition-colors"
                >
                  <div className="text-xs text-muted-foreground">#{i + 1}</div>
                  <div className="text-sm font-medium leading-tight line-clamp-2">{title}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">▶ {p.use_count} · ♡ {p.like_count}</div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex w-full max-w-xl gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="제목, 설명, 태그로 검색"
          className="flex-1"
        />
        {q && (
          <Button variant="outline" onClick={() => setQ('')}>지우기</Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat('')}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            cat === '' ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'
          }`}
        >
          전체 ({totalCount})
        </button>
        {cats.map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => setCat(c.category === cat ? '' : c.category)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors ${
              cat === c.category ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent'
            }`}
          >
            {CATEGORY_LABELS[c.category] ?? c.category} ({c.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</div>
      ) : prompts.length === 0 ? (
        <div className="text-sm text-muted-foreground py-8 text-center">검색 결과가 없습니다.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {prompts.map((p) => {
            const title = p.title_ko ?? p.title;
            const desc = p.description_ko ?? p.description;
            return (
              <Link key={p.id} href={`/ko/prompts/${p.slug}`}>
                <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight">{title}</CardTitle>
                      {p.is_featured && (
                        <Badge variant="default" className="text-[10px] shrink-0">⭐ 추천</Badge>
                      )}
                    </div>
                    <Badge variant="outline" className="w-fit text-[10px]">
                      {CATEGORY_LABELS[p.category] ?? p.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    <p className="line-clamp-3">{desc}</p>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-1 items-center justify-between text-xs pt-2">
                    <div className="flex flex-wrap gap-1">
                      {p.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-muted-foreground">#{tag}</span>
                      ))}
                    </div>
                    <div className="flex gap-3 text-muted-foreground">
                      <span>▶ {p.use_count}</span>
                      <span>♡ {p.like_count}</span>
                    </div>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PromptsListPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground py-8 text-center">로딩 중...</div>}>
      <PromptsListInner />
    </Suspense>
  );
}
