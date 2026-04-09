// ─── ACP (Agentic Commerce Protocol) Types ─────────────────────────────────

export interface AcpBuyer {
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
}

export interface AcpLineItem {
  id: string;
  item: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
  };
  base_amount: number;
  discount: number;
  total: number;
  subtotal: number;
  tax: number;
}

export interface AcpFulfillmentOption {
  type: 'digital';
  id: string;
  title: string;
  subtitle?: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface AcpTotal {
  type: 'items_base_amount' | 'subtotal' | 'tax' | 'total';
  display_text: string;
  amount: number;
}

export interface AcpMessage {
  type: 'info' | 'error';
  content: string;
  content_type?: 'plain' | 'markdown';
}

export interface AcpLink {
  type: 'terms_of_use' | 'privacy_policy' | 'seller_shop_policies';
  url: string;
}

export interface AcpOrder {
  id: string;
  checkout_session_id: string;
  permalink_url: string;
}

export interface AcpCheckoutSession {
  id: string;
  buyer?: AcpBuyer;
  payment_provider?: {
    provider: 'stripe';
    supported_payment_methods: string[];
  };
  status: 'not_ready_for_payment' | 'ready_for_payment' | 'completed' | 'canceled' | 'in_progress';
  currency: string;
  line_items: AcpLineItem[];
  fulfillment_options: AcpFulfillmentOption[];
  fulfillment_option_id?: string;
  totals: AcpTotal[];
  messages: AcpMessage[];
  links: AcpLink[];
  order?: AcpOrder;
}

export interface AcpCreateRequest {
  items: Array<{ id: string; quantity: number }>;
  buyer?: { first_name: string; last_name: string; email: string };
}

export interface AcpUpdateRequest {
  items?: Array<{ id: string; quantity: number }>;
  buyer?: { first_name: string; last_name: string; email: string };
  fulfillment_option_id?: string;
}

export interface AcpCompleteRequest {
  payment_data: {
    token: string;
    provider: 'stripe';
    billing_address?: Record<string, string>;
  };
}
