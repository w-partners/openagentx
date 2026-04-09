/**
 * ACPHelper — ChatGPT 상거래 설정 도우미 에이전트
 */
import { generateResponse } from '../ai/fallback-chain';

export interface ACPHelperInput {
  title: string;
  description: string;
  source_urls?: string[];
  product_data?: string;  // CSV 또는 JSON 형식 상품 데이터
  service_type: 'feed' | 'full' | 'enterprise';
}

export interface ACPHelperResult {
  product_feed?: object;
  checkout_code?: string;
  setup_guide?: string;
  validation_results?: { valid: boolean; errors: string[] };
  merchant_application_guide?: string;
}

const ACP_HELPER_SYSTEM_PROMPT = `You are ACPHelper, specialized in setting up ChatGPT commerce using the Agentic Commerce Protocol (ACP).

When the user provides product information, generate:

1. **Product Feed JSON** (ALWAYS): ACP-compliant JSON with:
   - feed_id, account_id, target_merchant, target_country
   - products array with: id, title, description, url, variants
   - Each variant: id, title, price {amount (integer cents), currency}, availability

2. **Checkout Endpoint Code** (for 'full' or 'enterprise' service):
   - Next.js API route implementation
   - 5 endpoints: POST/GET/PUT checkouts, complete, cancel
   - Stripe payment integration

3. **Setup Guide** (for 'enterprise' service):
   - Step-by-step ChatGPT merchant application guide
   - Stripe account setup instructions
   - Feed upload/API integration instructions

Respond with a JSON object:
{
  "product_feed": { ... the complete ACP feed ... },
  "checkout_code": "... Next.js code if applicable ...",
  "setup_guide": "... markdown guide if applicable ...",
  "validation_results": { "valid": true/false, "errors": [] },
  "merchant_application_guide": "... if enterprise ..."
}

Rules:
- Price amounts MUST be integers in cents (e.g., $5.00 = 500)
- Currency MUST be lowercase ISO 4217 (e.g., "usd")
- All IDs must be stable strings
- Include seller info with terms/privacy/refund links
- Respond in the user's language for guides, but keep JSON keys in English`;

async function fetchProductsFromUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  } catch {
    return null;
  }
}

export async function runACPHelper(input: ACPHelperInput): Promise<{
  result: ACPHelperResult;
  provider: string;
  processingMs: number;
}> {
  const start = Date.now();

  // 소스 내용 수집
  const parts: string[] = [];
  parts.push(`## 요청: ${input.title}`);
  parts.push(`## 설명:\n${input.description}`);
  parts.push(`## 서비스 유형: ${input.service_type}`);

  if (input.product_data) {
    parts.push(`## 상품 데이터:\n${input.product_data.slice(0, 5000)}`);
  }

  if (input.source_urls?.length) {
    for (const url of input.source_urls.slice(0, 3)) {
      const content = await fetchProductsFromUrl(url);
      if (content) parts.push(`## URL 내용 (${url}):\n${content}`);
    }
  }

  // 서비스 유형에 따라 프롬프트 조정
  if (input.service_type === 'feed') {
    parts.push('\n## 지시: Product Feed JSON만 생성해주세요. checkout_code와 setup_guide는 null로.');
  } else if (input.service_type === 'full') {
    parts.push('\n## 지시: Product Feed JSON + Checkout Endpoint Code를 생성해주세요.');
  } else {
    parts.push('\n## 지시: Product Feed JSON + Checkout Code + Setup Guide + Merchant Application Guide 모두 생성해주세요.');
  }

  const { text, provider } = await generateResponse({
    systemPrompt: ACP_HELPER_SYSTEM_PROMPT,
    userMessage: parts.join('\n\n'),
    maxTokens: 4096,
  });

  let result: ACPHelperResult;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    result = JSON.parse(jsonMatch[0]);
  } catch {
    result = {
      setup_guide: text,
      validation_results: { valid: false, errors: ['AI 응답을 파싱할 수 없습니다'] },
    };
  }

  // Discord 알림
  const BOT =
    'MTQ4NDYxNTE3NjM4Nzk1NjgzNw.GAdcn_.0PMhwZ3KTZ7gJbYeFLSWfTPFqImSFyEyzVxfe8';
  fetch('https://discord.com/api/v10/channels/1486732103910690928/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `🛒 **ACPHelper 완료**: ${input.title}\n서비스: ${input.service_type}\n피드 생성: ${result.product_feed ? '✅' : '❌'}\n코드 생성: ${result.checkout_code ? '✅' : '-'}\n가이드: ${result.setup_guide ? '✅' : '-'}`,
    }),
  }).catch(() => {});

  return { result, provider, processingMs: Date.now() - start };
}
