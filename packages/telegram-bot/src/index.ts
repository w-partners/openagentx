/**
 * @openagentx/telegram-bot
 *
 * Storage-agnostic toolkit for Telegram Bot API integrations.
 *
 *   - Minimal `TelegramBotClient` (sendMessage, answerCallbackQuery,
 *     setWebhook, getUpdates) on top of `fetch` — no `node-telegram-bot-api`
 *     dependency.
 *   - Stateless command + callback router (`createRouter`) you wire into
 *     your webhook route or long-polling loop.
 *   - Marketplace-style notification templates (`formatEvent`,
 *     `shouldNotify`) extracted from the OpenAgentX marketplace.
 *
 * Bring your own DB, user-account linking, and business logic. This package
 * does not touch storage.
 */

export {
  TelegramBotClient,
  createRouter,
  parseCommand,
} from './bot.js';

export type {
  TelegramUser,
  TelegramChat,
  TelegramMessage,
  TelegramCallbackQuery,
  TelegramUpdate,
  ParseMode,
  InlineKeyboardButton,
  SendMessageOptions,
  TelegramBotClientOptions,
  ParsedCommand,
  CommandContext,
  CallbackContext,
  CommandHandler,
  CallbackHandler,
  FallbackHandler,
  RouterOptions,
} from './bot.js';

export {
  shouldNotify,
  formatEvent,
  escapeMarkdownV2,
  escapeHtml,
} from './notifications.js';

export type {
  NotificationEvent,
  NotificationPreferences,
} from './notifications.js';
