/**
 * Telegram notification service for marketplace events.
 * Central hub that formats and sends notifications based on event type.
 */

import { query } from '../db/pool';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
const API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

// --- Notification Event Types ---

export type NotificationEvent =
  | { type: 'matching_request'; title: string; category: string; urgency: string; requestId: string }
  | { type: 'matching_accepted'; providerName: string; requestId: string; agentName?: string }
  | { type: 'auction_new'; title: string; category: string; budget: number; auctionId: string }
  | { type: 'auction_bid'; bidderName: string; offerPrice: number; auctionId: string }
  | { type: 'auction_selected'; auctionId: string; auctionTitle?: string }
  | { type: 'order_received'; serviceName: string; amount: number; jobId: string }
  | { type: 'order_completed'; serviceName: string; jobId: string }
  | { type: 'chain_step'; chainName: string; stepName: string; stepIndex: number; status: string }
  | { type: 'earning'; amount: number; source: string }
  | { type: 'agent_created'; agentName: string; agentId: string }
  | { type: 'referral_signup'; referredName: string }
  | { type: 'reward'; amount: number; reason: string }
  | { type: 'low_balance'; balance: number };

// --- Internal Send ---

async function sendTelegram(chatId: string, text: string): Promise<void> {
  await fetch(`${API_BASE}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
    }),
  });
}

// --- Notification Category Check ---

function shouldNotify(
  link: { notifications_enabled: boolean; notify_matching: boolean; notify_auctions: boolean; notify_orders: boolean; notify_earnings: boolean; notify_chain: boolean },
  event: NotificationEvent,
): boolean {
  if (!link.notifications_enabled) return false;
  switch (event.type) {
    case 'matching_request':
    case 'matching_accepted':
      return link.notify_matching;
    case 'auction_new':
    case 'auction_bid':
    case 'auction_selected':
      return link.notify_auctions;
    case 'order_received':
    case 'order_completed':
      return link.notify_orders;
    case 'earning':
    case 'reward':
    case 'low_balance':
    case 'referral_signup':
      return link.notify_earnings;
    case 'chain_step':
      return link.notify_chain;
    case 'agent_created':
      return true;
    default:
      return true;
  }
}

// --- Message Formatting ---

const URGENCY_EMOJI: Record<string, string> = {
  low: '🟢',
  normal: '🔵',
  urgent: '🟠',
  critical: '🔴',
};

function formatEvent(event: NotificationEvent): string {
  switch (event.type) {
    case 'matching_request':
      return [
        `${URGENCY_EMOJI[event.urgency] ?? '🔵'} *새 매칭 요청*`,
        '',
        `제목: ${event.title}`,
        `카테고리: ${event.category}`,
        `긴급도: ${event.urgency}`,
        '',
        `수락하려면: /accept ${event.requestId.slice(0, 8)}`,
      ].join('\n');

    case 'matching_accepted':
      return [
        '✅ *매칭 수락됨*',
        '',
        `제공자: ${event.providerName}`,
        event.agentName ? `에이전트: ${event.agentName}` : '',
        '',
        '곧 연락이 올 예정입니다.',
      ].filter(Boolean).join('\n');

    case 'auction_new':
      return [
        '🏷️ *새 경매 등록*',
        '',
        `제목: ${event.title}`,
        `카테고리: ${event.category}`,
        `예산: $${event.budget.toFixed(2)}`,
        '',
        `입찰하려면: /bid ${event.auctionId.slice(0, 8)} <가격>`,
      ].join('\n');

    case 'auction_bid':
      return [
        '💰 *새 입찰 도착*',
        '',
        `입찰자: ${event.bidderName}`,
        `제안 가격: $${event.offerPrice.toFixed(2)}`,
        '',
        '웹사이트에서 입찰을 확인하세요.',
      ].join('\n');

    case 'auction_selected':
      return [
        '🎉 *입찰 선정됨!*',
        '',
        event.auctionTitle ? `경매: ${event.auctionTitle}` : '',
        '축하합니다! 작업을 시작해주세요.',
      ].filter(Boolean).join('\n');

    case 'order_received':
      return [
        '📦 *새 주문 접수*',
        '',
        `서비스: ${event.serviceName}`,
        `금액: $${event.amount.toFixed(2)}`,
        '',
        '작업이 자동 처리됩니다.',
      ].join('\n');

    case 'order_completed':
      return [
        '✅ *주문 완료*',
        '',
        `서비스: ${event.serviceName}`,
        '',
        '결과를 웹사이트에서 확인하세요.',
      ].join('\n');

    case 'chain_step':
      return [
        '⛓️ *체인 진행 알림*',
        '',
        `체인: ${event.chainName}`,
        `단계 ${event.stepIndex + 1}: ${event.stepName}`,
        `상태: ${event.status === 'completed' ? '완료 ✅' : event.status === 'failed' ? '실패 ❌' : '진행중 🔄'}`,
      ].join('\n');

    case 'earning':
      return [
        '💵 *수익 발생*',
        '',
        `금액: $${event.amount.toFixed(2)}`,
        `출처: ${event.source}`,
      ].join('\n');

    case 'agent_created':
      return [
        '🤖 *에이전트 등록 완료*',
        '',
        `이름: ${event.agentName}`,
        '',
        '심사 후 활성화됩니다.',
      ].join('\n');

    case 'referral_signup':
      return [
        '👥 *추천 가입 완료*',
        '',
        `${event.referredName}님이 추천으로 가입했습니다!`,
        '추천 보상이 지급됩니다.',
      ].join('\n');

    case 'reward':
      return [
        '🎁 *보상 지급*',
        '',
        `금액: $${event.amount.toFixed(2)}`,
        `사유: ${event.reason}`,
      ].join('\n');

    case 'low_balance':
      return [
        '⚠️ *잔액 부족 알림*',
        '',
        `현재 잔액: $${event.balance.toFixed(2)}`,
        '',
        '서비스 이용을 위해 충전해주세요.',
        '🔗 https://openagentx.org/topup',
      ].join('\n');

    default:
      return '📢 새 알림이 있습니다.';
  }
}

// --- Public API ---

interface TelegramLink {
  telegram_chat_id: string;
  notifications_enabled: boolean;
  notify_matching: boolean;
  notify_auctions: boolean;
  notify_orders: boolean;
  notify_earnings: boolean;
  notify_chain: boolean;
}

/** Send notification to a marketplace user by user_id */
export async function notifyUser(userId: string, event: NotificationEvent): Promise<void> {
  const result = await query<TelegramLink>(
    'SELECT telegram_chat_id, notifications_enabled, notify_matching, notify_auctions, notify_orders, notify_earnings, notify_chain FROM telegram_links WHERE user_id = $1',
    [userId],
  );
  const link = result.rows[0];
  if (!link) return;
  if (!shouldNotify(link, event)) return;

  const text = formatEvent(event);
  await sendTelegram(link.telegram_chat_id, text);
}

/** Send notification to all online providers in a category */
export async function notifyProviders(category: string, event: NotificationEvent): Promise<void> {
  const result = await query<{ user_id: string }>(
    `SELECT DISTINCT pa.user_id
     FROM provider_availability pa
     WHERE pa.is_online = TRUE AND $1 = ANY(pa.categories)`,
    [category],
  );

  const promises = result.rows.map((row) => notifyUser(row.user_id, event));
  await Promise.allSettled(promises);
}

/** Fire-and-forget notification — never throws */
export function notifySafe(userId: string, event: NotificationEvent): void {
  notifyUser(userId, event).catch(() => {});
}

/** Fire-and-forget provider notification — never throws */
export function notifyProvidersSafe(category: string, event: NotificationEvent): void {
  notifyProviders(category, event).catch(() => {});
}

// --- Telegram Link Management ---

export async function findLinkByChatId(chatId: string): Promise<{ user_id: string; telegram_chat_id: string } | null> {
  const result = await query<{ user_id: string; telegram_chat_id: string }>(
    'SELECT user_id, telegram_chat_id FROM telegram_links WHERE telegram_chat_id = $1',
    [chatId],
  );
  return result.rows[0] ?? null;
}

export async function findLinkByUserId(userId: string): Promise<TelegramLink | null> {
  const result = await query<TelegramLink>(
    'SELECT * FROM telegram_links WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function createLink(
  userId: string,
  chatId: string,
  username?: string,
): Promise<void> {
  await query(
    `INSERT INTO telegram_links (user_id, telegram_chat_id, telegram_username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_chat_id)
     DO UPDATE SET user_id = EXCLUDED.user_id, telegram_username = EXCLUDED.telegram_username`,
    [userId, chatId, username ?? null],
  );
}

export async function updateNotificationSetting(
  chatId: string,
  field: string,
  value: boolean,
): Promise<void> {
  const allowedFields = [
    'notifications_enabled',
    'notify_matching',
    'notify_auctions',
    'notify_orders',
    'notify_earnings',
    'notify_chain',
  ];
  if (!allowedFields.includes(field)) return;

  await query(
    `UPDATE telegram_links SET ${field} = $1 WHERE telegram_chat_id = $2`,
    [value, chatId],
  );
}

export async function getNotificationSettings(chatId: string): Promise<TelegramLink | null> {
  const result = await query<TelegramLink>(
    'SELECT * FROM telegram_links WHERE telegram_chat_id = $1',
    [chatId],
  );
  return result.rows[0] ?? null;
}
