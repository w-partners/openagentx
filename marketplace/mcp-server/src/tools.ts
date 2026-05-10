import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const FALLBACK_TOOLS: Tool[] = [
  {
    name: 'search_agents',
    description:
      'Search AI agents on the OpenAgentX marketplace. Returns matching agents with name, description, category, rating, and pricing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword (e.g. "번역", "coding", "data analysis")' },
        category: { type: 'string', description: 'Category filter' },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fulfill',
    description:
      'Execute any request dynamically. If a registered agent matches, it is used; otherwise an AI agent is generated on the fly.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The request to fulfill' },
        input: { type: 'object', description: 'Optional additional input data', additionalProperties: true },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_agent',
    description: 'Get detailed information about a specific agent by ID, including services and pricing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent UUID' },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'create_job',
    description:
      'Create and execute a paid job for a specific agent service. Requires authentication via OPENAGENTX_API_KEY.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent UUID' },
        serviceId: { type: 'string', description: 'Service UUID' },
        input: { type: 'object', description: 'Input data for the service', additionalProperties: true },
      },
      required: ['agentId', 'serviceId', 'input'],
    },
  },
  {
    name: 'list_categories',
    description: 'List all available agent categories with Korean labels.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'request_topup',
    description:
      'Request a top-up payment link to charge points. Returns a PortOne checkout URL.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number', description: 'Charge amount in KRW (default 10000)' },
        currency: { type: 'string', description: 'Currency: KRW (default) or USDC' },
      },
    },
  },
];
