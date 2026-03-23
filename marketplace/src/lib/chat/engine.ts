import { GoogleGenerativeAI } from '@google/generative-ai';
import * as chatProfilesRepo from '@/lib/db/repositories/chat-profiles';
import type { ChatMessage, UserMode } from '@/lib/db/repositories/chat-profiles';

// Server-side Gemini keys (from env, with rotation)
const SERVER_GEMINI_KEYS: string[] = (process.env.GOOGLE_AI_API_KEYS ?? process.env.GOOGLE_AI_API_KEY ?? '')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

let serverKeyIndex = 0;

function getServerGeminiKey(): string {
  if (SERVER_GEMINI_KEYS.length === 0) {
    throw new Error('No server Gemini API keys configured (GOOGLE_AI_API_KEYS)');
  }
  const key = SERVER_GEMINI_KEYS[serverKeyIndex % SERVER_GEMINI_KEYS.length];
  serverKeyIndex++;
  return key;
}

// Function call patterns detected in AI response
const FUNCTION_PATTERNS: Record<string, RegExp> = {
  SEARCH_AGENTS: /\[SEARCH_AGENTS:\s*(.+?)\]/,
  FULFILL: /\[FULFILL:\s*(.+?)\]/,
  CREATE_AGENT: /\[CREATE_AGENT:\s*(.+?),\s*(.+?),\s*(.+?)\]/,
  CREATE_AUCTION: /\[CREATE_AUCTION:\s*(.+?),\s*(.+?)\]/,
  CREATE_MATCHING: /\[CREATE_MATCHING:\s*(.+?),\s*(.+?)\]/,
  START_CHAIN: /\[START_CHAIN:\s*(.+?)\]/,
  CHECK_BALANCE: /\[CHECK_BALANCE\]/,
  CHECK_REWARDS: /\[CHECK_REWARDS\]/,
  MY_AGENTS: /\[MY_AGENTS\]/,
  SWITCH_MODE: /\[SWITCH_MODE:\s*(user|provider|both)\]/,
};

function buildSystemPrompt(name: string, mode: UserMode): string {
  const modeLabel = mode === 'user' ? '사용자' : mode === 'provider' ? '제공자' : '사용자+제공자';

  return `당신은 OpenAgentX의 AI 어시스턴트입니다. 사용자의 이름은 "${name}"이고, 현재 모드는 "${modeLabel}"입니다.

OpenAgentX는 AI 에이전트 마켓플레이스입니다. 사용자가 필요한 AI 서비스를 찾거나, 자신의 AI 서비스를 등록할 수 있습니다.

항상 한국어로 답변하세요. 친근하고 도움되는 어조를 유지하세요.

## 사용 가능한 함수
응답에 아래 태그를 포함하면 시스템이 자동으로 실행합니다:

- [SEARCH_AGENTS: 검색어] — 에이전트 검색
- [FULFILL: 요청내용] — 요청 처리 (에이전트 자동 매칭)
- [CREATE_AGENT: 이름, 설명, 카테고리] — 새 에이전트 등록 (제공자 모드)
- [CREATE_AUCTION: 제목, 설명] — 역경매 생성
- [CREATE_MATCHING: 제목, 카테고리] — 매칭 요청 생성
- [START_CHAIN: 플로우ID] — 체인 실행
- [CHECK_BALANCE] — 잔액 확인
- [CHECK_REWARDS] — 리워드 확인
- [MY_AGENTS] — 내 에이전트 목록
- [SWITCH_MODE: user/provider/both] — 모드 변경

## 규칙
1. 사용자 요청에 맞는 함수를 호출하세요
2. 함수 결과를 받으면 자연스럽게 요약해서 전달하세요
3. 모르는 것은 모른다고 솔직히 말하세요
4. 개인정보(API 키, 패스코드)는 절대 노출하지 마세요
5. ${mode === 'provider' || mode === 'both' ? '제공자 기능(에이전트 등록, 통계 확인)도 안내하세요' : ''}
6. 대화는 짧고 명확하게 유지하세요`;
}

async function executeFunction(
  fnName: string,
  args: string[],
  profileId: string,
  userId: string | null,
): Promise<string> {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['x-user-id'] = userId;

  try {
    switch (fnName) {
      case 'SEARCH_AGENTS': {
        const res = await fetch(`${baseUrl}/api/agents?q=${encodeURIComponent(args[0])}&limit=5`, { headers });
        const data = await res.json();
        if (!data.data?.length) return '검색 결과가 없습니다.';
        return `검색 결과 ${data.data.length}개:\n${data.data.map((a: { name: string; category: string; avg_rating: number }) =>
          `- ${a.name} (${a.category}, 평점 ${a.avg_rating})`
        ).join('\n')}`;
      }

      case 'FULFILL': {
        const res = await fetch(`${baseUrl}/api/fulfill`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ query: args[0] }),
        });
        const data = await res.json();
        if (!data.success) return `처리 실패: ${data.error || '알 수 없는 오류'}`;
        if (data.source === 'registered') {
          return `매칭된 에이전트: ${data.agent.name}\n결과: ${data.result.response}`;
        }
        if (data.source === 'auction') {
          return `역경매가 생성되었습니다! ID: ${data.auction_id}`;
        }
        return `동적 처리 결과: ${data.result?.response || '처리 완료'}`;
      }

      case 'CREATE_AGENT': {
        if (!userId) return '에이전트를 등록하려면 로그인이 필요합니다.';
        const res = await fetch(`${baseUrl}/api/agents`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ name: args[0]?.trim(), description: args[1]?.trim(), category: args[2]?.trim() }),
        });
        const data = await res.json();
        if (!data.success) return `등록 실패: ${data.error}`;
        return `에이전트가 등록되었습니다! ID: ${data.data.id}`;
      }

      case 'CREATE_AUCTION': {
        const res = await fetch(`${baseUrl}/api/auctions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'create', title: args[0]?.trim(), description: args[1]?.trim(), category: 'general', expires_in_hours: 24 }),
        });
        const data = await res.json();
        return data.success ? `역경매 생성 완료! ID: ${data.data?.id || data.auction_id}` : `생성 실패: ${data.error}`;
      }

      case 'CREATE_MATCHING': {
        const res = await fetch(`${baseUrl}/api/matching`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'create', title: args[0]?.trim(), category: args[1]?.trim(), description: args[0]?.trim() }),
        });
        const data = await res.json();
        return data.success ? `매칭 요청 생성 완료!` : `생성 실패: ${data.error}`;
      }

      case 'START_CHAIN': {
        const res = await fetch(`${baseUrl}/api/chains`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ action: 'execute', flow_id: args[0]?.trim() }),
        });
        const data = await res.json();
        return data.success ? `체인 실행 시작!` : `실행 실패: ${data.error}`;
      }

      case 'CHECK_BALANCE': {
        if (!userId) return '잔액을 확인하려면 로그인이 필요합니다.';
        const res = await fetch(`${baseUrl}/api/topup`, { headers });
        const data = await res.json();
        return `충전 요청 내역: ${JSON.stringify(data.requests?.length ?? 0)}건`;
      }

      case 'CHECK_REWARDS': {
        if (!userId) return '리워드를 확인하려면 로그인이 필요합니다.';
        const res = await fetch(`${baseUrl}/api/rewards`, { headers });
        const data = await res.json();
        const stats = data.data?.stats;
        return stats ? `총 리워드: $${stats.total_earned ?? 0}` : '리워드 정보를 불러올 수 없습니다.';
      }

      case 'MY_AGENTS': {
        if (!userId) return '내 에이전트를 보려면 로그인이 필요합니다.';
        const res = await fetch(`${baseUrl}/api/agents?owner=${userId}&limit=10`, { headers });
        const data = await res.json();
        if (!data.data?.length) return '등록된 에이전트가 없습니다.';
        return `내 에이전트 ${data.data.length}개:\n${data.data.map((a: { name: string; status: string }) =>
          `- ${a.name} (${a.status})`
        ).join('\n')}`;
      }

      case 'SWITCH_MODE': {
        const newMode = args[0]?.trim() as 'user' | 'provider' | 'both';
        await chatProfilesRepo.updateMode(profileId, newMode);
        const labels = { user: '사용자', provider: '제공자', both: '전체' };
        return `모드가 "${labels[newMode]}"로 변경되었습니다.`;
      }

      default:
        return '';
    }
  } catch (err) {
    return `함수 실행 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
  }
}

export async function chat(profileId: string, message: string): Promise<string> {
  const profile = await chatProfilesRepo.findById(profileId);
  if (!profile) throw new Error('프로필을 찾을 수 없습니다');

  const geminiKey = getServerGeminiKey();
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  // Build conversation history for context
  const history = await chatProfilesRepo.getHistory(profileId, 20);
  const systemPrompt = buildSystemPrompt(profile.display_name, profile.user_mode as UserMode);

  const chatSession = model.startChat({
    history: history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    systemInstruction: systemPrompt,
  });

  // First AI call
  const result = await chatSession.sendMessage(message);
  let response = result.response.text();

  // Check for function calls in response
  for (const [fnName, pattern] of Object.entries(FUNCTION_PATTERNS)) {
    const match = response.match(pattern);
    if (match) {
      const args = match.slice(1);
      const fnResult = await executeFunction(fnName, args, profileId, profile.user_id);

      if (fnResult) {
        // Remove the function tag from response
        response = response.replace(pattern, '').trim();

        // Feed function result back to AI for natural language response
        const followUp = await chatSession.sendMessage(
          `[시스템] 함수 실행 결과:\n${fnResult}\n\n위 결과를 사용자에게 자연스럽게 전달해주세요.`
        );
        response = followUp.response.text();
      }
      break; // Process one function at a time
    }
  }

  // Save to history
  const now = new Date().toISOString();
  await chatProfilesRepo.appendHistory(profileId, [
    { role: 'user', content: message, timestamp: now },
    { role: 'assistant', content: response, timestamp: now },
  ]);

  // Trim history if needed (keep last 100 messages)
  await chatProfilesRepo.trimHistory(profileId, 100);

  return response;
}

