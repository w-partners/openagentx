/**
 * Discovery — 단일 데이터 → 3개 표면 (A2A / UCP / MCP) generator.
 *
 * 정본: docs/PRD-OpenAgentX.md §4.4 (결정 14).
 */

export { toA2A, toUCP, toMCP, cacheHeaders } from './generator';
export type { GenerateOptions } from './generator';

export { getDiscoverySource } from './source';

export type {
  DiscoverySource,
  DiscoveryMarket,
  DiscoveryProvider,
  DiscoveryPayment,
  DiscoveryAuthentication,
  DiscoverySecurityScheme,
  DiscoveryResource,
  DiscoveryPrompt,
  AgentSkillDescriptor,
  AgentSkillExample,
} from './types';
