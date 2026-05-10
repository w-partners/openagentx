import { NextRequest, NextResponse } from 'next/server';
import * as agentsRepo from '@/lib/db/repositories/agents';
import { hybridSearch } from '@/lib/search/hybrid';
import { SERVICE_CATEGORIES, CATEGORY_LABELS } from '@/lib/utils/constants';
import { query } from '@/lib/db/pool';
import {
  canFulfillDynamically,
  fulfillDynamically,
  findMatchingTemplate,
} from '@/lib/agents/dynamic-factory';

// ─── MCP Tool Definitions ───────────────────────────────────────────────────

const MCP_TOOLS = [
  {
    name: 'search_agents',
    description:
      'Search AI agents on the OpenAgentX marketplace. Returns matching agents with name, description, category, rating, and pricing.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Search keyword (e.g. "번역", "coding", "data analysis")' },
        category: {
          type: 'string',
          description: `Category filter. One of: ${SERVICE_CATEGORIES.join(', ')}`,
        },
        limit: { type: 'number', description: 'Max results (default 20, max 100)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'fulfill',
    description:
      'Execute any request dynamically. If a registered agent matches, it is used; otherwise an AI agent is generated on the fly. Works for translation, coding, analysis, content creation, and more.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'The request to fulfill (e.g. "Translate Hello to Korean")' },
        input: {
          type: 'object',
          description: 'Optional additional input data for the request',
          additionalProperties: true,
        },
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
      'Create and execute a paid job for a specific agent service. Requires authentication via X-API-Key header.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        agentId: { type: 'string', description: 'Agent UUID' },
        serviceId: { type: 'string', description: 'Service UUID' },
        input: {
          type: 'object',
          description: 'Input data for the service',
          additionalProperties: true,
        },
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
      'Request a top-up payment link to charge points. Returns a PortOne checkout URL the user can open in a browser to pay (KRW or USDC).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        amount: { type: 'number', description: 'Charge amount in KRW (won). Defaults to 10000.' },
        currency: { type: 'string', description: 'Currency code: "KRW" (default) or "USDC".' },
      },
    },
  },
];

// ─── JSON-RPC helpers ───────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: string;
  method: string;
  params?: Record<string, unknown>;
  id?: string | number | null;
}

function jsonrpc(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', result, id: id ?? null };
}

function jsonrpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', error: { code, message }, id: id ?? null };
}

function textContent(text: string) {
  return { content: [{ type: 'text', text }] };
}

// ─── Tool Handlers ──────────────────────────────────────────────────────────

async function handleSearchAgents(args: Record<string, unknown>) {
  const q = String(args.query ?? '');
  const category = args.category ? String(args.category) : undefined;
  const limit = Math.min(Number(args.limit) || 20, 100);

  if (q) {
    const results = await hybridSearch({ q, category, limit, offset: 0 });
    return textContent(JSON.stringify({ agents: results.agents, total: results.total }, null, 2));
  }

  const results = await agentsRepo.findAll({ category, limit, offset: 0 });
  return textContent(JSON.stringify({ agents: results.agents, total: results.total }, null, 2));
}

async function handleFulfill(args: Record<string, unknown>) {
  const queryText = String(args.query ?? '').trim();
  if (!queryText) {
    return textContent(JSON.stringify({ error: 'query is required' }));
  }

  const input = (args.input as Record<string, unknown>) ?? {};

  // 1. Check registered agents
  const existingAgent = await query<{
    agent_id: string;
    agent_name: string;
    agent_slug: string;
    service_name: string;
  }>(
    `SELECT a.id as agent_id, a.name as agent_name, a.slug as agent_slug, s.name as service_name
     FROM agents a
     JOIN agent_services s ON s.agent_id = a.id AND s.is_active = true
     WHERE a.status = 'active'
       AND (a.name ILIKE $1 OR s.name ILIKE $1 OR s.description ILIKE $1)
     LIMIT 1`,
    [`%${queryText.slice(0, 100)}%`],
  );

  if (existingAgent.rows.length > 0) {
    const agent = existingAgent.rows[0];
    const result = await fulfillDynamically(queryText, input, {
      agentId: agent.agent_id,
      serviceName: agent.service_name,
    });
    return textContent(
      JSON.stringify({
        source: 'registered',
        agent: { id: agent.agent_id, name: agent.agent_name, slug: agent.agent_slug },
        response: result.response,
        confidence: result.confidence,
      }, null, 2),
    );
  }

  // 2. Check templates
  const template = await findMatchingTemplate(queryText).catch(() => null);
  if (template) {
    return textContent(
      JSON.stringify({
        source: 'template',
        templateId: template.id,
        preview: template.response_preview,
        url: `https://openagentx.org/agents/dynamic/${template.slug}`,
      }, null, 2),
    );
  }

  // 3. Dynamic fulfillment
  const canFulfill = await canFulfillDynamically(queryText);
  if (!canFulfill) {
    return textContent(JSON.stringify({ error: 'Cannot fulfill this request' }));
  }

  const result = await fulfillDynamically(queryText, input);
  return textContent(
    JSON.stringify({
      source: 'dynamic',
      response: result.response,
      category: result.category,
      confidence: result.confidence,
    }, null, 2),
  );
}

async function handleGetAgent(args: Record<string, unknown>) {
  const agentId = String(args.agentId ?? '');
  if (!agentId) {
    return textContent(JSON.stringify({ error: 'agentId is required' }));
  }

  const agent = await agentsRepo.findById(agentId);
  if (!agent) {
    return textContent(JSON.stringify({ error: 'Agent not found' }));
  }

  // Fetch services
  const services = await query<{ id: string; name: string; description: string; price: number }>(
    'SELECT id, name, description, price FROM agent_services WHERE agent_id = $1 AND is_active = true',
    [agentId],
  );

  return textContent(
    JSON.stringify({ agent, services: services.rows }, null, 2),
  );
}

async function handleCreateJob(args: Record<string, unknown>, request: NextRequest) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!apiKey) {
    return textContent(JSON.stringify({ error: 'Authentication required. Provide X-API-Key header.' }));
  }

  // Forward to /api/jobs internally
  const agentId = String(args.agentId ?? '');
  const serviceId = String(args.serviceId ?? '');
  const input = args.input as Record<string, unknown> ?? {};

  // Look up service price
  const svc = await query<{ price: number }>(
    'SELECT price FROM agent_services WHERE id = $1 AND agent_id = $2 AND is_active = true',
    [serviceId, agentId],
  );
  if (svc.rows.length === 0) {
    return textContent(JSON.stringify({ error: 'Service not found or inactive' }));
  }

  const jobUrl = new URL('/api/jobs', request.url);
  const jobResponse = await fetch(jobUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...(request.headers.get('x-user-id') ? { 'x-user-id': request.headers.get('x-user-id')! } : {}),
    },
    body: JSON.stringify({
      agent_id: agentId,
      service_id: serviceId,
      input_data: input,
      payment_amount: svc.rows[0].price,
    }),
  });

  const jobResult = await jobResponse.json();
  return textContent(JSON.stringify(jobResult, null, 2));
}

function handleListCategories() {
  const categories = SERVICE_CATEGORIES.map((c) => ({
    id: c,
    label_ko: CATEGORY_LABELS[c] ?? c,
    label_en: c.replace(/_/g, ' '),
  }));
  return textContent(JSON.stringify({ categories }, null, 2));
}

function handleRequestTopup(args: Record<string, unknown>) {
  const amount = Number(args.amount) > 0 ? Number(args.amount) : 10000;
  const currency = String(args.currency ?? 'KRW').toUpperCase();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://openagentx.org';
  const topupUrl = `${baseUrl}/charge?amount=${amount}&currency=${currency}`;
  return textContent(
    JSON.stringify(
      {
        topup_url: topupUrl,
        amount,
        currency,
        message: '브라우저에서 위 URL을 열어 결제를 완료하세요. 결제 완료 후 자동으로 포인트가 충전됩니다.',
      },
      null,
      2,
    ),
  );
}

// ─── Route Handlers ─────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
};

/** GET — tool listing / server info for discovery */
export async function GET() {
  const response = jsonrpc(null, {
    serverInfo: {
      name: 'OpenAgentX',
      version: '1.0.0',
      description: 'AI Agent Marketplace - search, compare, and use AI agents',
    },
    tools: MCP_TOOLS,
  });

  return NextResponse.json(response, { headers: CORS_HEADERS });
}

/** POST — JSON-RPC 2.0 endpoint for MCP protocol */
export async function POST(request: NextRequest) {
  let body: JsonRpcRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      jsonrpcError(null, -32700, 'Parse error'),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return NextResponse.json(
      jsonrpcError(body.id, -32600, 'Invalid Request — must be JSON-RPC 2.0'),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    let result: unknown;

    switch (body.method) {
      // ── MCP Initialize ────────────────────────────────────────────
      case 'initialize': {
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'OpenAgentX',
            version: '1.0.0',
          },
        };
        break;
      }

      // ── List tools ────────────────────────────────────────────────
      case 'tools/list': {
        result = { tools: MCP_TOOLS };
        break;
      }

      // ── Call a tool ───────────────────────────────────────────────
      case 'tools/call': {
        const params = body.params as { name?: string; arguments?: Record<string, unknown> } | undefined;
        const toolName = params?.name;
        const toolArgs = params?.arguments ?? {};

        switch (toolName) {
          case 'search_agents':
            result = await handleSearchAgents(toolArgs);
            break;
          case 'fulfill':
            result = await handleFulfill(toolArgs);
            break;
          case 'get_agent':
            result = await handleGetAgent(toolArgs);
            break;
          case 'create_job':
            result = await handleCreateJob(toolArgs, request);
            break;
          case 'list_categories':
            result = handleListCategories();
            break;
          case 'request_topup':
            result = handleRequestTopup(toolArgs);
            break;
          default:
            return NextResponse.json(
              jsonrpcError(body.id, -32602, `Unknown tool: ${toolName}`),
              { status: 400, headers: CORS_HEADERS },
            );
        }
        break;
      }

      // ── Notifications (no response needed per spec) ───────────────
      case 'notifications/initialized': {
        return NextResponse.json(
          jsonrpc(body.id, {}),
          { headers: CORS_HEADERS },
        );
      }

      default:
        return NextResponse.json(
          jsonrpcError(body.id, -32601, `Method not found: ${body.method}`),
          { status: 400, headers: CORS_HEADERS },
        );
    }

    return NextResponse.json(jsonrpc(body.id, result), { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json(
      jsonrpcError(body.id, -32603, message),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
