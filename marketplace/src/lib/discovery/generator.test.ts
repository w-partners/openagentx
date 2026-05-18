/**
 * Discovery generator 단위 테스트.
 *
 * Beta 검증: agent.json / ucp / mcp 표면이 동일 source에서 일관 생성되는지.
 * 실행: vitest 또는 jest (마켓 표준 러너).
 */

import { describe, it, expect } from 'vitest';
import { toA2A, toMCP, toUCP } from './generator';
import type { DiscoverySource } from './types';

const fixture: DiscoverySource = {
  market: {
    name: 'Test Market',
    description: 'desc',
    url: 'https://test.example.com',
    version: '3.0.0',
    provider: { organization: 'T', url: 'https://test.example.com', contactEmail: 'a@b.c' },
    capabilities: { streaming: true, sse: true, pushNotifications: false },
    authentication: { type: 'bearer', description: 'JWT' },
    payment: { methods: ['PortOne', 'PayPal', 'x402'], chain: 'base' },
    currencies: ['USD', 'KRW', 'USDC'],
    locale: 'ko-KR',
  },
  skills: [
    {
      id: 'agent-search',
      name: '검색',
      description: '에이전트 검색',
      endpoint: 'https://test.example.com/api/agents',
      method: 'GET',
      tags: ['discovery'],
    },
    {
      id: 'job-create',
      name: '실행',
      description: '서비스 실행',
      endpoint: 'https://test.example.com/api/jobs',
      method: 'POST',
      paramsSchema: { type: 'object', required: ['agent_id'], properties: { agent_id: { type: 'string' } } },
    },
  ],
};

describe('discovery generator', () => {
  it('toA2A returns name + url + skills from source', () => {
    const card = toA2A(fixture);
    expect(card.name).toBe('Test Market');
    expect(card.url).toBe('https://test.example.com');
    expect(card.skills.length).toBe(2);
    expect(card.skills[0].id).toBe('agent-search');
  });

  it('toUCP exposes actions equivalent to skills', () => {
    const ucp = toUCP(fixture);
    expect(ucp.domain).toBe('test.example.com');
    expect(ucp.actions.length).toBe(2);
    const ids = ucp.actions.map((a) => a.id);
    expect(ids).toContain('agent-search');
    expect(ids).toContain('job-create');
  });

  it('toMCP converts skills to MCP tools with snake_case names', () => {
    const mcp = toMCP(fixture);
    expect(mcp.name).toBe('openagentx-marketplace');
    expect(mcp.tools.length).toBe(2);
    expect(mcp.tools[0].name).toBe('agent_search');
    expect(mcp.tools[1].name).toBe('job_create');
    expect(mcp.tools[1].inputSchema).toEqual(fixture.skills[1].paramsSchema);
  });

  it('all three surfaces share skill ids — consistency check', () => {
    const a2a = toA2A(fixture);
    const ucp = toUCP(fixture);
    const mcp = toMCP(fixture);

    const a2aIds = a2a.skills.map((s) => s.id).sort();
    const ucpIds = ucp.actions.map((a) => a.id).sort();
    const mcpIds = mcp.tools.map((t) => t.name.replaceAll('_', '-')).sort();

    expect(a2aIds).toEqual(ucpIds);
    expect(a2aIds).toEqual(mcpIds);
  });
});
