import { NextResponse } from 'next/server';

/**
 * DEPRECATED — /.well-known/agent-card 는 /.well-known/agent.json으로 통합됨.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.4 (결정 14)
 *   "중복 agent-card/route.ts는 제거. agent.json이 정본."
 *
 * 기존 외부 호출자 호환을 위해 308 영구 리다이렉트.
 * Phase GA 이후 본 파일 완전 제거 예정.
 */
export function GET(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/.well-known/agent.json';
  return NextResponse.redirect(url, 308);
}
