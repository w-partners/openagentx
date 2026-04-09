import { NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { CORS_HEADERS } from '../helpers';

interface ProductRow {
  id: string;
  service_name: string;
  description: string;
  price_usdc: string;
  agent_name: string;
  agent_slug: string;
  category: string;
  logo_url: string | null;
  avg_rating: string;
}

/** GET /api/acp/products — List agent services as ACP products */
export async function GET() {
  try {
    const result = await query<ProductRow>(
      `SELECT
         s.id,
         s.name AS service_name,
         s.description,
         s.price_usdc,
         a.name AS agent_name,
         a.slug AS agent_slug,
         a.category,
         a.logo_url,
         a.avg_rating
       FROM agent_services s
       JOIN agents a ON a.id = s.agent_id
       WHERE s.is_active = true AND a.status = 'active'
       ORDER BY a.ranking_score DESC`,
    );

    const products = result.rows.map((row) => ({
      id: row.id,
      name: `${row.agent_name} - ${row.service_name}`,
      description: row.description,
      url: `https://openagentx.org/agents/${row.agent_slug}`,
      price: Math.round(parseFloat(row.price_usdc) * 100),
      currency: 'usd',
      category: row.category,
      image_url: row.logo_url,
      metadata: {
        agent_slug: row.agent_slug,
        avg_rating: parseFloat(row.avg_rating),
      },
    }));

    return NextResponse.json({ products }, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
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
