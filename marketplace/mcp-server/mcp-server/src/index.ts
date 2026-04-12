#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAgentXClient } from './client.js';
import { TOOLS } from './tools.js';

const apiKey = process.env.OPENAGENTX_API_KEY;
if (!apiKey) {
  console.error('OPENAGENTX_API_KEY 환경변수가 필요합니다');
  console.error('');
  console.error('사용법:');
  console.error('  1. https://openagentx.org 에서 회원가입');
  console.error('  2. 프로필 > API Keys 에서 키 발급');
  console.error('  3. OPENAGENTX_API_KEY=oax_xxxx 환경변수 설정');
  process.exit(1);
}

const client = new OpenAgentXClient(apiKey);

const server = new Server(
  {
    name: 'openagentx',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// ListTools handler
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

// CallTool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_agents': {
        const result = await client.listAgents();
        if (!result.success) {
          return {
            content: [{ type: 'text', text: `에러: ${result.error || '조회 실패'}` }],
            isError: true,
          };
        }
        // Format agents for readability
        const agentList = (result.data || [])
          .map(
            (a) =>
              `- **${a.name}** (ID: ${a.id})\n  ${a.description}\n  가격: ${a.pricePoints}P | 태그: ${a.tags.join(', ')}`,
          )
          .join('\n\n');
        return {
          content: [
            {
              type: 'text',
              text: agentList || '사용 가능한 에이전트가 없습니다.',
            },
          ],
        };
      }

      case 'execute_agent': {
        const { agentId, input } = args as { agentId: string; input: string };
        if (!agentId || !input) {
          return {
            content: [{ type: 'text', text: '에러: agentId와 input은 필수입니다' }],
            isError: true,
          };
        }
        const result = await client.executeAgent(agentId, input);
        if (result.success && result.data) {
          if (result.data.status === 'completed' && result.data.result) {
            return {
              content: [
                {
                  type: 'text',
                  text: `${result.data.result}\n\n---\njobId: ${result.data.jobId} | 사용 포인트: ${result.data.usedPoints}P`,
                },
              ],
            };
          }
          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }
        return {
          content: [
            { type: 'text', text: `에러: ${result.error || '실행 실패'}` },
          ],
          isError: true,
        };
      }

      case 'check_result': {
        const { jobId } = args as { jobId: string };
        if (!jobId) {
          return {
            content: [{ type: 'text', text: '에러: jobId는 필수입니다' }],
            isError: true,
          };
        }
        const result = await client.getResult(jobId);
        if (result.success && result.data) {
          return {
            content: [{ type: 'text', text: JSON.stringify(result.data, null, 2) }],
          };
        }
        return {
          content: [
            { type: 'text', text: `에러: ${result.error || '조회 실패'}` },
          ],
          isError: true,
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `알 수 없는 도구: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `에러: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('MCP Server 시작 실패:', error);
  process.exit(1);
});
