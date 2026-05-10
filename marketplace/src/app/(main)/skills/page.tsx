'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Skill {
  tool: string;
  label: string;
  icon: string;
  description: string;
  example: string;
}

const SKILLS: Skill[] = [
  {
    tool: 'search_agents',
    label: '에이전트 검색',
    icon: '🔍',
    description:
      'OpenAgentX 마켓플레이스에서 키워드·카테고리로 AI 에이전트를 검색합니다. BM25 + 벡터 하이브리드 검색.',
    example: '"번역 에이전트 추천해줘"',
  },
  {
    tool: 'get_agent',
    label: '에이전트 상세',
    icon: '📋',
    description:
      '특정 에이전트의 상세 정보 — 서비스 목록, 가격, 평점, 샘플 입출력을 한 번에 조회합니다.',
    example: '"이 에이전트 자세히 알려줘"',
  },
  {
    tool: 'list_categories',
    label: '카테고리 목록',
    icon: '🗂️',
    description: '사용 가능한 모든 에이전트 카테고리 목록을 한국어 라벨과 함께 반환합니다.',
    example: '"어떤 카테고리가 있어?"',
  },
  {
    tool: 'fulfill',
    label: '요청 즉시 처리',
    icon: '⚡',
    description:
      '자연어 요청을 받아 등록된 에이전트가 매칭되면 사용하고, 없으면 AI가 즉석에서 동적 생성하여 처리합니다.',
    example: '"한국어로 \'Hello\' 번역해줘"',
  },
  {
    tool: 'create_job',
    label: '작업 결제·실행',
    icon: '💳',
    description:
      '특정 에이전트 서비스에 대해 결제 후 작업을 생성·실행합니다. X-API-Key 인증 필요.',
    example: '"이 에이전트로 작업 시작해줘"',
  },
  {
    tool: 'request_topup',
    label: '포인트 충전',
    icon: '💰',
    description: 'PortOne 결제 페이지 URL을 발급받아 사용자에게 안내합니다 (KRW/USDC).',
    example: '"포인트 1만원 충전하고 싶어"',
  },
];

const MCP_INSTALL_SNIPPET = `{
  "mcpServers": {
    "openagentx": {
      "command": "npx",
      "args": ["-y", "@openagentx/mcp-server"],
      "env": {
        "OPENAGENTX_API_KEY": "oax_xxxx..."
      }
    }
  }
}`;

export default function SkillsPage() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_INSTALL_SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="space-y-3 text-center">
        <h1 className="text-3xl font-bold md:text-4xl">스킬</h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          OpenAgentX를 Claude Code, OpenClaw 등 어떤 LLM에서도 쓸 수 있게 해주는 MCP 도구 모음입니다.
          에이전트 검색·결제·실행을 사용자의 LLM 안에서 그대로 처리합니다.
        </p>
      </div>

      {/* Install snippet */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">설치 (Claude Code)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            <code className="rounded bg-muted px-1 py-0.5">~/.claude/mcp.json</code> 또는 프로젝트의{' '}
            <code className="rounded bg-muted px-1 py-0.5">.mcp.json</code>에 아래를 추가하세요.{' '}
            <a
              href="https://openagentx.org/profile"
              className="text-primary underline-offset-2 hover:underline"
            >
              프로필 → API Keys
            </a>
            에서 키를 발급받습니다.
          </p>
          <div className="relative">
            <pre className="overflow-x-auto rounded-lg border bg-muted/50 p-4 text-xs">
              <code>{MCP_INSTALL_SNIPPET}</code>
            </pre>
            <Button
              size="sm"
              variant="secondary"
              className="absolute right-2 top-2"
              onClick={handleCopy}
            >
              {copied ? '복사됨!' : '복사'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Skill grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">제공 도구</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {SKILLS.map((skill) => (
            <Card key={skill.tool} className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{skill.icon}</span>
                    <CardTitle className="text-lg">{skill.label}</CardTitle>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {skill.tool}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{skill.description}</p>
                <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                  <span className="text-muted-foreground">예: </span>
                  <span className="italic">{skill.example}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
