/**
 * Discord slash-command type definitions and dispatcher.
 *
 * Stateless and storage-agnostic — callers supply their own command handlers.
 * The dispatcher only knows about Discord Interaction shape (per official docs).
 */

// --- Discord protocol constants ---

export const INTERACTION_TYPE_PING = 1;
export const INTERACTION_TYPE_APPLICATION_COMMAND = 2;
export const INTERACTION_TYPE_MESSAGE_COMPONENT = 3;
export const INTERACTION_TYPE_AUTOCOMPLETE = 4;
export const INTERACTION_TYPE_MODAL_SUBMIT = 5;

export const RESPONSE_TYPE_PONG = 1;
export const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;
export const RESPONSE_TYPE_DEFERRED_CHANNEL_MESSAGE = 5;
export const RESPONSE_TYPE_UPDATE_MESSAGE = 7;

/** Discord application command option type — string */
export const OPTION_TYPE_STRING = 3;
/** Discord application command option type — integer */
export const OPTION_TYPE_INTEGER = 4;
/** Discord application command option type — boolean */
export const OPTION_TYPE_BOOLEAN = 5;
/** Ephemeral flag — only the invoking user sees the message */
export const MESSAGE_FLAG_EPHEMERAL = 1 << 6;

// --- Types ---

export interface DiscordCommandOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

export interface DiscordUser {
  id: string;
  username: string;
}

export interface DiscordInteraction {
  id: string;
  type: number;
  token: string;
  member?: { user: DiscordUser };
  user?: DiscordUser;
  data?: {
    name: string;
    options?: DiscordCommandOption[];
  };
}

export interface DiscordResponse {
  type: number;
  data?: {
    content?: string;
    flags?: number;
  };
}

export interface SlashCommandSpec {
  name: string;
  description: string;
  options?: {
    name: string;
    description: string;
    type: number;
    required?: boolean;
  }[];
}

export interface CommandContext {
  /** Discord user ID (from `member.user.id` or `user.id`). Empty string if absent. */
  userId: string;
  /** Discord username (from `member.user.username` or `user.username`). Empty string if absent. */
  username: string;
  /** Raw options array, may be undefined for parameterless commands. */
  options?: DiscordCommandOption[];
  /** The raw interaction, for advanced use cases. */
  interaction: DiscordInteraction;
}

/** Handler returns either a plain string (becomes ephemeral message) or a full response. */
export type CommandHandler = (
  ctx: CommandContext,
) => Promise<string | DiscordResponse> | string | DiscordResponse;

// --- Option helpers ---

/** Read a string option by name. Returns '' if missing. */
export function getStringOption(opts: DiscordCommandOption[] | undefined, name: string): string {
  const opt = opts?.find((o) => o.name === name);
  return opt?.value != null ? String(opt.value) : '';
}

/** Read a numeric option by name. Returns NaN if missing or non-numeric. */
export function getNumberOption(opts: DiscordCommandOption[] | undefined, name: string): number {
  const opt = opts?.find((o) => o.name === name);
  if (opt?.value == null) return Number.NaN;
  const n = typeof opt.value === 'number' ? opt.value : Number(opt.value);
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Read a boolean option by name. Returns false if missing. */
export function getBooleanOption(opts: DiscordCommandOption[] | undefined, name: string): boolean {
  const opt = opts?.find((o) => o.name === name);
  return opt?.value === true;
}

// --- Response helpers ---

/** Build an ephemeral text response (only the invoking user sees it). */
export function ephemeralReply(content: string): DiscordResponse {
  return {
    type: RESPONSE_TYPE_CHANNEL_MESSAGE,
    data: { content, flags: MESSAGE_FLAG_EPHEMERAL },
  };
}

/** Build a public text response visible to the entire channel. */
export function publicReply(content: string): DiscordResponse {
  return {
    type: RESPONSE_TYPE_CHANNEL_MESSAGE,
    data: { content },
  };
}

// --- Dispatcher ---

export interface DispatcherOptions {
  /** Handler invoked when no command matches. Default: ephemeral "unknown command" message. */
  onUnknownCommand?: (ctx: CommandContext) => Promise<string | DiscordResponse> | string | DiscordResponse;
  /** Handler invoked when a command throws. Default: ephemeral error message. */
  onError?: (err: unknown, ctx: CommandContext) => Promise<string | DiscordResponse> | string | DiscordResponse;
}

/**
 * Build a stateless interaction dispatcher.
 *
 * Pass a map of `commandName -> handler`. The returned function takes a parsed
 * `DiscordInteraction` (already signature-verified by the caller) and returns
 * a `DiscordResponse` ready to be JSON-serialized to Discord.
 */
export function createDispatcher(
  handlers: Record<string, CommandHandler>,
  options: DispatcherOptions = {},
): (interaction: DiscordInteraction) => Promise<DiscordResponse> {
  const onUnknown = options.onUnknownCommand ?? (() => ephemeralReply('Unknown command.'));
  const onError = options.onError ?? ((err) => {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return ephemeralReply(`Error: ${msg}`);
  });

  return async function dispatch(interaction: DiscordInteraction): Promise<DiscordResponse> {
    if (interaction.type === INTERACTION_TYPE_PING) {
      return { type: RESPONSE_TYPE_PONG };
    }

    if (interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
      return ephemeralReply('Unsupported interaction type.');
    }

    const user = interaction.member?.user ?? interaction.user;
    const ctx: CommandContext = {
      userId: user?.id ?? '',
      username: user?.username ?? '',
      options: interaction.data?.options,
      interaction,
    };

    const name = interaction.data?.name ?? '';
    const handler = handlers[name];

    try {
      const result = handler
        ? await handler(ctx)
        : await onUnknown(ctx);
      return typeof result === 'string' ? ephemeralReply(result) : result;
    } catch (err) {
      const result = await onError(err, ctx);
      return typeof result === 'string' ? ephemeralReply(result) : result;
    }
  };
}
