import { NextRequest } from 'next/server';
import { query } from '@/lib/db/pool';
import { apiJson } from '@/lib/utils/api-response';

// GET /api/agents/[id]/services — List active services for an agent
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const result = await query<{
    id: string;
    name: string;
    name_ko: string | null;
    description: string;
    description_ko: string | null;
    price_usdc: number;
    is_active: boolean;
  }>(
    `SELECT id, name, name_ko, description, description_ko, price_usdc, is_active
     FROM agent_services
     WHERE agent_id = $1 AND is_active = true
     ORDER BY price_usdc ASC`,
    [id],
  );

  return apiJson({ data: result.rows });
}
