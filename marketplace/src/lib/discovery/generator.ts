/**
 * Unified discovery generator — A2A / UCP / MCP 표면을 단일 데이터에서 생성.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.4 (결정 14).
 *
 * 한 곳에서 DB의 agents + agent_capabilities + 마켓 메타를 읽어 3개 라우트로 직렬화:
 *   - GET /.well-known/agent.json    → A2A AgentCard (Google)
 *   - GET /.well-known/ucp           → UCP descriptor (사용자 도메인)
 *   - GET /api/mcp                   → MCP server manifest
 *
 * 중복 /.well-known/agent-card/route.ts는 제거됨 (정본은 agent.json).
 */

import type {
  AgentSkillDescriptor,
  DiscoverySource,
} from './types';

/**
 * 공급 데이터 → A2A AgentCard.
 * A2A 표준: https://github.com/google/A2A
 */
export function toA2A(source: DiscoverySource) {
  return {
    name: source.market.name,
    description: source.market.description,
    url: source.market.url,
    version: source.market.version,
    provider: source.market.provider,

    skills: source.skills.map(toA2ASkill),

    capabilities: {
      streaming: source.market.capabilities.streaming,
      sse: source.market.capabilities.sse,
      pushNotifications: source.market.capabilities.pushNotifications,
    },

    authentication: source.market.authentication,
    securitySchemes: source.market.securitySchemes,
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['application/json'],

    extensions: {
      'openagentx.io/marketplace': {
        catalog: `${source.market.url}/api/agents`,
        trading_models: ['fixed', 'auction', 'matching', 'chain'],
        currencies: source.market.currencies,
        locale: source.market.locale,
      },
    },
  };
}

function toA2ASkill(s: AgentSkillDescriptor) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    endpoint: s.endpoint,
    method: s.method,
    inputModes: s.inputModes ?? ['text/plain'],
    outputModes: s.outputModes ?? ['application/json'],
    examples: s.examples ?? [],
    tags: s.tags ?? [],
  };
}

/**
 * 공급 데이터 → UCP descriptor.
 * UCP = User Context Protocol — 사용자가 도메인을 보면 무엇이 가능한지 선언.
 */
export function toUCP(source: DiscoverySource) {
  return {
    ucp_version: '0.2',
    domain: new URL(source.market.url).host,
    site_name: source.market.name,
    summary: source.market.description,
    locale: source.market.locale,

    actions: source.skills.map((s) => ({
      id: s.id,
      label: s.name,
      description: s.description,
      method: s.method,
      endpoint: s.endpoint,
      params_schema: s.paramsSchema ?? null,
    })),

    authentication: source.market.authentication,
    payment: source.market.payment,
    contact: source.market.provider.contactEmail,
  };
}

/**
 * 공급 데이터 → MCP server manifest.
 * MCP = Model Context Protocol (Anthropic).
 */
export function toMCP(source: DiscoverySource) {
  return {
    name: 'openagentx-marketplace',
    version: source.market.version,
    protocol: 'mcp/0.1',
    description: source.market.description,
    server_info: source.market.provider,
    tools: source.skills.map(skillToMcpTool),
    resources: source.resources ?? [],
    prompts: source.prompts ?? [],
  };
}

function skillToMcpTool(s: AgentSkillDescriptor): {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
} {
  return {
    name: s.id.replaceAll('-', '_'),
    description: s.description,
    inputSchema: s.paramsSchema ?? {
      type: 'object',
      properties: {},
      additionalProperties: true,
    },
  };
}

/**
 * 호출자가 라우트에서 awaited한 후 NextResponse로 감싼다.
 */
export interface GenerateOptions {
  /** 캐시 TTL 초 (default 3600) */
  cacheTtlSec?: number;
}

/**
 * 캐시 헤더 — 모든 표면에서 동일.
 */
export function cacheHeaders(opts: GenerateOptions = {}) {
  const ttl = opts.cacheTtlSec ?? 3600;
  return {
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': `public, max-age=${ttl}`,
    'Content-Type': 'application/json',
  };
}
