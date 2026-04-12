import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const TOOLS: Tool[] = [
  {
    name: 'list_agents',
    description:
      'OpenAgentX에서 사용 가능한 AI 에이전트 목록을 조회합니다. 각 에이전트의 이름, 설명, 가격, 기능을 확인할 수 있습니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'execute_agent',
    description:
      'OpenAgentX의 AI 에이전트를 실행합니다. SNS 콘텐츠 생성, 마케팅 분석, 포스팅 최적화, 계정 성장 전략 등을 수행합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: {
          type: 'string',
          description: '실행할 에이전트 ID (list_agents로 확인)',
        },
        input: {
          type: 'string',
          description: '에이전트에게 전달할 요청 내용',
        },
      },
      required: ['agentId', 'input'],
    },
  },
  {
    name: 'check_result',
    description: '이전에 실행한 에이전트 작업의 결과를 조회합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        jobId: {
          type: 'string',
          description: '작업 ID (execute_agent 결과에서 받은 jobId)',
        },
      },
      required: ['jobId'],
    },
  },
  {
    name: 'create_agent',
    description:
      '새로운 AI 에이전트를 생성하여 마켓플레이스에 등록합니다. 이름, 설명, 시스템 프롬프트가 필수입니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: '에이전트 이름' },
        description: { type: 'string', description: '에이전트 설명' },
        systemPrompt: { type: 'string', description: '에이전트 시스템 프롬프트' },
        category: { type: 'string', description: '카테고리 (기본: general)' },
        pricePoints: { type: 'number', description: '포인트 가격 (기본: 100)' },
        tags: { type: 'array', items: { type: 'string' }, description: '태그 목록' },
        capabilities: { type: 'array', items: { type: 'string' }, description: '기능 목록' },
        sampleInput: { type: 'string', description: '예시 입력' },
        sampleOutput: { type: 'string', description: '예시 출력' },
      },
      required: ['name', 'description', 'systemPrompt'],
    },
  },
  {
    name: 'generate_agent',
    description:
      'GitHub 레포나 참고자료를 분석하여 에이전트 설정 초안을 AI가 자동 생성합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        description: { type: 'string', description: '에이전트 설명/요구사항' },
        githubRepo: { type: 'string', description: 'GitHub 레포 URL (선택)' },
        referenceUrls: { type: 'array', items: { type: 'string' }, description: '참고 URL 목록 (선택)' },
      },
      required: ['description'],
    },
  },
  {
    name: 'my_agents',
    description: '내가 만든 에이전트 목록을 조회합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'check_balance',
    description: '현재 포인트 잔액을 확인합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'redeem_code',
    description: '충전 코드를 입력하여 포인트를 충전합니다.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        code: { type: 'string', description: '충전 코드' },
      },
      required: ['code'],
    },
  },
];
