import { NextRequest } from 'next/server';
import { apiJson, apiError, AuthError } from '@/lib/utils/api-response';
import { requireAdmin, ForbiddenError } from '@/lib/auth/require-admin';
import { query } from '@/lib/db/pool';

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS gpt_config (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      config_key VARCHAR(50) UNIQUE NOT NULL,
      config_value TEXT NOT NULL,
      updated_by UUID,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

const DEFAULT_CONFIG: Record<string, string | string[]> = {
  name: 'OpenAgentX',
  description:
    'AI 에이전트 마켓플레이스 - SNS 콘텐츠 생성, 마케팅 분석, 포스팅 최적화 등을 제공합니다.',
  instructions: `당신은 OpenAgentX의 AI 에이전트 어시스턴트입니다.

사용자가 요청하면:
1. 먼저 listAgents를 호출하여 사용 가능한 에이전트를 확인합니다.
2. 사용자의 요청에 가장 적합한 에이전트를 추천합니다.
3. 사용자가 동의하면 executeAgent를 호출하여 에이전트를 실행합니다.
4. 결과를 보기 좋게 정리하여 사용자에게 전달합니다.

사용 가능한 에이전트:
- SNS 콘텐츠 크리에이터 (100P): SNS 플랫폼별 최적화 텍스트 콘텐츠 생성
- 마케팅 분석가 (200P): SNS 마케팅 전략 분석 및 개선 방안
- 포스팅 최적화 도우미 (150P): 크로스 포스팅, 플랫폼별 변환
- 계정 성장 어드바이저 (300P): 팔로워 성장 전략 수립
- 피드 분석기 (200P): 피드 시각 분석, 콘텐츠 믹스 평가

포인트가 부족하면 https://openagentx.org에서 충전하라고 안내합니다.
한국어로 친절하게 답변합니다.`,
  logoUrl: '',
  privacyPolicyUrl: 'https://openagentx.org/privacy',
  authType: 'bearer',
  apiBaseUrl: 'https://openagentx.org',
  welcomeMessage: `안녕하세요! OpenAgentX 에이전트 어시스턴트입니다.

SNS 마케팅에 도움이 필요하신가요?
- 콘텐츠 작성
- 마케팅 분석
- 계정 성장 전략
- 피드 최적화

무엇을 도와드릴까요?`,
  samplePrompts: [
    '인스타그램용 카페 홍보글 작성해줘',
    '우리 SNS 계정 마케팅 전략을 분석해줘',
    '블로그 글을 인스타/스레드/X에 맞게 변환해줘',
    '팔로워 1만명 성장 전략을 알려줘',
  ],
};

/**
 * GET /api/admin/gpt-config — 현재 GPT 설정 조회
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    await ensureTable();

    const result = await query<{ config_key: string; config_value: string }>(
      'SELECT config_key, config_value FROM gpt_config',
    );

    const config: Record<string, unknown> = { ...DEFAULT_CONFIG };
    for (const row of result.rows) {
      try {
        config[row.config_key] = JSON.parse(row.config_value);
      } catch {
        config[row.config_key] = row.config_value;
      }
    }

    return apiJson({ config });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

/**
 * PUT /api/admin/gpt-config — GPT 설정 수정 (관리자만)
 */
export async function PUT(request: NextRequest) {
  try {
    const userId = await requireAdmin(request);
    await ensureTable();

    const body = await request.json();
    const { config } = body as { config: Record<string, unknown> };

    if (!config || typeof config !== 'object') {
      return apiError('config 객체가 필요합니다');
    }

    const allowedKeys = [
      'name',
      'description',
      'instructions',
      'logoUrl',
      'privacyPolicyUrl',
      'authType',
      'apiBaseUrl',
      'welcomeMessage',
      'samplePrompts',
    ];

    for (const [key, value] of Object.entries(config)) {
      if (!allowedKeys.includes(key)) continue;

      const serialized = typeof value === 'string' ? value : JSON.stringify(value);

      await query(
        `INSERT INTO gpt_config (config_key, config_value, updated_by, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (config_key) DO UPDATE
         SET config_value = $2, updated_by = $3, updated_at = NOW()`,
        [key, serialized, userId],
      );
    }

    return apiJson({ message: 'GPT 설정이 업데이트되었습니다' });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    if (err instanceof ForbiddenError) return apiError(err.message, 403);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
