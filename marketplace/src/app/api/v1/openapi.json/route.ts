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
    security: [
      { bearerAuth: [] },
      { oauth2: ['agents:read', 'agents:execute', 'balance:read'] },
    ],
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
      '/api/v1/prompts': {
        get: {
          operationId: 'listPrompts',
          summary: '프롬프트 라이브러리 목록 조회',
          description: '공개된 시스템 프롬프트 모음을 조회합니다. 인증 불필요.',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: '검색어 (제목/설명/태그)' },
            { name: 'category', in: 'query', schema: { type: 'string' }, description: '카테고리 필터' },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20, maximum: 100 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': successResponse('프롬프트 목록', {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_featured: { type: 'boolean' },
                    use_count: { type: 'integer' },
                    like_count: { type: 'integer' },
                  },
                },
              },
            }),
          },
          security: [],
        },
        post: {
          operationId: 'createPrompt',
          summary: '새 프롬프트 등록',
          description: '인증된 사용자가 새 프롬프트를 라이브러리에 등록합니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'description', 'system_prompt'],
                  properties: {
                    slug: { type: 'string', description: '슬러그 (생략 시 자동 생성)' },
                    title: { type: 'string' },
                    title_ko: { type: 'string' },
                    description: { type: 'string' },
                    description_ko: { type: 'string' },
                    system_prompt: { type: 'string', description: '시스템 프롬프트 본문' },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    example_input: { type: 'string' },
                    example_output: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            '201': successResponse('생성된 프롬프트', {
              id: { type: 'string' },
              slug: { type: 'string' },
              title: { type: 'string' },
              category: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['prompts:write'] }],
        },
      },
      '/api/v1/prompts/{slug}': {
        get: {
          operationId: 'getPrompt',
          summary: '프롬프트 상세 조회',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': successResponse('프롬프트 상세', {
              id: { type: 'string' },
              slug: { type: 'string' },
              title: { type: 'string' },
              description: { type: 'string' },
              system_prompt: { type: 'string' },
              category: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              example_input: { type: 'string' },
              example_output: { type: 'string' },
              use_count: { type: 'integer' },
              like_count: { type: 'integer' },
            }),
          },
          security: [],
        },
      },
      '/api/v1/prompts/{slug}/run': {
        post: {
          operationId: 'runPrompt',
          summary: '프롬프트 실행',
          description: '프롬프트의 system_prompt + 사용자 입력으로 Claude를 호출합니다. 결과는 prompt_runs 에 기록됩니다.',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: '실행 입력' },
                    model: { type: 'string', enum: ['sonnet', 'opus', 'haiku'], description: '모델 선택 (기본 sonnet)' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('실행 결과', {
              run_id: { type: 'string' },
              slug: { type: 'string' },
              output: { type: 'string' },
              duration_ms: { type: 'integer' },
            }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['prompts:execute'] }],
        },
      },
      '/api/v1/workflows': {
        get: {
          operationId: 'listWorkflows',
          summary: '워크플로우 목록 조회',
          description: '공개된 비주얼 워크플로우 목록을 조회합니다.',
          parameters: [
            { name: 'q', in: 'query', schema: { type: 'string' }, description: '검색어' },
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            '200': successResponse('워크플로우 목록', {
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    slug: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    category: { type: 'string' },
                    use_count: { type: 'integer' },
                    node_count: { type: 'integer' },
                  },
                },
              },
              total: { type: 'integer' },
            }),
          },
          security: [],
        },
        post: {
          operationId: 'createWorkflow',
          summary: '워크플로우 등록',
          description: '인증된 사용자가 새 비주얼 워크플로우를 등록합니다.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'definition'],
                  properties: {
                    slug: { type: 'string' },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    definition: {
                      type: 'object',
                      required: ['nodes', 'edges'],
                      properties: {
                        nodes: { type: 'array', items: { type: 'object' } },
                        edges: { type: 'array', items: { type: 'object' } },
                      },
                    },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_public: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '201': successResponse('생성된 워크플로우', {
              id: { type: 'string' },
              slug: { type: 'string' },
              name: { type: 'string' },
            }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['workflows:write'] }],
        },
      },
      '/api/v1/workflows/{slug}': {
        get: {
          operationId: 'getWorkflow',
          summary: '워크플로우 상세 (definition 포함)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': successResponse('워크플로우 상세', {
              id: { type: 'string' },
              slug: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              definition: { type: 'object' },
              category: { type: 'string' },
              tags: { type: 'array', items: { type: 'string' } },
              use_count: { type: 'integer' },
            }),
          },
          security: [],
        },
        patch: {
          operationId: 'updateWorkflow',
          summary: '워크플로우 수정 (소유자만)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    definition: { type: 'object' },
                    category: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    is_public: { type: 'boolean' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('수정 완료', { slug: { type: 'string' }, name: { type: 'string' } }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['workflows:write'] }],
        },
        delete: {
          operationId: 'deleteWorkflow',
          summary: '워크플로우 삭제 (소유자만)',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            '200': successResponse('삭제 완료', { deleted: { type: 'boolean' } }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['workflows:write'] }],
        },
      },
      '/api/v1/workflows/{slug}/run': {
        post: {
          operationId: 'runWorkflow',
          summary: '워크플로우 실행',
          description: '입력값을 받아 노드 그래프를 토포로지 순서로 실행합니다. 결과는 workflow_runs 에 기록됩니다.',
          parameters: [{ name: 'slug', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['input'],
                  properties: {
                    input: { type: 'string', description: '워크플로우 시작 입력' },
                  },
                },
              },
            },
          },
          responses: {
            '200': successResponse('실행 결과', {
              run_id: { type: 'string' },
              slug: { type: 'string' },
              output: { type: 'string', description: '최종 출력' },
              step_results: { type: 'object', description: '노드별 결과' },
              duration_ms: { type: 'integer' },
            }),
          },
          security: [{ bearerAuth: [] }, { oauth2: ['workflows:execute'] }],
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
          security: [],
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
          security: [],
        },
      },
    },
    components: {
      schemas: {},
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'OpenAgentX API Key (oax_로 시작) 또는 OAuth access token (oac_at_/oax_at_).',
        },
        oauth2: {
          type: 'oauth2',
          description: 'ChatGPT Custom GPT Actions 호환 OAuth 2.0 Authorization Code flow.',
          flows: {
            authorizationCode: {
              authorizationUrl: 'https://openagentx.org/oauth/authorize',
              tokenUrl: 'https://openagentx.org/api/oauth/token',
              scopes: {
                'agents:read': '에이전트 목록 조회',
                'agents:execute': '에이전트 실행 (포인트 차감)',
                'balance:read': '잔액 조회',
                'balance:write': '잔액 변경 (충전/차감)',
                'prompts:read': '프롬프트 목록/상세 조회',
                'prompts:execute': '프롬프트 실행 (Claude 호출)',
                'prompts:write': '프롬프트 등록/수정',
                'workflows:read': '워크플로우 목록/상세 조회',
                'workflows:execute': '워크플로우 실행 (Claude 체인 호출)',
                'workflows:write': '워크플로우 등록/수정',
              },
            },
          },
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
