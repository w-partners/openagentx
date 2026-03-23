# OpenAgentX Phase 2 — 한국 AI 에이전트 마켓플레이스 상세 체크리스트

**PRD**: docs/PRD.md v2.2
**생성일**: 2026-03-22 09:20
**Phase 2 범위**: 섹션 9~26 (마켓플레이스 MVP)

---

## 6단계 작업 프로토콜 (모든 최하위 항목 적용)

1단계: 중복 코드/기능 검사 + 코드 길이 검사
2단계: 공식 문서 확인
3단계: 코드 구현
4단계: /simplify 스킬
5단계: 작동 검증, 하드코딩 제거, 정적 요소 제거
6단계: 체크리스트 완료 표시 [ ] → [x]

---

### 9. Next.js 프로젝트 초기화

- [x] 9.1 프로젝트 생성
  - [x] 9.1.1 Next.js 15 프로젝트 설정
    - [x] 9.1.1.1 create-next-app으로 marketplace/ 디렉토리 생성 (App Router, TypeScript, Tailwind)
    - [x] 9.1.1.2 package.json 의존성 추가 (shadcn/ui, pg, ioredis, zod, inngest, next-auth, ethers)
    - [x] 9.1.1.3 tsconfig.json paths alias (@components, @lib, @db 등)
    - [x] 9.1.1.4 npm install 실행
  - [x] 9.1.2 UI 프레임워크
    - [x] 9.1.2.1 Tailwind CSS 설정 (tailwind.config.ts, globals.css)
    - [x] 9.1.2.2 shadcn/ui 초기화 + 기본 컴포넌트 (Button, Input, Card, Dialog, Badge, Select)
    - [x] 9.1.2.3 한국어 폰트 (Pretendard CDN)
    - [x] 9.1.2.4 다크/라이트 테마 (next-themes)
  - [x] 9.1.3 레이아웃 기반
    - [x] 9.1.3.1 app/layout.tsx — 루트 레이아웃 (폰트, 테마 프로바이더)
    - [x] 9.1.3.2 app/(root)/layout.tsx — 메인 레이아웃 (헤더, 풋터)
    - [x] 9.1.3.3 app/(auth)/layout.tsx — 인증 레이아웃 (최소 UI)
    - [x] 9.1.3.4 app/(dashboard)/layout.tsx — 대시보드 레이아웃 (사이드바)

- [x] 9.2 PostgreSQL Phase 2 스키마
  - [x] 9.2.1 사용자 테이블
    - [x] 9.2.1.1 users 마이그레이션 (id, email, password_hash, nickname, role, wallet_address, balance_usdc)
    - [x] 9.2.1.2 favorites 마이그레이션 (user_id, agent_id PK)
    - [x] 9.2.1.3 users 인덱스 (email UNIQUE, wallet_address UNIQUE)
    - [x] 9.2.1.4 DB 연결 모듈 (lib/db.ts — Phase 1의 pool.ts 패턴 재사용)
  - [x] 9.2.2 에이전트 테이블
    - [x] 9.2.2.1 agents 마이그레이션 (description_embedding vector 포함)
    - [x] 9.2.2.2 agent_services 마이그레이션
    - [x] 9.2.2.3 agent_protocol_settings 마이그레이션 (멀티프로토콜)
    - [x] 9.2.2.4 인덱스 (category, status, ranking_score, commission_rate)
  - [x] 9.2.3 거래 테이블
    - [x] 9.2.3.1 marketplace_jobs 마이그레이션
    - [x] 9.2.3.2 payments 마이그레이션
    - [x] 9.2.3.3 reviews 마이그레이션
    - [x] 9.2.3.4 인덱스 (buyer_id, agent_id, status, created_at)
  - [x] 9.2.4 바운티/구독/기타 테이블
    - [x] 9.2.4.1 bounties + bounty_candidates 마이그레이션
    - [x] 9.2.4.2 subscriptions + subscription_tiers 마이그레이션
    - [x] 9.2.4.3 concierge_conversations 마이그레이션
    - [x] 9.2.4.4 disputes 마이그레이션
  - [x] 9.2.5 pgvector 설정
    - [x] 9.2.5.1 pgvector 확장 설치 (CREATE EXTENSION vector)
    - [x] 9.2.5.2 agents.description_embedding vector(1536) 컬럼
    - [x] 9.2.5.3 벡터 인덱스 (ivfflat 또는 hnsw)
    - [x] 9.2.5.4 임베딩 생성 유틸리티 함수

- [x] 9.3 Inngest 이벤트 워크플로우
  - [x] 9.3.1 Inngest 설정
    - [x] 9.3.1.1 Inngest 클라이언트 초기화 (lib/inngest.ts)
    - [x] 9.3.1.2 app/api/inngest/route.ts 엔드포인트
    - [x] 9.3.1.3 Job 실행 워크플로우 함수 (marketplace-job.execute)
    - [x] 9.3.1.4 Dev server 설정 (inngest dev)
  - [x] 9.3.2 크론 워크플로우
    - [x] 9.3.2.1 바운티 매칭 크론 (10분 간격)
    - [x] 9.3.2.2 구독 만료 체크 크론 (매일)
    - [x] 9.3.2.3 일간 리포트 크론
    - [x] 9.3.2.4 ACP 에이전트 동기화 크론 (1시간 간격)

### 10. 인증 시스템

- [x] 10.1 이메일 인증
  - [x] 10.1.1 회원가입
    - [x] 10.1.1.1 POST /api/auth/register Server Action (Zod 검증)
    - [x] 10.1.1.2 이메일 중복 체크
    - [x] 10.1.1.3 bcrypt 해싱 (saltRounds: 12)
    - [x] 10.1.1.4 DB 저장 + JWT 발급
  - [x] 10.1.2 로그인
    - [x] 10.1.2.1 POST /api/auth/login Server Action
    - [x] 10.1.2.2 이메일/비밀번호 검증
    - [x] 10.1.2.3 JWT Access Token (15분) + Refresh Token (7일 httpOnly)
    - [x] 10.1.2.4 로그인 실패 시 구조화된 에러 응답

- [x] 10.2 JWT 미들웨어
  - [x] 10.2.1 인증 처리
    - [x] 10.2.1.1 middleware.ts — Authorization Bearer 파싱
    - [x] 10.2.1.2 JWT 검증 + 페이로드 추출
    - [x] 10.2.1.3 역할 기반 접근 제어 (user, seller, admin)
    - [x] 10.2.1.4 public 경로 화이트리스트

- [x] 10.3 지갑 연결 로그인
  - [x] 10.3.1 MetaMask 서명
    - [x] 10.3.1.1 POST /api/auth/wallet Server Action
    - [x] 10.3.1.2 nonce 생성 + 서명 메시지 포맷
    - [x] 10.3.1.3 ethers.verifyMessage로 서명 검증
    - [x] 10.3.1.4 지갑 주소 기반 유저 생성/연결

- [x] 10.4 토큰 관리
  - [x] 10.4.1 갱신/로그아웃
    - [x] 10.4.1.1 POST /api/auth/refresh (Refresh Token → 새 Access Token)
    - [x] 10.4.1.2 DELETE /api/auth/logout (Refresh Token 무효화)
    - [x] 10.4.1.3 Redis 기반 토큰 블랙리스트
    - [x] 10.4.1.4 Rate Limiting (인증 분당 10회, 일반 분당 60회)

### 11. 에이전트 CRUD 및 검색

- [x] 11.1 에이전트 CRUD API
  - [x] 11.1.1 CRUD
    - [x] 11.1.1.1 POST /api/agents (등록, commission_rate 기본 0%)
    - [x] 11.1.1.2 PUT /api/agents/[id] (수정, 소유자 검증)
    - [x] 11.1.1.3 DELETE /api/agents/[id] (소프트 삭제)
    - [x] 11.1.1.4 Zod 입력 스키마 (name, description, category, commission_rate)
  - [x] 11.1.2 상태 관리
    - [x] 11.1.2.1 상태 정의 (pending → approved → suspended)
    - [x] 11.1.2.2 상태 전이 검증 로직
    - [x] 11.1.2.3 이미지/아이콘 업로드
    - [x] 11.1.2.4 등록 시 관리자 승인 큐

- [x] 11.2 에이전트 검색/조회
  - [x] 11.2.1 목록/상세
    - [x] 11.2.1.1 GET /api/agents (페이지네이션, 카테고리, 정렬, 키워드)
    - [x] 11.2.1.2 GET /api/agents/[id] (서비스, 리뷰, 통계 포함)
    - [x] 11.2.1.3 GET /api/agents/compare (?ids=1,2,3)
    - [x] 11.2.1.4 GET /api/agents/recommended

- [x] 11.3 하이브리드 검색 엔진
  - [x] 11.3.1 BM25 + 벡터
    - [x] 11.3.1.1 PostgreSQL tsvector + GIN 인덱스 설정
    - [x] 11.3.1.2 pgvector 코사인 유사도 검색 함수
    - [x] 11.3.1.3 하이브리드 스코어 = alpha * bm25 + (1-alpha) * cosine
    - [x] 11.3.1.4 메트릭 리랭킹 (성공률, 완료 건수)

- [x] 11.4 서비스(Offering) CRUD
  - [x] 11.4.1 관리
    - [x] 11.4.1.1 POST/PUT/DELETE/GET /api/agents/[id]/services
    - [x] 11.4.1.2 input_schema/output_schema JSON 검증
    - [x] 11.4.1.3 가격 설정 (USDC)
    - [x] 11.4.1.4 활성/비활성 토글

- [x] 11.5 수수료 및 랭킹
  - [x] 11.5.1 수수료
    - [x] 11.5.1.1 PUT /api/agents/[id]/commission (0~50%)
    - [x] 11.5.1.2 ranking_score = commission*0.5 + rating*0.3 + jobs*0.2
    - [x] 11.5.1.3 리뷰/Job 완료 시 자동 재계산
    - [x] 11.5.1.4 GET /api/agents/ranking

- [x] 11.6 멀티프로토콜 설정
  - [x] 11.6.1 API + UI
    - [x] 11.6.1.1 agent_protocol_settings CRUD API
    - [x] 11.6.1.2 에이전트 등록 시 프로토콜/결제 선택 UI
    - [x] 11.6.1.3 설정 페이지에서 프로토콜 토글
    - [x] 11.6.1.4 Job 생성 시 프로토콜 설정 기반 라우팅

### 12~26 — Phase 2 나머지 (Phase 2 MVP 이후 순차 진행)

*Phase 2 MVP (9~11)이 완료되면 12~26을 세부 체크리스트로 확장*

---

## 의존성 순서
```
9(초기화) → 10(인증) → 11(CRUD+검색) → 12(Job) → 13(결제)
10 → 14(프론트엔드) → 23(반응형)
11 → 15(텔레그램) + 21(바운티) + 22(구독)
12 → 17(리뷰) → 16(대시보드)
13 → 20(분쟁)
10 → 18(프로필) → 19(관리자)
24(보안) → 25(배포)
11 + 15 → 26(컨시어지)
```
