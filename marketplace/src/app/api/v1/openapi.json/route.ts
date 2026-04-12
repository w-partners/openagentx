import { NextResponse } from 'next/server';

const successResponse = (desc: string, dataProps: Record<string, unknown>) => ({
  description: desc,
  content: {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: { type: 'object', properties: dataProps },
        },
      },
    },
  },
});

export async function GET() {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: 'OpenAgentX API',
      description: 'AI 에이전트 마켓플레이스 - 누구나 AI 에이전트를 만들어 판매하고, 포인트로 사용할 수 있습니다.',
      version: '1.0.0',
      contact: { name: 'OpenAgentX', url: 'https://openagentx.org' },
    },
    servers: [{ url: 'https://openagentx.org', description: 'Production' }],
    paths: {
      '/api/v1/agents': {
        get: {
          operationId: 'listAgents',
          summary: '사용 가능한 AI 에이전트 목록 조회',
          description: '마켓플레이스에 등록된 모든 에이전트를 조회합니다.',
          responses: {
            '200': successResponse('에이전트 목록', {
              agents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    pricePoints: { type: 'integer' },
                    tags: { type: 'array', items: { type: 'string' } },
                    capabilities: { type: 'array', items: { type: 'string' } },
                    sampleInput: { type: 'string' },
                    sampleOutput: { type: 'string' },
                  },
                },
              },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/execute': {
        post: {
          operationId: 'executeAgent',
          summary: 'AI 에이전트 실행',
          description: '에이전트를 실행하여 결과를 생성합니다. 포인트가 자동 차감됩니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['agentId', 'input'],
                  properties: {
                    agentId: { type: 'string', description: '에이전트 ID' },
                    input: { type: 'string', description: '요청 내용' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('실행 결과', {
              jobId: { type: 'string' },
              status: { type: 'string', enum: ['completed', 'processing', 'failed'] },
              result: { type: 'string', description: '실행 결과' },
              usedPoints: { type: 'integer' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/result/{jobId}': {
        get: {
          operationId: 'getResult',
          summary: '에이전트 실행 결과 조회',
          parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': successResponse('작업 결과', {
              jobId: { type: 'string' },
              status: { type: 'string' },
              result: { type: 'string' },
              usedPoints: { type: 'integer' },
              completedAt: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/create': {
        post: {
          operationId: 'createAgent',
          summary: '새 AI 에이전트 생성',
          description: '새 에이전트를 만들어 마켓플레이스에 등록합니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'systemPrompt'],
                  properties: {
                    name: { type: 'string', description: '에이전트 이름' },
                    description: { type: 'string', description: '설명' },
                    systemPrompt: { type: 'string', description: '시스템 프롬프트' },
                    category: { type: 'string', description: '카테고리' },
                    pricePoints: { type: 'integer', description: '가격 (기본 100P)' },
                    tags: { type: 'array', items: { type: 'string' } },
                    capabilities: { type: 'array', items: { type: 'string' } },
                    sampleInput: { type: 'string' },
                    sampleOutput: { type: 'string' },
                    githubRepo: { type: 'string' },
                    referenceUrls: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '201': successResponse('생성된 에이전트', {
              id: { type: 'string' },
              name: { type: 'string' },
              status: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/generate': {
        post: {
          operationId: 'generateAgent',
          summary: 'AI 기반 에이전트 초안 자동 생성',
          description: 'GitHub 레포나 참고자료를 분석하여 에이전트 초안을 자동 생성합니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['description'],
                  properties: {
                    description: { type: 'string', description: '에이전트 요구사항' },
                    githubRepo: { type: 'string' },
                    referenceUrls: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('자동 생성된 초안', {
              name: { type: 'string' },
              description: { type: 'string' },
              systemPrompt: { type: 'string' },
              category: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              capabilities: { type: 'array', items: { type: 'string' } },
              sampleInput: { type: 'string' },
              sampleOutput: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/my': {
        get: {
          operationId: 'myAgents',
          summary: '내가 만든 에이전트 목록',
          responses: {
            '200': successResponse('에이전트 목록', {
              agents: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                    status: { type: 'string' },
                    usageCount: { type: 'integer' },
                    pricePoints: { type: 'integer' },
                  },
                },
              },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/agents/{id}': {
        put: {
          operationId: 'updateAgent',
          summary: '에이전트 수정',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    systemPrompt: { type: 'string' },
                    pricePoints: { type: 'integer' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('수정 완료', { id: { type: 'string' }, name: { type: 'string' } }),
          },
          security: [{ bearerAuth: [] }],
        },
        delete: {
          operationId: 'deleteAgent',
          summary: '에이전트 삭제',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': successResponse('삭제 완료', { deleted: { type: 'boolean' } }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/balance': {
        get: {
          operationId: 'checkBalance',
          summary: '포인트 잔액 확인',
          responses: {
            '200': successResponse('잔액 정보', {
              balance: { type: 'number', description: '포인트 잔액' },
              currency: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/charge/pin': {
        post: {
          operationId: 'chargeWithPin',
          summary: 'PIN으로 포인트 충전',
          description: 'PIN을 입력하여 포인트를 충전합니다. 10% 보너스 포함.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount', 'pin'],
                  properties: {
                    amount: { type: 'integer', minimum: 1000, maximum: 1000000, description: '충전 금액 (원)' },
                    pin: { type: 'string', description: '결제 PIN (4~6자리)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('충전 결과', {
              amount: { type: 'integer' },
              points: { type: 'integer', description: '충전된 포인트' },
              balance: { type: 'number', description: '현재 잔액' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/charge/request': {
        post: {
          operationId: 'chargeRequest',
          summary: '계좌이체 충전 요청',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['amount'],
                  properties: {
                    amount: { type: 'integer', description: '충전 금액 (원)' },
                  },
                },
              },
            },
          },
          responses: {
            '201': successResponse('충전 요청 정보', {
              requestId: { type: 'string' },
              bankInfo: { type: 'string' },
              amount: { type: 'integer' },
              expectedPoints: { type: 'integer' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/charge/redeem': {
        post: {
          operationId: 'redeemCode',
          summary: '충전 코드 사용',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['code'],
                  properties: {
                    code: { type: 'string', description: '충전 코드' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('충전 결과', {
              points: { type: 'integer', description: '충전된 포인트' },
              balance: { type: 'number' },
            }),
          },
          security: [{ bearerAuth: [] }],
        },
      },
      '/api/v1/auth/code': {
        post: {
          operationId: 'sendAuthCode',
          summary: '인증코드 발송',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email'],
                  properties: {
                    email: { type: 'string', format: 'email', description: '이메일' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('발송 결과', {
              sent: { type: 'boolean' },
              expiresIn: { type: 'integer', description: '만료 시간(초)' },
            }),
          },
        },
      },
      '/api/v1/auth/verify': {
        post: {
          operationId: 'verifyAuthCode',
          summary: '인증코드 확인 + API Key 발급',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'code'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    code: { type: 'string', description: '6자리 인증코드' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('API Key 발급', {
              apiKey: { type: 'string', description: 'API Key (한 번만 표시)' },
              userId: { type: 'string' },
            }),
          },
        },
      },
    },
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'OpenAgentX API Key (oax_로 시작). 프로필 페이지에서 발급.',
        },
      },
    },
  };

  return NextResponse.json(spec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    },
  });
}
