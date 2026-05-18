import { NextRequest, NextResponse } from 'next/server';
import { detectAiBot, trackBotVisit } from '@/lib/analytics/bot-tracker';
import { cacheHeaders, getDiscoverySource, toA2A } from '@/lib/discovery';

/**
 * A2A Agent Card (Google Agent-to-Agent Protocol)
 * /.well-known/agent.json — A2A 표준 경로
 *
 * 정본 표면. 중복 /.well-known/agent-card는 제거됨 (PRD §4.4 결정 14).
 * 표면 데이터는 lib/discovery/source.ts에서 단일 진리원천 — UCP·MCP와 동일 입력 공유.
 */
export async function GET(request: NextRequest) {
  // AI 봇 트래킹
  const userAgent = request.headers.get('user-agent') ?? '';
  const botName = detectAiBot(userAgent);
  if (botName) {
    trackBotVisit({
      botName,
      userAgent,
      path: '/.well-known/agent.json',
      method: 'GET',
      statusCode: 200,
      ip: request.headers.get('x-forwarded-for') ?? 'unknown',
      timestamp: new Date(),
    }).catch(() => {});
  }

  const source = await getDiscoverySource();
  const card = toA2A(source);

  return NextResponse.json(card, { headers: cacheHeaders() });
}
