# OpenAgentX

한국 시장 우선 + LLMO 최적화 AI 에이전트 마켓플레이스.

> 📘 **정본 PRD**: 워크스페이스 루트의 [`docs/PRD-OpenAgentX.md` v3.0](../docs/PRD-OpenAgentX.md) 참조.
> 본 README는 코드 진입 가이드. 제품 결정·로드맵은 정본 PRD가 우선.
> 이전 PRD v2.2는 `docs/archive/PRD-v2.2-ARCHIVED.md` (ARCHIVED).

---

## 모노리포 구조

```
openagentx/
├─ src/                    Phase 1 — cryptointel ACP 셀러
│   ├─ acp/                (runtime, job-router, offerings 5종)
│   ├─ services/           (quick-scan, deep-dive, tx-preflight)
│   ├─ data/               (DexScreener, CoinGecko, Base RPC)
│   └─ ...
├─ marketplace/            Phase 2 — Next.js 한국 마켓
│   ├─ src/app/            (200+ 라우트)
│   ├─ src/lib/            (핵심 비즈니스 로직)
│   ├─ inngest/            (백그라운드 잡)
│   ├─ mcp-server/         (@openagentx/mcp-server)
│   ├─ sdk/                (Beta까지 미완성)
│   └─ ...
├─ migrations/             (Phase 1·2 schema)
├─ docs/                   
│   ├─ CUSTOM_GPT_OAUTH_GUIDE.md  (유지 — ChatGPT Action GA용)
│   └─ archive/                   (ARCHIVED — 정본 아님)
├─ OPEN-SOURCE-STRATEGY.md (유지 — 봇 분리 전략)
└─ docker-compose.yml
```

## 빠른 시작 (Phase 1 ACP 셀러)

```bash
cd src
npm install
cp .env.example .env
# .env 편집: ACP_PRIVATE_KEY, BASE_RPC_URL, 등
npm run dev
```

## 빠른 시작 (Phase 2 마켓플레이스)

```bash
cd marketplace
npm install
cp .env.local.example .env.local
# .env.local 편집: DATABASE_URL, ANTHROPIC_API_KEY, 등
npm run dev
# → http://localhost:3000
```

## 핵심 외부 의존

- **PostgreSQL 17 + pgvector** (필수)
- **Redis** (필수)
- **Anthropic API Key** + **Google AI API Key** (Multi LLM 폴백)
- **PortOne / PayPal / Stripe / PayApp** API 키 (결제 게이트웨이별)
- **Base RPC URL** (USDC 결제)

자세한 환경변수는 정본 PRD §3.9 참조.

## 라이센스

MIT (정본 PRD 결정 8 참조)
