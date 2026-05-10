#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { OpenAgentXClient } from './client.js';
import { FALLBACK_TOOLS } from './tools.js';

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
  { name: 'openagentx', version: '0.2.0' },
  { capabilities: { tools: {} } },
);

// ListTools: HTTP MCP 서버에 위임 (실패 시 fallback 정적 정의)
server.setRequestHandler(ListToolsRequestSchema, async () => {
  try {
    const tools = (await client.listTools()) as Tool[];
    return { tools: tools.length > 0 ? tools : FALLBACK_TOOLS };
  } catch {
    return { tools: FALLBACK_TOOLS };
  }
});

// CallTool: HTTP MCP 서버로 그대로 forward
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await client.callTool(name, args ?? {});
    const r = result as { content?: unknown[] } | undefined;
    if (r?.content) {
      return { content: r.content };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `에러: ${message}` }],
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
