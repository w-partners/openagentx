# OpenAgentX - Virtuals Protocol ACP 리서치

## 1. Virtuals Protocol 개요

Virtuals Protocol은 2024년 출시된 AI 에이전트 인프라 플랫폼으로, Ethereum Base L2 위에서 동작한다.
2025년부터 Ethereum mainnet, Solana, Ronin으로 멀티체인 확장되었다.

- **VIRTUAL 토큰**: 프로토콜 거버넌스 및 에이전트 토큰 발행에 사용
- **veVIRTUAL**: 스테이킹 토큰 (최대 2년 잠금, 거버넌스 투표 참여)

### 공식 리소스
- Whitepaper: https://whitepaper.virtuals.io
- GitHub: https://github.com/Virtual-Protocol
- ACP 앱: https://app.virtuals.io/research/agent-commerce-protocol

---

## 2. Agent Commerce Protocol (ACP)

### 핵심 개념
ACP는 자율 AI 에이전트 간 안전하고 검증 가능한 상거래를 위한 개방형 표준이다.

**주요 특징:**
- 스마트 컨트랙트 기반 에스크로 시스템
- 암호화 합의 검증
- 독립적 평가 단계
- 온체인 불변 기록 (감사 추적)
- 허가 불필요(permissionless), 체인 무관(chain-agnostic)

### 거래 흐름
1. **Buyer** → 서비스 검색 및 Job 생성 → 대금 에스크로 잠금
2. **Seller** → Job 수락 및 서비스 실행 → 결과물 전달
3. **Evaluator** (선택) → 결과물 검증
4. 검증 성공 시 에스크로에서 Seller 지갑으로 대금 해제

### ACP 아키텍처 용어
- **Agent Wallet**: 에이전트의 온체인 지갑 (Base 체인)
- **Session Entity**: 에이전트 세션 식별자
- **Job**: 바이어-셀러 간 거래 단위
- **Offering**: 셀러가 등록하는 서비스 (이름, 설명, 가격)
- **Evaluator**: 결과물 품질을 검증하는 제3자 에이전트

---

## 3. ACP Node SDK (@virtuals-protocol/acp-node)

### 설치
```bash
npm install @virtuals-protocol/acp-node
```

### 초기화
```typescript
import { AcpClient, AcpContractClientV2 } from '@virtuals-protocol/acp-node';

const acpClient = new AcpClient({
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY,  // 0x 접두사 포함
  sessionEntityKeyId: process.env.ENTITY_KEY_ID,
  agentWalletAddress: process.env.AGENT_WALLET_ADDRESS,
  rpcUrl: process.env.RPC_URL,  // 선택사항
  chainConfig: { ... },
  onNewTask: async (task) => { /* 새 작업 수신 콜백 */ },
  onJobEvaluation: async (job) => { /* 평가 콜백 */ }
});
```

### 핵심 기능
- **Seller**: 서비스 오퍼링 등록, Job 수신/실행/결과 전달
- **Buyer**: 서비스 검색, Job 생성, 대금 지불
- **Evaluator**: 결과물 검증

### 테스트 권장
- 셀러 서비스 가격: $0.01 (테스트용)
- 환경변수에 0x 접두사 포함한 프라이빗 키 설정

---

## 4. OpenClaw ACP CLI

### 리포지토리
- https://github.com/Virtual-Protocol/openclaw-acp

### 기능
- CLI 기반 ACP 에이전트 관리
- 셀러 런타임: WebSocket 기반 Job 수신/처리
- `acp sell create <name>`: 오퍼링 등록
- `acp serve start`: 셀러 런타임 시작
- handlers.ts에서 `executeJob` 구현

### 프로젝트 구조
```
seller/
  ├── runtime/      # WebSocket, job handler, offering loader
  └── offerings/    # 서비스 오퍼링 정의
```

---

## 5. GAME Framework

GAME(Generative Autonomous Multimodal Engine)은 Virtuals Protocol의 에이전트 의사결정 프레임워크.

### 아키텍처
- **Task Generator**: 에이전트 목표 기반 작업 생성
- **Workers**: 실제 기능 실행 (함수/액션 바인딩)
- **High-Level Planner**: 전략적 의사결정
- **Low-Level Planner**: 세부 실행 계획

### SDK
- npm: `@virtuals-protocol/game`
- GitHub: https://github.com/game-by-virtuals/game-node
- GAME ACP Plugin: `@virtuals-protocol/game-acp-plugin`

---

## 6. 데이터 소스 API

### DexScreener API
- 문서: https://docs.dexscreener.com/api/reference
- Rate Limit: 300 req/min
- 기능: 토큰 검색, 페어 데이터, 실시간 가격, 거래량, 유동성
- 최대 30개 토큰 주소 동시 조회
- SDK: `dexscreener-sdk` (npm)

### CoinGecko API
- 무료 티어: /api/v3 (rate limit 제한적)
- Pro 티어: /api/v3 with API key
- 기능: 시가총액, 가격, 거래량, 차트 데이터, 트렌딩 코인

### 온체인 RPC
- Base chain: https://mainnet.base.org (공개 RPC)
- Ethereum: Infura/Alchemy
- 기능: 트랜잭션 조회, 컨트랙트 호출, 잔액 확인

---

## 7. 핵심 의존성 패키지

| 패키지 | 용도 |
|--------|------|
| `@virtuals-protocol/acp-node` | ACP SDK |
| `@virtuals-protocol/game` | GAME Framework (선택) |
| `@virtuals-protocol/game-acp-plugin` | GAME-ACP 통합 (선택) |
| `ethers` | 이더리움 지갑/트랜잭션 |
| `dexscreener-sdk` | DexScreener API |
| `axios` | HTTP 클라이언트 |
| `dotenv` | 환경변수 관리 |
| `ws` | WebSocket 통신 |
