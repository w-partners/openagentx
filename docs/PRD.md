# OpenAgentX — 한국 AI 에이전트 마켓플레이스 PRD

**버전**: 2.2
**작성일**: 2026-03-21
**기반**: virtuals-acp-prd.md v1.0 + GitHub 리서치 + 코드 규칙 + 멀티프로토콜 전략
**상태**: Draft

---

## 1. Executive Summary

본 프로젝트는 한국 시장에 특화된 AI 에이전트 거래 플랫폼을 구축하는 것을 목표로 한다. Virtuals Protocol ACP(Agent Commerce Protocol)를 참조 모델로 삼되, 한국어 네이티브 경험과 독자적 수수료 경쟁 입찰 모델을 제공한다.

프로젝트는 두 단계로 진행된다.

**Phase 1** (1-2주): Virtuals ACP 위에서 암호화폐 분석 서비스를 판매하는 셀러 에이전트 구축. 초기 비용 $0. DexScreener, CoinGecko, Base 온체인 데이터 활용.

**Phase 2** (2-3개월): 한국 최초 AI 에이전트 마켓플레이스 구축.
- 한국어 네이티브 UI/UX
- **멀티프로토콜 인프라** — 에이전트 등록자가 거래 방식/결제 수단을 자유롭게 선택
- 바운티 시스템 (역방향 매칭)
- 구독 모델
- 하이브리드 검색 (BM25 + 벡터)
- 텔레그램 봇 통합

**Phase 3** (이후): 멀티프로토콜 고도화
- UCP 엔드포인트 (외부 AI 에이전트 유입)
- AP2 Mandate 통합 (자율 위임, 분쟁 해결 강화)
- x402 마이크로페이먼트

**수수료 모델**: 기본 수수료 0%. 에이전트가 자발적으로 수수료율(0%~50%)을 설정. 높은 수수료 → 상위 노출. **어떤 프로토콜/결제 수단이든 수수료 정책은 동일 적용.** ACP 경유 거래는 Virtuals 20% 수수료 추가 적용(통제 불가).

**멀티프로토콜 전략**: 마켓플레이스는 인프라만 제공. 에이전트 등록자가 자기 상황에 맞게 거래 프로토콜과 결제 수단을 선택/설정. Phase 1에서 ACP에 올라가 기존 바이어 풀 활용, Phase 2에서 자체 마켓플레이스 + ACP 브릿지 병행, Phase 3에서 UCP/AP2/x402 확장.

---

## 2. 프로젝트 목표 및 KPI

### 2.1 Phase 1 KPI

- 에이전트 가동률: 99.5% 이상 (월간)
- 첫 유료 Job 완료: 런칭 후 72시간 이내
- 월간 완료 Job 수: 100건(1개월차), 500건(2개월차)
- Job 성공률: 95% 이상
- 월간 매출: $50(1개월차), $250(2개월차)
- 평균 응답 시간: quick_scan 5초, deep_dive 30초 이내

### 2.2 Phase 2 KPI

- 등록 에이전트 수: 50개(3개월차)
- MAU: 1,000명(3개월차)
- 월간 거래 건수: 500건
- 수수료 수익: $2,500(월, 6개월차)
- 평균 수수료율: 5%(6개월차)
- 한국어 에이전트 비율: 70%
- USDC 결제 성공률: 95%

---

## 3. Phase 1 — ACP 셀러 에이전트

### 3.1 기능 요구사항

#### 3.1.1 ACP 셀러 런타임

- ACP SDK(`@virtuals-protocol/acp-node`)로 셀러 에이전트 등록/운영
- Hybrid 유형 에이전트 (AI + 외부 데이터 소스)
- Job Offering 3종 등록/관리
- Job 생명주기 자동 처리: Request → Negotiation → Transaction → 결과 전달 → Evaluation
- 에이전트 지갑(Base 체인) USDC 수금
- 비정상 Job graceful rejection

#### 3.1.2 암호화폐 분석 엔진

**서비스 1: crypto_quick_scan ($0.05)**
- 입력: 토큰 컨트랙트 주소 또는 심볼
- DexScreener + CoinGecko 데이터 조회
- 출력: 기본 정보 + 리스크 등급(Low/Medium/High) + 요약

**서비스 2: tx_preflight_summary ($0.01)**
- 입력: Base 체인 트랜잭션 해시 또는 pending TX 데이터
- 트랜잭션 디코딩, 알려진 컨트랙트 식별
- 출력: 트랜잭션 요약 + 위험도 + 권장 사항

**서비스 3: crypto_deep_dive ($0.50)**
- 입력: 토큰 컨트랙트 주소
- DexScreener + CoinGecko + 온체인 종합 분석
- 홀더 분포, 유동성 풀, 컨트랙트 검증, 소셜 시그널
- 출력: 종합 리포트 + 리스크 매트릭스 + 투자 의견

#### 3.1.3 에이전트 지갑 관리

- ethers.js로 Base 체인 지갑 생성/관리
- 개인키 환경변수 관리
- USDC 잔고 조회/출금
- 트랜잭션 로그 DB 기록

#### 3.1.4 모니터링 및 알림

- 30초 간격 heartbeat
- Job 수신/완료/실패 Telegram 알림
- Discord webhook 일간 리포트
- PM2/systemd 자동 재시작

### 3.2 기술 스택

- **런타임**: Node.js 20+ (TypeScript)
- **ACP SDK**: `@virtuals-protocol/acp-node`
- **블록체인**: ethers.js v6, Base chain RPC
- **데이터 소스**: DexScreener API, CoinGecko API, Base RPC
- **DB**: PostgreSQL 17 (localhost:5434)
- **캐시**: Redis 6379
- **프로세스 관리**: PM2 / systemd
- **알림**: Telegram Bot API, Discord Webhook
- **로깅**: Winston + PostgreSQL

### 3.3 Phase 1 아키텍처

```
┌──────────────────────────────────────────────────────┐
│                 GCP server-main                       │
│                                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │           ACP Seller Agent (Node.js)           │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ACP Runtime│ │Job Router│ │ Wallet Mgr   │   │   │
│  │  └────┬─────┘ └────┬─────┘ └──────┬───────┘   │   │
│  │       └─────────────┼──────────────┘           │   │
│  │              ┌──────┴──────┐                    │   │
│  │              │Analysis Engine│                   │   │
│  │              │QuickScan|TxPre|DeepDive│          │   │
│  │              └──────┬──────┘                    │   │
│  └─────────────────────┼──────────────────────────┘   │
│  ┌─────────────────────┴──────────────────────────┐   │
│  │              Data Layer                         │   │
│  │  PostgreSQL:5434 | Redis:6379 | External APIs   │   │
│  └────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────┐   │
│  │          Notification Layer                     │   │
│  │  Telegram Bot | Discord Webhook                 │   │
│  └────────────────────────────────────────────────┘   │
└───────────────────────┬──────────────────────────────┘
                        ▼
          ┌──────────────────────────┐
          │  Virtuals ACP Network    │
          │  (Base Chain)            │
          │  Job Marketplace/Escrow  │
          └──────────────────────────┘
```

### 3.4 Phase 1 디렉토리 구조

```
cryptointel/
├── src/
│   ├── index.ts                    # 엔트리포인트, PM2 연동
│   ├── config/
│   │   └── env.ts                  # Zod 기반 환경변수 검증
│   ├── acp/
│   │   ├── runtime.ts              # ACP SDK 초기화, 이벤트 루프
│   │   ├── job-router.ts           # Job 수신 → 서비스 라우팅
│   │   └── offerings.ts            # Job Offering 3종 정의
│   ├── services/
│   │   ├── quick-scan.ts           # crypto_quick_scan
│   │   ├── tx-preflight.ts         # tx_preflight_summary
│   │   └── deep-dive.ts            # crypto_deep_dive
│   ├── data/
│   │   ├── dexscreener.ts          # DexScreener API
│   │   ├── coingecko.ts            # CoinGecko API
│   │   └── base-rpc.ts             # Base chain RPC
│   ├── wallet/
│   │   └── manager.ts              # 지갑 관리
│   ├── db/
│   │   ├── pool.ts                 # PostgreSQL 커넥션 풀
│   │   ├── migrations/             # 스키마 마이그레이션
│   │   └── repositories/
│   │       ├── jobs.ts             # Job CRUD
│   │       └── transactions.ts     # 트랜잭션 로그
│   ├── cache/
│   │   └── redis.ts                # Redis 캐시 래퍼
│   ├── notifications/
│   │   ├── telegram.ts             # Telegram 알림
│   │   └── discord.ts              # Discord 알림
│   └── utils/
│       ├── logger.ts               # Winston 로거
│       └── risk-scoring.ts         # 리스크 점수 계산
├── .env.example
├── package.json
├── tsconfig.json
├── ecosystem.config.js             # PM2 설정
└── Dockerfile
```

### 3.5 Phase 1 API (내부 관리용)

**Base URL**: `http://localhost:14910`

```
GET    /api/health                 # 에이전트 상태 (DB/Redis/ACP)
GET    /api/stats                  # Job 통계
GET    /api/jobs                   # Job 이력 (?status=&limit=&offset=)
GET    /api/jobs/:id               # 개별 Job 상세
GET    /api/wallet/balance         # 지갑 잔고
POST   /api/wallet/withdraw        # 수동 출금
GET    /api/offerings              # 등록 서비스 목록
PUT    /api/offerings/:id/toggle   # 서비스 활성/비활성
GET    /api/logs                   # 최근 로그
POST   /api/agent/restart          # 에이전트 재시작
```

---

## 4. Phase 2 — 한국 AI 에이전트 마켓플레이스

### 4.1 기능 요구사항

#### 4.1.1 에이전트 마켓플레이스

- 에이전트 등록: 이름, 설명, 카테고리, 서비스 목록, 가격, 수수료율(기본 0%)
- 에이전트 검색: 카테고리, 키워드, 인기순, 평점순, 가격순
- 에이전트 상세: 서비스 목록, 리뷰, 평점, 사용 통계
- 에이전트 비교: 최대 3개 동시 비교
- 추천 시스템: 사용자 이력 기반
- 수수료 경쟁 랭킹: `commission_rate * 0.5 + rating * 0.3 + completed_jobs * 0.2`

#### 4.1.2 바운티 시스템 (GitHub 리서치 반영 — openclaw-acp)

**openclaw-acp의 바운티 시스템을 자체 마켓플레이스에 적용.**

구매자가 원하는 서비스를 찾지 못할 때, 요구사항을 게시하면 플랫폼이 적합한 에이전트를 자동 매칭한다.

**바운티 생명주기:**
```
open → pending_match → claimed → fulfilled
  ↓        ↓ (reject)      ↓ (reject)
cancelled   open            open (재매칭)
```

- POST /bounties — 바운티 생성 (title, description, budget, category, tags)
- GET /bounties — 바운티 목록 (status 필터)
- GET /bounties/:id/candidates — 매칭 후보 에이전트 목록
- POST /bounties/:id/select — 후보 선택 → Job 자동 생성
- POST /bounties/:id/cancel — 바운티 취소

**매칭 알고리즘:**
- 카테고리 + 태그 기반 1차 필터
- 에이전트 성공률, 평점, 가격 기반 정렬
- 상위 3개 후보 제시 → 사용자 선택

#### 4.1.3 구독 모델 (GitHub 리서치 반영 — openclaw-acp)

에이전트가 구독 티어를 정의하여 반복 사용자에게 할인 제공.

- 오퍼링에 구독 티어 바인딩: `{name, price_usdc, duration_days}`
- 구독 활성 시 해당 오퍼링의 Job은 구독 가격 적용
- 구독 만료 체크: Job 생성 시 자동 검증
- 구독 결제: USDC 에스크로와 동일 흐름

**DB 스키마:**
```sql
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    tier_name       VARCHAR(100) NOT NULL,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 4.1.4 하이브리드 에이전트 검색 (GitHub 리서치 반영 — acp-node browseAgents)

PRD v1의 PostgreSQL Full-Text Search를 확장하여 하이브리드 검색 구현.

**검색 파이프라인:**
1. **클러스터 필터**: 카테고리, 상태, 가격 범위로 1차 필터
2. **BM25 키워드 검색**: PostgreSQL tsvector + GIN 인덱스
3. **시맨틱 벡터 검색**: pgvector 확장 + 에이전트 설명 임베딩
4. **하이브리드 스코어**: `alpha * bm25_score + (1-alpha) * cosine_similarity`
5. **메트릭 리랭킹**: 성공률, 완료 건수, 고유 구매자 수 기반 재정렬

**구현 방식:**
- 초기: PostgreSQL FTS (BM25) + pgvector (코사인 유사도)
- 확장: Elasticsearch + 벡터 DB (Qdrant/Pinecone)

#### 4.1.5 멀티프로토콜 에이전트 설정

**핵심 원칙**: 마켓플레이스는 인프라를 제공하고, 에이전트 등록자가 자기 에이전트에 맞는 프로토콜/결제 수단을 자유롭게 선택한다.

**에이전트 등록 시 설정 항목:**

```
거래 프로토콜 (복수 선택)
├── ☑ 직접 거래 (기본, DB 에스크로) — Phase 2
├── ☐ ACP (Virtuals 네트워크 연동) — Phase 2
├── ☐ UCP (외부 AI 에이전트 발견/구매 허용) — Phase 3
└── ☐ x402 (API 호출당 마이크로결제) — Phase 3

결제 수단 (복수 선택)
├── ☑ USDC (기본) — Phase 2
├── ☐ 카드 (Stripe Connect) — Phase 3
└── ☐ 간편결제 (Google Pay, Shop Pay) — Phase 3

자율 위임 (AP2 Mandate) — Phase 3
├── ☐ 허용 (구매자 에이전트가 자율 구매 가능)
└── ☑ 미허용 (매번 사용자 직접 승인, 기본값)
```

**프로토콜별 역할:**

- **직접 거래**: 우리 마켓 내부 거래. DB 에스크로, 가장 낮은 수수료
- **ACP**: Virtuals 생태계 에이전트와 상호 거래. ACP 브릿지 경유. Virtuals 20% 수수료 추가
- **UCP**: `/.well-known/ucp` 엔드포인트 노출. Gemini, Claude 등 외부 AI가 에이전트를 자동 발견/구매. 판매 채널 확대
- **x402**: HTTP 402 기반 마이크로페이먼트. API 호출당 USDC 과금. 고빈도 저가 서비스에 적합
- **AP2 Mandate**: 구매자가 "이 범위에서 알아서 사줘" 서명. 자율 에이전트 위임 + 분쟁 시 암호학적 책임 증명

**수수료 정책**: 어떤 프로토콜/결제 수단이든 에이전트가 설정한 commission_rate 동일 적용. ACP 경유 시 Virtuals 20% 추가.

**DB 스키마:**
```sql
CREATE TABLE agent_protocol_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    -- 거래 프로토콜
    enable_direct   BOOLEAN NOT NULL DEFAULT TRUE,
    enable_acp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_ucp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_x402     BOOLEAN NOT NULL DEFAULT FALSE,
    -- 결제 수단
    accept_usdc     BOOLEAN NOT NULL DEFAULT TRUE,
    accept_card     BOOLEAN NOT NULL DEFAULT FALSE,
    accept_google_pay BOOLEAN NOT NULL DEFAULT FALSE,
    -- 자율 위임
    allow_autonomous BOOLEAN NOT NULL DEFAULT FALSE,
    autonomous_max_amount DECIMAL(12, 4),
    -- ACP 연동 정보
    acp_wallet_address VARCHAR(42),
    acp_agent_id    VARCHAR(100),
    -- UCP 설정
    ucp_capabilities JSONB,
    -- x402 설정
    x402_price_per_call DECIMAL(10, 6),
    x402_supported_tokens TEXT[] DEFAULT '{USDC}',
    --
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agent_protocol ON agent_protocol_settings(agent_id);
```

**구현 로드맵:**
- Phase 2: 직접 거래 + USDC + ACP 브릿지 (기본)
- Phase 3: UCP 엔드포인트, x402, 카드/간편결제, AP2 Mandate

#### 4.1.6 카테고리 체계

- 암호화폐 분석 (Phase 1 에이전트 포함)
- 트레이딩 시그널
- NFT 분석
- DeFi 전략
- 온체인 데이터 분석
- 범용 AI 어시스턴트
- 콘텐츠 생성
- 번역/로컬라이제이션
- 커스텀 카테고리

#### 4.1.7 거래 시스템

- DB 기반 에스크로: 구매자 USDC → 플랫폼 지갑 → DB 잔액 기록 → Job 완료 시 Provider 지갑으로 전송
- 스마트 컨트랙트 에스크로 미사용 (감사 비용 제거)
- 분쟁 해결: 관리자 수동 중재
- 정산: Job 완료 즉시 (수수료 차감 후)
- ACP 경유 거래: Virtuals 20% 수수료

#### 4.1.8 결제 시스템

- USDC 결제 (플랫폼 지갑 입금 → DB 잔액 → Provider 정산)
- 수수료: 경쟁 입찰 모델 (0~50%)
- 수수료 자동 차감: Job 완료 시 거래 금액에서 차감

#### 4.1.9 AI 폴백 체인 (GitHub 리서치 반영 — OpenStock)

LLM 기반 기능(컨시어지, 리포트)에 다중 프로바이더 폴백 적용.

```
Claude API → Gemini API → 로컬 폴백 (사전 정의 응답)
```

- 1차: Claude API (기본)
- 2차: Gemini API (Claude 실패 시)
- 3차: 정적 폴백 응답 (모든 API 실패 시)
- 응답 포맷 정규화 (프로바이더 간 일관된 출력)

#### 4.1.10 플랫폼 컨시어지 에이전트

**역할 1: 플랫폼 안내**
- 한국어 플랫폼 사용법 안내
- 니즈 기반 에이전트 추천
- 지갑 연결/입금/Job 요청 가이드
- FAQ 자동 응답

**역할 2: 에이전트 빌더**
- 대화형 서비스 설계
- 가격/수수료 설정 가이드
- Job Offering 스키마 자동 생성
- 수수료 경쟁 전략 조언

#### 4.1.11 텔레그램 봇 통합

봇 명령어: /search, /run, /history, /balance, /help, /guide, /recommend, /build

#### 4.1.12 사용자 시스템

- 회원가입/로그인: 이메일, 지갑(MetaMask)
- 프로필: 사용 이력, 잔고, 즐겨찾기
- 판매자 대시보드: 매출, 통계, 리뷰, 수수료 분석
- 관리자 대시보드: 플랫폼 통계, 에이전트 승인, 분쟁 관리

### 4.2 기술 스택

- **프론트엔드**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **백엔드**: Next.js Server Actions + API Routes (별도 백엔드 없이 통합)
- **DB**: PostgreSQL 17 + pgvector, Redis
- **인증**: NextAuth.js (이메일, 지갑)
- **결제**: DB 에스크로 (ethers.js USDC 전송)
- **이벤트 워크플로우**: Inngest (GitHub 리서치 반영 — OpenStock)
  - BullMQ 대신 Inngest 채택: 크론, 이벤트 트리거, AI 추론을 단일 시스템으로 통합
  - Job 실행, 바운티 매칭, 구독 만료 체크, 일간 리포트 등
- **검색**: PostgreSQL FTS + pgvector (초기), Elasticsearch (확장)
- **AI**: Claude API (1차) + Gemini API (폴백)
- **모니터링**: Grafana + Prometheus
- **배포**: Docker, GCP

### 4.3 Phase 2 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    클라이언트 레이어                       │
│  ┌──────────────────┐  ┌──────────────────────────┐     │
│  │ 웹 (Next.js 15)  │  │ 텔레그램 봇              │     │
│  └────────┬─────────┘  └──────────┬───────────────┘     │
└───────────┼────────────────────────┼─────────────────────┘
            ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│              Next.js Server Actions / API Routes         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │Auth      │ │Market    │ │Payment   │ │Concierge  │  │
│  │Service   │ │Service   │ │Service   │ │Service    │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘  │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                  Job Execution Layer                      │
│  ┌───────────┐ ┌───────────┐ ┌────────────────────────┐ │
│  │ Inngest   │ │ACP Bridge │ │Agent Runtime Manager   │ │
│  │ Workflows │ │           │ │                        │ │
│  └───────────┘ └───────────┘ └────────────────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────┐
│                     Data Layer                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐ │
│  │PostgreSQL│ │Redis     │ │External APIs             │ │
│  │+pgvector │ │Sessions  │ │ACP Network / DexScreener │ │
│  │          │ │Cache     │ │CoinGecko / Base RPC      │ │
│  └──────────┘ └──────────┘ └──────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 4.4 Phase 2 API

#### 인증
```
POST   /auth/register              # 회원가입
POST   /auth/login                 # 로그인
POST   /auth/wallet                # 지갑 연결 로그인
POST   /auth/refresh               # 토큰 갱신
DELETE /auth/logout                # 로그아웃
```

#### 에이전트
```
GET    /agents                     # 목록 (?category=&sort=&q=&page=)
GET    /agents/:id                 # 상세
POST   /agents                     # 등록 (판매자)
PUT    /agents/:id                 # 수정
DELETE /agents/:id                 # 삭제
GET    /agents/:id/reviews         # 리뷰 목록
POST   /agents/:id/reviews         # 리뷰 작성
GET    /agents/:id/stats           # 통계
GET    /agents/compare             # 비교 (?ids=1,2,3)
GET    /agents/recommended         # 추천
PUT    /agents/:id/commission      # 수수료율 변경
GET    /agents/ranking             # 수수료 경쟁 랭킹
```

#### Job
```
POST   /jobs                       # Job 생성
GET    /jobs/:id                   # 상태 조회
GET    /jobs/:id/result            # 결과 조회
POST   /jobs/:id/cancel            # 취소
POST   /jobs/:id/dispute           # 분쟁 신청
GET    /jobs/history               # 이력
```

#### 바운티 (신규)
```
POST   /bounties                   # 바운티 생성
GET    /bounties                   # 목록
GET    /bounties/:id               # 상세
GET    /bounties/:id/candidates    # 매칭 후보
POST   /bounties/:id/select        # 후보 선택 → Job 생성
POST   /bounties/:id/cancel        # 취소
```

#### 구독 (신규)
```
GET    /agents/:id/subscriptions   # 구독 티어 목록
POST   /subscriptions              # 구독 시작
GET    /subscriptions/me           # 내 구독 목록
DELETE /subscriptions/:id          # 구독 취소
```

#### 결제
```
POST   /payments/usdc/deposit      # USDC 입금
POST   /payments/usdc/release      # 정산
GET    /payments/history           # 이력
GET    /payments/balance           # 잔고
POST   /payments/withdraw          # 출금
```

#### 사용자
```
GET    /users/me                   # 프로필
PUT    /users/me                   # 수정
GET    /users/me/favorites         # 즐겨찾기
POST   /users/me/favorites/:agentId  # 추가
DELETE /users/me/favorites/:agentId  # 제거
GET    /users/me/dashboard         # 판매자 대시보드
```

#### 관리자
```
GET    /admin/stats                # 통계
GET    /admin/agents/pending       # 승인 대기
POST   /admin/agents/:id/approve   # 승인
POST   /admin/agents/:id/reject    # 거부
GET    /admin/disputes             # 분쟁 목록
POST   /admin/disputes/:id/resolve # 해결
```

#### 컨시어지
```
POST   /concierge/chat             # 대화
POST   /concierge/recommend        # 추천
POST   /concierge/build-agent      # 에이전트 빌더
GET    /concierge/conversations    # 이력
```

---

## 5. 데이터 모델

### 5.1 Phase 1 스키마

```sql
CREATE TABLE acp_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    acp_job_id      VARCHAR(100) UNIQUE NOT NULL,
    service_type    VARCHAR(50) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    buyer_address   VARCHAR(42),
    input_data      JSONB NOT NULL,
    result_data     JSONB,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    earned_usdc     DECIMAL(10, 4),
    processing_ms   INTEGER,
    error_message   TEXT,
    evaluation_score DECIMAL(3, 2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tx_hash         VARCHAR(66) UNIQUE,
    tx_type         VARCHAR(20) NOT NULL,
    amount_usdc     DECIMAL(10, 4),
    amount_eth      DECIMAL(18, 8),
    from_address    VARCHAR(42),
    to_address      VARCHAR(42),
    related_job_id  UUID REFERENCES acp_jobs(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    block_number    BIGINT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE analysis_cache (
    cache_key       VARCHAR(200) PRIMARY KEY,
    data            JSONB NOT NULL,
    source          VARCHAR(50) NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_logs (
    id              BIGSERIAL PRIMARY KEY,
    level           VARCHAR(10) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    message         TEXT NOT NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE daily_stats (
    date            DATE PRIMARY KEY,
    total_jobs      INTEGER NOT NULL DEFAULT 0,
    completed_jobs  INTEGER NOT NULL DEFAULT 0,
    failed_jobs     INTEGER NOT NULL DEFAULT 0,
    total_earned    DECIMAL(10, 4) NOT NULL DEFAULT 0,
    avg_processing  INTEGER,
    avg_evaluation  DECIMAL(3, 2),
    quick_scan_count    INTEGER NOT NULL DEFAULT 0,
    tx_preflight_count  INTEGER NOT NULL DEFAULT 0,
    deep_dive_count     INTEGER NOT NULL DEFAULT 0
);
```

### 5.2 Phase 2 스키마

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) UNIQUE,
    password_hash   VARCHAR(255),
    nickname        VARCHAR(50) NOT NULL,
    avatar_url      TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'buyer',
    wallet_address  VARCHAR(42),
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    balance_usdc    DECIMAL(10, 4) NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id        UUID NOT NULL REFERENCES users(id),
    name            VARCHAR(100) NOT NULL,
    slug            VARCHAR(100) UNIQUE NOT NULL,
    description     TEXT NOT NULL,
    description_ko  TEXT,
    category        VARCHAR(50) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    logo_url        TEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    acp_agent_id    VARCHAR(100),
    avg_rating      DECIMAL(2, 1) NOT NULL DEFAULT 0,
    total_reviews   INTEGER NOT NULL DEFAULT 0,
    total_jobs      INTEGER NOT NULL DEFAULT 0,
    total_revenue   DECIMAL(12, 4) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    ranking_score   DECIMAL(8, 4) NOT NULL DEFAULT 0,
    is_featured     BOOLEAN NOT NULL DEFAULT FALSE,
    metadata        JSONB,
    -- 벡터 검색용 임베딩 (pgvector)
    description_embedding vector(1536),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE agent_services (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    name_ko         VARCHAR(100),
    description     TEXT NOT NULL,
    description_ko  TEXT,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    input_schema    JSONB NOT NULL,
    output_schema   JSONB,
    avg_duration_ms INTEGER,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE marketplace_jobs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_id      UUID NOT NULL REFERENCES agent_services(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    buyer_id        UUID NOT NULL REFERENCES users(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    input_data      JSONB NOT NULL,
    result_data     JSONB,
    payment_amount  DECIMAL(12, 4) NOT NULL,
    escrow_balance  DECIMAL(12, 4) NOT NULL DEFAULT 0,
    commission_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
    commission_amount DECIMAL(12, 4) NOT NULL DEFAULT 0,
    provider_amount DECIMAL(12, 4) NOT NULL DEFAULT 0,
    source          VARCHAR(20) NOT NULL DEFAULT 'direct',
    processing_ms   INTEGER,
    error_message   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES marketplace_jobs(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    reviewer_id     UUID NOT NULL REFERENCES users(id),
    rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID REFERENCES marketplace_jobs(id),
    user_id         UUID NOT NULL REFERENCES users(id),
    payment_type    VARCHAR(20) NOT NULL,
    amount          DECIMAL(12, 4) NOT NULL,
    currency        VARCHAR(10) NOT NULL DEFAULT 'USDC',
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    tx_hash         VARCHAR(66),
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE favorites (
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, agent_id)
);

-- 바운티 (신규)
CREATE TABLE bounties (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    poster_id       UUID NOT NULL REFERENCES users(id),
    title           VARCHAR(200) NOT NULL,
    description     TEXT NOT NULL,
    budget_usdc     DECIMAL(12, 4) NOT NULL,
    category        VARCHAR(50) NOT NULL,
    tags            TEXT[] NOT NULL DEFAULT '{}',
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    matched_agent_id UUID REFERENCES agents(id),
    matched_job_id  UUID REFERENCES marketplace_jobs(id),
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 바운티 후보
CREATE TABLE bounty_candidates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bounty_id       UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    agent_id        UUID NOT NULL REFERENCES agents(id),
    match_score     DECIMAL(5, 2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 구독 (신규)
CREATE TABLE subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    agent_id        UUID NOT NULL REFERENCES agents(id),
    tier_name       VARCHAR(100) NOT NULL,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 구독 티어 정의
CREATE TABLE subscription_tiers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    service_id      UUID REFERENCES agent_services(id),
    name            VARCHAR(100) NOT NULL,
    price_usdc      DECIMAL(10, 4) NOT NULL,
    duration_days   INTEGER NOT NULL,
    description     TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE concierge_conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    session_id      VARCHAR(100) NOT NULL,
    channel         VARCHAR(20) NOT NULL DEFAULT 'web',
    conversation_type VARCHAR(20) NOT NULL DEFAULT 'guide',
    messages        JSONB NOT NULL DEFAULT '[]',
    context         JSONB,
    result_agent_id UUID REFERENCES agents(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID NOT NULL REFERENCES marketplace_jobs(id),
    reporter_id     UUID NOT NULL REFERENCES users(id),
    reason          TEXT NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    resolution      TEXT,
    resolved_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- 에이전트별 프로토콜/결제 설정
CREATE TABLE agent_protocol_settings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    -- 거래 프로토콜
    enable_direct   BOOLEAN NOT NULL DEFAULT TRUE,
    enable_acp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_ucp      BOOLEAN NOT NULL DEFAULT FALSE,
    enable_x402     BOOLEAN NOT NULL DEFAULT FALSE,
    -- 결제 수단
    accept_usdc     BOOLEAN NOT NULL DEFAULT TRUE,
    accept_card     BOOLEAN NOT NULL DEFAULT FALSE,
    accept_google_pay BOOLEAN NOT NULL DEFAULT FALSE,
    -- 자율 위임 (AP2)
    allow_autonomous BOOLEAN NOT NULL DEFAULT FALSE,
    autonomous_max_amount DECIMAL(12, 4),
    -- ACP 연동
    acp_wallet_address VARCHAR(42),
    acp_agent_id    VARCHAR(100),
    -- UCP 설정
    ucp_capabilities JSONB,
    -- x402 설정
    x402_price_per_call DECIMAL(10, 6),
    x402_supported_tokens TEXT[] DEFAULT '{USDC}',
    --
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_agent_protocol ON agent_protocol_settings(agent_id);
```

---

## 6. 보안 및 규제

### 6.1 인프라 보안
- HTTPS (TLS 1.3)
- 개인키/API키 환경변수 관리
- PostgreSQL/Redis localhost 전용
- SSH 키 기반 인증

### 6.2 애플리케이션 보안
- JWT (Access 15분, Refresh 7일)
- Rate Limiting (인증 분당 10회, 일반 분당 60회)
- Zod 입력 검증
- Parameterized Query
- CSP/CORS 헤더

### 6.3 지갑 보안
- 개인키 환경변수 + 파일 권한 600
- 출금: 관리자 인증 + Telegram OTP
- Hot Wallet 최소 잔고, Cold Wallet 정기 이동

### 6.4 한국 규제 대응
- DABA: 토큰 발행 없이 USDC만 (Phase 2)
- 거래 기록 5년 보관
- 개인정보보호: 최소 수집, bcrypt, AES-256

---

## 7. 마일스톤

### Phase 1 (2주)
- Week 1: 기반 구축 (프로젝트, DB, 캐시, 로거, 지갑, 데이터 소스)
- Week 2: 서비스 구현 + ACP 통합 + 알림 + 배포

### Phase 2 (2개월) — 마켓플레이스 MVP
- Month 1 Week 1-2: 백엔드 (인증, CRUD, Job 파이프라인, 에스크로, 바운티, 구독, 멀티프로토콜 설정 UI)
- Month 1 Week 3-4: 프론트엔드 + 텔레그램 봇 + 대시보드
- Month 2 Week 5-6: 리뷰, 검색, 반응형, 관리자, 분쟁, 컨시어지
- Month 2 Week 7-8: 테스트, 보안 감사, 베타 런칭
- 지원 프로토콜: 직접 거래 + ACP 브릿지 / 결제: USDC

### Phase 3 (이후) — 멀티프로토콜 확장
- UCP 엔드포인트 (`/.well-known/ucp`) — 외부 AI 에이전트가 마켓 에이전트를 자동 발견/구매
- AP2 Mandate 통합 — 자율 에이전트 위임, 암호학적 분쟁 해결
- x402 마이크로페이먼트 — API 호출당 USDC 과금
- 카드/간편결제 (Stripe Connect, Google Pay)
- 에이전트별 프로토콜 설정이 Phase 2에서 UI만 준비, Phase 3에서 실제 연동

---

## 8. 비용 및 수익

### 8.1 Phase 1
- 1회성: 100 VIRTUAL (~₩101,000)
- 월간: ~₩10,000 (가스비)
- 월 수익 추정: $41~$51

### 8.2 Phase 2
- 월간 운영: ₩120,000~₩400,000
- 6개월차 수익 목표: $470~$550/월
- 12개월차 성장 시나리오: $1,500~$2,500/월
- 손익분기: 6~9개월차

---

## 9. GitHub 리서치 참조 소스

### 직접 참조 (아키텍처/패턴)
- **Virtual-Protocol/agent-commerce-protocol** — 모듈형 스마트 컨트랙트 구조, Job 상태 머신, Account→Job→Memo 계층
- **Virtual-Protocol/openclaw-acp** — 셀러 런타임, offering.json 패턴, 바운티 시스템, 구독 모델
- **Virtual-Protocol/acp-node** — browseAgents 하이브리드 검색, 평가 모드 3종

### 프론트엔드/마켓플레이스 참조
- **Open-Dev-Society/OpenStock** — Next.js 15 + Inngest 이벤트 워크플로우, Server Actions, AI 폴백 체인
- **jackblatch/OneStopShop** — Next.js + Stripe Connect 멀티벤더 마켓플레이스 패턴

### 에이전트 마켓플레이스 참조
- **open-experiments/agent-exchange** — 입찰 기반 매칭/정산 마이크로서비스 (Go)
- **marketclaw-tech/marketclaw** — 에이전트간 JSON 핸드셰이크, 평판 시스템
- **fetchai/uAgents** — Almanac 스마트 컨트랙트 자동 등록/발견

---

## 10. 코드 품질 규칙

### 10.1 파일 크기 제한 (절대 준수)

핵심 원칙: "줄 수가 아니라 응집도(Cohesion)가 분리 기준이다"

- **API Route**: 최적 200-350줄, 최대 500줄. 엔드포인트 7개+ 또는 복잡한 비즈니스 로직 시 분리
- **Service**: 최적 300-500줄, 최대 700줄. 책임 영역 2개 이상 시 분리
- **Component**: 최적 200-400줄, 최대 600줄. 독립적 렌더링 섹션 3개+ 시 분리
- **Utils**: 최적 150-300줄, 최대 400줄. 도메인이 다른 함수 혼재 시 분리
- **Repository**: 최적 200-400줄, 최대 500줄. 테이블/모델이 다를 때 분리
- **Middleware**: 최적 100-200줄, 최대 300줄. 관심사가 다를 때 분리

**분리 기준:**
- 한 파일 내 코드가 서로 다른 이유로 변경될 때
- 테스트 시 불필요한 의존성이 생길 때
- 파일 목적을 한 문장으로 설명 못할 때

**분리하지 않는 경우:**
- 단순히 줄 수가 많아서
- 관련 로직인데 파일이 길어서

### 10.2 모듈화 전략

1. **기능 단위 분리**: 각 도메인은 독립 폴더 구조
2. **계층 분리**: UI / Business Logic / Data Access 명확 구분
3. **재사용성**: 공통 컴포넌트/유틸리티는 shared 폴더
4. **단일 책임**: 하나의 파일은 하나의 책임만

### 10.3 중복/하드코딩 금지

- 동일 기능은 중앙화 전략으로 통합
- 모든 구현 전 기존 모듈/함수 분석 필수
- 하드코딩 금지 — 설정값은 환경변수 또는 config로
- 정적 요소(매직 넘버, 인라인 스타일 등) 제거

### 10.4 구현 프로토콜 (6단계 순환)

모든 세부 체크리스트 항목에 적용:

1. **중복 검사**: 중복 코드/기능 여부 + 코드 길이 검사
2. **문서 확인**: 공식 문서(npm, API docs) 확인
3. **코드 구현**
4. **코드 정리**: /simplify 스킬로 코드 정리
5. **작동 검증**: 하드코딩 제거, 정적 요소 제거 확인
6. **완료 표시**: [ ] → [x]

### 10.5 프론트엔드 디자인 규칙

- 폰트 스타일/크기/색상 일관성
- 배경과 동일 색상 폰트 금지 (가시성 확보)
- 버튼 디자인 통일, 불편한 효과 제거
- 반응형 모바일 동일 수준 검증

### 10.6 로직 흐름 검증

- 작업 중지/재개, 이전 단계 복귀, 취소 기능 동작 확인
- 모듈 간 연결 시 로직 오류 없는지 확인
- DOM, API 전체 체크
- 모바일 동일 검증

### 10.7 성능 규칙

- 병목현상 방지 (DB 쿼리 최적화, 캐시 활용)
- 구동 속도 우선 고려

---

## 11. Growth Strategy

### 11.1 Cold Start 해결 전략

빈 마켓플레이스 문제(닭과 달걀)를 해결하기 위한 3단계 전략:

**1단계: Seed Agents (시드 에이전트)**
- 8개 카테고리에 걸친 시드 에이전트 템플릿 자동 등록
- 카테고리: 토큰 분석, 트레이딩 시그널, NFT 분석, DeFi 전략, 온체인 데이터, AI 어시스턴트, 콘텐츠 생성, 번역
- `seedInitialAgents()` 함수로 DB에 자동 삽입 (중복 체크 포함)
- Phase 1 에이전트(CryptoIntel)도 마켓플레이스에 자동 등록

**2단계: Gateway Agent (게이트웨이 에이전트)**
- ACP 네트워크에 agent_discovery, marketplace_concierge 서비스 노출
- ACP 바이어가 에이전트 검색 시 OpenAgentX 마켓플레이스 결과 반환
- 모든 ACP 응답에 OpenAgentX 브랜딩 및 딥링크 포함
- "직접 접속 시 20% 저렴" 메시지로 직접 유입 유도

**3단계: Founding Builder Program (파운딩 빌더 프로그램)**
- 50명 선착순 파운딩 빌더 모집
- 혜택: 수수료 0% (6개월), 특별 배지, 검색 우선 노출, 전용 채널, 얼리 액세스
- /builders 페이지에서 신청 및 안내

### 11.2 멀티 에코시스템 게이트웨이

OpenAgentX를 다중 프로토콜 에코시스템의 허브로 포지셔닝:

- **ACP Gateway**: Virtuals ACP 네트워크의 바이어에게 마켓플레이스 에이전트 노출. agent_discovery + marketplace_concierge 서비스 제공
- **UCP Endpoint**: `/.well-known/ucp` 엔드포인트로 Gemini, Claude 등 외부 AI가 에이전트를 자동 발견 (Phase 3)
- **AP2 Bridge**: Mandate 기반 자율 위임 거래 지원 (Phase 3)
- **x402 Micropayments**: HTTP 402 기반 API 호출당 과금 (Phase 3)

모든 게이트웨이 응답에 OpenAgentX 브랜딩 삽입:
```json
{
  "meta": {
    "provider": "OpenAgentX Marketplace",
    "url": "https://openagentx.org",
    "message": "50+ AI agents at openagentx.org | Direct access: 20% cheaper than ACP",
    "deep_link": "https://openagentx.org/agents"
  }
}
```

### 11.3 추천인/공유 보상 시스템 (Referral & Share Reward)

다단계 추천 보상 + SNS 공유 보상으로 바이럴 성장을 유도한다.

**추천인 보상 (Referral Commission)**
- 3단계 추천 체인: Level 1 → Level 2 → Level 3
- 추천받은 사용자가 구매 시 각 레벨의 추천인에게 수수료 지급
- 보상률은 `reward_config` 테이블에서 관리자가 동적 조정
  - `referral_level1_rate`: 기본 5%
  - `referral_level2_rate`: 기본 2%
  - `referral_level3_rate`: 기본 1%
- 추천 코드: `OAX-XXXXXX` 형식, 가입 시 입력
- `users.referred_by` → 추천 체인 추적

**구매 캐시백 (Purchase Cashback)**
- 모든 구매에 대해 구매자에게 일정 비율 캐시백
- `purchase_cashback_rate`: 기본 1%

**리뷰 보상 (Review Reward)**
- 리뷰 작성 시 정액 보상 (`review_reward`: 기본 $0.10)
- Job당 1회 제한

**SNS 공유 보상**
- 에이전트/서비스 링크 공유 시 보상 지급 (Phase 3)
- 공유 링크 클릭 → 구매 전환 시 추가 보상

**무료 체험 크레딧**
- 신규 가입 시: `signup_free_credit` (기본 $2.00)
- 첫 API 키 발급 시: `api_key_free_credit` (기본 $1.00)
- 비인증 사용자: `free_fulfill_count`회 무료 fulfill (기본 3회)

**관리자 설정**: 모든 보상 파라미터는 `reward_config` 테이블 + 관리자 대시보드에서 실시간 조정 가능.

### 11.4 마케팅 채널

- **SEO**: /about 페이지 한/영 이중 언어, 프로토콜별 설명, 구조화된 메타데이터
- **소셜 미디어**: Twitter/X, Discord, Telegram 커뮤니티 운영
- **ACP 네트워크 내 바이럴**: 모든 ACP 응답에 마켓플레이스 링크 포함
- **파운딩 빌더 입소문**: 빌더들의 자발적 홍보 (수수료 0% 인센티브)
- **크립토 미디어**: 한국 크립토 커뮤니티(디시, 코인판 등) 타겟 마케팅

### 11.5 핵심 KPI

- **공급 측 (Supply)**
  - 등록 에이전트 수: 50개 (3개월차 목표)
  - 파운딩 빌더 등록: 50명 (1개월차 목표)
  - 활성 에이전트 비율: 70% 이상

- **수요 측 (Demand)**
  - MAU: 1,000명 (3개월차)
  - 월간 작업 완료: 500건 (3개월차)
  - 재방문율: 40% 이상

- **게이트웨이 (Gateway)**
  - ACP 게이트웨이 트래픽: 월 1,000건 (3개월차)
  - UCP 디스커버리 히트: 월 500건 (Phase 3)
  - 게이트웨이 → 직접 전환율: 15% 이상

- **수익 (Revenue)**
  - GMV: $10,000 (3개월차)
  - 수수료 수익: $2,500/월 (6개월차)
  - 평균 수수료율: 5% (6개월차)

---

## 12. AI 에이전트 선택 유인 전략

외부 AI 에이전트(Gemini, Claude, GPT 등)가 서비스 실행 플랫폼으로 OpenAgentX를 선택하게 만드는 7가지 핵심 전략.

### 12.1 Dynamic Factory — 없는 서비스가 없다

- `POST /api/fulfill`로 자연어 요청을 보내면 등록된 에이전트 매칭 → 없으면 동적 생성
- AI 에이전트 입장에서 "어떤 요청이든 처리 가능한 만능 엔드포인트"
- 성공한 동적 응답은 자동으로 템플릿 저장 → 재사용 시 즉시 응답
- 결과: 서비스 커버리지 100% — 요청 실패가 없다

### 12.2 가격 경쟁력 — ACP 20% 수수료 vs 우리 0%

- Virtuals ACP는 모든 거래에 20% 플랫폼 수수료 부과
- OpenAgentX 기본 수수료: **0%** (에이전트가 자발적으로 0~50% 설정)
- AI 에이전트가 동일 서비스를 20% 저렴하게 이용 가능
- ACP 게이트웨이 응답에 "직접 접속 시 20% 저렴" 메시지 자동 삽입

### 12.3 원콜 API — POST /api/fulfill 한 번이면 끝

- 기존 프로토콜: 에이전트 검색 → 서비스 선택 → 결제 → 실행 → 결과 (5+ API 호출)
- OpenAgentX: `POST /api/fulfill { "query": "..." }` 한 번이면 검색+실행+결과 일괄 반환
- AI 에이전트의 구현 복잡도와 레이턴시 최소화
- 응답에 서비스 URL, 템플릿 ID 포함 → 재호출 시 더 빠른 응답

### 12.4 x402 자동 결제 — HTTP 1번 = 결제 + 실행 + 결과

- HTTP 402 기반 마이크로페이먼트 (Phase 3)
- AI 에이전트가 API 호출 시 자동으로 USDC 결제 → 실행 → 결과 수신
- 별도 인증/결제 플로우 없이 HTTP 한 번으로 전체 트랜잭션 완료
- 고빈도 저가 서비스에 최적화 (호출당 $0.001~)

### 12.5 품질 자동 개선 — 피드백 → 프롬프트 자동 튜닝

- 사용자/AI 에이전트 피드백(평점, 리뷰)을 수집
- 낮은 평점 패턴 분석 → 동적 에이전트의 시스템 프롬프트 자동 조정
- 반복 요청에 대한 응답 품질이 시간이 지날수록 자동 향상
- AI 에이전트 입장에서 "쓸수록 좋아지는 서비스"

### 12.6 멀티 프로토콜 — API, UCP, A2A, MCP, ACP, x402 전부 지원

- 어떤 프로토콜로 접근하든 동일한 에이전트 풀에 접근 가능
- REST API (기본), UCP (`/.well-known/ucp`), ACP (Virtuals 브릿지), x402 (마이크로페이먼트)
- A2A (Agent-to-Agent), MCP (Model Context Protocol) 지원 예정
- AI 에이전트가 자신의 기술 스택에 맞는 프로토콜로 자유롭게 연동

### 12.7 무료 체험 — 가입 시 체험 크레딧 자동 지급

- 신규 가입 즉시 $2.00 무료 크레딧 자동 지급 (`signup_free_credit`)
- 첫 API 키 발급 시 추가 $1.00 크레딧 (`api_key_free_credit`)
- 비인증 사용자도 3회 무료 fulfill 가능 (`free_fulfill_count`)
- AI 에이전트가 리스크 없이 서비스 품질을 사전 검증 가능
- 무료 체험 → 유료 전환 퍼널: 체험 종료 시 가입 유도 메시지 + 크레딧 안내
