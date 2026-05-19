# @openagentx/telegram-bot

Storage-agnostic Telegram Bot API toolkit. Extracted from the OpenAgentX
marketplace so any project — not just OpenAgentX — can reuse the same plumbing
for two-way Telegram bots.

- `TelegramBotClient` — minimal `fetch`-based wrapper for `sendMessage`,
  `answerCallbackQuery`, `setWebhook`, `getUpdates`. No `node-telegram-bot-api`
  dependency.
- `createRouter` — stateless command + inline-button callback dispatcher with
  longest-prefix callback matching.
- `formatEvent` / `shouldNotify` — marketplace-style notification templates +
  per-category preference gating.
- `escapeMarkdownV2`, `escapeHtml` — safe parse-mode escapes.

Zero runtime dependencies. Works on Node >=18, Bun, Deno, and any other
runtime exposing `fetch`.

## Install

```bash
npm install @openagentx/telegram-bot
```

## Quick start (webhook)

```ts
import {
  TelegramBotClient,
  createRouter,
  formatEvent,
} from '@openagentx/telegram-bot';

const client = new TelegramBotClient(process.env.TELEGRAM_BOT_TOKEN!);

const route = createRouter(client, {
  commands: {
    '/start': async (ctx) => {
      await client.sendMessage(ctx.chatId, 'Welcome!');
    },
    '/echo': async (ctx) => {
      await client.sendMessage(ctx.chatId, `echo: ${ctx.args}`);
    },
  },
  callbacks: {
    'toggle_': async (ctx) => {
      await client.answerCallbackQuery(ctx.query.id, 'toggled');
    },
  },
  onText: async (ctx) => {
    await client.sendMessage(ctx.chatId, `you said: ${ctx.text}`);
  },
  onError: (err) => console.error('telegram handler failed', err),
});

// In your webhook route:
export async function POST(req: Request) {
  const update = await req.json();
  await route(update);
  return new Response('ok');
}
```

## Register a webhook

```ts
await client.setWebhook('https://yourapp.com/api/telegram', 'your-secret');
```

If you'd rather long-poll (for local dev):

```ts
await client.deleteWebhook();
let offset: number | undefined;
for (;;) {
  const { result } = await client.getUpdates(offset, 100, 30);
  for (const u of result) {
    await route(u);
    offset = (u.update_id ?? 0) + 1;
  }
}
```

## Notification templates

The `formatEvent` helper produces Markdown-formatted messages for common
marketplace events (new auction, matching accepted, low balance, chain step,
etc.). Pair it with your own DB layer:

```ts
import { formatEvent, shouldNotify } from '@openagentx/telegram-bot';

async function notify(chatId: string, prefs, event) {
  if (!shouldNotify(prefs, event)) return;
  await client.sendMessage(chatId, formatEvent(event));
}
```

## Why no DB integration?

This package is a pure library. Map Telegram `chat_id` to your user records in
your own application code. The router gives you `ctx.chatId` and the raw
message; everything else is yours.

## License

MIT — part of the [OpenAgentX](https://github.com/w-partners/openagentx)
project.

---

# @openagentx/telegram-bot (한국어)

OpenAgentX 마켓플레이스에서 분리한 텔레그램 봇 툴킷.

- `TelegramBotClient` — `fetch` 기반의 최소 클라이언트
  (`sendMessage`, `answerCallbackQuery`, `setWebhook`, `getUpdates`)
- `createRouter` — 명령·인라인 콜백 라우터 (longest-prefix 매칭)
- `formatEvent` / `shouldNotify` — 마켓플레이스 알림 템플릿 + 카테고리별
  알림 설정 필터링
- `escapeMarkdownV2`, `escapeHtml` — parse-mode 안전 이스케이프

런타임 의존성 0개. DB는 호출 측에서 직접 매핑한다.

라이센스: MIT
