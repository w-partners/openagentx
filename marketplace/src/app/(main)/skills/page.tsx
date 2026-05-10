'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SKILLS } from '@/lib/skills/data';

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
            <Link key={skill.tool} href={`/skills/${skill.tool}`} className="block">
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
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
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
