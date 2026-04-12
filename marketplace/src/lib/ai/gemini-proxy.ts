/** Gemini Proxy (localhost:14900) — OpenAI 호환 API */
export const GEMINI_PROXY_URL = process.env.GEMINI_PROXY_URL ?? 'http://localhost:14900';
export const GEMINI_PROXY_KEY = process.env.GEMINI_PROXY_KEY ?? '';

const MAX_RETRIES = 3;

export interface GeminiProxyOptions {
  model?: string;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Call Gemini proxy with retry logic for 502/404 errors (key rotation).
 */
export async function callGeminiProxy(
  messages: { role: string; content: string }[],
  options?: GeminiProxyOptions,
): Promise<string> {
  const model = options?.model ?? 'gemini-2.0-flash';
  const temperature = options?.temperature ?? 0.7;
  const retries = options?.maxRetries ?? MAX_RETRIES;

  let lastError = '';
  for (let i = 0; i < retries; i++) {
    const res = await fetch(`${GEMINI_PROXY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GEMINI_PROXY_KEY}`,
      },
      body: JSON.stringify({ model, messages, temperature }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.choices?.[0]?.message?.content ?? '결과를 생성하지 못했습니다.';
    }

    lastError = await res.text();
    // 502/404 에러는 키 로테이션 문제 — 재시도
    if (res.status === 502 || res.status === 404) continue;
    // 다른 에러는 즉시 실패
    throw new Error(`AI 처리 실패 (${res.status}): ${lastError.substring(0, 200)}`);
  }

  throw new Error(`AI 처리 실패 (${retries}회 재시도 후): ${lastError.substring(0, 200)}`);
}
