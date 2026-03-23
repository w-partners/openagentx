import { generateResponse } from './fallback-chain';
import { query } from '../db/pool';

const SYSTEM_PROMPT = `당신은 OpenAgentX 범용 AI 에이전트 마켓플레이스의 컨시어지입니다.

OpenAgentX는 코딩, 데이터 분석, 콘텐츠 생성, 번역, 마케팅, 고객 서비스, 리서치, 금융, 암호화폐, 디자인, 교육, 자동화 등 모든 분야의 AI 에이전트를 거래할 수 있는 마켓플레이스입니다.

역할:
1. 플랫폼 안내: 사용법, 지갑 연결, USDC 입금, Job 요청 방법을 안내합니다.
2. 에이전트 추천: 사용자 니즈에 맞는 에이전트를 추천합니다. 모든 분야의 에이전트를 다룹니다.
3. 에이전트 빌더: 대화형으로 에이전트 서비스를 설계하고 등록을 도와줍니다.

규칙:
- 항상 한국어로 응답합니다.
- 간결하고 친절하게 답변합니다.
- 에이전트 추천 시 카테고리, 가격, 평점을 기준으로 합니다.
- 투자 조언은 하지 않습니다 (NFA 면책).`;

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export async function chatWithConcierge(
  sessionId: string,
  userMessage: string,
  userId?: string,
  conversationType: 'guide' | 'recommend' | 'build_agent' | 'faq' = 'guide',
): Promise<string> {
  // Load conversation history
  const history = await loadConversation(sessionId);

  // Build context from history
  const contextMessages = history
    .slice(-10) // Last 10 messages for context
    .map((m) => `${m.role === 'user' ? '사용자' : 'AI'}: ${m.content}`)
    .join('\n');

  const fullPrompt = contextMessages
    ? `이전 대화:\n${contextMessages}\n\n사용자: ${userMessage}`
    : userMessage;

  const response = await generateResponse({
    systemPrompt: SYSTEM_PROMPT,
    userMessage: fullPrompt,
    maxTokens: 1024,
  });

  // Save conversation (trim to last N messages to prevent unbounded growth)
  const MAX_CONVERSATION_MESSAGES = 50;
  const newMessages: ConversationMessage[] = [
    ...history,
    { role: 'user' as const, content: userMessage, timestamp: new Date().toISOString() },
    { role: 'assistant' as const, content: response.text, timestamp: new Date().toISOString() },
  ].slice(-MAX_CONVERSATION_MESSAGES);

  await saveConversation(sessionId, userId, conversationType, newMessages);

  return response.text;
}

async function loadConversation(sessionId: string): Promise<ConversationMessage[]> {
  const result = await query<{ messages: ConversationMessage[] }>(
    "SELECT messages FROM concierge_conversations WHERE session_id = $1 AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
    [sessionId],
  );
  return result.rows[0]?.messages ?? [];
}

async function saveConversation(
  sessionId: string,
  userId: string | undefined,
  conversationType: string,
  messages: ConversationMessage[],
): Promise<void> {
  await query(
    `INSERT INTO concierge_conversations (session_id, user_id, conversation_type, messages, status)
     VALUES ($1, $2, $3, $4, 'active')
     ON CONFLICT (session_id) WHERE status = 'active'
     DO UPDATE SET messages = $4, updated_at = NOW()`,
    [sessionId, userId ?? null, conversationType, JSON.stringify(messages)],
  );
}
