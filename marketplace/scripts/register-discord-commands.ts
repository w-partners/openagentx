/**
 * Discord 슬래시 커맨드 등록 스크립트.
 *
 * 사용법:
 *   DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... npx tsx scripts/register-discord-commands.ts
 *
 * 동작:
 *   - SLASH_COMMANDS (lib/discord/bot.ts)를 Discord에 일괄 PUT
 *   - 글로벌 커맨드 — 전파에 최대 1시간 소요. 빠른 테스트 시 길드 ID 옵션 사용.
 *
 * 길드 한정 등록 (즉시 반영):
 *   DISCORD_GUILD_ID=... npx tsx scripts/register-discord-commands.ts
 */

import { SLASH_COMMANDS } from '../src/lib/discord/bot';

const APP_ID = process.env.DISCORD_APP_ID ?? '';
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN ?? '';
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? '';

if (!APP_ID || !BOT_TOKEN) {
  console.error('DISCORD_APP_ID와 DISCORD_BOT_TOKEN 환경변수가 필요합니다');
  process.exit(1);
}

const url = GUILD_ID
  ? `https://discord.com/api/v10/applications/${APP_ID}/guilds/${GUILD_ID}/commands`
  : `https://discord.com/api/v10/applications/${APP_ID}/commands`;

async function main(): Promise<void> {
  console.log(`[discord] registering ${SLASH_COMMANDS.length} commands → ${GUILD_ID ? `guild ${GUILD_ID}` : 'global'}`);

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(SLASH_COMMANDS),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error(`[discord] HTTP ${res.status}:`, txt);
    process.exit(1);
  }

  const data = await res.json();
  console.log(`[discord] registered ${Array.isArray(data) ? data.length : 1} commands`);
  if (!GUILD_ID) {
    console.log('[discord] note: 글로벌 커맨드는 전파에 최대 1시간 소요됩니다. 빠른 테스트는 DISCORD_GUILD_ID 사용.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
