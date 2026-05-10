/**
 * Discord Interactions bot — slash command handler.
 * Uses Discord HTTP Interactions API (no gateway). Stateless per request.
 *
 * Setup:
 *   1. Create application at https://discord.com/developers/applications
 *   2. Set DISCORD_PUBLIC_KEY (for signature verification)
 *   3. Set DISCORD_APP_ID + DISCORD_BOT_TOKEN
 *   4. Set Interactions Endpoint URL → https://openagentx.org/api/discord
 *   5. Register slash commands (separate script: scripts/register-discord-commands.ts)
 */

import { query } from '../db/pool';

export const DISCORD_PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY ?? '';

// --- Interaction types (Discord docs) ---

const INTERACTION_TYPE_PING = 1;
const INTERACTION_TYPE_APPLICATION_COMMAND = 2;

const RESPONSE_TYPE_PONG = 1;
const RESPONSE_TYPE_CHANNEL_MESSAGE = 4;

interface DiscordOption {
  name: string;
  type: number;
  value?: string | number | boolean;
}

interface DiscordInteraction {
  id: string;
  type: number;
  token: string;
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
  data?: {
    name: string;
    options?: DiscordOption[];
  };
}

interface DiscordResponse {
  type: number;
  data?: {
    content?: string;
    flags?: number;
  };
}

// --- Signature verification (Ed25519) ---

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export async function verifyDiscordSignature(
  rawBody: string,
  signatureHex: string,
  timestamp: string,
): Promise<boolean> {
  if (!DISCORD_PUBLIC_KEY) return false;
  try {
    const publicKey = await crypto.subtle.importKey(
      'raw',
      hexToBytes(DISCORD_PUBLIC_KEY),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    const message = new TextEncoder().encode(timestamp + rawBody);
    return await crypto.subtle.verify(
      'Ed25519',
      publicKey,
      hexToBytes(signatureHex),
      message,
    );
  } catch {
    return false;
  }
}

// --- Slash command definitions (for registration script) ---

export const SLASH_COMMANDS = [
  {
    name: 'search',
    description: 'OpenAgentX에서 에이전트를 검색합니다',
    options: [{ name: 'query', description: '검색어', type: 3, required: true }],
  },
  {
    name: 'popular',
    description: '인기 에이전트 TOP 5',
  },
  {
    name: 'balance',
    description: '현재 잔액을 조회합니다 (계정 연결 필요)',
  },
  {
    name: 'agents',
    description: '내 에이전트 목록 (계정 연결 필요)',
  },
  {
    name: 'charge',
    description: '포인트 충전 페이지 링크',
  },
];

// --- Command handlers ---

function getOption(opts: DiscordOption[] | undefined, name: string): string {
  const opt = opts?.find((o) => o.name === name);
  return opt?.value != null ? String(opt.value) : '';
}

async function handleSearch(opts: DiscordOption[] | undefined): Promise<string> {
  const q = getOption(opts, 'query');
  if (!q) return '검색어를 입력해주세요.';

  const result = await query<{ name: string; category: string; avg_rating: number; total_jobs: number }>(
    `SELECT name, category, avg_rating, total_jobs FROM agents
     WHERE status = 'active' AND search_vector @@ plainto_tsquery('simple', $1)
     ORDER BY ranking_score DESC LIMIT 5`,
    [q],
  );

  if (result.rows.length === 0) return `**"${q}"** 검색 결과가 없습니다.`;

  const lines = result.rows.map(
    (a, i) => `${i + 1}. **${a.name}** (${a.category}) — ⭐${a.avg_rating} | ${a.total_jobs}건`,
  );
  return `🔍 **검색 결과: "${q}"**\n${lines.join('\n')}`;
}

async function handlePopular(): Promise<string> {
  const result = await query<{ name: string; category: string; avg_rating: number; total_jobs: number }>(
    `SELECT name, category, avg_rating, total_jobs FROM agents
     WHERE status = 'active' ORDER BY ranking_score DESC LIMIT 5`,
  );
  if (result.rows.length === 0) return '등록된 에이전트가 없습니다.';
  const lines = result.rows.map(
    (a, i) => `${i + 1}. **${a.name}** (${a.category}) — ⭐${a.avg_rating} | ${a.total_jobs}건`,
  );
  return `🏆 **인기 에이전트 TOP 5**\n${lines.join('\n')}`;
}

async function handleBalance(discordUserId: string): Promise<string> {
  const result = await query<{ balance_usdc: string }>(
    `SELECT u.balance_usdc FROM users u
     JOIN discord_links dl ON dl.user_id = u.id
     WHERE dl.discord_user_id = $1`,
    [discordUserId],
  );
  if (result.rows.length === 0) {
    return '⚠️ Discord 계정이 연결되지 않았습니다. 웹사이트에서 연결해주세요: https://openagentx.org/profile';
  }
  const bal = parseFloat(result.rows[0].balance_usdc);
  return `💰 **잔액**\nUSDC: $${bal.toFixed(2)}\n충전: https://openagentx.org/charge`;
}

async function handleAgents(discordUserId: string): Promise<string> {
  const result = await query<{ name: string; status: string; total_jobs: number; avg_rating: number }>(
    `SELECT a.name, a.status, a.total_jobs, a.avg_rating
     FROM agents a
     JOIN discord_links dl ON dl.user_id = a.owner_id
     WHERE dl.discord_user_id = $1
     ORDER BY a.created_at DESC LIMIT 10`,
    [discordUserId],
  );
  if (result.rows.length === 0) {
    return '등록된 에이전트가 없거나 계정이 연결되지 않았습니다.';
  }
  const lines = result.rows.map(
    (a) => `• **${a.name}** (${a.status}) — ⭐${a.avg_rating} | ${a.total_jobs}건`,
  );
  return `🤖 **내 에이전트**\n${lines.join('\n')}`;
}

function handleCharge(): string {
  return '💳 충전: https://openagentx.org/charge';
}

// --- Main interaction dispatcher ---

export async function handleDiscordInteraction(
  interaction: DiscordInteraction,
): Promise<DiscordResponse> {
  if (interaction.type === INTERACTION_TYPE_PING) {
    return { type: RESPONSE_TYPE_PONG };
  }

  if (interaction.type !== INTERACTION_TYPE_APPLICATION_COMMAND) {
    return {
      type: RESPONSE_TYPE_CHANNEL_MESSAGE,
      data: { content: '지원하지 않는 인터랙션 타입입니다.', flags: 64 },
    };
  }

  const userId = interaction.member?.user.id ?? interaction.user?.id ?? '';
  const cmd = interaction.data?.name ?? '';
  const opts = interaction.data?.options;

  let content = '알 수 없는 명령어입니다.';
  try {
    switch (cmd) {
      case 'search':
        content = await handleSearch(opts);
        break;
      case 'popular':
        content = await handlePopular();
        break;
      case 'balance':
        content = await handleBalance(userId);
        break;
      case 'agents':
        content = await handleAgents(userId);
        break;
      case 'charge':
        content = handleCharge();
        break;
    }
  } catch (err) {
    content = `⚠️ 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`;
  }

  return {
    type: RESPONSE_TYPE_CHANNEL_MESSAGE,
    data: { content },
  };
}
