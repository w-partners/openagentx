import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { buildCheckoutResponse, CORS_HEADERS } from '../../helpers';
import type { AcpUpdateRequest } from '../../types';

/** GET /api/acp/checkouts/[id] — Retrieve checkout session */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const response = await buildCheckoutResponse(id);

    if (!response) {
      return NextResponse.json(
        { error: 'Checkout session not found' },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    return NextResponse.json(response, { headers: CORS_HEADERS });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

/** PUT /api/acp/checkouts/[id] — Update checkout session */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body: AcpUpdateRequest = await request.json();

    // Check session exists and is modifiable
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
    if (existing.rows[0].status === 'completed' || existing.rows[0].status === 'canceled') {
      return NextResponse.json(
        { error: `Cannot update a ${existing.rows[0].status} checkout session` },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Build dynamic UPDATE
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.buyer) {
      if (body.buyer.first_name) {
        updates.push(`buyer_first_name = $${paramIndex++}`);
        values.push(body.buyer.first_name);
      }
      if (body.buyer.last_name) {
        updates.push(`buyer_last_name = $${paramIndex++}`);
        values.push(body.buyer.last_name);
      }
      if (body.buyer.email) {
        updates.push(`buyer_email = $${paramIndex++}`);
        values.push(body.buyer.email);
      }
    }

    if (body.fulfillment_option_id) {
      updates.push(`fulfillment_option_id = $${paramIndex++}`);
      values.push(body.fulfillment_option_id);
    }

    if (body.items && Array.isArray(body.items)) {
      // Validate item IDs
      const serviceIds = body.items.map((i) => i.id);
      const servicesResult = await query<{ id: string; price_usdc: string }>(
        'SELECT id, price_usdc FROM agent_services WHERE id = ANY($1) AND is_active = true',
        [serviceIds],
      );
      const foundIds = new Set(servicesResult.rows.map((r) => r.id));
      const missingIds = serviceIds.filter((sid) => !foundIds.has(sid));
      if (missingIds.length > 0) {
        return NextResponse.json(
          { error: `Products not found: ${missingIds.join(', ')}` },
          { status: 404, headers: CORS_HEADERS },
        );
      }

      // Recalculate total
      let totalAmount = 0;
      for (const item of body.items) {
        const svc = servicesResult.rows.find((r) => r.id === item.id);
        if (svc) {
          totalAmount += Math.round(parseFloat(svc.price_usdc) * 100) * (item.quantity || 1);
        }
      }

      updates.push(`items = $${paramIndex++}`);
      values.push(JSON.stringify(body.items.map((i) => ({ id: i.id, quantity: i.quantity || 1 }))));
      updates.push(`total_amount = $${paramIndex++}`);
      values.push(totalAmount);
    }

    if (updates.length === 0) {
      const response = await buildCheckoutResponse(id);
      return NextResponse.json(response, { headers: CORS_HEADERS });
    }

    // Update updated_at
    updates.push(`updated_at = NOW()`);

    // Determine if status should change to ready_for_payment
    // After update, check if buyer info + items are present
    values.push(id);
    await query(
      `UPDATE acp_checkout_sessions SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values,
    );

    // Check if ready_for_payment
    const updatedSession = await query<{
      buyer_email: string | null;
      buyer_first_name: string | null;
      items: unknown[];
      status: string;
    }>(
      'SELECT buyer_email, buyer_first_name, items, status FROM acp_checkout_sessions WHERE id = $1',
      [id],
    );

    if (updatedSession.rows.length > 0) {
      const s = updatedSession.rows[0];
      const hasItems = Array.isArray(s.items) && s.items.length > 0;
      const hasBuyer = !!s.buyer_email && !!s.buyer_first_name;
      if (hasItems && hasBuyer && s.status === 'not_ready_for_payment') {
        await query(
          "UPDATE acp_checkout_sessions SET status = 'ready_for_payment', updated_at = NOW() WHERE id = $1",
          [id],
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
