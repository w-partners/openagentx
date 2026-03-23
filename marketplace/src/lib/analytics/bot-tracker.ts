/**
 * AI 봇 분석 미들웨어
 * AI 봇 방문을 추적하고 어떤 엔드포인트에 접근하는지 기록.
 */
import { query } from '../db/pool';

/** 알려진 AI 봇 User-Agent 패턴 */
const AI_BOT_PATTERNS: Record<string, RegExp> = {
  GPTBot: /GPTBot/i,
  ChatGPT: /ChatGPT-User/i,
  ClaudeBot: /ClaudeBot/i,
  PerplexityBot: /PerplexityBot/i,
  GoogleBot: /Googlebot/i,
  GoogleExtended: /Google-Extended/i,
  BingBot: /bingbot/i,
  Anthropic: /anthropic-ai/i,
  Cohere: /cohere-ai/i,
  Meta: /Meta-ExternalAgent/i,
};

export interface BotVisit {
  botName: string;
  userAgent: string;
  path: string;
  method: string;
  statusCode: number;
  ip: string;
  timestamp: Date;
}

/**
 * User-Agent에서 AI 봇 이름 감지
 */
export function detectAiBot(userAgent: string | null): string | null {
  if (!userAgent) return null;

  for (const [name, pattern] of Object.entries(AI_BOT_PATTERNS)) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

/**
 * AI 봇 방문을 DB에 기록
 */
export async function trackBotVisit(visit: BotVisit): Promise<void> {
  try {
    await query(
      `INSERT INTO ai_bot_visits (bot_name, user_agent, path, method, status_code, ip, visited_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        visit.botName,
        visit.userAgent.slice(0, 500),
        visit.path,
        visit.method,
        visit.statusCode,
        visit.ip,
        visit.timestamp,
      ],
    );
  } catch {
    // 트래킹 실패는 요청에 영향 없음 — 조용히 무시
  }
}

/**
 * 봇 방문 통계 조회
 */
export async function getBotStats(days: number = 30): Promise<{
  totalVisits: number;
  byBot: Record<string, number>;
  topPaths: Array<{ path: string; count: number }>;
}> {
  const totalResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM ai_bot_visits WHERE visited_at > NOW() - INTERVAL '1 day' * $1`,
    [days],
  );

  const byBotResult = await query<{ bot_name: string; count: string }>(
    `SELECT bot_name, COUNT(*) as count FROM ai_bot_visits
     WHERE visited_at > NOW() - INTERVAL '1 day' * $1
     GROUP BY bot_name ORDER BY count DESC`,
    [days],
  );

  const topPathsResult = await query<{ path: string; count: string }>(
    `SELECT path, COUNT(*) as count FROM ai_bot_visits
     WHERE visited_at > NOW() - INTERVAL '1 day' * $1
     GROUP BY path ORDER BY count DESC LIMIT 20`,
    [days],
  );

  const byBot: Record<string, number> = {};
  for (const row of byBotResult.rows) {
    byBot[row.bot_name] = parseInt(row.count, 10);
  }

  return {
    totalVisits: parseInt(totalResult.rows[0]?.count ?? '0', 10),
    byBot,
    topPaths: topPathsResult.rows.map((r) => ({
      path: r.path,
      count: parseInt(r.count, 10),
    })),
  };
}
