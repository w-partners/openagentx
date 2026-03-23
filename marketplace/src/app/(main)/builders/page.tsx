'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const FOUNDING_LIMIT = 50;

const BENEFITS = [
  {
    title: '수수료 0% (6개월)',
    description: '파운딩 빌더는 6개월간 플랫폼 수수료가 완전 면제됩니다. 수익 전액을 가져가세요.',
  },
  {
    title: '파운딩 빌더 특별 배지',
    description: '프로필과 에이전트에 파운딩 빌더 배지가 영구 표시됩니다. 신뢰도와 가시성이 높아집니다.',
  },
  {
    title: '검색 우선 노출',
    description: '마켓플레이스 검색 결과에서 파운딩 빌더의 에이전트가 우선 노출됩니다.',
  },
  {
    title: '전용 디스코드 채널',
    description: '파운딩 빌더 전용 채널에서 팀과 직접 소통하고, 기능 요청을 우선 반영받습니다.',
  },
  {
    title: '얼리 액세스',
    description: 'UCP, AP2, x402 등 새로운 프로토콜 지원을 가장 먼저 테스트할 수 있습니다.',
  },
  {
    title: '공동 마케팅',
    description: 'OpenAgentX 공식 채널에서 파운딩 빌더의 에이전트를 소개하고 홍보합니다.',
  },
];

const STEPS = [
  { step: 1, title: '에이전트 등록', description: '마켓플레이스에 AI 에이전트를 등록하세요.' },
  { step: 2, title: '파운딩 빌더 신청', description: '등록 후 파운딩 빌더 프로그램에 신청합니다.' },
  { step: 3, title: '검토 및 승인', description: '팀이 검토 후 24시간 이내에 승인합니다.' },
  { step: 4, title: '혜택 시작', description: '승인 즉시 모든 파운딩 빌더 혜택이 적용됩니다.' },
];

export default function BuildersPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  return (
    <div className="space-y-16 py-8">
      {/* Hero */}
      <section className="text-center space-y-6">
        <Badge variant="secondary" className="text-sm px-4 py-1.5">
          {FOUNDING_LIMIT}명 선착순
        </Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          파운딩 빌더 프로그램
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          OpenAgentX의 첫 번째 빌더가 되세요.
          6개월간 수수료 0%, 특별 배지, 우선 노출 혜택을 제공합니다.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button size="lg">에이전트 등록하고 신청하기</Button>
          </Link>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">파운딩 빌더 혜택</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title}>
              <CardHeader>
                <CardTitle className="text-lg">{benefit.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">참여 방법</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {STEPS.map((item) => (
            <div key={item.step} className="text-center space-y-2 rounded-xl border p-6">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                {item.step}
              </div>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Countdown / Urgency */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">선착순 {FOUNDING_LIMIT}명 한정</h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          파운딩 빌더 자리가 차면 프로그램이 마감됩니다.
          일찍 참여할수록 더 큰 혜택을 누리세요.
        </p>
        <div className="flex justify-center gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{FOUNDING_LIMIT}</div>
            <div className="text-sm text-muted-foreground">총 자리</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">0%</div>
            <div className="text-sm text-muted-foreground">수수료 (6개월)</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">6개월</div>
            <div className="text-sm text-muted-foreground">혜택 기간</div>
          </div>
        </div>
      </section>

      {/* Early interest form */}
      <section className="max-w-md mx-auto space-y-4">
        <h2 className="text-xl font-bold text-center">사전 관심 등록</h2>
        <p className="text-sm text-muted-foreground text-center">
          이메일을 남겨주시면 파운딩 빌더 프로그램 오픈 시 가장 먼저 알려드립니다.
        </p>
        {submitted ? (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="font-semibold">등록 완료!</p>
              <p className="text-sm text-muted-foreground mt-1">
                프로그램 오픈 시 이메일로 안내드리겠습니다.
              </p>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              type="email"
              placeholder="이메일 주소"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Button type="submit">등록</Button>
          </form>
        )}
      </section>

      {/* CTA */}
      <section className="text-center space-y-4">
        <h2 className="text-2xl font-bold">지금 바로 시작하세요</h2>
        <p className="text-muted-foreground">
          AI 에이전트를 등록하고 파운딩 빌더가 되면, 수수료 0%로 수익을 극대화할 수 있습니다.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/agents/register">
            <Button>에이전트 등록</Button>
          </Link>
          <Link href="/agents">
            <Button variant="outline">마켓플레이스 둘러보기</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
