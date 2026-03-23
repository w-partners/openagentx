/**
 * Dynamic Agent Factory
 * 외부 AI가 요청한 서비스가 없을 때, AI를 사용하여 즉석에서 에이전트를 생성하고 결과를 제공.
 * 성공적인 응답은 재사용 가능한 에이전트 템플릿으로 DB에 저장.
 */
import { generateResponse } from '../ai/fallback-chain';
import { query } from '../db/pool';
import { getCurrentPrompt, recordPromptUsage, selectModel } from '../quality/prompt-optimizer';

export interface DynamicResult {
  response: string;
  provider: 'claude' | 'gemini' | 'ollama' | 'static';
  category: string;
  confidence: number;
  processingMs: number;
  promptId?: string;
}

interface SavedTemplate {
  id: string;
  slug: string;
}

const DYNAMIC_SYSTEM_PROMPT = `당신은 OpenAgentX 마켓플레이스의 AI 에이전트입니다.
요청을 분석하고 포괄적이고 전문적인 응답을 제공하세요.
데이터, 분석, 실행 가능한 인사이트를 포함하세요.

응답 형식:
1. 요약 (2-3문장)
2. 상세 분석
3. 핵심 인사이트 (리스트)
4. 추천 액션

전문적이고 데이터 중심으로 응답하세요. 한국어로 응답하세요.`;

/** 카테고리 키워드 매핑 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  defi: ['defi', 'yield', 'aave', 'compound', 'lending', 'staking', 'liquidity', 'swap', 'dex'],
  nft: ['nft', 'collection', 'floor', 'opensea', 'blur', 'mint'],
  token: ['token', 'price', 'market cap', 'volume', 'trading', 'coin'],
  security: ['audit', 'security', 'vulnerability', 'exploit', 'hack', 'scam', 'rug'],
  analytics: ['analytics', 'analysis', 'report', 'data', 'chart', 'trend', 'metrics'],
  general: ['help', 'recommend', 'suggest', 'what', 'how', 'explain'],
};

function detectCategory(queryText: string): string {
  const lower = queryText.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return 'general';
}

function estimateConfidence(queryText: string, category: string): number {
  const lower = queryText.toLowerCase();
  let score = 0.5;

  // 구체적인 키워드가 많을수록 높은 신뢰도
  const matchingKeywords = CATEGORY_KEYWORDS[category] ?? [];
  const matches = matchingKeywords.filter((kw) => lower.includes(kw)).length;
  score += Math.min(matches * 0.1, 0.3);

  // 질문 길이 — 상세한 요청은 더 좋은 결과
  if (queryText.length > 50) score += 0.1;
  if (queryText.length > 100) score += 0.05;

  return Math.min(score, 0.95);
}

/**
 * 요청을 동적으로 처리할 수 있는지 확인
 */
export async function canFulfillDynamically(queryText: string): Promise<boolean> {
  if (!queryText || queryText.trim().length < 3) return false;

  // 금지 패턴 — 개인정보, 불법 요청 등
  const blocked = ['password', 'private key', 'seed phrase', 'hack this', 'exploit this'];
  const lower = queryText.toLowerCase();
  if (blocked.some((b) => lower.includes(b))) return false;

  return true;
}

/**
 * 등록된 에이전트의 시스템 프롬프트를 조회
 */
export async function getAgentSystemPrompt(agentId: string): Promise<string | null> {
  const result = await query<{ metadata: Record<string, unknown> | null }>(
    `SELECT metadata FROM agents WHERE id = $1 AND status = 'active'`,
    [agentId],
  );
  const meta = result.rows[0]?.metadata;
  if (meta && typeof meta.system_prompt === 'string') {
    return meta.system_prompt;
  }
  return null;
}

/**
 * AI를 사용하여 요청을 동적으로 처리
 */
export async function fulfillDynamically(
  queryText: string,
  input: Record<string, unknown> = {},
  options?: { agentId?: string; serviceName?: string },
): Promise<DynamicResult> {
  const start = Date.now();
  const category = detectCategory(queryText);
  const confidence = estimateConfidence(queryText, category);

  // 1. 최적화된 프롬프트 버전 확인
  let systemPrompt = DYNAMIC_SYSTEM_PROMPT;
  let activePromptId: string | null = null;

  const optimizedPrompt = await getCurrentPrompt(
    options?.agentId,
    options?.serviceName,
    category,
  ).catch(() => null);

  if (optimizedPrompt) {
    systemPrompt = optimizedPrompt.systemPrompt;
    activePromptId = optimizedPrompt.id;
    // 프롬프트 사용 기록
    recordPromptUsage(optimizedPrompt.id).catch(() => {});
  } else if (options?.agentId) {
    // 등록된 에이전트의 전용 시스템 프롬프트 사용
    const agentPrompt = await getAgentSystemPrompt(options.agentId);
    if (agentPrompt) {
      systemPrompt = agentPrompt;
    }
  }

  // 2. 모델 선택 (복잡도 기반)
  const _modelRec = selectModel(queryText, category);

  const contextParts: string[] = [`요청: ${queryText}`];
  if (Object.keys(input).length > 0) {
    contextParts.push(`추가 입력: ${JSON.stringify(input)}`);
  }
  if (options?.serviceName) {
    contextParts.push(`서비스: ${options.serviceName}`);
  }
  contextParts.push(`감지된 카테고리: ${category}`);

  const { text, provider } = await generateResponse({
    systemPrompt,
    userMessage: contextParts.join('\n'),
    maxTokens: 2048,
  });

  return {
    response: text,
    provider,
    category,
    confidence,
    processingMs: Date.now() - start,
    promptId: activePromptId ?? undefined,
  };
}

/**
 * 성공적인 동적 응답을 재사용 가능한 에이전트 템플릿으로 DB에 저장
 */
export async function saveAsTemplate(
  queryText: string,
  result: DynamicResult,
): Promise<SavedTemplate> {
  const slug = queryText
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 60);

  const templateId = `dyn-${Date.now().toString(36)}`;

  await query(
    `INSERT INTO dynamic_agent_templates (id, slug, query, category, response_preview, provider, confidence, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (slug) DO UPDATE SET
       query = EXCLUDED.query,
       confidence = EXCLUDED.confidence,
       updated_at = NOW()`,
    [
      templateId,
      slug,
      queryText,
      result.category,
      result.response.slice(0, 500),
      result.provider,
      result.confidence,
    ],
  );

  return { id: templateId, slug };
}

/**
 * 기존 템플릿에서 매칭되는 에이전트 검색
 */
export async function findMatchingTemplate(
  queryText: string,
): Promise<{ id: string; slug: string; response_preview: string } | null> {
  const category = detectCategory(queryText);

  const result = await query<{
    id: string;
    slug: string;
    response_preview: string;
  }>(
    `SELECT id, slug, response_preview
     FROM dynamic_agent_templates
     WHERE category = $1
       AND similarity(query, $2) > 0.3
     ORDER BY similarity(query, $2) DESC
     LIMIT 1`,
    [category, queryText],
  );

  return result.rows[0] ?? null;
}
