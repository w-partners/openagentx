'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { findSkill } from '@/lib/skills/data';

export default function SkillDetailPage() {
  const params = useParams<{ tool: string }>();
  const skill = findSkill(params.tool);

  if (!skill) {
    return (
      <div className="space-y-4 py-16 text-center">
        <h1 className="text-2xl font-bold">스킬을 찾을 수 없습니다</h1>
        <p className="text-muted-foreground">존재하지 않거나 삭제된 도구입니다.</p>
        <Link href="/skills">
          <Button variant="outline">전체 스킬로</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="space-y-3">
        <Link href="/skills" className="text-sm text-muted-foreground hover:text-foreground">
          ← 전체 스킬
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{skill.icon}</span>
          <div>
            <h1 className="text-3xl font-bold">{skill.label}</h1>
            <Badge variant="outline" className="mt-1 font-mono text-xs">
              {skill.tool}
            </Badge>
          </div>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">{skill.description}</p>
      </div>

      {/* Long description */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">동작 방식</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{skill.longDescription}</p>
        </CardContent>
      </Card>

      {/* Parameters */}
      {skill.params.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">입력 파라미터</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="border-b text-left text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4 font-medium">이름</th>
                  <th className="py-2 pr-4 font-medium">타입</th>
                  <th className="py-2 pr-4 font-medium">필수</th>
                  <th className="py-2 font-medium">설명</th>
                </tr>
              </thead>
              <tbody>
                {skill.params.map((p) => (
                  <tr key={p.name} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{p.name}</td>
                    <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{p.type}</td>
                    <td className="py-2 pr-4 text-xs">
                      {p.required ? <Badge variant="default" className="text-[10px]">필수</Badge> : <span className="text-muted-foreground">선택</span>}
                    </td>
                    <td className="py-2 text-muted-foreground">{p.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Examples */}
      {skill.examples.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">호출 예시</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {skill.examples.map((ex, i) => (
              <div key={i} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">요청</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">
                  <code>{JSON.stringify(ex.request, null, 2)}</code>
                </pre>
                <p className="text-xs font-medium text-muted-foreground">응답</p>
                <pre className="overflow-x-auto rounded-md border bg-muted/50 p-3 text-xs">
                  <code>{JSON.stringify(ex.response, null, 2)}</code>
                </pre>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-5">
          <p className="font-medium">사용해보려면 OpenAgentX MCP를 설치하세요</p>
          <p className="text-sm text-muted-foreground">
            Claude Code/OpenClaw에 설치하면 위 도구를 자연어로 바로 호출할 수 있습니다.
          </p>
          <Link href="/skills">
            <Button>설치 가이드 보기</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
