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
];
