import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { buildCheckoutResponse, CORS_HEADERS } from '../../../helpers';
import type { AcpCompleteRequest } from '../../../types';

/** POST /api/acp/checkouts/[id]/complete — Complete payment and create order */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: AcpCompleteRequest = await request.json();

    // Validate payment data
    if (!body.payment_data?.token || body.payment_data.provider !== 'stripe') {
      return NextResponse.json(
        { error: 'Valid payment_data with token and provider "stripe" is required' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Check session exists and is ready
    const existing = await query<{
      id: string;
      status: string;
      items: Array<{ id: string; quantity: number }>;
      total_amount: number;
    }>(
      'SELECT id, status, items, total_amount FROM acp_checkout_sessions WHERE id = $1',
      [id],
    );

    if (existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    const session = existing.rows[0];

    if (session.status !== 'ready_for_payment') {
      return NextResponse.json(
        { error: `Cannot complete a checkout with status "${session.status}". Must be "ready_for_payment".` },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Generate order ID
    const orderIdResult = await query<{ id: string }>(
      "SELECT gen_random_uuid() AS id",
    );
    const orderId = orderIdResult.rows[0].id;

    // Update session to completed
    await query(
      `UPDATE acp_checkout_sessions
       SET status = 'completed',
           stripe_payment_token = $1,
           order_id = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [body.payment_data.token, orderId, id],
    );

    // Create marketplace_jobs for each item (trigger agent execution)
    const items: Array<{ id: string; quantity: number }> = session.items || [];
    for (const item of items) {
      // Look up the service's agent_id
      const svcResult = await query<{ agent_id: string; price_usdc: string }>(
        'SELECT agent_id, price_usdc FROM agent_services WHERE id = $1',
        [item.id],
      );
      if (svcResult.rows.length === 0) continue;

      const svc = svcResult.rows[0];
      for (let i = 0; i < (item.quantity || 1); i++) {
        await query(
          `INSERT INTO marketplace_jobs
             (service_id, agent_id, buyer_id, status, input_data, payment_amount, source)
           VALUES ($1, $2, $3, 'pending', $4, $5, 'acp')`,
          [
            item.id,
            svc.agent_id,
            // Use a system user for ACP purchases (first admin user)
            (await query<{ id: string }>("SELECT id FROM users ORDER BY created_at LIMIT 1")).rows[0]?.id || '00000000-0000-0000-0000-000000000000',
            JSON.stringify({ acp_order_id: orderId, checkout_session_id: id }),
            parseFloat(svc.price_usdc),
          ],
        );
      }
    }

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
