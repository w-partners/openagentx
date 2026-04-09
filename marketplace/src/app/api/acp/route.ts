import { NextResponse } from 'next/server';
import { CORS_HEADERS } from './helpers';

/** GET /api/acp — ACP server info */
export async function GET() {
  return NextResponse.json(
    {
      name: 'OpenAgentX',
      version: '1.0.0',
      protocol: 'agentic-commerce-protocol',
      protocol_version: '2026-01-30',
      description: 'AI Agent Marketplace - Buy and use specialized AI agents',
      endpoints: {
        products: '/api/acp/products',
        checkouts: '/api/acp/checkouts',
        feed: '/api/acp/feed',
      },
      supported_currencies: ['usd'],
      payment_providers: ['stripe'],
      links: {
        website: 'https://openagentx.org',
        terms: 'https://openagentx.org/terms',
        privacy: 'https://openagentx.org/privacy',
      },
    },
    { headers: CORS_HEADERS },
  );
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
