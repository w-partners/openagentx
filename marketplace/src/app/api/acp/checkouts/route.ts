import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db/pool';
import { buildCheckoutResponse, CORS_HEADERS } from '../helpers';
import type { AcpCreateRequest } from '../types';

/** POST /api/acp/checkouts — Create a new checkout session */
export async function POST(request: NextRequest) {
  try {
    const body: AcpCreateRequest = await request.json();

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400, headers: CORS_HEADERS },
      );
    }

    // Validate all item IDs exist in agent_services
    const serviceIds = body.items.map((i) => i.id);
    const servicesResult = await query<{ id: string; price_usdc: string }>(
      'SELECT id, price_usdc FROM agent_services WHERE id = ANY($1) AND is_active = true',
      [serviceIds],
    );

    const foundIds = new Set(servicesResult.rows.map((r) => r.id));
    const missingIds = serviceIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Products not found: ${missingIds.join(', ')}` },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    // Calculate total
    let totalAmount = 0;
    for (const item of body.items) {
      const svc = servicesResult.rows.find((r) => r.id === item.id);
      if (svc) {
        totalAmount += Math.round(parseFloat(svc.price_usdc) * 100) * (item.quantity || 1);
      }
    }

    // Determine initial status
    const hasBuyer = body.buyer && body.buyer.email && body.buyer.first_name && body.buyer.last_name;
    const status = hasBuyer ? 'ready_for_payment' : 'not_ready_for_payment';

    // Insert session
    const insertResult = await query<{ id: string }>(
      `INSERT INTO acp_checkout_sessions
         (buyer_email, buyer_first_name, buyer_last_name, status, items, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        body.buyer?.email || null,
        body.buyer?.first_name || null,
        body.buyer?.last_name || null,
        status,
        JSON.stringify(body.items.map((i) => ({ id: i.id, quantity: i.quantity || 1 }))),
        totalAmount,
      ],
    );

    const sessionId = insertResult.rows[0].id;
    const response = await buildCheckoutResponse(sessionId);

    return NextResponse.json(response, { status: 201, headers: CORS_HEADERS });
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
