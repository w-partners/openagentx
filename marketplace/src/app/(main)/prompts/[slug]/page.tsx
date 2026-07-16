'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface PromptDetail {
  id: string;
  slug: string;
  title: string;
  title_ko: string | null;
  description: string;
  description_ko: string | null;
  system_prompt: string;
  category: string;
  tags: string[];
  is_featured: boolean;
  use_count: number;
  like_count: number;
  example_input: string | null;
  example_output: string | null;
}

export default function PromptDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const [prompt, setPrompt] = useState<PromptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [copied, setCopied] = useState<'prompt' | 'curl' | null>(null);
  const [showApi, setShowApi] = useState(false);

  // Run UI
  const [runInput, setRunInput] = useState('');
  const [runOutput, setRunOutput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/v1/prompts/${slug}`);
        if (!r.ok) {
          if (!cancelled) setNotFound(true);
          return;
        }
        const j = await r.json();
        if (!cancelled) {
          setPrompt(j.data);
          setLikeCount(j.data?.like_count ?? 0);
        }
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }

      // like state
      try {
        const r = await fetch(`/api/prompts/${slug}/like`);
        if (r.ok) {
          const j = await r.json();
          if (!cancelled) setLiked(!!j.data?.liked);
        }
      } catch { /* ignore */ }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleCopy = useCallback(
    async (text: string, kind: 'prompt' | 'curl') => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        setTimeout(() => setCopied(null), 1500);
      } catch {
        /* noop */
      }
    },
    [],
  );

  const handleLike = useCallback(async () => {
    if (!slug) return;
    try {
      const r = await fetch(`/api/prompts/${slug}/like`, { method: 'POST' });
      const j = await r.json();
      if (r.ok && j.data) {
        setLiked(j.data.liked);
        setLikeCount(j.data.like_count);
      } else if (r.status === 401) {
        alert('로그인 후 좋아요를 누를 수 있습니다.');
      }
    } catch {
      /* noop */
    }
  }, [slug]);

  const handleRun = useCallback(async () => {
    if (!slug || !runInput.trim()) return;
    setRunning(true);
    setRunOutput(null);
    setRunError(null);
    try {
      // 웹 UI는 세션쿠키 전용 엔드포인트 사용 (Bearer 불필요)
      const r = await fetch(`/api/prompts/${slug}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ input: runInput }),
      });
      const j = await r.json();
      if (r.ok && j.data?.output !== undefined) {
        setRunOutput(j.data.output);
      } else if (r.status === 401) {
        setRunError('로그인이 필요합니다. /ko/login 에서 로그인 후 다시 시도하세요.');
      } else {
        setRunError(j.error ?? '실행 실패');
      }
    } catch (e) {
      setRunError(e instanceof Error ? e.message : '네트워크 오류');
    } finally {
      setRunning(false);
    }
  }, [slug, runInput]);

  if (loading) {
    return <div className="text-sm text-muted-foreground py-8 text-center">불러오는 중...</div>;
  }
  if (notFound || !prompt) {
    return (
      <div className="py-12 text-center space-y-4">
        <p className="text-muted-foreground">프롬프트를 찾을 수 없습니다.</p>
        <Link href="/ko/prompts" className="text-primary underline">목록으로 돌아가기</Link>
      </div>
    );
  }

  const title = prompt.title_ko ?? prompt.title;
  const desc = prompt.description_ko ?? prompt.description;
  const curlExample = `curl -X POST https://openagentx.org/api/v1/prompts/${prompt.slug}/run \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"input": "여기에 입력"}'`;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <Link href="/ko/prompts" className="text-xs text-muted-foreground hover:underline">← 목록으로</Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{desc}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{prompt.category}</Badge>
                {prompt.is_featured && <Badge>⭐ 추천</Badge>}
                {prompt.tags.map((t) => (
                  <span key={t} className="text-xs text-muted-foreground">#{t}</span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant={liked ? 'default' : 'outline'} size="sm" onClick={handleLike}>
                {liked ? '♥' : '♡'} {likeCount}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* CTA */}
      <div className="grid md:grid-cols-2 gap-3">
        <Link href={`/chat?prompt=${prompt.slug}`} className="block">
          <Button className="w-full text-base py-6">💬 지금 사용하기</Button>
        </Link>
        <Button
          variant="outline"
          className="w-full text-base py-6"
          onClick={() => handleCopy(prompt.system_prompt, 'prompt')}
        >
          {copied === 'prompt' ? '✓ 복사됨' : '📋 프롬프트만 복사'}
        </Button>
      </div>

      {/* System prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            시스템 프롬프트
            <Button size="sm" variant="ghost" onClick={() => handleCopy(prompt.system_prompt, 'prompt')}>
              {copied === 'prompt' ? '✓ 복사됨' : '복사'}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono leading-relaxed max-h-96 overflow-auto">{prompt.system_prompt}</pre>
        </CardContent>
      </Card>

      {/* Examples */}
      {(prompt.example_input || prompt.example_output) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">사용 예시</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {prompt.example_input && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">📥 입력</div>
                <pre className="whitespace-pre-wrap bg-muted p-3 rounded">{prompt.example_input}</pre>
              </div>
            )}
            {prompt.example_output && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">📤 출력</div>
                <pre className="whitespace-pre-wrap bg-muted p-3 rounded">{prompt.example_output}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Run — 세션 쿠키로 즉시 실행 (로그인 필요). API Key 는 외부 호출용. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">💬 빠른 실행 (로그인 필요)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <textarea
            className="w-full min-h-[100px] p-3 text-sm border rounded-md bg-background font-mono"
            placeholder="여기에 입력 텍스트를 작성하세요..."
            value={runInput}
            onChange={(e) => setRunInput(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleRun} disabled={running || !runInput.trim()}>
              {running ? '실행 중... (최대 3분)' : '▶ 실행'}
            </Button>
            <Link href={`/chat?prompt=${prompt.slug}`}>
              <Button variant="outline">또는 채팅으로 →</Button>
            </Link>
          </div>
          {runError && <div className="text-sm text-destructive">{runError}</div>}
          {runOutput !== null && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">📤 결과</div>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded max-h-96 overflow-auto">{runOutput}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API usage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            API로 사용하기
            <Button size="sm" variant="ghost" onClick={() => setShowApi((v) => !v)}>
              {showApi ? '접기' : '펼치기'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showApi && (
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              ChatGPT GPT Actions, cURL, Python, Node 등 어디서나 호출할 수 있습니다.
              API Key 는 <Link href="/ko/dashboard" className="underline text-primary">대시보드</Link> 에서 발급하세요.
            </p>
            <div className="flex items-center justify-between">
              <span className="font-medium text-xs">cURL</span>
              <Button size="sm" variant="ghost" onClick={() => handleCopy(curlExample, 'curl')}>
                {copied === 'curl' ? '✓ 복사됨' : '복사'}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap text-xs bg-muted p-3 rounded font-mono">{curlExample}</pre>
            <p className="text-xs text-muted-foreground">
              OpenAPI 스펙: <Link href="/api/v1/openapi.json" className="underline">/api/v1/openapi.json</Link>
            </p>
          </CardContent>
        )}
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">사용 통계</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">실행 횟수</div>
            <div className="text-2xl font-bold">{prompt.use_count.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">좋아요</div>
            <div className="text-2xl font-bold">{likeCount.toLocaleString()}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
