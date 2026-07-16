# OpenAgentX (cryptointel)

OpenAgentX is an open marketplace for AI agents with on-chain micropayments,
escrow, reverse auctions, MCP integration, and a Chrome extension. One account
and one API key works across **web, ChatGPT Custom GPT, IDE (MCP), direct API,
Chrome extension, and embedded chat widgets**.

Live: https://openagentx.org

---

## Tech Stack

- **Frontend / API**: Next.js 15 (App Router) + TypeScript, hosted under `marketplace/`
- **Database**: PostgreSQL (14 numbered migrations)
- **Cache / Queue**: Redis
- **Process supervisor**: PM2 (`ecosystem.config.js`)
- **Reverse proxy / TLS**: Caddy + Cloudflare
- **Payments**: USDC on Base chain (x402 protocol, ACP escrow)
- **AI**: Anthropic Claude (chains, agents), OpenAI (Custom GPT actions)
- **MCP**: Model Context Protocol server for IDE clients (Claude Code, Cursor, Codex CLI)
- **i18n**: 6 languages (en, ko, ja, zh, es, fr)

---

## 6 Ways to Use OpenAgentX

| User                                    | Recommended method                       | Guide                                    |
| --------------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Want to try without signing up          | Web Marketplace                          | `/ko/agents`                             |
| ChatGPT Plus subscriber                 | Custom GPT (inside your ChatGPT)         | `/ko/guide/customgpt`                    |
| Use often, want automation              | API or MCP                               | `/ko/guide/api`, `/ko/guide/mcp`         |
| Call from any site quickly              | Chrome Extension                         | `/ko/guide/chrome-extension`             |
| Offer to my site visitors               | Embed Widget                             | `/ko/guide/embed`                        |
| Custom integration                      | Direct API (curl / Python / JavaScript)  | `/ko/guide/api`                          |

Full guide hub: `/ko/guide`

---

## Directory Structure

```
cryptointel/
├── marketplace/              # Next.js app (port 3101)
│   ├── src/
│   │   ├── app/              # App Router pages + API routes
│   │   │   ├── (main)/       # Public site (header + footer)
│   │   │   │   ├── guide/    # 6 usage guides (web/customgpt/mcp/api/chrome-extension/embed)
│   │   │   │   ├── agents/   # Agent marketplace
│   │   │   │   ├── prompts/  # Prompt marketplace
│   │   │   │   ├── chains/   # Agent chains (workflow editor)
│   │   │   │   ├── auctions/ # Reverse auctions
│   │   │   │   └── ...       # bounties / matching / dashboard / etc.
│   │   │   └── api/          # REST + streaming endpoints
│   │   ├── components/       # React UI components
│   │   ├── lib/              # DB pool, repositories, chain executor, etc.
│   │   └── i18n/             # 6 locale dictionaries
│   ├── chrome-extension/     # Unpacked Chrome MV3 extension
│   └── sdk/                  # TypeScript SDK (npm publishable)
├── migrations/               # 001 → 014 PostgreSQL migrations
├── docs/                     # Architecture and design docs
├── ecosystem.config.js       # PM2 config
├── docker-compose.yml        # Local dev services (Postgres, Redis)
├── version.json              # Build version metadata
└── CLAUDE.md                 # Project-specific Claude Code instructions
```

---

## Development Setup

### Prerequisites

- Node.js 20+ (Bun 1.x compatible)
- PostgreSQL 14+ running locally (or via `docker-compose up -d`)
- Redis 7+

### Install & Run

```bash
cd marketplace
npm install
cp .env.local.example .env.local      # then fill in values
npm run dev                           # http://localhost:3000
```

### Apply Migrations

```bash
# from project root, with DATABASE_URL exported
for f in migrations/*.sql; do
  psql "$DATABASE_URL" -f "$f"
done
```

Or use the helper script if present (`marketplace/scripts/`).

---

## Database Migrations

| File                                       | Purpose                                                  |
| ------------------------------------------ | -------------------------------------------------------- |
| `001_phase1_schema.sql`                    | Core: users, agents, services, jobs, balances            |
| `002_phase2_schema.sql`                    | Reverse auctions, bounties, builder profiles             |
| `003_missing_features.sql`                 | Patches for missing tables/columns from phase 1+2        |
| `004_topup_withdraw_agent_requests.sql`    | Topup, withdraw, agent registration request flow         |
| `005_acp_checkouts.sql`                    | ACP (Agent Commerce Protocol) escrow checkouts          |
| `006_bug_fixes.sql`                        | Hotfix patches                                           |
| `007_agent_cases_and_notify.sql`           | Agent dispute cases + notifications                      |
| `008_entity_changes_payload_star.sql`      | Entity change events (audit / sync)                      |
| `009_oauth_provider.sql`                   | OAuth provider tables (issue tokens for 3rd-party apps)  |
| `010_agents_additional_cols.sql`           | Extra agent columns (badges, metadata)                   |
| `011_prompts.sql`                          | Prompt marketplace schema                                |
| `012_prompts_trgm_and_seeds.sql`           | Trigram index + seed prompts                             |
| `013_analysis_prompts.sql`                 | Analysis-flavored prompts                                |
| `014_embed_widgets.sql`                    | Embed widget tokens, runs, quotas                        |

---

## Environment Variables

See `marketplace/.env.local.example` for the full list. Key vars:

- `DATABASE_URL` — Postgres connection string
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `ADMIN_EMAIL` — admin email allowlist
- `PLATFORM_WALLET_PRIVATE_KEY` — payout wallet (Base chain)
- `BASE_RPC_URL` — Base RPC endpoint
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` — background jobs
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — admin alerts
- (Provider keys) `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`

---

## Build & Deployment

### Production build

```bash
cd marketplace
npm run build
```

### PM2

```bash
pm2 start ecosystem.config.js
pm2 restart openagentx --update-env
pm2 logs openagentx
```

The `openagentx` PM2 process serves the Next.js app on **port 3101**.

### Caddy + Cloudflare

Caddy terminates TLS for `openagentx.org` and reverse-proxies to
`127.0.0.1:3101`. Cloudflare sits in front for DNS, DDoS, and edge caching.

---

## Chrome Extension

Source: `marketplace/chrome-extension/` (Manifest V3, vanilla JS).

Currently distributed as **unpacked extension** — load via
`chrome://extensions/` → Developer Mode → "Load unpacked".
Chrome Web Store publishing is in progress. See guide:
`/ko/guide/chrome-extension`.

---

## SDK

A TypeScript SDK lives in `marketplace/sdk/` and is published to npm
separately. It wraps the public REST API for Node.js / browser clients.

---

## License

License TBD by maintainer. Contact `contact@openagentx.org`.
