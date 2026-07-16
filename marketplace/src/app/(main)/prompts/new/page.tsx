'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const CATEGORIES = ['general', 'coding', 'data', 'writing', 'marketing', 'translation', 'education', 'productivity'];

function autoSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100);
}

export default function NewPromptPage() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [titleKo, setTitleKo] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [descriptionKo, setDescriptionKo] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [category, setCategory] = useState('general');
  const [tagsInput, setTagsInput] = useState('');
  const [exampleInput, setExampleInput] = useState('');
  const [exampleOutput, setExampleOutput] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(autoSlug(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim() || !systemPrompt.trim()) {
      setError('제목, 설명, 시스템 프롬프트는 필수입니다.');
      return;
    }

    setSubmitting(true);
    try {
      const tags = tagsInput
        .split(/[,\s]+/)
        .map((t) => t.trim().replace(/^#/, ''))
        .filter(Boolean)
        .slice(0, 20);

      const r = await fetch('/api/v1/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: slug || undefined,
          title,
          title_ko: titleKo || undefined,
          description,
          description_ko: descriptionKo || undefined,
          system_prompt: systemPrompt,
          category,
          tags,
          example_input: exampleInput || undefined,
          example_output: exampleOutput || undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.data?.slug) {
        if (r.status === 401) {
          setError('로그인 또는 API Key 가 필요합니다.');
        } else {
          setError(j.error ?? '등록 실패');
        }
        return;
      }
      router.push(`/ko/prompts/${j.data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '네트워크 오류');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/ko/prompts" className="text-xs text-muted-foreground hover:underline">← 목록으로</Link>
        <h1 className="text-2xl font-bold mt-2">새 프롬프트 등록</h1>
        <p className="text-sm text-muted-foreground mt-1">
          공개 라이브러리에 새 시스템 프롬프트를 등록합니다.
          (인증 필요 — 세션 쿠키 또는 Bearer API Key)
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">기본 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">제목 (영문) *</label>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Code Reviewer" required />
            </div>

            <div>
              <label className="text-sm font-medium">제목 (한글)</label>
              <Input value={titleKo} onChange={(e) => setTitleKo(e.target.value)} placeholder="코드 리뷰어" />
            </div>

            <div>
              <label className="text-sm font-medium">슬러그</label>
              <Input
                value={slug}
                onChange={(e) => {
                  setSlug(autoSlug(e.target.value));
                  setSlugTouched(true);
                }}
                placeholder="code-reviewer"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /ko/prompts/<span className="font-mono">{slug || 'auto-generated'}</span>
              </p>
            </div>

            <div>
              <label className="text-sm font-medium">카테고리</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium">설명 (영문) *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                required
                placeholder="Reviews TypeScript / Python code…"
              />
            </div>

            <div>
              <label className="text-sm font-medium">설명 (한글)</label>
              <textarea
                value={descriptionKo}
                onChange={(e) => setDescriptionKo(e.target.value)}
                rows={2}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="TypeScript / Python 코드를 리뷰합니다."
              />
            </div>

            <div>
              <label className="text-sm font-medium">시스템 프롬프트 *</label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                rows={12}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm font-mono"
                required
                placeholder="당신은 ..."
              />
            </div>

            <div>
              <label className="text-sm font-medium">태그 (쉼표 또는 공백 구분, 최대 20개)</label>
              <Input
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="code-review, typescript, python"
              />
            </div>

            <div>
              <label className="text-sm font-medium">예시 입력 (선택)</label>
              <textarea
                value={exampleInput}
                onChange={(e) => setExampleInput(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm font-mono"
              />
            </div>

            <div>
              <label className="text-sm font-medium">예시 출력 (선택)</label>
              <textarea
                value={exampleOutput}
                onChange={(e) => setExampleOutput(e.target.value)}
                rows={3}
                className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm font-mono"
              />
            </div>

            {error && <div className="text-sm text-destructive">{error}</div>}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? '등록 중...' : '등록하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
