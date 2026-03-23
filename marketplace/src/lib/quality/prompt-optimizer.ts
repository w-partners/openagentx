/**
 * 프롬프트 최적화 시스템
 * 피드백 기반으로 시스템 프롬프트를 자동 개선하고 버전 관리
 */
import { query } from '../db/pool';
import { generateResponse } from '../ai/fallback-chain';
import { getLowRatedResponses, getCategoriesNeedingImprovement } from './feedback';

export interface PromptVersion {
  id: string;
  agentId: string | null;
  serviceName: string | null;
  category: string | null;
  systemPrompt: string;
  version: number;
  avgRating: number;
  totalUses: number;
  isActive: boolean;
  createdAt: Date;
}

export interface ModelRecommendation {
  model: 'claude' | 'gemini-flash' | 'ollama';
  reason: string;
}

/**
 * 현재 활성 프롬프트 조회
 */
export async function getCurrentPrompt(
  agentId?: string,
  serviceName?: string,
  category?: string,
): Promise<PromptVersion | null> {
  // agentId가 있으면 에이전트 전용 프롬프트 우선 조회
  if (agentId) {
    const result = await query<{
      id: string;
      agent_id: string;
      service_name: string;
      category: string;
      system_prompt: string;
      version: number;
      avg_rating: string;
      total_uses: number;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT * FROM prompt_versions
       WHERE agent_id = $1 AND is_active = true
       ${serviceName ? 'AND service_name = $2' : ''}
       ORDER BY version DESC LIMIT 1`,
      serviceName ? [agentId, serviceName] : [agentId],
    );

    if (result.rows.length > 0) {
      return mapPromptRow(result.rows[0]);
    }
  }

  // 카테고리 기반 공통 프롬프트 조회
  if (category) {
    const result = await query<{
      id: string;
      agent_id: string;
      service_name: string;
      category: string;
      system_prompt: string;
      version: number;
      avg_rating: string;
      total_uses: number;
      is_active: boolean;
      created_at: Date;
    }>(
      `SELECT * FROM prompt_versions
       WHERE category = $1 AND agent_id IS NULL AND is_active = true
       ORDER BY version DESC LIMIT 1`,
      [category],
    );

    if (result.rows.length > 0) {
      return mapPromptRow(result.rows[0]);
    }
  }

  return null;
}

function mapPromptRow(r: {
  id: string;
  agent_id: string;
  service_name: string;
  category: string;
  system_prompt: string;
  version: number;
  avg_rating: string;
  total_uses: number;
  is_active: boolean;
  created_at: Date;
}): PromptVersion {
  return {
    id: r.id,
    agentId: r.agent_id,
    serviceName: r.service_name,
    category: r.category,
    systemPrompt: r.system_prompt,
    version: r.version,
    avgRating: parseFloat(r.avg_rating) || 0,
    totalUses: r.total_uses,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

/**
 * 프롬프트 사용 기록 + 평점 업데이트
 */
export async function recordPromptUsage(promptId: string, rating?: number): Promise<void> {
  if (rating) {
    await query(
      `UPDATE prompt_versions
       SET total_uses = total_uses + 1,
           avg_rating = (avg_rating * total_uses + $2) / (total_uses + 1)
       WHERE id = $1`,
      [promptId, rating],
    );
  } else {
    await query(
      `UPDATE prompt_versions SET total_uses = total_uses + 1 WHERE id = $1`,
      [promptId],
    );
  }
}

/**
 * 카테고리 기반 프롬프트 자동 개선
 * 낮은 평점과 높은 평점 응답을 비교하여 AI가 개선된 프롬프트 생성
 */
export async function analyzeAndImprove(category: string): Promise<{
  improved: boolean;
  newVersion?: number;
  reason: string;
}> {
  // 낮은 평점 응답 수집 (해당 카테고리)
  const lowRated = await query<{ fulfill_query: string; rating: number }>(
    `SELECT fulfill_query, rating FROM response_feedback
     WHERE response_category = $1 AND rating <= 2 AND fulfill_query IS NOT NULL
     ORDER BY created_at DESC LIMIT 10`,
    [category],
  );

  // 높은 평점 응답 수집 (해당 카테고리)
  const highRated = await query<{ fulfill_query: string; rating: number }>(
    `SELECT fulfill_query, rating FROM response_feedback
     WHERE response_category = $1 AND rating >= 4 AND fulfill_query IS NOT NULL
     ORDER BY created_at DESC LIMIT 10`,
    [category],
  );

  if (lowRated.rows.length < 3) {
    return { improved: false, reason: `${category} 카테고리에 충분한 낮은 평점 데이터가 없습니다.` };
  }

  // 현재 프롬프트 가져오기
  const currentPrompt = await getCurrentPrompt(undefined, undefined, category);
  const currentSystemPrompt = currentPrompt?.systemPrompt ?? getDefaultPromptForCategory(category);

  // AI를 사용하여 개선된 프롬프트 생성
  const metaPrompt = `당신은 AI 시스템 프롬프트 최적화 전문가입니다.
아래 데이터를 분석하여 개선된 시스템 프롬프트를 생성하세요.

## 현재 시스템 프롬프트
${currentSystemPrompt}

## 낮은 평점 받은 요청들 (개선 필요)
${lowRated.rows.map((r) => `- [평점 ${r.rating}] ${r.fulfill_query}`).join('\n')}

## 높은 평점 받은 요청들 (참고)
${highRated.rows.map((r) => `- [평점 ${r.rating}] ${r.fulfill_query}`).join('\n')}

## 지침
1. 낮은 평점 요청에서 패턴을 분석하세요
2. 높은 평점 요청의 성공 요인을 파악하세요
3. 개선된 시스템 프롬프트를 작성하세요
4. 한국어로 작성하세요
5. 프롬프트만 출력하세요 (설명 없이)`;

  const { text: improvedPrompt } = await generateResponse({
    systemPrompt: '시스템 프롬프트 최적화 전문가. 개선된 프롬프트만 출력.',
    userMessage: metaPrompt,
    maxTokens: 2048,
  });

  if (!improvedPrompt || improvedPrompt.length < 50) {
    return { improved: false, reason: '개선된 프롬프트 생성에 실패했습니다.' };
  }

  // 기존 프롬프트 비활성화
  await query(
    `UPDATE prompt_versions SET is_active = false
     WHERE category = $1 AND agent_id IS NULL AND is_active = true`,
    [category],
  );

  // 새 버전 번호
  const versionResult = await query<{ max_version: number }>(
    `SELECT COALESCE(MAX(version), 0) as max_version FROM prompt_versions
     WHERE category = $1 AND agent_id IS NULL`,
    [category],
  );
  const newVersion = (versionResult.rows[0].max_version ?? 0) + 1;

  // 새 프롬프트 저장
  await query(
    `INSERT INTO prompt_versions (category, system_prompt, version, is_active)
     VALUES ($1, $2, $3, true)`,
    [category, improvedPrompt, newVersion],
  );

  return {
    improved: true,
    newVersion,
    reason: `${category} 카테고리 프롬프트가 v${newVersion}으로 개선되었습니다.`,
  };
}

/**
 * 모델 선택 — 요청 복잡도에 따라 최적 모델 추천
 */
export function selectModel(queryText: string, category?: string): ModelRecommendation {
  const length = queryText.length;
  const lower = queryText.toLowerCase();

  // 복잡한 요청 → claude
  const complexKeywords = ['audit', 'security', 'vulnerability', 'analysis', 'code', 'contract',
    'exploit', 'forensics', '분석', '감사', '보안'];
  const isComplex = complexKeywords.some((kw) => lower.includes(kw));
  const complexCategories = ['security', 'analytics', 'on_chain_forensics'];
  const isComplexCategory = category ? complexCategories.includes(category) : false;

  if (isComplex || isComplexCategory || length > 200) {
    return { model: 'claude', reason: '복잡한 분석 요청 — 고품질 모델 사용' };
  }

  // 단순한 요청 → gemini-flash
  if (length < 50) {
    return { model: 'gemini-flash', reason: '단순 요청 — 빠른 모델 사용' };
  }

  // 기본 → gemini-flash
  return { model: 'gemini-flash', reason: '일반 요청 — 균형 모델 사용' };
}

/**
 * 프롬프트 버전 히스토리 조회
 */
export async function getPromptHistory(
  category?: string,
  agentId?: string,
  limit: number = 20,
): Promise<PromptVersion[]> {
  let whereClause = '';
  const params: unknown[] = [];
  let paramIndex = 1;

  if (category) {
    whereClause += `${whereClause ? ' AND' : 'WHERE'} category = $${paramIndex++}`;
    params.push(category);
  }
  if (agentId) {
    whereClause += `${whereClause ? ' AND' : 'WHERE'} agent_id = $${paramIndex++}`;
    params.push(agentId);
  }

  params.push(limit);

  const result = await query<{
    id: string;
    agent_id: string;
    service_name: string;
    category: string;
    system_prompt: string;
    version: number;
    avg_rating: string;
    total_uses: number;
    is_active: boolean;
    created_at: Date;
  }>(
    `SELECT * FROM prompt_versions ${whereClause}
     ORDER BY created_at DESC LIMIT $${paramIndex}`,
    params,
  );

  return result.rows.map(mapPromptRow);
}

/**
 * 전체 카테고리 자동 개선 실행
 */
export async function runAutoImprovement(): Promise<{
  results: { category: string; improved: boolean; reason: string }[];
}> {
  const categories = await getCategoriesNeedingImprovement(3.0, 10);
  const results: { category: string; improved: boolean; reason: string }[] = [];

  for (const cat of categories) {
    try {
      const result = await analyzeAndImprove(cat.category);
      results.push({ category: cat.category, ...result });
    } catch (err) {
      results.push({
        category: cat.category,
        improved: false,
        reason: `오류 발생: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
      });
    }
  }

  return { results };
}

function getDefaultPromptForCategory(category: string): string {
  const defaults: Record<string, string> = {
    defi: `당신은 DeFi 전문 AI 에이전트입니다. 수익률, 유동성, 프로토콜 분석에 대해 정확하고 데이터 기반의 답변을 제공하세요.`,
    nft: `당신은 NFT 시장 전문 AI 에이전트입니다. 컬렉션 분석, 가격 추이, 트렌드에 대해 전문적으로 답변하세요.`,
    token: `당신은 토큰 분석 전문 AI 에이전트입니다. 가격, 시가총액, 거래량 분석을 정확하게 제공하세요.`,
    security: `당신은 블록체인 보안 전문 AI 에이전트입니다. 스마트 컨트랙트 감사, 취약점 분석을 꼼꼼하게 수행하세요.`,
    analytics: `당신은 데이터 분석 전문 AI 에이전트입니다. 온체인 데이터, 트렌드 분석을 체계적으로 제공하세요.`,
    general: `당신은 OpenAgentX 마켓플레이스의 AI 에이전트입니다. 전문적이고 데이터 중심으로 응답하세요.`,
  };
  return defaults[category] ?? defaults.general;
}
