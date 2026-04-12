import { NextRequest } from 'next/server';
import { apiJson } from '@/lib/utils/api-response';
import { validatePartnerKey } from '@/lib/auth/partner-auth';
import { DEFAULT_AGENTS } from '@/lib/partner/agents';

export async function GET(request: NextRequest) {
  const auth = validatePartnerKey(request);
  if (!auth.valid) {
    return apiJson({ error: '유효하지 않은 파트너 키입니다' }, 401);
  }

  // TODO: DB에 agent_services 테이블이 생기면 활성 에이전트 조회로 교체
  const agents = DEFAULT_AGENTS;

  return apiJson({
    data: agents,
    meta: { total: agents.length, partner: auth.partner },
  });
}
