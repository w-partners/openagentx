# @openagentx/discord-bot

Storage-agnostic toolkit for building Discord HTTP Interactions bots. Extracted
from the OpenAgentX marketplace so any project can reuse the slash-command
plumbing without dragging marketplace dependencies along.

- Ed25519 signature verification via the runtime WebCrypto API (no `tweetnacl`).
- Slash-command type definitions, option helpers, ephemeral/public reply
  builders.
- Stateless interaction dispatcher with pluggable handlers, custom error
  handling, and unknown-command fallback.
- Zero runtime dependencies. Works on Node >=18, Bun, Deno, Cloudflare
  Workers, and Vercel Edge.

## Install

```bash
npm install @openagentx/discord-bot
```

## Quick start (Next.js App Router)

```ts
// app/api/discord/route.ts
import {
  verifyDiscordRequest,
  createDispatcher,
  getStringOption,
} from '@openagentx/discord-bot';

const dispatch = createDispatcher({
  ping: () => 'pong',
  echo: (ctx) => `echo: ${getStringOption(ctx.options, 'msg')}`,
});

export async function POST(req: Request) {
  const rawBody = await req.text();
  const ok = await verifyDiscordRequest(
    process.env.DISCORD_PUBLIC_KEY!,
    rawBody,
    req.headers,
  );
  if (!ok) return new Response('invalid request signature', { status: 401 });

  const interaction = JSON.parse(rawBody);
  const response = await dispatch(interaction);
  return Response.json(response);
}
```

## Slash-command registration

Bot tokens, application IDs, and command registration are intentionally NOT
part of this package — they're operational concerns. Register commands via
Discord's REST API once, then keep them in source control:

```ts
import type { SlashCommandSpec } from '@openagentx/discord-bot';

export const COMMANDS: SlashCommandSpec[] = [
  {
    name: 'echo',
    description: 'Echo a message back',
    options: [
      { name: 'msg', description: 'message', type: 3, required: true },
    ],
  },
];

await fetch(`https://discord.com/api/v10/applications/${APP_ID}/commands`, {
  method: 'PUT',
  headers: {
    Authorization: `Bot ${BOT_TOKEN}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(COMMANDS),
});
```

## Why no `db` integration?

This package is a pure library. Database access, user-account linking, and
business logic live in your application. The dispatcher hands each command a
`CommandContext` containing the Discord user ID; map that to your own user
records however you like.

## License

MIT — part of the [OpenAgentX](https://github.com/w-partners/openagentx)
project.

---

# @openagentx/discord-bot (한국어)

OpenAgentX 마켓플레이스에서 분리한 디스코드 HTTP 인터랙션 봇 툴킷.
마켓플레이스 의존성 없이 어떤 프로젝트에서도 슬래시 명령 인프라를 재사용할
수 있다.

- WebCrypto 기반 Ed25519 서명 검증 (외부 의존성 없음)
- 슬래시 명령 타입, 옵션 헬퍼, ephemeral/public 응답 빌더
- 핸들러·에러 처리·미지정 명령 폴백을 지원하는 무상태 디스패처
- 런타임 의존성 0개. Node >=18, Bun, Deno, Cloudflare Workers, Vercel Edge
  지원

DB, 외부 서비스, 메이커별 로직은 이 패키지에 포함하지 않는다. 디스패처가
`CommandContext`에 디스코드 사용자 ID를 전달하므로 호출 측에서 직접
매핑한다.

라이센스: MIT
