# OpenAgentX — 구현 체크리스트

**PRD 기반**: docs/PRD.md v2.0 (GitHub 리서치 통합)
**작성일**: 2026-03-21

---

## 작업 프로토콜

각 최하위 항목 작업 시:
1. 중복 코드/기능 검사, 코드 길이 검사
2. 공식 문서 확인 (npm README, API docs)
3. 코드 구현
4. /simplify 스킬로 코드 정리
5. 작동 검증, 하드코딩 제거
6. 체크리스트 완료 표시 [ ] → [x]

---

## Phase 1: ACP 셀러 에이전트 (2주)

### 1. 프로젝트 초기화 및 기반 설정

- [x] 1.1 Node.js + TypeScript 프로젝트 재구성
  - [x] 1.1.1 package.json 재정비 (PRD 기준 의존성: pg, ioredis, zod, winston, fastify 추가)
  - [x] 1.1.2 tsconfig.json 설정 (strict, ES2022, NodeNext, paths alias)
  - [x] 1.1.3 ESLint + Prettier 설정
  - [x] 1.1.4 디렉토리 구조 PRD 기준으로 재구성 (services/, data/, db/, cache/, notifications/)
- [x] 1.2 Zod 기반 환경변수 검증 모듈
  - [x] 1.2.1 src/config/env.ts — Zod 스키마 작성 (필수/선택 분류, 타입 변환)
  - [x] 1.2.2 .env.example 업데이트 (PG, Redis, Telegram, Discord 변수 추가)
  - [x] 1.2.3 앱 시작 시 검증 실패 → 즉시 종료
- [x] 1.3 PostgreSQL Phase 1 스키마
  - [x] 1.3.1 마이그레이션 도구 설정 (node-pg-migrate)
  - [x] 1.3.2 acp_jobs 테이블
  - [x] 1.3.3 wallet_transactions 테이블
  - [x] 1.3.4 analysis_cache 테이블
  - [x] 1.3.5 agent_logs 테이블
  - [x] 1.3.6 daily_stats 테이블
  - [x] 1.3.7 인덱스 생성
  - [x] 1.3.8 DB 커넥션 풀 (src/db/pool.ts)
- [x] 1.4 Redis 캐시 래퍼
  - [x] 1.4.1 ioredis 클라이언트 초기화 (src/cache/redis.ts)
  - [x] 1.4.2 get/set/del 래퍼 (JSON 자동 직렬화)
  - [x] 1.4.3 TTL 기반 캐시, 네임스페이스 관리
  - [x] 1.4.4 graceful shutdown 연결 정리
- [x] 1.5 Winston 로거 + DB 저장
  - [x] 1.5.1 Winston 인스턴스 (src/utils/logger.ts) — 콘솔 + 파일 트랜스포트
  - [x] 1.5.2 커스텀 DB 트랜스포트 (agent_logs 배치 삽입)
  - [x] 1.5.3 구조화 메타데이터 (requestId, service, action)
  - [x] 1.5.4 30일 이상 로그 자동 정리

### 2. 블록체인 및 지갑

- [x] 2.1 Base chain 지갑 관리 (src/wallet/manager.ts)
  - [x] 2.1.1 ethers.js v6 Provider 초기화
  - [x] 2.1.2 지갑 생성/복원 (프라이빗 키 기반)
  - [x] 2.1.3 nonce 관리, 가스비 추정
- [x] 2.2 USDC 잔고/출금
  - [x] 2.2.1 Base USDC 컨트랙트 연동 (balanceOf, transfer)
  - [x] 2.2.2 일일 출금 한도, 화이트리스트
  - [x] 2.2.3 출금 실패 재시도 (최대 3회, 지수 백오프)
- [x] 2.3 트랜잭션 로그 DB 기록
  - [x] 2.3.1 src/db/repositories/transactions.ts CRUD
  - [x] 2.3.2 상태 업데이트 (pending → confirmed/failed)
  - [x] 2.3.3 일별 통계 집계
- [x] 2.4 Base RPC 클라이언트 (src/data/base-rpc.ts)
  - [x] 2.4.1 다중 RPC 엔드포인트 + 헬스체크 폴백
  - [x] 2.4.2 레이트 리미팅

### 3. 외부 데이터 소스

- [x] 3.1 DexScreener API (src/data/dexscreener.ts)
  - [x] 3.1.1 토큰 가격, 거래량, 유동성 조회
  - [x] 3.1.2 응답 타입 정의, 레이트 리미트 대응, 재시도
- [x] 3.2 CoinGecko API (src/data/coingecko.ts)
  - [x] 3.2.1 시가총액, 24h 변동, 거래소 조회
  - [x] 3.2.2 Free tier 레이트 리미트, 재시도
- [x] 3.3 Redis 캐시 통합
  - [x] 3.3.1 DexScreener 30초 TTL, CoinGecko 5분 TTL
  - [x] 3.3.2 캐시 미스 → API → 캐시 저장 → 반환

### 4. 분석 서비스

- [x] 4.1 리스크 점수 유틸리티 (src/utils/risk-scoring.ts)
  - [x] 4.1.1 팩터 정의 (유동성, 변동성, 홀더 집중도)
  - [x] 4.1.2 가중치 환경변수 기반 설정
  - [x] 4.1.3 종합 점수 (0~100) + 등급 (LOW/MEDIUM/HIGH/CRITICAL)
- [x] 4.2 crypto_quick_scan (src/services/quick-scan.ts)
  - [x] 4.2.1 입력 검증 (주소 형식)
  - [x] 4.2.2 DexScreener + CoinGecko 병렬 조회
  - [x] 4.2.3 리스크 점수 + 결과 조합
  - [x] 4.2.4 analysis_cache 5분 TTL
- [x] 4.3 tx_preflight_summary (src/services/tx-preflight.ts)
  - [x] 4.3.1 트랜잭션 파라미터 검증
  - [x] 4.3.2 가스비 추정, 시뮬레이션 (eth_call)
  - [x] 4.3.3 위험 트랜잭션 경고 (스캠 주소, 높은 슬리피지)
- [x] 4.4 crypto_deep_dive (src/services/deep-dive.ts)
  - [x] 4.4.1 홀더 분포, 유동성 풀, 컨트랙트 검증
  - [x] 4.4.2 종합 리포트 생성
  - [x] 4.4.3 analysis_cache 30분 TTL

### 5. ACP 런타임 통합

- [x] 5.1 ACP SDK 초기화 (src/acp/runtime.ts)
  - [x] 5.1.1 SDK 초기화, 인증
  - [x] 5.1.2 셀러 에이전트 프로필 등록
  - [x] 5.1.3 이벤트 리스너 (Job 수신, 상태 변경)
  - [x] 5.1.4 자동 재연결, graceful shutdown
- [x] 5.2 Job Offering 3종 (src/acp/offerings.ts)
  - [x] 5.2.1 crypto_quick_scan, tx_preflight_summary, crypto_deep_dive 정의
  - [x] 5.2.2 ACP 등록/활성화/비활성화
- [x] 5.3 Job Router (src/acp/job-router.ts)
  - [x] 5.3.1 Job 수신 → 서비스 매핑
  - [x] 5.3.2 Zod 입력 검증
  - [x] 5.3.3 서비스 실행 + 결과 반환
  - [x] 5.3.4 타임아웃, 에러 구조화
- [x] 5.4 Job 생명주기
  - [x] 5.4.1 Negotiation → Transaction → 결과 전달 → Evaluation
  - [x] 5.4.2 타임아웃/잘못된 입력 graceful rejection
  - [x] 5.4.3 실행 메트릭 (성공률, 응답 시간)
- [x] 5.5 Job DB 리포지토리 (src/db/repositories/jobs.ts)
  - [x] 5.5.1 CRUD + 상태 전이 검증
  - [x] 5.5.2 통계 집계 (일별, 서비스별)

### 6. 모니터링 및 알림

- [x] 6.1 Telegram 알림 (src/notifications/telegram.ts)
  - [x] 6.1.1 Bot API 초기화, 메시지 전송
  - [x] 6.1.2 Job 수신/완료/실패 알림
  - [x] 6.1.3 에이전트 다운/복구 알림
- [x] 6.2 Discord webhook (src/notifications/discord.ts)
  - [x] 6.2.1 일간 통계 리포트 (매일 00:00 UTC)
  - [x] 6.2.2 주간 요약, 이상 감지, 잔고 부족 경고
- [x] 6.3 Heartbeat (30초 간격)
  - [x] 6.3.1 ACP/DB/Redis 연결 상태 확인
  - [x] 6.3.2 연속 실패 → 재연결 → 복구 불가 시 알림

### 7. 내부 관리 API

- [x] 7.1 Fastify 서버 (localhost:14910)
  - [x] 7.1.1 GET /api/health, /api/stats, /api/jobs, /api/wallet/balance
  - [x] 7.1.2 GET /api/offerings, /api/logs
  - [x] 7.1.3 POST /api/wallet/withdraw, PUT /api/offerings/:id/toggle, POST /api/agent/restart
  - [x] 7.1.4 API Key 인증, 응답 표준화

### 8. 배포 및 가동

- [x] 8.1 PM2 설정 (ecosystem.config.js)
- [x] 8.2 Docker (Dockerfile, docker-compose.yml)
- [x] 8.3 엔트리포인트 (src/index.ts)
  - [x] 8.3.1 초기화 순서: DB → Redis → ACP → API → Heartbeat
  - [x] 8.3.2 SIGTERM/SIGINT graceful shutdown
- [x] 8.4 ACP 등록 + 24/7 가동

---

## Phase 2: 한국 AI 에이전트 마켓플레이스 (2개월)

### 9. 프로젝트 초기화

- [x] 9.1 Next.js 15 프로젝트 생성
  - [x] 9.1.1 App Router + TypeScript
  - [x] 9.1.2 Tailwind CSS + shadcn/ui
  - [x] 9.1.3 한국어 폰트 (Pretendard), 다크/라이트 테마
- [x] 9.2 PostgreSQL Phase 2 스키마
  - [x] 9.2.1 users, favorites 테이블
  - [x] 9.2.2 agents (description_embedding vector 컬럼 포함), agent_services 테이블
  - [x] 9.2.3 marketplace_jobs, payments, reviews 테이블
  - [x] 9.2.4 bounties, bounty_candidates 테이블 *(신규)*
  - [x] 9.2.5 subscriptions, subscription_tiers 테이블 *(신규)*
  - [x] 9.2.6 concierge_conversations, disputes 테이블
  - [x] 9.2.7 agent_protocol_settings 테이블 *(멀티프로토콜)*
  - [x] 9.2.8 pgvector 확장 설치
- [x] 9.3 Inngest 이벤트 워크플로우 설정 *(BullMQ → Inngest 변경)*
  - [x] 9.3.1 Inngest 클라이언트 초기화
  - [x] 9.3.2 Job 실행 워크플로우 함수
  - [x] 9.3.3 바운티 매칭 크론 (10분 간격) *(신규)*
  - [x] 9.3.4 구독 만료 체크 크론 *(신규)*
  - [x] 9.3.5 일간/주간 리포트 크론

### 10. 인증 시스템

- [x] 10.1 이메일 회원가입/로그인
  - [x] 10.1.1 POST /auth/register (Zod 검증, bcrypt)
  - [x] 10.1.2 POST /auth/login (JWT Access 15분 + Refresh 7일)
- [x] 10.2 JWT 미들웨어
  - [x] 10.2.1 토큰 검증, req.user 주입
  - [x] 10.2.2 역할 기반 접근 제어 (user, seller, admin)
- [x] 10.3 지갑 연결 로그인
  - [x] 10.3.1 POST /auth/wallet (nonce 서명 검증, ethers.js)
- [x] 10.4 토큰 갱신/로그아웃
  - [x] 10.4.1 Refresh Token 로테이션, 블랙리스트 (Redis)
- [x] 10.5 Rate Limiting
  - [x] 10.5.1 인증 분당 10회, 일반 분당 60회

### 11. 에이전트 CRUD 및 검색

- [x] 11.1 에이전트 CRUD
  - [x] 11.1.1 POST /agents (등록, commission_rate 기본 0%)
  - [x] 11.1.2 PUT /agents/:id (수정, 소유자 검증)
  - [x] 11.1.3 DELETE /agents/:id (소프트 삭제)
  - [x] 11.1.4 상태 관리 (pending → approved → suspended)
- [x] 11.2 에이전트 검색/조회
  - [x] 11.2.1 GET /agents (페이지네이션, 카테고리/정렬/키워드)
  - [x] 11.2.2 GET /agents/:id (서비스, 리뷰, 통계 포함)
  - [x] 11.2.3 GET /agents/compare, /agents/recommended
- [x] 11.3 하이브리드 검색 엔진 *(신규)*
  - [x] 11.3.1 PostgreSQL tsvector + GIN 인덱스 (BM25)
  - [x] 11.3.2 pgvector 코사인 유사도 (에이전트 설명 임베딩)
  - [x] 11.3.3 하이브리드 스코어 = alpha * bm25 + (1-alpha) * cosine
  - [x] 11.3.4 메트릭 리랭킹 (성공률, 완료 건수, 고유 구매자)
- [x] 11.4 서비스(Job Offering) CRUD
  - [x] 11.4.1 POST/PUT/DELETE/GET /agents/:id/services
  - [x] 11.4.2 input_schema/output_schema JSON 검증
- [x] 11.5 수수료 및 랭킹
  - [x] 11.5.1 PUT /agents/:id/commission (0~50%)
  - [x] 11.5.2 ranking_score = commission * 0.5 + rating * 0.3 + jobs * 0.2
  - [x] 11.5.3 리뷰/Job 완료 시 자동 재계산
- [x] 11.6 멀티프로토콜 에이전트 설정 *(멀티프로토콜)*
  - [x] 11.6.1 agent_protocol_settings CRUD API
  - [x] 11.6.2 에이전트 등록 시 프로토콜/결제수단 선택 UI
  - [x] 11.6.3 에이전트 설정 페이지에서 프로토콜 토글
  - [x] 11.6.4 프로토콜별 추가 설정 (ACP 지갑, x402 호출당 가격 등)
  - [x] 11.6.5 Job 생성 시 에이전트 프로토콜 설정에 따른 라우팅

### 12. Job 실행 파이프라인

- [x] 12.1 Job 생성/관리 API
  - [x] 12.1.1 POST /jobs (Inngest 큐 등록, 잔고 검증)
  - [x] 12.1.2 GET /jobs/:id, /jobs/:id/result, /jobs/history
  - [x] 12.1.3 POST /jobs/:id/cancel
- [x] 12.2 ACP Bridge
  - [x] 12.2.1 ACP 에이전트 검색 → 자체 DB 동기화 (1시간 간격)
  - [x] 12.2.2 ACP Job 프록시 (자체 마켓 → ACP)
  - [x] 12.2.3 ACP 수수료 20% 안내 표시
- [x] 12.3 Agent Runtime Manager
  - [x] 12.3.1 에이전트 online/offline 추적
  - [x] 12.3.2 헬스체크, 오프라인 시 Job 라우팅 차단

### 13. DB 기반 USDC 에스크로

- [x] 13.1 입금 관리
  - [x] 13.1.1 POST /payments/usdc/deposit
  - [x] 13.1.2 온체인 입금 감지 (이벤트 리스닝/폴링)
  - [x] 13.1.3 유저 DB 잔액 업데이트
  - [x] 13.1.4 동시성 제어 (트랜잭션 격리)
- [x] 13.2 에스크로 로직
  - [x] 13.2.1 Job 생성 시 구매자 잔액 → 에스크로
  - [x] 13.2.2 Job 취소 시 에스크로 → 구매자 반환
  - [x] 13.2.3 에스크로 타임아웃 자동 반환
- [x] 13.3 수수료 차감 + 정산
  - [x] 13.3.1 commission_amount = payment * commission_rate / 100
  - [x] 13.3.2 Provider 지갑 USDC 전송 (수수료 차감 후)
  - [x] 13.3.3 정산 실패 재시도

### 14. 프론트엔드 — 메인 및 에이전트

- [x] 14.1 메인 페이지
  - [x] 14.1.1 헤더, 히어로, 카테고리 네비게이션, 풋터
  - [x] 14.1.2 추천/인기 에이전트 섹션
  - [x] 14.1.3 검색바 (실시간 자동완성)
  - [x] 14.1.4 한국어 UI
- [x] 14.2 에이전트 목록 페이지
  - [x] 14.2.1 카드 그리드 (반응형), 필터 사이드바, 정렬
  - [x] 14.2.2 무한 스크롤, 로딩 스켈레톤
- [x] 14.3 에이전트 상세 페이지
  - [x] 14.3.1 헤더, 설명, 서비스 목록, 통계
  - [x] 14.3.2 서비스 실행 폼 (input_schema 동적 생성)
  - [x] 14.3.3 리뷰 섹션, 즐겨찾기, 공유
- [x] 14.4 에이전트 등록 폼
  - [x] 14.4.1 다단계 폼 (기본정보 → 서비스 → 수수료 → 확인)
  - [x] 14.4.2 수수료율 슬라이더 + 예상 수익 시뮬레이션
- [x] 14.5 로그인/회원가입 페이지
  - [x] 14.5.1 이메일 폼, MetaMask 연결, JWT 관리

### 15. 텔레그램 봇

- [x] 15.1 기본 프레임워크 (telegraf)
  - [x] 15.1.1 Webhook 설정, 명령어 라우팅
  - [x] 15.1.2 사용자 인증 (텔레그램 ID ↔ 유저 매핑)
- [x] 15.2 /search, /run 명령어
- [x] 15.3 /history, /balance, /help 명령어
- [x] 15.4 Job 완료/실패 알림

### 16. 판매자 대시보드

- [x] 16.1 매출 요약 (총매출, 추이 차트, Job 통계)
- [x] 16.2 에이전트 관리 (서비스 토글, 가격 수정)
- [x] 16.3 리뷰 관리 (평점 분포, 필터)
- [x] 16.4 수수료 설정 UI
  - [x] 16.4.1 슬라이더 (0~50%) + 현재 랭킹 실시간 표시
  - [x] 16.4.2 예상 랭킹 시뮬레이션, 경쟁 에이전트 수수료 분포

### 17. 리뷰/평점 시스템

- [x] 17.1 POST /agents/:id/reviews (Job 완료 구매자만, 중복 방지)
- [x] 17.2 GET /agents/:id/reviews (페이지네이션, 정렬)
- [x] 17.3 avg_rating, ranking_score 자동 재계산
- [x] 17.4 리뷰 UI (별점 입력, 카드, 목록)

### 18. 사용자 프로필 및 즐겨찾기

- [x] 18.1 GET/PUT /users/me
- [x] 18.2 즐겨찾기 CRUD
- [x] 18.3 프로필 페이지 (이력, 잔고, 즐겨찾기)

### 19. 관리자 대시보드

- [x] 19.1 GET /admin/stats (유저, 에이전트, Job, 매출, 수수료 수익)
- [x] 19.2 에이전트 승인/거부 + 알림
- [x] 19.3 대시보드 UI (차트, 테이블)

### 20. 분쟁 해결

- [x] 20.1 POST /jobs/:id/dispute (7일 이내, 사유 20자 이상)
- [x] 20.2 GET/POST /admin/disputes (관리, 해결)
- [x] 20.3 환불/정산 처리 (에스크로 반환 or Provider 정산)

### 21. 바운티 시스템 *(신규 — openclaw-acp 참조)*

- [x] 21.1 바운티 CRUD API
  - [x] 21.1.1 POST /bounties (title, description, budget, category, tags)
  - [x] 21.1.2 GET /bounties (status 필터, 페이지네이션)
  - [x] 21.1.3 POST /bounties/:id/cancel
- [x] 21.2 자동 매칭 엔진
  - [x] 21.2.1 Inngest 크론 (10분 간격) — 카테고리+태그 기반 후보 검색
  - [x] 21.2.2 후보 점수 계산 (성공률, 평점, 가격 적합도)
  - [x] 21.2.3 상위 3개 후보 → bounty_candidates에 저장
- [x] 21.3 후보 선택 → Job 생성
  - [x] 21.3.1 GET /bounties/:id/candidates
  - [x] 21.3.2 POST /bounties/:id/select → marketplace_jobs 자동 생성
  - [x] 21.3.3 바운티 상태 전이 (open → pending_match → claimed → fulfilled)
- [x] 21.4 바운티 UI
  - [x] 21.4.1 바운티 생성 폼
  - [x] 21.4.2 내 바운티 목록 + 후보 확인/선택 UI
  - [x] 21.4.3 바운티 상태 알림 (Telegram/웹)

### 22. 구독 시스템 *(신규 — openclaw-acp 참조)*

- [x] 22.1 구독 티어 관리
  - [x] 22.1.1 POST/PUT/DELETE /agents/:id/subscription-tiers (판매자)
  - [x] 22.1.2 GET /agents/:id/subscriptions (구독 티어 목록)
- [x] 22.2 구독 결제/관리
  - [x] 22.2.1 POST /subscriptions (구독 시작, USDC 에스크로)
  - [x] 22.2.2 GET /subscriptions/me (내 구독 목록)
  - [x] 22.2.3 구독 만료 체크 Inngest 크론 (매일)
  - [x] 22.2.4 구독 활성 시 할인 가격 적용
- [x] 22.3 구독 UI
  - [x] 22.3.1 에이전트 상세에 구독 티어 표시
  - [x] 22.3.2 내 구독 관리 페이지

### 23. 반응형 모바일 UI

- [x] 23.1 전체 페이지 반응형 (sm/md/lg/xl)
- [x] 23.2 모바일 네비게이션 (햄버거, 하단 탭바)

### 24. 보안 강화

- [x] 24.1 전역 Zod 검증, SQL Injection/XSS 방지
- [x] 24.2 CORS 화이트리스트, CSP/HSTS 헤더
- [x] 24.3 출금 보안 (관리자 인증 + Telegram OTP)

### 25. 테스트 및 배포

- [x] 25.1 E2E 테스트 (가입→로그인, 검색→상세, Job→결과, 결제→리뷰)
- [x] 25.2 OWASP 보안 감사
- [x] 25.3 Docker 배포 (docker-compose, GCP)
- [x] 25.4 도메인 설정 (openagentx.org, Nginx, TLS)
- [x] 25.5 클로즈드 베타 → 오픈 베타

### 26. 컨시어지 에이전트

- [x] 26.1 대화 엔진 (Claude 1차 + Gemini 폴백) *(AI 폴백 체인 적용)*
  - [x] 26.1.1 시스템 프롬프트 (한국어 안내 역할)
  - [x] 26.1.2 대화 컨텍스트 관리, SSE 스트리밍
  - [x] 26.1.3 FAQ 지식베이스
- [x] 26.2 에이전트 추천 (POST /concierge/recommend)
  - [x] 26.2.1 요구사항 → 카테고리 매핑 (NLP)
  - [x] 26.2.2 하이브리드 검색 엔진 연동 *(신규)*
- [x] 26.3 에이전트 빌더 (POST /concierge/build-agent)
  - [x] 26.3.1 대화형 서비스 설계 → Offering 스키마 자동 생성
  - [x] 26.3.2 수수료 경쟁 전략 조언
- [x] 26.4 텔레그램 봇 연동 (/guide, /recommend, /build)
- [x] 26.5 대화 로그 관리 (concierge_conversations CRUD)

---

## 의존성 순서

### Phase 1
```
1(기반) → 2(지갑) → 3(데이터소스) → 4(분석서비스) → 5(ACP통합)
1(기반) → 6(알림) → 7(관리API) → 8(배포)
```

### Phase 2
```
9(초기화) → 10(인증) → 11(에이전트CRUD+검색) → 12(Job파이프라인) → 13(결제)
10(인증) → 14(프론트엔드) → 23(반응형)
11(에이전트CRUD) → 15(텔레그램봇)
12(Job파이프라인) → 17(리뷰) → 16(판매자대시보드)
11(수수료랭킹) → 13(수수료차감) → 16(수수료분석)
13(DB에스크로) → 20(분쟁해결)
13(DB에스크로) → 21(바운티) ← 11(에이전트검색)
13(DB에스크로) → 22(구독) ← 11(에이전트CRUD)
10(인증) → 18(프로필) → 19(관리자)
24(보안) → 25(테스트/배포)
11 + 15 → 26(컨시어지)
```

---

## Phase 3: 멀티프로토콜 확장 (Phase 2 이후)

### 27. UCP 엔드포인트

- [x] 27.1 `/.well-known/ucp` 매니페스트 생성
  - [x] 27.1.1 마켓플레이스 전체 capabilities 선언 (Checkout, Catalog)
  - [x] 27.1.2 에이전트별 UCP 활성 시 개별 서비스를 capabilities로 노출
  - [x] 27.1.3 Capability Negotiation (Intersection Algorithm) 구현
  - [x] 27.1.4 트랜스포트 바인딩 (REST + MCP)
- [x] 27.2 UCP Checkout 플로우
  - [x] 27.2.1 외부 에이전트 → 우리 마켓 에이전트 서비스 검색
  - [x] 27.2.2 Checkout 상태 머신 (incomplete → requires_escalation → ready_for_complete)
  - [x] 27.2.3 결제 핸들러 연동 (USDC + Stripe)
  - [x] 27.2.4 UCP-Agent 헤더 파싱, idempotency-key 처리

### 28. AP2 Mandate 통합

- [x] 28.1 Cart Mandate (Human-Present)
  - [x] 28.1.1 서비스 구매 시 판매자 서명 → 사용자 디바이스 키 서명
  - [x] 28.1.2 Mandate 검증/저장
- [x] 28.2 Intent Mandate (Human-Not-Present)
  - [x] 28.2.1 자율 위임 범위 설정 UI (최대 금액, 카테고리, TTL)
  - [x] 28.2.2 에이전트가 자율 구매 시 Mandate 검증
  - [x] 28.2.3 위임 범위 초과 시 사용자에게 에스컬레이션
- [x] 28.3 분쟁 해결 강화
  - [x] 28.3.1 Mandate 기반 책임 귀속 로직
  - [x] 28.3.2 분쟁 시 Mandate 증거 자동 첨부

### 29. x402 마이크로페이먼트

- [x] 29.1 x402 엔드포인트
  - [x] 29.1.1 HTTP 402 응답 + 결제 요구 헤더
  - [x] 29.1.2 USDC 결제 서명 검증
  - [x] 29.1.3 온체인 정산 확인 후 서비스 제공
- [x] 29.2 에이전트 x402 설정
  - [x] 29.2.1 호출당 가격 설정 UI
  - [x] 29.2.2 지원 토큰 선택

### 30. 카드/간편결제 확장

- [x] 30.1 Stripe Connect 연동
  - [x] 30.1.1 판매자 Stripe 계정 연결 온보딩
  - [x] 30.1.2 카드 결제 → 에스크로 → 정산 흐름
  - [x] 30.1.3 수수료 자동 차감 (Stripe fees + 플랫폼 commission)
- [x] 30.2 간편결제
  - [x] 30.2.1 Google Pay 연동
  - [x] 30.2.2 결제 수단별 라우팅 (에이전트 설정 기반)

---

## 리서치 반영 요약

| PRD v1 항목 | v2.2 변경 사항 | 참조 소스 |
|---|---|---|
| BullMQ 큐 | → Inngest 이벤트 워크플로우 | OpenStock |
| PG Full-Text Search만 | → 하이브리드 검색 (BM25 + pgvector) | acp-node browseAgents |
| 없음 | + 바운티 시스템 (역방향 매칭) | openclaw-acp |
| 없음 | + 구독 모델 (티어별 가격/기간) | openclaw-acp |
| Claude API만 | → AI 폴백 체인 (Claude → Gemini → 정적) | OpenStock |
| Next.js 14 | → Next.js 15 | OpenStock |
| Express/Fastify 백엔드 | → Next.js Server Actions 통합 | OpenStock |
| DB 에스크로 + USDC만 | + 멀티프로토콜 (UCP/AP2/x402/카드) | UCP, AP2 리서치 |
| 마켓플레이스 강제 결제방식 | → 에이전트별 프로토콜/결제 자유 선택 | UCP/AP2 설계 철학 |
