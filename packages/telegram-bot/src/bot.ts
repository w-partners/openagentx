/**
 * Telegram Bot API client + stateless command/callback router.
 *
 * Storage-agnostic — bring your own user-account linking, DB, and command
 * handlers. This module knows about the Telegram Bot HTTP API and the shape
 * of `Update` objects, nothing else.
 *
 * Reference: https://core.telegram.org/bots/api
 */

// --- Types (subset matching the OpenAgentX use cases) ---

export interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
  is_bot?: boolean;
}

export interface TelegramChat {
  id: number;
  type?: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
}

export interface TelegramMessage {
  message_id?: number;
  chat: TelegramChat;
  text?: string;
  from?: TelegramUser;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: { chat: TelegramChat; message_id?: number };
  data?: string;
}

export interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export type ParseMode = 'Markdown' | 'MarkdownV2' | 'HTML';

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

export interface SendMessageOptions {
  parse_mode?: ParseMode;
  disable_web_page_preview?: boolean;
  reply_markup?: { inline_keyboard: InlineKeyboardButton[][] };
  reply_to_message_id?: number;
}

// --- Telegram Bot API client ---

const DEFAULT_API_BASE = 'https://api.telegram.org';

export interface TelegramBotClientOptions {
  /** Override the API base URL (defaults to https://api.telegram.org). */
  apiBase?: string;
  /** Custom fetch implementation (defaults to global fetch). */
  fetch?: typeof fetch;
}

/**
 * Minimal Telegram Bot API client.
 *
 * Wraps `sendMessage`, `answerCallbackQuery`, `setWebhook`, `getUpdates` so
 * downstream code never has to remember endpoint URLs. All methods return the
 * parsed JSON response from Telegram.
 */
export class TelegramBotClient {
  readonly token: string;
  private readonly apiBase: string;
  private readonly fetchImpl: typeof fetch;

  constructor(token: string, options: TelegramBotClientOptions = {}) {
    if (!token) throw new Error('TelegramBotClient: bot token is required');
    this.token = token;
    this.apiBase = options.apiBase ?? DEFAULT_API_BASE;
    this.fetchImpl = options.fetch ?? fetch;
  }

  private endpoint(method: string): string {
    return `${this.apiBase}/bot${this.token}/${method}`;
  }

  /** Low-level call helper. POSTs `params` as JSON and returns the parsed body. */
  async call<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const res = await this.fetchImpl(this.endpoint(method), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    return res.json() as Promise<T>;
  }

  /** Send a text message to a chat. */
  async sendMessage(
    chatId: number | string,
    text: string,
    options: SendMessageOptions = {},
  ): Promise<unknown> {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: options.parse_mode ?? 'Markdown',
      disable_web_page_preview: options.disable_web_page_preview ?? true,
      ...(options.reply_markup ? { reply_markup: options.reply_markup } : {}),
      ...(options.reply_to_message_id ? { reply_to_message_id: options.reply_to_message_id } : {}),
    });
  }

  /** Acknowledge a callback query. Without this, Telegram shows a loading spinner. */
  async answerCallbackQuery(callbackQueryId: string, text?: string, showAlert = false): Promise<unknown> {
    return this.call('answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      ...(text ? { text } : {}),
      show_alert: showAlert,
    });
  }

  /** Register a webhook URL with Telegram. */
  async setWebhook(url: string, secretToken?: string): Promise<unknown> {
    return this.call('setWebhook', {
      url,
      ...(secretToken ? { secret_token: secretToken } : {}),
    });
  }

  /** Remove the current webhook (so you can use long polling instead). */
  async deleteWebhook(): Promise<unknown> {
    return this.call('deleteWebhook');
  }

  /** Long-poll for updates. Returns up to `limit` updates with optional timeout. */
  async getUpdates(offset?: number, limit = 100, timeout = 0): Promise<{ ok: boolean; result: TelegramUpdate[] }> {
    return this.call('getUpdates', {
      ...(offset != null ? { offset } : {}),
      limit,
      timeout,
    });
  }
}

// --- Command parsing ---

export interface ParsedCommand {
  /** Lowercased command including the leading `/`, with any `@botname` suffix stripped. */
  command: string;
  /** Whitespace-trimmed argument string (everything after the first space). */
  args: string;
}

/**
 * Parse a Telegram message text into a command + args tuple.
 * Returns `null` if the text doesn't start with `/`.
 */
export function parseCommand(text: string): ParsedCommand | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('/')) return null;
  const spaceIdx = trimmed.indexOf(' ');
  const rawCmd = (spaceIdx > 0 ? trimmed.slice(0, spaceIdx) : trimmed).toLowerCase();
  const command = rawCmd.includes('@') ? (rawCmd.split('@')[0] ?? rawCmd) : rawCmd;
  const args = spaceIdx > 0 ? trimmed.slice(spaceIdx + 1).trim() : '';
  return { command, args };
}

// --- Stateless router ---

export interface CommandContext {
  chatId: number;
  args: string;
  message: TelegramMessage;
  client: TelegramBotClient;
}

export interface CallbackContext {
  chatId: number;
  data: string;
  query: TelegramCallbackQuery;
  client: TelegramBotClient;
}

export type CommandHandler = (ctx: CommandContext) => Promise<void> | void;
export type CallbackHandler = (ctx: CallbackContext) => Promise<void> | void;
export type FallbackHandler = (
  ctx: { chatId: number; text: string; message: TelegramMessage; client: TelegramBotClient },
) => Promise<void> | void;

export interface RouterOptions {
  /** Map of command names (with leading `/`, lowercased) to handlers. */
  commands?: Record<string, CommandHandler>;
  /** Map of callback-data prefixes to handlers. The longest matching prefix wins. */
  callbacks?: Record<string, CallbackHandler>;
  /** Invoked for non-command text messages. */
  onText?: FallbackHandler;
  /** Invoked when a `/command` is received but no handler matches. */
  onUnknownCommand?: CommandHandler;
  /** Invoked when any handler throws. */
  onError?: (err: unknown, update: TelegramUpdate) => Promise<void> | void;
}

/**
 * Build a stateless update handler. Pass the result to your webhook
 * route handler or long-polling loop.
 */
export function createRouter(client: TelegramBotClient, options: RouterOptions) {
  const commands = options.commands ?? {};
  const callbacks = options.callbacks ?? {};
  const onText = options.onText;
  const onUnknownCommand = options.onUnknownCommand;
  const onError = options.onError;

  // Sort callback prefixes by length DESC for longest-prefix match.
  const callbackPrefixes = Object.keys(callbacks).sort((a, b) => b.length - a.length);

  return async function handleUpdate(update: TelegramUpdate): Promise<void> {
    try {
      if (update.callback_query) {
        const cb = update.callback_query;
        const chatId = cb.message?.chat.id;
        if (chatId == null || !cb.data) return;
        const prefix = callbackPrefixes.find((p) => cb.data!.startsWith(p));
        const handler = prefix !== undefined ? callbacks[prefix] : undefined;
        if (handler) {
          await handler({ chatId, data: cb.data, query: cb, client });
        }
        return;
      }

      const message = update.message;
      if (!message?.text) return;
      const chatId = message.chat.id;
      const parsed = parseCommand(message.text);

      if (!parsed) {
        if (onText) {
          await onText({ chatId, text: message.text, message, client });
        }
        return;
      }

      const handler = commands[parsed.command];
      const ctx: CommandContext = { chatId, args: parsed.args, message, client };
      if (handler) {
        await handler(ctx);
      } else if (onUnknownCommand) {
        await onUnknownCommand(ctx);
      }
    } catch (err) {
      if (onError) {
        await onError(err, update);
      } else {
        // Swallow errors by default; caller should provide onError for observability.
      }
    }
  };
}
