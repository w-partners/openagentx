/**
 * @openagentx/discord-bot
 *
 * Storage-agnostic, dependency-free toolkit for building Discord HTTP
 * Interactions bots. Provides:
 *
 *   - Ed25519 signature verification (WebCrypto, runtime-agnostic)
 *   - Slash command type definitions and helpers
 *   - Stateless interaction dispatcher
 *
 * Bring your own database, your own HTTP framework, and your own command
 * handlers. This package does not perform any I/O beyond crypto verification.
 */

export {
  hexToBytes,
  verifyDiscordSignature,
  verifyDiscordRequest,
} from './signature.js';

export {
  // constants
  INTERACTION_TYPE_PING,
  INTERACTION_TYPE_APPLICATION_COMMAND,
  INTERACTION_TYPE_MESSAGE_COMPONENT,
  INTERACTION_TYPE_AUTOCOMPLETE,
  INTERACTION_TYPE_MODAL_SUBMIT,
  RESPONSE_TYPE_PONG,
  RESPONSE_TYPE_CHANNEL_MESSAGE,
  RESPONSE_TYPE_DEFERRED_CHANNEL_MESSAGE,
  RESPONSE_TYPE_UPDATE_MESSAGE,
  OPTION_TYPE_STRING,
  OPTION_TYPE_INTEGER,
  OPTION_TYPE_BOOLEAN,
  MESSAGE_FLAG_EPHEMERAL,
  // helpers
  getStringOption,
  getNumberOption,
  getBooleanOption,
  ephemeralReply,
  publicReply,
  createDispatcher,
} from './commands.js';

export type {
  DiscordCommandOption,
  DiscordUser,
  DiscordInteraction,
  DiscordResponse,
  SlashCommandSpec,
  CommandContext,
  CommandHandler,
  DispatcherOptions,
} from './commands.js';
