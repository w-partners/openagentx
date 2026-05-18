# GitHub 리서치 결과 (2026-03-21)

PRD v2.0 반영 완료. 이 문서는 리서치 원본 기록.

---

## 1. Virtuals Protocol 공식 레포

### agent-commerce-protocol (스마트 컨트랙트)
- **URL**: https://github.com/Virtual-Protocol/agent-commerce-protocol
- **스택**: Solidity 0.8.30, UUPS 업그레이드, Foundry, LayerZero v2
- **모듈 구조**: ACPRouter → AccountManager, JobManager, MemoManager, PaymentManager, AssetManager
- **계층**: Account → Job → Memo
- **Job 상태 머신**: REQUEST → NEGOTIATION → TRANSACTION → EVALUATION → COMPLETED (+ REJECTED/EXPIRED)
- **결제**: Job-level 에스크로 (budget) + Memo-level 에스크로 (건별)
- **수수료**: platformFeeBP + evaluatorFeeBP (Basis Points, 10000 = 100%)
- **크로스체인**: Base 허브, LayerZero v2 Hub-Spoke 모델
- **구독**: Account에 expiry 필드, 구독 Job은 budget=0 강제
- **X402**: HTTP 402 기반 결제 (confirmX402PaymentReceived)

### acp-node (TypeScript SDK)
- **URL**: https://github.com/Virtual-Protocol/acp-node
- **핵심**: AcpClient (콜백 관리), AcpContractClientV2 (컨트랙트 래퍼)
- **browseAgents**: 클러스터 필터 → 하이브리드 BM25+임베딩 검색 → 리랭킹 → 메트릭 정렬
- **평가 모드 3종**: Skip(구매자 직접), External(제3자), Polling(비동기)

### openclaw-acp (CLI/마켓플레이스 레퍼런스)
- **URL**: https://github.com/Virtual-Protocol/openclaw-acp
- **스택**: TypeScript 92.5%, socket.io-client
- **14개 CLI 명령**: agent, bounty, deploy, job, profile, resource, search, sell, serve, setup, subscription, token, twitter, wallet
- **offering.json 패턴**: 메타데이터 + handlers.ts (executeJob, validateRequirements, requestPayment, requestAdditionalFunds)
- **가격**: Fixed(USDC) 또는 Percentage(자본의 %)
- **바운티 시스템**: open → pending_match → claimed → fulfilled, 10분 크론 폴링
- **구독**: 오퍼링에 티어 바인딩 {name, price, duration}
- **셀러 런타임**: WebSocket(socket.io) 기반 실시간 Job 수신

---

## 2. 유사 마켓플레이스

### Agent Exchange (AEX) — 가장 성숙한 구조
- **URL**: https://github.com/open-experiments/agent-exchange
- **Stars**: 357 / **스택**: Go 1.21+, Python, MongoDB, Docker, 10개 마이크로서비스
- **아키텍처**: 브로커 모델 — 소비자 제출 → 구독 프로바이더에 브로드캐스트 → 입찰 → 낙찰 → 직접 통신 → 정산
- **수수료**: 15% 플랫폼
- **적용**: 입찰/매칭/정산 패턴 참조

### MarketClaw
- **URL**: https://github.com/marketclaw-tech/marketclaw
- **스택**: Node.js, Firestore, Base(L2)
- **특징**: JSON 핸드셰이크, 에이전트 등록(능력+지갑), 평판 시스템(Sybil 방지)
- **적용**: 평판 프레임워크 참조

### SingularityNET
- **URL**: https://dev.singularitynet.io/docs/products/AIMarketplace/
- **특징**: Multi-party Escrow + 단방향 페이먼트 채널, Daemon 추상화
- **적용**: 에스크로 패턴, 서비스 발견 (블록체인 이벤트 → DB 캐싱) 참조

### Fetch.ai uAgents
- **URL**: https://github.com/fetchai/uAgents
- **Stars**: 1.6k / **스택**: Python, Almanac 스마트 컨트랙트
- **특징**: 데코레이터 기반 에이전트, 시작 시 Almanac에 자동 등록 → Agentverse 발견
- **적용**: 에이전트 자동 등록/발견 패턴 참조

---

## 3. 웹 마켓플레이스 레퍼런스

### OpenStock
- **URL**: https://github.com/Open-Dev-Society/OpenStock
- **Stars**: 9.8k / **스택**: Next.js 15, React 19, Tailwind CSS v4, shadcn/ui, MongoDB, Inngest, Gemini AI
- **적용**:
  - Inngest 이벤트 워크플로우 (크론, 이벤트 트리거, AI 추론)
  - Server Actions 패턴 ('use server' + graceful degradation)
  - AI 폴백 체인 (Gemini → Siray.ai)
  - MongoDB 연결 캐싱 (global.mongooseCache 싱글톤)
  - Command+K 검색 팔레트

### OneStopShop
- **URL**: https://github.com/jackblatch/OneStopShop
- **Stars**: 591 / **스택**: Next.js 13, Drizzle ORM, Clerk Auth, Stripe Connect
- **적용**: Stripe Connect 멀티벤더 마켓플레이스 패턴 (플랫폼 수수료 + 판매자 지급)

---

## 4. 프로토콜 상세 비교

### 4.1 UCP (Universal Commerce Protocol) — Google + Shopify

- **URL**: https://ucp.dev / https://github.com/Universal-Commerce-Protocol/ucp (2,497 stars)
- **발표**: 2026년 1월 NRF, Apache 2.0
- **참여**: Google, Shopify, Etsy, Wayfair, Target, Walmart, Mastercard, Visa, Stripe, Adyen, AmEx 등 20+

**아키텍처 (3계층):**
- Shopping Service Layer: 트랜잭션 프리미티브 (checkout, line items, totals)
- Capabilities Layer: 기능 도메인 (Checkout, Orders, Catalog) — 독립 버전 관리
- Extensions Layer: 도메인별 스키마 합성 (core 수정 없이 확장)

**Discovery (`/.well-known/ucp`):**
- 머천트가 JSON 매니페스트 퍼블리시 (services, capabilities, payment handlers, signing keys)
- Intersection Algorithm으로 상호 지원 가능 capabilities 동적 협상
- UCP-Agent HTTP 헤더로 에이전트 프로필 전달

**트랜스포트:**
- REST (OpenAPI 3.x), MCP (JSON-RPC 2.0), A2A (Agent Card), Embedded (iframe)
- 하나의 프로필에서 동시에 여러 트랜스포트 지원

**결제 (3-Role):**
- Credential Provider (Google Pay, Shop Pay) → Business (Merchant) → Platform (AI Agent)
- 원시 결제 정보는 비즈니스에 직접 전달 안 됨 (토큰/암호화 페이로드만)
- PCI-DSS 범위 최소화

**Checkout 상태 머신:**
- `incomplete` → `requires_escalation` → `ready_for_complete`
- 에이전트가 자동 해결 시도 → 불가 시 사용자에게 `continue_url` 핸드오프

**SDK:**
- JS: `@ucp-js/sdk` (npm), Python: 공식 SDK, 샘플: FastAPI/Hono/A2A+Gemini
- Java SDK 없음 (커뮤니티만)

**마켓플레이스 적용 가능 요소:**
- `/.well-known/` 기반 탈중앙 에이전트 발견
- Capability Negotiation (에이전트 간 서비스 매칭)
- 3-Role 결제 모델 (플랫폼=중개, 판매자=Business)
- Checkout 상태 머신 (인간 개입 필요 시점 명확)
- Extension 네임스페이스 (중앙 승인 없이 확장)

---

### 4.2 AP2 (Agent Payments Protocol) — Google

- **URL**: https://ap2-protocol.org / https://github.com/google-agentic-commerce/AP2
- **발표**: 2025년 9월, Apache 2.0
- **참여**: Google, Mastercard, PayPal, Adyen, Coinbase, AmEx, Revolut, Etsy, Salesforce 등 60+

**핵심 혁신: 암호학적 Mandate 모델**
- W3C Verifiable Credentials 기반 디지털 증명서
- 하드웨어 기반 디바이스 키로 서명 (ECDSA, Ed25519)

**Mandate 3종:**

1. **Cart Mandate (Human-Present)**
   - 사용자 실시간 참여, 정확한 거래 내역 포함
   - 판매자가 먼저 서명 (이행 보증) → 사용자가 디바이스 키로 서명
   - 분쟁 시 불변의 증거

2. **Intent Mandate (Human-Not-Present)**
   - 자율 에이전트 위임, 허가 범위/TTL 포함
   - 에이전트의 사용자 요청 이해도(prompt playback) 포함
   - 사용자 부재 시에도 검증 가능한 권한 증명

3. **Payment Mandate**
   - 결제 네트워크에 AI 에이전트 거래임을 알리는 시그널
   - Human-Present/Not-Present 모달리티 플래그

**역할 (6개):**
- User, Shopping Agent, Credentials Provider, Merchant Endpoint, Merchant Payment Processor, Network/Issuer

**A2A x402 Extension (에이전트 간 암호화폐 결제):**
- GitHub: https://github.com/google-agentic-commerce/a2a-x402
- Coinbase, Ethereum Foundation, MetaMask 협력
- 3단계: 개시(payment-required) → 서명 → 정산(온체인)
- 중개자 없는 P2P 에이전트 상거래, USDC 스테이블코인

**분쟁 해결 프레임워크:**
- 자체 오용: 사용자 서명 → 사용자 책임
- 에이전트 오선택(승인됨): Cart Mandate → 사용자 책임
- 에이전트 오선택(미승인): Intent vs 실제 불일치 → 에이전트 책임
- 계정 탈취: 인증 시그널 → CP/발급자 책임

**현재 상태 (V0.1):**
- Python SDK만 (PyPI 미게시)
- Pull 결제(카드), Human-Present만
- V1.x 예정: Push 결제, 반복결제, HNP 완전 지원, MCP 구현

**마켓플레이스 적용 가능 요소:**
- Agent Card (`/.well-known/agent-card.json`) 기반 서비스 발견
- Mandate = 서비스 계약 (SLA, 가격, 범위의 암호학적 보증)
- A2A x402로 에이전트 간 직접 결제 (마이크로서비스 과금)
- Human-Present/Not-Present 이중 모드 (고가 서비스 vs 자율 위임)
- 역할 기반 아키텍처 (구매자/판매자/오케스트레이터 분리)
- 암호학적 분쟁 해결 (누구 책임인지 증명 가능)

---

### 4.3 프로토콜 포지셔닝 (상호 보완적)

| 프로토콜 | 레이어 | 초점 | 결제 방식 |
|---|---|---|---|
| **ACP (Virtuals)** | 실행 | AI 에이전트 P2P 상거래 | 온체인 에스크로, WETH |
| **ACP (OpenAI/Stripe)** | 체크아웃 | AI 쇼핑 체크아웃 | Stripe SPT, 카드 |
| **UCP (Google/Shopify)** | 발견+체크아웃 | 탈중앙 커머스 표준 | 다중 PSP |
| **AP2 (Google)** | 거버넌스 | 인가+추적+분쟁 | 결제 수단 무관 |
| **x402 (Coinbase)** | HTTP 실행 | 마이크로페이먼트 | USDC 온체인 |
| **A2A (Google)** | 통신 | 에이전트 간 협업 | 결제 아님 (AP2/x402와 결합) |
| **ANP** | 신원 | 탈중앙 ID | 결제 아님 |

**핵심 인사이트**: ACP + AP2 + x402는 서로 다른 레이어를 담당하므로 **동시 적용 가능**.
- ACP: 에이전트 서비스 거래 (Job 생명주기)
- AP2: 결제 인가/거버넌스 (Mandate로 신뢰 보증)
- x402: 에이전트 간 마이크로페이먼트 (API 호출당 과금)
- UCP: 외부 커머스 연동 (쇼핑 에이전트가 판매자와 거래)
