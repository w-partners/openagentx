/**
 * Telegram bot handler for marketplace commands.
 * Webhook-based — no polling. Stateless per request.
 */

import { query } from '../db/pool';
import {
  findLinkByChatId,
  createLink,
  getNotificationSettings,
  updateNotificationSetting,
} from './notifications';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Verification codes: Map<code, { userId, email, expiresAt }>
const verificationCodes = new Map<string, { userId: string; email: string; expiresAt: number }>();

interface TelegramMessage {
  chat: { id: number };
  text?: string;
  from?: { id: number; first_name: string; username?: string };
}

interface TelegramUpdate {
  message?: TelegramMessage;
  callback_query?: {
    id: string;
    from: { id: number };
    message?: { chat: { id: number } };
    data?: string;
  };
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
  });
}

async function sendWithButtons(
  chatId: number,
  text: string,
  buttons: { text: string; callback_data: string }[][],
): Promise<void> {
  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: buttons },
    }),
  });
}

async function answerCallback(callbackId: string, text?: string): Promise<void> {
  await fetch(`${API_BASE}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

// --- Helper: require linked account ---
async function requireLink(chatId: number): Promise<string | null> {
  const link = await findLinkByChatId(String(chatId));
  if (!link) {
    await sendMessage(chatId, '⚠️ 텔레그램 계정이 연결되지 않았습니다.\n/link <이메일> 로 연결해주세요.');
    return null;
  }
  return link.user_id;
}

type CommandHandler = (chatId: number, args: string, msg: TelegramMessage) => Promise<void>;

const commands: Record<string, CommandHandler> = {
  '/start': async (chatId) => {
    await sendMessage(chatId, [
      '🤖 *OpenAgentX 마켓플레이스 봇*',
      '',
      '📌 *기본 명령어*',
      '/search <키워드> — 에이전트 검색',
      '/popular — 인기 에이전트 목록',
      '/categories — 카테고리 목록',
      '',
      '🔗 *계정 연결*',
      '/link <이메일> — 계정 연결',
      '/settings — 알림 설정',
      '',
      '💼 *프로바이더*',
      '/online — 온라인 설정',
      '/offline — 오프라인 설정',
      '/accept <요청ID> — 매칭 수락',
      '/bid <경매ID> <가격> — 입찰',
      '',
      '📊 *정보*',
      '/balance — 잔액 조회',
      '/earnings — 오늘 수익',
      '/agents — 내 에이전트',
      '/history — 최근 작업',
      '/mode <user|provider|both> — 모드 전환',
      '/help — 도움말',
    ].join('\n'));
  },

  '/help': async (chatId) => {
    await sendMessage(chatId, [
      '📖 *명령어 안내*',
      '',
      '/search <키워드> — 에이전트 검색',
      '/popular — 인기 에이전트 TOP 5',
      '/categories — 카테고리 목록',
      '/link <이메일> — 텔레그램 연결',
      '/settings — 알림 설정 관리',
      '/balance — USDC 잔액 조회',
      '/earnings — 오늘 수익 요약',
      '/agents — 내 에이전트 목록',
      '/history — 최근 작업 내역',
      '/online — 매칭 온라인',
      '/offline — 매칭 오프라인',
      '/accept <ID> — 매칭 수락',
      '/bid <ID> <가격> — 경매 입찰',
      '/mode <user|provider|both> — 모드',
    ].join('\n'));
  },

  '/link': async (chatId, args, msg) => {
    const email = args.trim().toLowerCase();

    // Check if it's a verification code
    if (/^\d{6}$/.test(email)) {
      // This is a verification code
      for (const [code, data] of verificationCodes.entries()) {
        if (code === email && data.expiresAt > Date.now()) {
          await createLink(data.userId, String(chatId), msg.from?.username);
          verificationCodes.delete(code);
          await sendMessage(chatId, '✅ 계정이 성공적으로 연결되었습니다!\n알림을 받으실 수 있습니다.');
          return;
        }
      }
      await sendMessage(chatId, '❌ 유효하지 않거나 만료된 인증 코드입니다.');
      return;
    }

    if (!email || !email.includes('@')) {
      await sendMessage(chatId, '사용법: /link <이메일주소>\n예: /link user@example.com\n\n인증 코드가 있으면: /link <6자리코드>');
      return;
    }

    // Find user by email
    const userResult = await query<{ id: string; name: string }>(
      'SELECT id, name FROM users WHERE email = $1',
      [email],
    );
    if (userResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 해당 이메일로 등록된 계정을 찾을 수 없습니다.');
      return;
    }

    const user = userResult.rows[0];

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));
    verificationCodes.set(code, {
      userId: user.id,
      email,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    // Clean up expired codes
    for (const [k, v] of verificationCodes.entries()) {
      if (v.expiresAt < Date.now()) verificationCodes.delete(k);
    }

    await sendMessage(chatId, [
      `🔐 *인증 코드*`,
      '',
      `계정: ${user.name} (${email})`,
      '',
      `인증 코드: \`${code}\``,
      '',
      '위 코드를 /link 명령어로 입력해주세요:',
      `/link ${code}`,
      '',
      '⏰ 10분 내 입력해주세요.',
    ].join('\n'));
  },

  '/settings': async (chatId) => {
    const settings = await getNotificationSettings(String(chatId));
    if (!settings) {
      await sendMessage(chatId, '⚠️ 먼저 /link 로 계정을 연결해주세요.');
      return;
    }

    const on = '✅';
    const off = '❌';

    await sendWithButtons(chatId, [
      '⚙️ *알림 설정*',
      '',
      `전체 알림: ${settings.notifications_enabled ? on : off}`,
      `매칭 알림: ${settings.notify_matching ? on : off}`,
      `경매 알림: ${settings.notify_auctions ? on : off}`,
      `주문 알림: ${settings.notify_orders ? on : off}`,
      `수익 알림: ${settings.notify_earnings ? on : off}`,
      `체인 알림: ${settings.notify_chain ? on : off}`,
      '',
      '버튼을 눌러 설정을 변경하세요:',
    ].join('\n'), [
      [
        { text: `전체 ${settings.notifications_enabled ? '끄기' : '켜기'}`, callback_data: `toggle_notifications_enabled` },
      ],
      [
        { text: `매칭 ${settings.notify_matching ? '끄기' : '켜기'}`, callback_data: `toggle_notify_matching` },
        { text: `경매 ${settings.notify_auctions ? '끄기' : '켜기'}`, callback_data: `toggle_notify_auctions` },
      ],
      [
        { text: `주문 ${settings.notify_orders ? '끄기' : '켜기'}`, callback_data: `toggle_notify_orders` },
        { text: `수익 ${settings.notify_earnings ? '끄기' : '켜기'}`, callback_data: `toggle_notify_earnings` },
      ],
      [
        { text: `체인 ${settings.notify_chain ? '끄기' : '켜기'}`, callback_data: `toggle_notify_chain` },
      ],
    ]);
  },

  '/accept': async (chatId, args) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const requestIdPrefix = args.trim();
    if (!requestIdPrefix) {
      await sendMessage(chatId, '사용법: /accept <요청ID>\n예: /accept abc12345');
      return;
    }

    // Find matching request by ID prefix
    const reqResult = await query<{ id: string; title: string; category: string }>(
      `SELECT id, title, category FROM matching_requests
       WHERE id::text LIKE $1 AND status = 'waiting' AND expires_at > NOW()
       LIMIT 1`,
      [`${requestIdPrefix}%`],
    );
    if (reqResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 해당 매칭 요청을 찾을 수 없습니다.');
      return;
    }

    // Find provider's first active agent in matching category
    const agentResult = await query<{ id: string; name: string }>(
      `SELECT a.id, a.name FROM agents a
       JOIN provider_availability pa ON pa.agent_id = a.id AND pa.user_id = $1
       WHERE a.owner_id = $1 AND a.status = 'active' AND $2 = ANY(pa.categories)
       LIMIT 1`,
      [userId, reqResult.rows[0].category],
    );
    if (agentResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 해당 카테고리에 등록된 에이전트가 없습니다.\n웹사이트에서 에이전트를 등록해주세요.');
      return;
    }

    // Import and call acceptRequest
    const { acceptRequest } = await import('../db/repositories/matching');
    const { notifySafe } = await import('./notifications');

    try {
      const result = await acceptRequest(reqResult.rows[0].id, userId, agentResult.rows[0].id);
      await sendMessage(chatId, [
        '✅ *매칭 수락 완료!*',
        '',
        `요청: ${reqResult.rows[0].title}`,
        `에이전트: ${agentResult.rows[0].name}`,
      ].join('\n'));

      // Notify requester
      const matchReq = await query<{ requester_id: string | null }>(
        'SELECT requester_id FROM matching_requests WHERE id = $1',
        [reqResult.rows[0].id],
      );
      if (matchReq.rows[0]?.requester_id) {
        const providerName = (await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId])).rows[0]?.name ?? '제공자';
        notifySafe(matchReq.rows[0].requester_id, {
          type: 'matching_accepted',
          providerName,
          requestId: reqResult.rows[0].id,
          agentName: agentResult.rows[0].name,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '수락에 실패했습니다';
      await sendMessage(chatId, `❌ ${msg}`);
    }
  },

  '/bid': async (chatId, args) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const parts = args.trim().split(/\s+/);
    if (parts.length < 2) {
      await sendMessage(chatId, '사용법: /bid <경매ID> <가격>\n예: /bid abc12345 50');
      return;
    }

    const [auctionIdPrefix, priceStr] = parts;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) {
      await sendMessage(chatId, '❌ 유효한 가격을 입력해주세요.');
      return;
    }

    // Find auction
    const auctionResult = await query<{ id: string; title: string; category: string }>(
      `SELECT id, title, category FROM auction_requests
       WHERE id::text LIKE $1 AND status = 'open' AND expires_at > NOW()
       LIMIT 1`,
      [`${auctionIdPrefix}%`],
    );
    if (auctionResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 해당 경매를 찾을 수 없습니다.');
      return;
    }

    // Find provider's agent
    const agentResult = await query<{ id: string; name: string }>(
      `SELECT id, name FROM agents WHERE owner_id = $1 AND status = 'active' LIMIT 1`,
      [userId],
    );
    if (agentResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 활성 에이전트가 없습니다.');
      return;
    }

    const { placeBid } = await import('../db/repositories/auctions');
    const { notifySafe } = await import('./notifications');

    try {
      await placeBid({
        auction_id: auctionResult.rows[0].id,
        provider_id: userId,
        agent_id: agentResult.rows[0].id,
        bid_fee: 0,
        offer_price: price,
        offer_description: `텔레그램 입찰: $${price}`,
      });

      await sendMessage(chatId, [
        '✅ *입찰 완료!*',
        '',
        `경매: ${auctionResult.rows[0].title}`,
        `제안 가격: $${price.toFixed(2)}`,
        `에이전트: ${agentResult.rows[0].name}`,
      ].join('\n'));

      // Notify auction owner
      const auction = await query<{ requester_id: string | null }>(
        'SELECT requester_id FROM auction_requests WHERE id = $1',
        [auctionResult.rows[0].id],
      );
      if (auction.rows[0]?.requester_id) {
        const providerName = (await query<{ name: string }>('SELECT name FROM users WHERE id = $1', [userId])).rows[0]?.name ?? '입찰자';
        notifySafe(auction.rows[0].requester_id, {
          type: 'auction_bid',
          bidderName: providerName,
          offerPrice: price,
          auctionId: auctionResult.rows[0].id,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '입찰에 실패했습니다';
      await sendMessage(chatId, `❌ ${msg}`);
    }
  },

  '/online': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    // Find user's agents and set all online
    const agentsResult = await query<{ id: string; name: string; category: string }>(
      "SELECT id, name, category FROM agents WHERE owner_id = $1 AND status = 'active'",
      [userId],
    );
    if (agentsResult.rows.length === 0) {
      await sendMessage(chatId, '❌ 활성 에이전트가 없습니다.');
      return;
    }

    const { setOnline } = await import('../db/repositories/matching');

    for (const agent of agentsResult.rows) {
      await setOnline(userId, agent.id, [agent.category]);
    }

    const names = agentsResult.rows.map((a) => a.name).join(', ');
    await sendMessage(chatId, `🟢 *온라인 설정 완료*\n\n에이전트: ${names}\n\n매칭 요청을 받을 수 있습니다.`);
  },

  '/offline': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const { setOffline } = await import('../db/repositories/matching');
    await setOffline(userId);
    await sendMessage(chatId, '🔴 *오프라인 설정 완료*\n\n매칭 요청을 받지 않습니다.');
  },

  '/balance': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const result = await query<{ balance_usdc: string }>(
      'SELECT balance_usdc FROM users WHERE id = $1',
      [userId],
    );
    if (result.rows.length === 0) {
      await sendMessage(chatId, '❌ 계정 정보를 찾을 수 없습니다.');
      return;
    }

    const balance = parseFloat(result.rows[0].balance_usdc);
    await sendMessage(chatId, `💰 *잔액 조회*\n\nUSDC: $${balance.toFixed(2)}\n\n충전: https://openagentx.org/topup`);
  },

  '/earnings': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const result = await query<{ total: string; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
       FROM reward_history
       WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
      [userId],
    );

    const total = parseFloat(result.rows[0].total);
    const count = parseInt(result.rows[0].count, 10);

    const byTypeResult = await query<{ type: string; total: string }>(
      `SELECT type, SUM(amount) AS total
       FROM reward_history
       WHERE user_id = $1 AND created_at >= CURRENT_DATE
       GROUP BY type ORDER BY total DESC`,
      [userId],
    );

    const lines = byTypeResult.rows.map((r) => `  ${r.type}: $${parseFloat(r.total).toFixed(2)}`);

    await sendMessage(chatId, [
      '📊 *오늘 수익 요약*',
      '',
      `총 수익: $${total.toFixed(2)}`,
      `건수: ${count}건`,
      '',
      lines.length > 0 ? '*항목별:*' : '아직 오늘 수익이 없습니다.',
      ...lines,
    ].join('\n'));
  },

  '/agents': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const result = await query<{ name: string; status: string; total_jobs: number; avg_rating: number }>(
      'SELECT name, status, total_jobs, avg_rating FROM agents WHERE owner_id = $1 ORDER BY created_at DESC LIMIT 10',
      [userId],
    );

    if (result.rows.length === 0) {
      await sendMessage(chatId, '등록된 에이전트가 없습니다.\n🔗 https://openagentx.org/agents/register');
      return;
    }

    const statusEmoji: Record<string, string> = { active: '🟢', pending: '🟡', suspended: '🔴', rejected: '❌' };
    const lines = result.rows.map((a) =>
      `${statusEmoji[a.status] ?? '⚪'} *${a.name}* (${a.status})\n   ⭐${a.avg_rating} | ${a.total_jobs}건`
    );

    await sendMessage(chatId, `🤖 *내 에이전트*\n\n${lines.join('\n\n')}`);
  },

  '/history': async (chatId) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const result = await query<{ id: string; status: string; payment_amount: string; created_at: Date }>(
      `SELECT mj.id, mj.status, mj.payment_amount, mj.created_at
       FROM marketplace_jobs mj
       WHERE mj.buyer_id = $1
       ORDER BY mj.created_at DESC LIMIT 5`,
      [userId],
    );

    if (result.rows.length === 0) {
      await sendMessage(chatId, '📋 최근 작업 내역이 없습니다.');
      return;
    }

    const statusEmoji: Record<string, string> = {
      completed: '✅', pending: '⏳', processing: '🔄', failed: '❌', deposited: '💰',
    };
    const lines = result.rows.map((j) => {
      const date = new Date(j.created_at).toLocaleDateString('ko-KR');
      return `${statusEmoji[j.status] ?? '⚪'} ${j.id.slice(0, 8)} | $${parseFloat(j.payment_amount).toFixed(2)} | ${date}`;
    });

    await sendMessage(chatId, `📋 *최근 작업 내역*\n\n${lines.join('\n')}`);
  },

  '/mode': async (chatId, args) => {
    const userId = await requireLink(chatId);
    if (!userId) return;

    const mode = args.trim().toLowerCase();
    if (!['user', 'provider', 'both'].includes(mode)) {
      await sendMessage(chatId, '사용법: /mode <user|provider|both>\n\n• user — 구매자 모드\n• provider — 제공자 모드\n• both — 양쪽 모두');
      return;
    }

    await query('UPDATE users SET metadata = jsonb_set(COALESCE(metadata, \'{}\'::jsonb), \'{telegram_mode}\', $1) WHERE id = $2', [
      JSON.stringify(mode),
      userId,
    ]);

    const modeLabel: Record<string, string> = { user: '구매자', provider: '제공자', both: '구매자+제공자' };
    await sendMessage(chatId, `✅ 모드가 *${modeLabel[mode]}*로 변경되었습니다.`);
  },

  '/search': async (chatId, args) => {
    if (!args.trim()) {
      await sendMessage(chatId, '사용법: /search <검색어>\n예: /search 코딩 어시스턴트');
      return;
    }

    const result = await query<{ name: string; category: string; avg_rating: number; total_jobs: number }>(
      `SELECT name, category, avg_rating, total_jobs FROM agents
       WHERE status = 'active' AND search_vector @@ plainto_tsquery('simple', $1)
       ORDER BY ranking_score DESC LIMIT 5`,
      [args.trim()],
    );

    if (result.rows.length === 0) {
      await sendMessage(chatId, `"${args.trim()}" 검색 결과가 없습니다.`);
      return;
    }

    const lines = result.rows.map((a, i) =>
      `${i + 1}. *${a.name}* (${a.category})\n   ⭐${a.avg_rating} | ${a.total_jobs}건 완료`
    );
    await sendMessage(chatId, `🔍 *검색 결과: "${args.trim()}"*\n\n${lines.join('\n\n')}`);
  },

  '/popular': async (chatId) => {
    const result = await query<{ name: string; category: string; avg_rating: number; total_jobs: number }>(
      `SELECT name, category, avg_rating, total_jobs FROM agents
       WHERE status = 'active' ORDER BY ranking_score DESC LIMIT 5`,
    );

    if (result.rows.length === 0) {
      await sendMessage(chatId, '등록된 에이전트가 없습니다.');
      return;
    }

    const lines = result.rows.map((a, i) =>
      `${i + 1}. *${a.name}* (${a.category})\n   ⭐${a.avg_rating} | ${a.total_jobs}건`
    );
    await sendMessage(chatId, `🏆 *인기 에이전트 TOP 5*\n\n${lines.join('\n\n')}`);
  },

  '/categories': async (chatId) => {
    await sendMessage(chatId, [
      '📂 *카테고리*',
      '',
      '• 코딩/개발',
      '• 데이터 분석',
      '• 콘텐츠 생성',
      '• 번역/로컬라이제이션',
      '• 마케팅/SEO',
      '• 고객 서비스',
      '• 리서치/조사',
      '• 금융/투자 분석',
      '• 암호화폐/블록체인',
      '• 디자인/이미지',
      '• 교육/튜터링',
      '• 자동화/워크플로우',
    ].join('\n'));
  },
};

// --- Callback Query Handler ---

async function handleCallback(callbackId: string, chatId: number, data: string): Promise<void> {
  if (!data.startsWith('toggle_')) return;

  const field = data.replace('toggle_', '');
  const settings = await getNotificationSettings(String(chatId));
  if (!settings) {
    await answerCallback(callbackId, '계정 연결이 필요합니다');
    return;
  }

  const currentValue = (settings as unknown as Record<string, unknown>)[field];
  if (typeof currentValue !== 'boolean') {
    await answerCallback(callbackId, '알 수 없는 설정입니다');
    return;
  }

  await updateNotificationSetting(String(chatId), field, !currentValue);
  await answerCallback(callbackId, `${!currentValue ? '켜짐' : '꺼짐'}`);

  // Refresh settings display
  await commands['/settings'](chatId, '', { chat: { id: chatId } });
}

// --- Main Handler ---

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  // Handle callback queries (inline buttons)
  if (update.callback_query) {
    const cb = update.callback_query;
    const cbChatId = cb.message?.chat.id;
    if (cbChatId && cb.data) {
      try {
        await handleCallback(cb.id, cbChatId, cb.data);
      } catch {
        await answerCallback(cb.id, '오류가 발생했습니다');
      }
    }
    return;
  }

  const message = update.message;
  if (!message?.text) return;

  const chatId = message.chat.id;
  const text = message.text.trim();

  // Parse command and args
  const spaceIdx = text.indexOf(' ');
  const command = spaceIdx > 0 ? text.slice(0, spaceIdx).toLowerCase() : text.toLowerCase();
  // Strip @botname from command
  const cleanCommand = command.includes('@') ? command.split('@')[0] : command;
  const args = spaceIdx > 0 ? text.slice(spaceIdx + 1) : '';

  const handler = commands[cleanCommand];
  if (handler) {
    try {
      await handler(chatId, args, message);
    } catch {
      await sendMessage(chatId, '⚠️ 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
  } else {
    await sendMessage(chatId, '알 수 없는 명령어입니다. /help 로 사용 가능한 명령어를 확인하세요.');
  }
}

// Export verification codes map for use by API route
export { verificationCodes };
