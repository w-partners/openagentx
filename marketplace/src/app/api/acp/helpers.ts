import { query } from '@/lib/db/pool';
import type { AcpCheckoutSession, AcpLineItem, AcpMessage } from './types';

// ─── CORS Headers ──────────────────────────────────────────────────────────

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ─── Build full checkout response ──────────────────────────────────────────

interface SessionRow {
  id: string;
  buyer_email: string | null;
  buyer_first_name: string | null;
  buyer_last_name: string | null;
  buyer_phone: string | null;
  status: AcpCheckoutSession['status'];
  currency: string;
  items: Array<{ id: string; quantity: number }>;
  fulfillment_option_id: string | null;
  payment_provider: string | null;
  order_id: string | null;
  total_amount: number;
}

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  price_usdc: string;
  agent_name: string;
  logo_url: string | null;
}

export async function buildCheckoutResponse(sessionId: string): Promise<AcpCheckoutSession | null> {
  // 1. Fetch session
  const sessionResult = await query<SessionRow>(
    'SELECT * FROM acp_checkout_sessions WHERE id = $1',
    [sessionId],
  );
  if (sessionResult.rows.length === 0) return null;
  const session = sessionResult.rows[0];

  // 2. Build line_items from items JSON
  const items: Array<{ id: string; quantity: number }> = session.items || [];
  const lineItems: AcpLineItem[] = [];
  let totalBaseAmount = 0;

  if (items.length > 0) {
    const serviceIds = items.map((i) => i.id);
    const servicesResult = await query<ServiceRow>(
      `SELECT s.id, s.name, s.description, s.price_usdc, a.name AS agent_name, a.logo_url
       FROM agent_services s
       JOIN agents a ON a.id = s.agent_id
       WHERE s.id = ANY($1) AND s.is_active = true`,
      [serviceIds],
    );

    const serviceMap = new Map(servicesResult.rows.map((r) => [r.id, r]));

    for (const item of items) {
      const svc = serviceMap.get(item.id);
      if (!svc) continue;

      const priceInCents = Math.round(parseFloat(svc.price_usdc) * 100);
      const baseAmount = priceInCents * item.quantity;
      totalBaseAmount += baseAmount;

      lineItems.push({
        id: item.id,
        item: {
          id: svc.id,
          name: `${svc.agent_name} - ${svc.name}`,
          description: svc.description,
          image_url: svc.logo_url || undefined,
        },
        base_amount: baseAmount,
        discount: 0,
        subtotal: baseAmount,
        tax: 0,
        total: baseAmount,
      });
    }
  }

  // 3. Fulfillment options (digital only)
  const fulfillmentOptions = [
    {
      type: 'digital' as const,
      id: 'digital-delivery',
      title: 'Instant AI Agent Delivery',
      subtitle: 'Delivered immediately after payment',
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  ];

  // 4. Totals
  const totals = [
    { type: 'items_base_amount' as const, display_text: 'Items', amount: totalBaseAmount },
    { type: 'subtotal' as const, display_text: 'Subtotal', amount: totalBaseAmount },
    { type: 'tax' as const, display_text: 'Tax', amount: 0 },
    { type: 'total' as const, display_text: 'Total', amount: totalBaseAmount },
  ];

  // 5. Messages based on status
  const messages: AcpMessage[] = [];
  switch (session.status) {
    case 'not_ready_for_payment':
      messages.push({
        type: 'info',
        content: 'Please provide buyer information and items to proceed.',
        content_type: 'plain',
      });
      break;
    case 'ready_for_payment':
      messages.push({
        type: 'info',
        content: 'Checkout is ready for payment.',
        content_type: 'plain',
      });
      break;
    case 'completed':
      messages.push({
        type: 'info',
        content: 'Payment completed. Your AI agent service is being delivered.',
        content_type: 'plain',
      });
      break;
    case 'canceled':
      messages.push({
        type: 'info',
        content: 'This checkout has been canceled.',
        content_type: 'plain',
      });
      break;
    case 'in_progress':
      messages.push({
        type: 'info',
        content: 'Payment is being processed.',
        content_type: 'plain',
      });
      break;
  }

  // 6. Links
  const links = [
    { type: 'terms_of_use' as const, url: 'https://openagentx.org/terms' },
    { type: 'privacy_policy' as const, url: 'https://openagentx.org/privacy' },
    { type: 'seller_shop_policies' as const, url: 'https://openagentx.org/refund' },
  ];

  // 7. Build response
  const response: AcpCheckoutSession = {
    id: session.id,
    payment_provider: {
      provider: 'stripe',
      supported_payment_methods: ['card'],
    },
    status: session.status,
    currency: session.currency,
    line_items: lineItems,
    fulfillment_options: fulfillmentOptions,
    totals,
    messages,
    links,
  };

  // Buyer info
  if (session.buyer_email || session.buyer_first_name) {
    response.buyer = {
      first_name: session.buyer_first_name || '',
      last_name: session.buyer_last_name || '',
      email: session.buyer_email || '',
      phone_number: session.buyer_phone || undefined,
    };
  }

  // Fulfillment option
  if (session.fulfillment_option_id) {
    response.fulfillment_option_id = session.fulfillment_option_id;
  }

  // Order (only when completed)
  if (session.status === 'completed' && session.order_id) {
    response.order = {
      id: session.order_id,
      checkout_session_id: session.id,
      permalink_url: `https://openagentx.org/orders/${session.order_id}`,
    };
  }

  return response;
}
