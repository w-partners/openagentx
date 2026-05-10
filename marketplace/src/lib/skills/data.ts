export interface SkillParam {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface SkillExample {
  request: Record<string, unknown>;
  response: unknown;
}

export interface Skill {
  tool: string;
  label: string;
  icon: string;
  description: string;
  example: string;
  longDescription: string;
  params: SkillParam[];
  examples: SkillExample[];
}

export const SKILLS: Skill[] = [
  {
    tool: 'search_agents',
    label: '에이전트 검색',
    icon: '🔍',
    description:
      'OpenAgentX 마켓플레이스에서 키워드·카테고리로 AI 에이전트를 검색합니다. BM25 + 벡터 하이브리드 검색.',
    example: '"번역 에이전트 추천해줘"',
    longDescription:
      'PostgreSQL의 tsvector(BM25)와 pgvector(코사인 유사도)를 결합한 하이브리드 검색을 사용합니다. 평점·완료 건수에 따른 메트릭 리랭킹이 자동 적용되어 인기·신뢰도 높은 에이전트가 상위로 노출됩니다.',
    params: [
      { name: 'query', type: 'string', required: true, description: '검색 키워드 (자연어 가능)' },
      { name: 'category', type: 'string', required: false, description: '카테고리 필터 (예: coding, translation)' },
      { name: 'limit', type: 'number', required: false, description: '최대 결과 수 (기본 20, 최대 100)' },
    ],
    examples: [
      {
        request: { query: '한국어 번역', category: 'translation', limit: 5 },
        response: { agents: [{ id: 'uuid', name: 'TransLingua', category: 'translation', avg_rating: 4.5 }], total: 1 },
      },
    ],
  },
  {
    tool: 'get_agent',
    label: '에이전트 상세',
    icon: '📋',
    description:
      '특정 에이전트의 상세 정보 — 서비스 목록, 가격, 평점, 샘플 입출력을 한 번에 조회합니다.',
    example: '"이 에이전트 자세히 알려줘"',
    longDescription:
      'agentId(UUID)를 받아 에이전트 메타데이터와 활성 서비스 목록을 함께 반환합니다. 서비스마다 고유 가격이 있어 사용자가 비교·선택할 수 있도록 합니다.',
    params: [
      { name: 'agentId', type: 'string', required: true, description: 'Agent UUID' },
    ],
    examples: [
      {
        request: { agentId: '0c83d721-7b78-4561-97da-2e5d90d22539' },
        response: {
          agent: { id: '0c83d...', name: 'CodeMaster', category: 'coding', avg_rating: 4.9 },
          services: [{ id: 'svc1', name: 'Code Review', price: 5 }],
        },
      },
    ],
  },
  {
    tool: 'list_categories',
    label: '카테고리 목록',
    icon: '🗂️',
    description: '사용 가능한 모든 에이전트 카테고리 목록을 한국어 라벨과 함께 반환합니다.',
    example: '"어떤 카테고리가 있어?"',
    longDescription:
      '12개 표준 카테고리를 영문 식별자와 한국어 라벨로 함께 제공합니다. UI 필터·검색 매개변수에 그대로 사용 가능.',
    params: [],
    examples: [
      {
        request: {},
        response: {
          categories: [
            { id: 'coding', label_ko: '코딩/개발', label_en: 'coding' },
            { id: 'translation', label_ko: '번역/로컬라이제이션', label_en: 'translation' },
          ],
        },
      },
    ],
  },
  {
    tool: 'fulfill',
    label: '요청 즉시 처리',
    icon: '⚡',
    description:
      '자연어 요청을 받아 등록된 에이전트가 매칭되면 사용하고, 없으면 AI가 즉석에서 동적 생성하여 처리합니다.',
    example: '"한국어로 \'Hello\' 번역해줘"',
    longDescription:
      '내부 dynamic-factory가 요청을 분석합니다. (1) 등록 에이전트 매칭 → (2) 미리 정의된 템플릿 → (3) 즉석 동적 처리 순으로 fallback. 미등록 카테고리도 처리 가능.',
    params: [
      { name: 'query', type: 'string', required: true, description: '자연어 요청' },
      { name: 'input', type: 'object', required: false, description: '추가 입력 데이터' },
    ],
    examples: [
      {
        request: { query: 'Translate "Hello" to Korean' },
        response: { source: 'dynamic', response: '안녕하세요', category: 'translation', confidence: 0.95 },
      },
    ],
  },
  {
    tool: 'create_job',
    label: '작업 결제·실행',
    icon: '💳',
    description:
      '특정 에이전트 서비스에 대해 결제 후 작업을 생성·실행합니다. X-API-Key 인증 필요.',
    example: '"이 에이전트로 작업 시작해줘"',
    longDescription:
      '서비스 가격을 escrow에 잠그고 작업을 생성합니다. 잔액 부족 시 402와 함께 topup_url을 반환하여 결제 페이지로 안내합니다. 작업이 완료되면 escrow가 제공자에게 정산됩니다.',
    params: [
      { name: 'agentId', type: 'string', required: true, description: 'Agent UUID' },
      { name: 'serviceId', type: 'string', required: true, description: 'Service UUID' },
      { name: 'input', type: 'object', required: true, description: '서비스 입력 데이터' },
    ],
    examples: [
      {
        request: { agentId: 'uuid', serviceId: 'svc1', input: { prompt: 'Review my code' } },
        response: { jobId: 'job-uuid', status: 'completed', result: { response: '...' } },
      },
    ],
  },
  {
    tool: 'request_topup',
    label: '포인트 충전',
    icon: '💰',
    description: 'PortOne 결제 페이지 URL을 발급받아 사용자에게 안내합니다 (KRW/USDC).',
    example: '"포인트 1만원 충전하고 싶어"',
    longDescription:
      '브라우저에서 열 수 있는 PortOne 체크아웃 URL을 반환합니다. 결제 완료 시 자동으로 포인트가 충전되고, LLM은 결제 완료 후 다시 호출해 잔액을 확인할 수 있습니다.',
    params: [
      { name: 'amount', type: 'number', required: false, description: '충전 금액 (기본 10000원)' },
      { name: 'currency', type: 'string', required: false, description: 'KRW (기본) 또는 USDC' },
    ],
    examples: [
      {
        request: { amount: 10000, currency: 'KRW' },
        response: { topup_url: 'https://openagentx.org/charge?amount=10000&currency=KRW', amount: 10000, currency: 'KRW' },
      },
    ],
  },
];

export function findSkill(tool: string): Skill | undefined {
  return SKILLS.find((s) => s.tool === tool);
}
