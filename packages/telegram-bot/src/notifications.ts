/**
 * Notification message templates for marketplace-style events.
 *
 * Pure formatting — no DB, no HTTP. Pair with `TelegramBotClient.sendMessage`
 * (or any other sink) to deliver the rendered text.
 */

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

export interface NotificationPreferences {
  notifications_enabled: boolean;
  notify_matching: boolean;
  notify_auctions: boolean;
  notify_orders: boolean;
  notify_earnings: boolean;
  notify_chain: boolean;
}

const URGENCY_EMOJI: Record<string, string> = {
  low: '🟢',
  normal: '🔵',
  urgent: '🟠',
  critical: '🔴',
};

/**
 * Decide whether a notification should be delivered given the user's
 * per-category preferences. Returns `true` when the relevant flag is on.
 */
export function shouldNotify(prefs: NotificationPreferences, event: NotificationEvent): boolean {
  if (!prefs.notifications_enabled) return false;
  switch (event.type) {
    case 'matching_request':
    case 'matching_accepted':
      return prefs.notify_matching;
    case 'auction_new':
    case 'auction_bid':
    case 'auction_selected':
      return prefs.notify_auctions;
    case 'order_received':
    case 'order_completed':
      return prefs.notify_orders;
    case 'earning':
    case 'reward':
    case 'low_balance':
    case 'referral_signup':
      return prefs.notify_earnings;
    case 'chain_step':
      return prefs.notify_chain;
    case 'agent_created':
      return true;
    default:
      return true;
  }
}

/** Render a notification event into a Markdown-formatted Telegram message. */
export function formatEvent(event: NotificationEvent): string {
  switch (event.type) {
    case 'matching_request':
      return [
        `${URGENCY_EMOJI[event.urgency] ?? '🔵'} *New matching request*`,
        '',
        `Title: ${event.title}`,
        `Category: ${event.category}`,
        `Urgency: ${event.urgency}`,
        '',
        `Accept with: /accept ${event.requestId.slice(0, 8)}`,
      ].join('\n');

    case 'matching_accepted':
      return [
        '✅ *Match accepted*',
        '',
        `Provider: ${event.providerName}`,
        event.agentName ? `Agent: ${event.agentName}` : '',
        '',
        "You'll hear from them shortly.",
      ].filter(Boolean).join('\n');

    case 'auction_new':
      return [
        '🏷️ *New auction listed*',
        '',
        `Title: ${event.title}`,
        `Category: ${event.category}`,
        `Budget: $${event.budget.toFixed(2)}`,
        '',
        `Bid with: /bid ${event.auctionId.slice(0, 8)} <price>`,
      ].join('\n');

    case 'auction_bid':
      return [
        '💰 *New bid received*',
        '',
        `Bidder: ${event.bidderName}`,
        `Offer: $${event.offerPrice.toFixed(2)}`,
      ].join('\n');

    case 'auction_selected':
      return [
        '🎉 *Your bid was selected*',
        '',
        event.auctionTitle ? `Auction: ${event.auctionTitle}` : '',
        'Congratulations! Get started on the work.',
      ].filter(Boolean).join('\n');

    case 'order_received':
      return [
        '📦 *New order received*',
        '',
        `Service: ${event.serviceName}`,
        `Amount: $${event.amount.toFixed(2)}`,
      ].join('\n');

    case 'order_completed':
      return [
        '✅ *Order completed*',
        '',
        `Service: ${event.serviceName}`,
      ].join('\n');

    case 'chain_step':
      return [
        '⛓️ *Chain progress*',
        '',
        `Chain: ${event.chainName}`,
        `Step ${event.stepIndex + 1}: ${event.stepName}`,
        `Status: ${formatStatus(event.status)}`,
      ].join('\n');

    case 'earning':
      return [
        '💵 *Earnings*',
        '',
        `Amount: $${event.amount.toFixed(2)}`,
        `Source: ${event.source}`,
      ].join('\n');

    case 'agent_created':
      return [
        '🤖 *Agent registered*',
        '',
        `Name: ${event.agentName}`,
      ].join('\n');

    case 'referral_signup':
      return [
        '👥 *Referral signup*',
        '',
        `${event.referredName} joined via your referral.`,
      ].join('\n');

    case 'reward':
      return [
        '🎁 *Reward received*',
        '',
        `Amount: $${event.amount.toFixed(2)}`,
        `Reason: ${event.reason}`,
      ].join('\n');

    case 'low_balance':
      return [
        '⚠️ *Low balance*',
        '',
        `Current: $${event.balance.toFixed(2)}`,
      ].join('\n');

    default:
      return '📢 New notification.';
  }
}

function formatStatus(status: string): string {
  if (status === 'completed') return 'completed ✅';
  if (status === 'failed') return 'failed ❌';
  return 'in progress 🔄';
}

/** Escape MarkdownV2 special characters per Telegram Bot API spec. */
export function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, (ch) => `\\${ch}`);
}

/** Escape HTML entities for use with `parse_mode: 'HTML'`. */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
