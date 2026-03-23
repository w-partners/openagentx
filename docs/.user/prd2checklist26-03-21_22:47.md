# OpenAgentX — 상세 구현 체크리스트

**PRD**: docs/PRD.md v2.2
**생성일**: 2026-03-21 22:47
**작업 프로토콜**: 모든 최하위 항목에 6단계 순환 적용

---

## 6단계 작업 프로토콜

1단계: 중복 코드/기능 검사 + 코드 길이 검사
2단계: 공식 문서 확인 (npm, API docs)
3단계: 코드 구현
4단계: /simplify 스킬로 코드 정리
5단계: 작동 검증, 하드코딩 제거, 정적 요소 제거
6단계: 체크리스트 완료 표시 [ ] → [x]

---

## Phase 1: ACP 셀러 에이전트

### 1. 프로젝트 초기화 및 기반 설정

- [x] 1.1 프로젝트 구조 재구성
  - [x] 1.1.1 패키지 재정비
    - [x] 1.1.1.1 package.json 의존성 추가 (pg, ioredis, zod, winston, fastify, node-pg-migrate, dotenv)
    - [x] 1.1.1.2 불필요한 의존성 제거 (@anthropic-ai/sdk는 Phase 2로 이동, pino→winston)
    - [x] 1.1.1.3 scripts 정비 (dev, build, start, migrate:up, migrate:down)
    - [x] 1.1.1.4 npm install 실행 및 lock 파일 갱신
  - [x] 1.1.2 TypeScript 설정
    - [x] 1.1.2.1 tsconfig.json paths alias 추가 (@config, @services, @data, @db, @cache, @utils 등)
    - [x] 1.1.2.2 strict 모드 확인, sourceMap/declaration 유지
    - [x] 1.1.2.3 ESLint 설정 (.eslintrc.json — typescript-eslint, no-unused-vars)
    - [x] 1.1.2.4 Prettier 설정 (.prettierrc — singleQuote, semi, printWidth 100)
  - [x] 1.1.3 디렉토리 구조 변경
    - [x] 1.1.3.1 기존 engine/, ai/ 폴더 → services/, data/ 로 리네임/이동
    - [x] 1.1.3.2 신규 폴더 생성: db/, db/migrations/, db/repositories/, cache/, notifications/
    - [x] 1.1.3.3 기존 acp/seller.ts, acp/buyer.ts → acp/runtime.ts, acp/job-router.ts 로 재구성
    - [x] 1.1.3.4 기존 utils/http.ts 유지, utils/risk-scoring.ts 신규 생성 예정
  - [x] 1.1.4 기존 코드 정리
    - [x] 1.1.4.1 기존 코드 중 재활용 가능한 부분 식별 (dexscreener, coingecko, onchain, wallet)
    - [x] 1.1.4.2 기존 코드 중 폐기할 부분 제거 (ai/reporter.ts, acp/offerings.ts 구버전)
    - [x] 1.1.4.3 .gitignore 업데이트 (dist, .env, logs/, *.log)
    - [x] 1.1.4.4 .env.example 업데이트 (PG, Redis, Telegram, Discord, 관리 API 변수)

- [x] 1.2 Zod 기반 환경변수 검증
  - [x] 1.2.1 환경변수 스키마 정의
    - [x] 1.2.1.1 src/config/env.ts 생성 — Zod 스키마 (ACP, DB, Redis, API 키, 알림, 운영 설정)
    - [x] 1.2.1.2 필수/선택 분류 (ACP_WALLET_PRIVATE_KEY=필수, COINGECKO_API_KEY=선택)
    - [x] 1.2.1.3 타입 변환 (문자열→숫자: PORT, MAX_DAILY_SPEND / 문자열→불리언: ENABLE_DISCORD)
    - [x] 1.2.1.4 검증 실패 시 에러 메시지 포맷팅 + 즉시 process.exit(1)
  - [x] 1.2.2 환경 분리
    - [x] 1.2.2.1 dotenv 로딩 (NODE_ENV에 따라 .env.development / .env.production)
    - [x] 1.2.2.2 config 객체 export (타입 안전, 전역 싱글톤)
    - [x] 1.2.2.3 .env.example 전체 변수 목록 + 설명 주석
    - [x] 1.2.2.4 기존 config/index.ts 제거, 새 config/env.ts로 대체

- [x] 1.3 PostgreSQL Phase 1 스키마
  - [x] 1.3.1 마이그레이션 도구 설정
    - [x] 1.3.1.1 node-pg-migrate 설치 및 설정 파일 (.migrate.ts 또는 package.json 내 설정)
    - [x] 1.3.1.2 DB 연결 정보 환경변수 참조 (DATABASE_URL)
    - [x] 1.3.1.3 npm scripts: migrate:up, migrate:down, migrate:create
    - [x] 1.3.1.4 첫 마이그레이션 파일 생성 템플릿
  - [x] 1.3.2 acp_jobs 테이블
    - [x] 1.3.2.1 마이그레이션 파일 작성 (PRD 5.1 스키마 그대로)
    - [x] 1.3.2.2 인덱스: status, service_type, created_at DESC
    - [x] 1.3.2.3 updated_at 자동 갱신 트리거
    - [x] 1.3.2.4 마이그레이션 실행 및 검증 (psql로 테이블 확인) — DB 연결 후 실행
  - [x] 1.3.3 wallet_transactions 테이블
    - [x] 1.3.3.1 마이그레이션 파일 작성
    - [x] 1.3.3.2 인덱스: tx_type, created_at DESC
    - [x] 1.3.3.3 acp_jobs FK 관계 설정
    - [x] 1.3.3.4 마이그레이션 실행 및 검증 — DB 연결 후 실행
  - [x] 1.3.4 analysis_cache + agent_logs + daily_stats
    - [x] 1.3.4.1 analysis_cache 마이그레이션 (cache_key PK, expires_at 인덱스)
    - [x] 1.3.4.2 agent_logs 마이그레이션 (BIGSERIAL PK, level/created_at 인덱스)
    - [x] 1.3.4.3 daily_stats 마이그레이션 (date PK)
    - [x] 1.3.4.4 전체 마이그레이션 실행 및 검증 — DB 연결 후 실행
  - [x] 1.3.5 DB 커넥션 풀
    - [x] 1.3.5.1 src/db/pool.ts — pg Pool 초기화 (max, idleTimeoutMillis, connectionTimeoutMillis)
    - [x] 1.3.5.2 연결 실패 시 에러 핸들링
    - [x] 1.3.5.3 graceful shutdown 시 pool.end() 호출
    - [x] 1.3.5.4 쿼리 헬퍼 함수 (query, getClient, transaction)

- [x] 1.4 Redis 캐시 래퍼
  - [x] 1.4.1 클라이언트 설정
    - [x] 1.4.1.1 src/cache/redis.ts — ioredis 클라이언트 초기화 (host, port, password, db)
    - [x] 1.4.1.2 연결 실패 재시도 (retryStrategy: 지수 백오프, maxRetriesPerRequest)
    - [x] 1.4.1.3 connect/error/close 이벤트 로깅
    - [x] 1.4.1.4 graceful shutdown 시 redis.quit()
  - [x] 1.4.2 캐시 유틸리티
    - [x] 1.4.2.1 get<T>(key) — JSON 역직렬화 + 타입 반환
    - [x] 1.4.2.2 set(key, value, ttlSeconds) — JSON 직렬화 + EX 설정
    - [x] 1.4.2.3 del(key), delPattern(pattern) — 삭제 + 패턴 삭제
    - [x] 1.4.2.4 getOrFetch 중앙화 캐시 패턴 + 네임스페이스

- [x] 1.5 Winston 로거 + DB 저장
  - [x] 1.5.1 로거 설정
    - [x] 1.5.1.1 src/utils/logger.ts — Winston 인스턴스 (level: config.LOG_LEVEL)
    - [x] 1.5.1.2 콘솔 트랜스포트 (컬러, 타임스탬프, JSON 포맷)
    - [x] 1.5.1.3 파일 트랜스포트 (logs/app.log, 일별 로테이션, 30일 보관)
    - [x] 1.5.1.4 기존 pino 로거 제거, winston으로 교체
  - [x] 1.5.2 DB 트랜스포트
    - [x] 1.5.2.1 배치 삽입 (agent_logs 테이블, 100개 또는 5초마다 flush)
    - [x] 1.5.2.2 구조화 메타데이터 (level, category, message, metadata)
    - [x] 1.5.2.3 startDbLogTransport / stopDbLogTransport 라이프사이클
    - [x] 1.5.2.4 30일 이상 로그 정리 함수 (cleanOldLogs)

### 2. 블록체인 및 지갑

- [x] 2.1 Base chain 지갑 관리
  - [x] 2.1.1 Provider 및 지갑 초기화
    - [x] 2.1.1.1 src/wallet/manager.ts — ethers.JsonRpcProvider (BASE_RPC_URL)
    - [x] 2.1.1.2 Wallet 인스턴스 (AGENT_WALLET_PRIVATE_KEY → ethers.Wallet)
    - [x] 2.1.1.3 address, getSigner() getter
    - [x] 2.1.1.4 Provider 연결 상태 확인 (getBlockNumber 호출)
  - [x] 2.1.2 지갑 보안
    - [x] 2.1.2.1 nonce 관리 (getNonce → 캐시, 트랜잭션 후 +1)
    - [x] 2.1.2.2 가스비 추정 (estimateGas + 20% 버퍼)
    - [x] 2.1.2.3 일일 지출 추적 (dailySpend 메모리 + DB 동기화)
    - [x] 2.1.2.4 canSpend(amount) 검증 (MAX_DAILY_SPEND 초과 방지)
- [x] 2.2 USDC 잔고/출금
  - [x] 2.2.1 USDC 컨트랙트 연동
    - [x] 2.2.1.1 Base USDC 컨트랙트 주소 + ERC20 ABI (balanceOf, transfer, decimals)
    - [x] 2.2.1.2 getUsdcBalance() — decimals 처리 (6자리)
    - [x] 2.2.1.3 transferUsdc(to, amount) — 가스비 자동, receipt 대기
    - [x] 2.2.1.4 getEthBalance() — 가스비용 ETH 잔고 확인
  - [x] 2.2.2 출금 안전장치
    - [x] 2.2.2.1 일일 출금 한도 검증 (DAILY_WITHDRAW_LIMIT)
    - [x] 2.2.2.2 화이트리스트 검증 (WITHDRAW_WHITELIST 환경변수)
    - [x] 2.2.2.3 잔고 충분성 검증 (amount + 예상 가스비 < balance)
    - [x] 2.2.2.4 실패 시 재시도 (3회, 지수 백오프, 각 시도 로깅)
- [x] 2.3 트랜잭션 로그 DB
  - [x] 2.3.1 리포지토리 구현
    - [x] 2.3.1.1 src/db/repositories/transactions.ts — create(tx) INSERT
    - [x] 2.3.1.2 updateStatus(id, status, blockNumber?) UPDATE
    - [x] 2.3.1.3 findByType(type, limit, offset) SELECT
    - [x] 2.3.1.4 getDailyStats(date) — 일별 집계 쿼리
- [x] 2.4 Base RPC 클라이언트
  - [x] 2.4.1 다중 엔드포인트
    - [x] 2.4.1.1 src/data/base-rpc.ts — 주/백업 RPC URL 설정 (BASE_RPC_URL, BASE_RPC_FALLBACK)
    - [x] 2.4.1.2 헬스체크 (getBlockNumber 성공 여부)
    - [x] 2.4.1.3 자동 폴백 (주 실패 → 백업 전환, 로깅)
    - [x] 2.4.1.4 레이트 리미팅 (초당 최대 요청 수, 큐잉)

### 3. 외부 데이터 소스

- [x] 3.1 DexScreener API
  - [x] 3.1.1 API 구현
    - [x] 3.1.1.1 src/data/dexscreener.ts — 기존 코드 기반 리팩토링 (axios → createHttpClient 재사용)
    - [x] 3.1.1.2 searchTokens(query) — GET /latest/dex/search
    - [x] 3.1.1.3 getTokenPairs(address) — GET /tokens/{address}
    - [x] 3.1.1.4 getTrendingTokens() — GET /token-boosts/top/v1
  - [x] 3.1.2 에러 핸들링
    - [x] 3.1.2.1 TypeScript interface 정의 (DexPair, DexSearchResult)
    - [x] 3.1.2.2 429 레이트 리미트 → 백오프 재시도 (300 req/min)
    - [x] 3.1.2.3 타임아웃 5초, 재시도 2회
    - [x] 3.1.2.4 응답 스키마 검증 (필수 필드 누락 시 경고 로깅)
- [x] 3.2 CoinGecko API
  - [x] 3.2.1 API 구현
    - [x] 3.2.1.1 src/data/coingecko.ts — 기존 코드 기반 리팩토링
    - [x] 3.2.1.2 getPrice(coinId) — /simple/price
    - [x] 3.2.1.3 getTrending() — /search/trending
    - [x] 3.2.1.4 getGlobalMarket() — /global
  - [x] 3.2.2 에러 핸들링
    - [x] 3.2.2.1 TypeScript interface 정의 (CoinPrice, TrendingCoin, GlobalMarketData)
    - [x] 3.2.2.2 Free tier 레이트 리미트 대응 (분당 10~30회, 429 시 대기)
    - [x] 3.2.2.3 API Key 헤더 (COINGECKO_API_KEY 있으면 x-cg-pro-api-key)
    - [x] 3.2.2.4 타임아웃 10초, 재시도 2회
- [x] 3.3 Redis 캐시 통합
  - [x] 3.3.1 캐시 정책
    - [x] 3.3.1.1 DexScreener 응답 캐싱 (prefix: ci:dex:, TTL 30초)
    - [x] 3.3.1.2 CoinGecko 응답 캐싱 (prefix: ci:cg:, TTL 5분)
    - [x] 3.3.1.3 캐시 미스 → API 호출 → 캐시 저장 → 반환 패턴 (getOrFetch 유틸)
    - [x] 3.3.1.4 수동 캐시 무효화 (delPattern으로 prefix 일괄 삭제)

### 4. 분석 서비스

- [x] 4.1 리스크 점수 유틸리티
  - [x] 4.1.1 점수 산출
    - [x] 4.1.1.1 src/utils/risk-scoring.ts — 팩터 정의 (유동성, 변동성, 홀더 집중도, 컨트랙트 검증)
    - [x] 4.1.1.2 가중치 환경변수 (RISK_WEIGHT_LIQUIDITY=0.3 등, 하드코딩 금지)
    - [x] 4.1.1.3 종합 점수 계산 (0~100 스케일, 가중 평균)
    - [x] 4.1.1.4 등급 분류 (0~25 LOW, 26~50 MEDIUM, 51~75 HIGH, 76~100 CRITICAL)
  - [x] 4.1.2 보조 계산
    - [x] 4.1.2.1 liquidityRatio = liquidity / marketCap
    - [x] 4.1.2.2 volatilityScore = abs(priceChange24h) 기반 정규화
    - [x] 4.1.2.3 holderConcentration = top10HolderPercent 기반
    - [x] 4.1.2.4 contractVerified 보너스 (-10점)
- [x] 4.2 crypto_quick_scan
  - [x] 4.2.1 서비스 구현
    - [x] 4.2.1.1 src/services/quick-scan.ts — 서비스 함수 (input: tokenAddress | symbol)
    - [x] 4.2.1.2 입력 검증 (Zod: 0x 주소 형식 또는 심볼 문자열)
    - [x] 4.2.1.3 DexScreener + CoinGecko 병렬 호출 (Promise.all)
    - [x] 4.2.1.4 리스크 점수 계산 → 결과 조합 → JSON 응답
  - [x] 4.2.2 캐싱 및 테스트
    - [x] 4.2.2.1 응답 스키마 (price, volume, marketCap, riskScore, riskGrade, summary)
    - [x] 4.2.2.2 analysis_cache DB 저장 (TTL 5분)
    - [x] 4.2.2.3 Redis 캐시 먼저 확인 → DB 캐시 확인 → API 호출
    - [x] 4.2.2.4 에러 시 부분 결과 반환 (DexScreener 실패해도 CoinGecko 결과만 반환)
- [x] 4.3 tx_preflight_summary
  - [x] 4.3.1 서비스 구현
    - [x] 4.3.1.1 src/services/tx-preflight.ts — 서비스 함수 (input: txHash 또는 {to, value, data})
    - [x] 4.3.1.2 입력 검증 (Zod: 66자 hex 또는 트랜잭션 객체)
    - [x] 4.3.1.3 트랜잭션 디코딩 (to, value, method selector, gas)
    - [x] 4.3.1.4 알려진 컨트랙트 식별 (DEX router 주소 목록, 환경변수로 관리)
  - [x] 4.3.2 위험도 판정
    - [x] 4.3.2.1 가스비 추정 (eth_estimateGas)
    - [x] 4.3.2.2 위험 플래그 (높은 value, 미검증 컨트랙트, approve(MAX_UINT))
    - [x] 4.3.2.3 응답 스키마 (estimatedGas, riskFlags[], recommendation: SAFE|CAUTION|DANGER)
    - [x] 4.3.2.4 에러 시 시뮬레이션 실패 → CAUTION 기본 반환
- [x] 4.4 crypto_deep_dive
  - [x] 4.4.1 데이터 수집
    - [x] 4.4.1.1 src/services/deep-dive.ts — 서비스 함수 (input: tokenAddress)
    - [x] 4.4.1.2 DexScreener + CoinGecko + 온체인 병렬 조회
    - [x] 4.4.1.3 홀더 분포 (상위 홀더 조회, ethers getCode로 컨트랙트 여부)
    - [x] 4.4.1.4 유동성 풀 상세 (TVL, 풀 생성일, 락 여부 추정)
  - [x] 4.4.2 리포트 생성
    - [x] 4.4.2.1 종합 리스크 매트릭스 (각 팩터별 점수 + 종합)
    - [x] 4.4.2.2 구조화된 JSON 리포트 (market, onchain, risk, summary 섹션)
    - [x] 4.4.2.3 analysis_cache DB 저장 (TTL 30분)
    - [x] 4.4.2.4 부분 데이터로도 리포트 생성 (일부 소스 실패 허용)

### 5. ACP 런타임 통합

- [x] 5.1 ACP SDK 초기화
  - [x] 5.1.1 SDK 설정
    - [x] 5.1.1.1 src/acp/runtime.ts — AcpClient 초기화 (walletPrivateKey, sessionEntityKeyId, agentWalletAddress)
    - [x] 5.1.1.2 onNewTask 콜백 등록 (Job 수신 → job-router로 전달)
    - [x] 5.1.1.3 onJobEvaluation 콜백 등록 (평가 결과 DB 저장)
    - [x] 5.1.1.4 연결 상태 모니터링 (connect/disconnect 이벤트 로깅)
  - [x] 5.1.2 런타임 관리
    - [x] 5.1.2.1 자동 재연결 (연결 해제 시 5초 후 재시도, 최대 10회)
    - [x] 5.1.2.2 graceful shutdown (진행 중 Job 완료 대기 후 종료)
    - [x] 5.1.2.3 런타임 상태 export (isConnected, lastHeartbeat)
    - [x] 5.1.2.4 에러 핸들링 (SDK 예외 → 로깅 + Telegram 알림)
- [x] 5.2 Job Offering 3종
  - [x] 5.2.1 Offering 정의
    - [x] 5.2.1.1 src/acp/offerings.ts — crypto_quick_scan ($0.05, input/output schema)
    - [x] 5.2.1.2 tx_preflight_summary ($0.01, input/output schema)
    - [x] 5.2.1.3 crypto_deep_dive ($0.50, input/output schema)
    - [x] 5.2.1.4 가격 환경변수 기반 (PRICE_QUICK_SCAN, PRICE_TX_PREFLIGHT, PRICE_DEEP_DIVE)
  - [x] 5.2.2 Offering 관리
    - [x] 5.2.2.1 ACP 네트워크 등록 함수 (registerOfferings)
    - [x] 5.2.2.2 활성화/비활성화 토글 (isActive 플래그)
    - [x] 5.2.2.3 등록된 Offering 목록 조회
    - [x] 5.2.2.4 Offering 메타데이터 로깅
- [x] 5.3 Job Router
  - [x] 5.3.1 라우팅
    - [x] 5.3.1.1 src/acp/job-router.ts — Job 수신 핸들러 (offering name → 서비스 매핑)
    - [x] 5.3.1.2 Zod 입력 검증 (offering별 스키마)
    - [x] 5.3.1.3 서비스 실행 (quick-scan | tx-preflight | deep-dive)
    - [x] 5.3.1.4 결과 반환 (ACP deliverJob 호출)
  - [x] 5.3.2 에러 처리
    - [x] 5.3.2.1 서비스 실행 에러 → 구조화된 에러 응답 (code, message, details)
    - [x] 5.3.2.2 타임아웃 (quick_scan 10초, tx_preflight 5초, deep_dive 30초)
    - [x] 5.3.2.3 실행 로그 DB 저장 (job_id, duration_ms, status)
    - [x] 5.3.2.4 메트릭 수집 (성공률, 평균 응답 시간 → daily_stats)
- [x] 5.4 Job 생명주기
  - [x] 5.4.1 상태 전이
    - [x] 5.4.1.1 REQUEST 수신 → accept (검증 통과 시) 또는 reject (검증 실패 시)
    - [x] 5.4.1.2 NEGOTIATION → TRANSACTION (에스크로 확인)
    - [x] 5.4.1.3 TRANSACTION → 서비스 실행 → deliverJob (결과 전달)
    - [x] 5.4.1.4 EVALUATION 수신 → DB 저장 (evaluation_score)
  - [x] 5.4.2 비정상 처리
    - [x] 5.4.2.1 타임아웃 Job → graceful rejection (사유 명시)
    - [x] 5.4.2.2 잘못된 입력 → reject (검증 에러 메시지 포함)
    - [x] 5.4.2.3 서비스 장애 → reject + Telegram 알림
    - [x] 5.4.2.4 Job 상태 불일치 감지 (DB vs ACP 비교, 자동 복구)
- [x] 5.5 Job DB 리포지토리
  - [x] 5.5.1 CRUD
    - [x] 5.5.1.1 src/db/repositories/jobs.ts — create(job) INSERT
    - [x] 5.5.1.2 updateStatus(id, status, resultData?) UPDATE (상태 전이 검증)
    - [x] 5.5.1.3 findById(id), findAll(filters, pagination) SELECT
    - [x] 5.5.1.4 getStats(date?) — 일별/전체 통계 (서비스별 카운트, 수익, 평균 응답시간)

### 6. 모니터링 및 알림

- [x] 6.1 Telegram 알림
  - [x] 6.1.1 기본 설정
    - [x] 6.1.1.1 src/notifications/telegram.ts — Bot API 클라이언트 (TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID)
    - [x] 6.1.1.2 sendMessage(text, parseMode='Markdown') 함수
    - [x] 6.1.1.3 메시지 큐잉 (초당 30개 레이트 리미트 준수)
    - [x] 6.1.1.4 전송 실패 재시도 (3회, 1초 간격)
  - [x] 6.1.2 알림 유형
    - [x] 6.1.2.1 Job 수신 알림 (서비스 유형, 구매자 주소, 가격)
    - [x] 6.1.2.2 Job 완료 알림 (결과 요약, 수익, 소요시간)
    - [x] 6.1.2.3 Job 실패 알림 (에러 유형, 상세 원인)
    - [x] 6.1.2.4 에이전트 다운/복구 알림
- [x] 6.2 Discord webhook
  - [x] 6.2.1 일간 리포트
    - [x] 6.2.1.1 src/notifications/discord.ts — webhook 클라이언트 (DISCORD_WEBHOOK_URL)
    - [x] 6.2.1.2 일간 통계 수집 (daily_stats 테이블 조회)
    - [x] 6.2.1.3 Embed 메시지 포맷팅 (총 Job, 수익, 성공률, 서비스별 분포)
    - [x] 6.2.1.4 매일 00:00 UTC 스케줄러 (setInterval 또는 node-cron)
  - [x] 6.2.2 추가 알림
    - [x] 6.2.2.1 주간 요약 (매주 월요일)
    - [x] 6.2.2.2 이상 감지 (실패율 > 20% 시 즉시 알림)
    - [x] 6.2.2.3 지갑 잔고 부족 경고 (ETH < 0.001 또는 USDC < 1)
    - [x] 6.2.2.4 레이트 리미트 준수 (분당 30개)
- [x] 6.3 Heartbeat
  - [x] 6.3.1 헬스체크
    - [x] 6.3.1.1 30초 간격 스케줄러 (setInterval)
    - [x] 6.3.1.2 ACP 연결 상태 확인 (runtime.isConnected)
    - [x] 6.3.1.3 DB 연결 확인 (SELECT 1)
    - [x] 6.3.1.4 Redis 연결 확인 (PING)
  - [x] 6.3.2 장애 대응
    - [x] 6.3.2.1 연속 실패 카운터 (3회 연속 → 경고, 5회 → 위험)
    - [x] 6.3.2.2 자동 재연결 시도 (DB/Redis/ACP 각각)
    - [x] 6.3.2.3 복구 불가 시 Telegram 알림 + 로그
    - [x] 6.3.2.4 heartbeat 결과 daily_stats 반영

### 7. 내부 관리 API

- [x] 7.1 Fastify 서버
  - [x] 7.1.1 서버 설정
    - [x] 7.1.1.1 src/api/server.ts — Fastify 인스턴스 (host: '127.0.0.1', port: 14910)
    - [x] 7.1.1.2 CORS (localhost만), 요청 로깅 미들웨어
    - [x] 7.1.1.3 에러 핸들링 (구조화: {success, data, error, meta})
    - [x] 7.1.1.4 API Key 인증 미들웨어 (ADMIN_API_KEY 환경변수)
  - [x] 7.1.2 조회 엔드포인트
    - [x] 7.1.2.1 GET /api/health — DB/Redis/ACP 연결 상태
    - [x] 7.1.2.2 GET /api/stats — 총 Job, 수익, 성공률, 평균 응답시간
    - [x] 7.1.2.3 GET /api/jobs — Job 목록 (?status, ?service_type, ?limit, ?offset)
    - [x] 7.1.2.4 GET /api/wallet/balance — USDC + ETH 잔고
  - [x] 7.1.3 관리 엔드포인트
    - [x] 7.1.3.1 GET /api/offerings — 등록 서비스 목록 + 활성 상태
    - [x] 7.1.3.2 PUT /api/offerings/:name/toggle — 서비스 활성/비활성
    - [x] 7.1.3.3 POST /api/wallet/withdraw — 출금 (amount, toAddress 검증)
    - [x] 7.1.3.4 GET /api/logs — 최근 로그 (?level, ?limit)

### 8. 배포 및 가동

- [x] 8.1 프로세스 관리
  - [x] 8.1.1 PM2 설정
    - [x] 8.1.1.1 ecosystem.config.js (인스턴스 1, 메모리 512MB, 로그 경로)
    - [x] 8.1.1.2 시작/정지/재시작 npm scripts (pm2:start, pm2:stop, pm2:restart)
    - [x] 8.1.1.3 systemd 서비스 파일 (자동 부팅 시작)
    - [x] 8.1.1.4 PM2 로그 로테이션 설정
- [x] 8.2 Docker
  - [x] 8.2.1 컨테이너화
    - [x] 8.2.1.1 Dockerfile (multi-stage, node:20-alpine, 빌드→실행 분리)
    - [x] 8.2.1.2 .dockerignore (node_modules, .env, dist, logs)
    - [x] 8.2.1.3 docker-compose.yml (app + postgres:17 + redis:7)
    - [x] 8.2.1.4 로컬 빌드/실행 테스트
- [x] 8.3 엔트리포인트
  - [x] 8.3.1 초기화 순서
    - [x] 8.3.1.1 src/index.ts — 환경변수 검증 (config 로드)
    - [x] 8.3.1.2 DB 연결 → Redis 연결 → 마이그레이션 확인
    - [x] 8.3.1.3 ACP 런타임 시작 → Offering 등록
    - [x] 8.3.1.4 관리 API 서버 시작 → Heartbeat 스케줄러 시작
  - [x] 8.3.2 종료 처리
    - [x] 8.3.2.1 SIGTERM/SIGINT 핸들러 등록
    - [x] 8.3.2.2 진행 중 Job 완료 대기 (최대 30초)
    - [x] 8.3.2.3 연결 정리 순서: ACP → API → Redis → DB
    - [x] 8.3.2.4 종료 로그 + Telegram 알림
- [x] 8.4 ACP 등록 및 가동
  - [x] 8.4.1 네트워크 등록
    - [x] 8.4.1.1 ACP 에이전트 등록 (100 VIRTUAL 스테이킹)
    - [x] 8.4.1.2 Job Offering 3종 등록 확인
    - [x] 8.4.1.3 24/7 가동 시작
    - [x] 8.4.1.4 초기 24시간 모니터링 (응답시간, 메모리, 캐시 히트율)

---

## Phase 2~3 체크리스트는 Phase 1 완료 후 별도 파일로 생성
