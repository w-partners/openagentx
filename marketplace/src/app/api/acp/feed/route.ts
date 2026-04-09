import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { CORS_HEADERS } from '../helpers';

const SITE_URL = 'https://openagentx.org';

interface FeedRow {
  service_id: string;
  service_name: string;
  service_description: string;
  price_usdc: string;
  agent_id: string;
  agent_name: string;
  agent_slug: string;
  agent_description: string;
  agent_description_ko: string | null;
  category: string;
  tags: string[] | null;
  logo_url: string | null;
}

interface ProductVariant {
  id: string;
  title: string;
  price: { amount: number; currency: string };
  availability: { available: boolean; status: string };
  variant_options: Array<{ name: string; value: string }>;
}

interface FeedProduct {
  id: string;
  title: string;
  description: { type: string; value: string };
  url: string;
  media: Array<{ type: string; url: string; alt_text: string }>;
  variants: ProductVariant[];
  categories: Array<{ value: string; taxonomy: string }>;
  seller: {
    name: string;
    links: Array<{ type: string; url: string }>;
  };
}

/** GET /api/acp/feed — OpenAI Product Feed (partner submission) */
export async function GET(request: NextRequest) {
  try {
    const result = await query<FeedRow>(
      `SELECT
         s.id        AS service_id,
         s.name      AS service_name,
         s.description AS service_description,
         s.price_usdc,
         a.id        AS agent_id,
         a.name      AS agent_name,
         a.slug      AS agent_slug,
         a.description AS agent_description,
         a.description_ko AS agent_description_ko,
         a.category,
         a.tags,
         a.logo_url
       FROM agent_services s
       JOIN agents a ON a.id = s.agent_id
       WHERE a.status = 'active' AND s.is_active = true
       ORDER BY a.name, s.name`,
    );

    // Group services by agent
    const agentMap = new Map<string, { agent: FeedRow; services: FeedRow[] }>();

    for (const row of result.rows) {
      if (!agentMap.has(row.agent_id)) {
        agentMap.set(row.agent_id, { agent: row, services: [] });
      }
      agentMap.get(row.agent_id)!.services.push(row);
    }

    // Build products
    const products: FeedProduct[] = [];

    for (const [agentId, { agent, services }] of agentMap) {
      const product: FeedProduct = {
        id: agentId,
        title: agent.agent_name,
        description: {
          type: 'plain',
          value: agent.agent_description || '',
        },
        url: `${SITE_URL}/agents/${agent.agent_slug}`,
        media: agent.logo_url
          ? [
              {
                type: 'image',
                url: agent.logo_url,
                alt_text: `${agent.agent_name} logo`,
              },
            ]
          : [],
        variants: services.map((svc) => ({
          id: svc.service_id,
          title: svc.service_name,
          price: {
            amount: Math.round(parseFloat(svc.price_usdc) * 100),
            currency: 'USD',
          },
          availability: {
            available: true,
            status: 'in_stock',
          },
          variant_options: [
            {
              name: 'service_type',
              value: svc.service_name,
            },
          ],
        })),
        categories: [
          {
            value: agent.category || 'ai-agent',
            taxonomy: 'merchant',
          },
        ],
        seller: {
          name: 'OpenAgentX',
          links: [
            { type: 'terms_of_service', url: `${SITE_URL}/terms` },
            { type: 'privacy_policy', url: `${SITE_URL}/privacy` },
            { type: 'refund_policy', url: `${SITE_URL}/refund` },
          ],
        },
      };

      products.push(product);
    }

    const feed = {
      feed_id: 'openagentx-product-feed',
      account_id: 'openagentx',
      target_merchant: 'openagentx',
      target_country: 'US',
      products,
    };

    // format=file → downloadable JSON file
    const format = request.nextUrl.searchParams.get('format');
    if (format === 'file') {
      return new Response(JSON.stringify(feed, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition':
            'attachment; filename="openagentx-product-feed.json"',
        },
      });
    }

    return NextResponse.json(feed, {
      headers: {
        ...CORS_HEADERS,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err) {
    console.error('[ACP Feed] Error:', err);
    const message =
      err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** CORS preflight */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
