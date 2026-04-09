import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { buildCheckoutResponse, CORS_HEADERS } from '../../../helpers';

/** POST /api/acp/checkouts/[id]/cancel — Cancel a checkout session */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Check session exists
    const existing = await query<{ id: string; status: string }>(
      'SELECT id, status FROM acp_checkout_sessions WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    if (existing.rows[0].status === 'completed') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed checkout session' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    if (existing.rows[0].status === 'canceled') {
      // Already canceled — return current state
      const response = await buildCheckoutResponse(id);
      return NextResponse.json(response, { headers: CORS_HEADERS });
    }

    // Cancel the session
    await query(
      "UPDATE acp_checkout_sessions SET status = 'canceled', updated_at = NOW() WHERE id = $1",
      [id],
    );

    const response = await buildCheckoutResponse(id);
    return NextResponse.json(response, { headers: CORS_HEADERS });
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
