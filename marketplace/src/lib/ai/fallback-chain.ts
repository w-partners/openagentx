/**
 * AI LLM Fallback Chain: Claude → Gemini (key rotation) → Ollama → Static
 * Gemini keys rotate on 429/error. Validation uses list_models (zero cost).
 * Ollama runs locally at http://localhost:11434 with gemma3:4b model.
 */

interface LLMResponse {
  text: string;
  provider: 'claude' | 'gemini' | 'ollama' | 'static';
}

interface LLMOptions {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}

// --- Gemini Key Rotation ---

const GEMINI_KEYS: string[] = (process.env.GOOGLE_AI_API_KEYS ?? process.env.GOOGLE_AI_API_KEY ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

let geminiKeyIndex = 0;

function getNextGeminiKey(): string | null {
  if (GEMINI_KEYS.length === 0) return null;
  const key = GEMINI_KEYS[geminiKeyIndex % GEMINI_KEYS.length];
  geminiKeyIndex++;
  return key;
}

/** Zero-cost key validation via list_models */
export async function validateGeminiKey(key: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    );
    return res.ok;
  } catch {
    return false;
  }
}

// --- Claude ---

async function callClaude(options: LLMOptions): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: options.maxTokens ?? 1024,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage }],
    }),
  });

  if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// --- Gemini (with key rotation) ---

async function callGeminiWithKey(key: string, options: LLMOptions): Promise<string> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.systemPrompt }] },
        contents: [{ parts: [{ text: options.userMessage }] }],
        generationConfig: { maxOutputTokens: options.maxTokens ?? 1024 },
      }),
    },
  );

  if (!res.ok) {
    const status = res.status;
    throw new Error(`Gemini API error: ${status}`);
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

async function callGemini(options: LLMOptions): Promise<string> {
  // Try each key until one works (full rotation)
  const totalKeys = GEMINI_KEYS.length;
  if (totalKeys === 0) throw new Error('No Gemini API keys configured');

  for (let i = 0; i < totalKeys; i++) {
    const key = getNextGeminiKey();
    if (!key) break;
    try {
      return await callGeminiWithKey(key, options);
    } catch {
      // Try next key (429 rate limit or other error)
      continue;
    }
  }
  throw new Error('All Gemini keys exhausted');
}

// --- Ollama (local) ---

const OLLAMA_BASE_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'gemma3:4b';
const OLLAMA_TIMEOUT_MS = 120_000; // CPU-only: needs more time

async function callOllama(options: LLMOptions): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt: options.userMessage,
        system: options.systemPrompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error(`Ollama API error: ${res.status}`);
    const data = await res.json();
    return data.response;
  } finally {
    clearTimeout(timeout);
  }
}

// --- Static fallback ---

function staticFallback(options: LLMOptions): string {
  return `죄송합니다. 현재 AI 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.\n\n요청 내용: ${options.userMessage.slice(0, 100)}...`;
}

// --- Main entry ---

export async function generateResponse(options: LLMOptions): Promise<LLMResponse> {
  // Try Claude first
  try {
    const text = await callClaude(options);
    return { text, provider: 'claude' };
  } catch {
    // Fallback to Gemini
  }

  // Try Gemini with key rotation
  try {
    const text = await callGemini(options);
    return { text, provider: 'gemini' };
  } catch {
    // Fallback to Ollama
  }

  // Try Ollama local
  try {
    const text = await callOllama(options);
    return { text, provider: 'ollama' };
  } catch {
    // Final fallback
  }

  return { text: staticFallback(options), provider: 'static' };
}
