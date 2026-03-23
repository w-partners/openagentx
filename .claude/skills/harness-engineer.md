---
name: harness-engineer
description: "Harness 평가 결과를 기반으로 프로젝트의 canonical 지식 레이어를 Taskboard DB에 구축합니다"
user_invocable: true
---

# /harness-engineer -- Canonical 지식 레이어 구축

Harness 평가 리포트를 기반으로 canonical 지식 레이어를 구축한다.
반드시 /harness-evaluate를 먼저 실행한 후 사용한다.

## 불변 규칙 (절대 위반 금지)

- 기존 파일 경로 변경 금지
- 기존 문서 파일 수정 금지
- 문서 간 참조 깨뜨리기 금지
- 레포지토리 컨벤션 변경 금지
- 코드베이스 구조 변경 금지

레포지토리 안정성이 문서 명확성보다 우선한다.

## Step 0: 프로젝트 ID 조회

`$ARGUMENTS`에 프로젝트명이 있으면 사용하고, 없으면 현재 디렉토리의 프로젝트를 대상으로 한다.

```bash
curl -s 'http://localhost:3006/api/context/by-name/{프로젝트명}?token=0205'
```

PROJECT_ID를 확보한 후 다음 단계로 진행한다.

## Step 1: 이전 평가 리포트 확인

이전 /harness-evaluate 결과를 확인한다:

```bash
curl -s "http://localhost:3006/api/instructions?project_id=PROJECT_ID&source=skill:harness-evaluate&token=0205" | jq '.[0]'
```

평가 리포트가 없으면 먼저 /harness-evaluate를 실행하라고 안내한다.

## Step 2: 지식 소스 수집

두 가지 소스에서 지식을 추출한다:

**소스 1 -- 기존 문서**
- AGENTS.md, CLAUDE.md: 에이전트 규칙, 작업 절차
- ARCHITECTURE.md, docs/architecture.md: 시스템 구조
- README.md: 프로젝트 개요
- docs/: 상세 문서

**소스 2 -- 코드베이스 (ground truth)**
- package.json: 의존성, 스크립트, 버전
- tsconfig.json / vite.config.* / next.config.*: 빌드 설정
- 디렉토리 구조: 모듈 경계, 엔트리 포인트
- 실제 코드 패턴: 네이밍, 구조, 컨벤션

문서와 코드가 충돌하면, canonical 지식은 코드베이스를 반영한다.

## Step 3: Canonical 지식 구성

Taskboard의 project_context 필드에 매핑한다:

**tech_stack** -- 기술 스택
- 언어, 프레임워크, 핵심 라이브러리
- 빌드 도구, 패키지 매니저
- 런타임 환경, 배포 대상

**structure** -- REPO_MAP
- 레포 개요 (한 문단)
- 주요 디렉토리와 역할
- 핵심 모듈과 엔트리 포인트
- 의존성 구조 (모듈 간 관계)

**rules** -- STYLEGUIDE + TESTING
- 코딩 컨벤션 (네이밍, 포매팅, 파일 구조)
- 테스트 전략과 구조
- 커밋/PR 규칙
- 금지사항

**agent_directives** -- 역할별 지침:

- agent_role: 'architecture'
  시스템 개요, 핵심 모듈, 모듈 경계, 데이터 흐름, 아키텍처 제약

- agent_role: 'workflows'
  개발 워크플로우, 빌드 절차, 배포 절차, 에이전트 작업 라이프사이클

- agent_role: 'tasks'
  현재 백로그, 우선순위, 기술 이니셔티브

## Step 4: 정책 충돌 처리

중복된 설명을 통합하되, 정책 충돌은 조용히 해결하지 않는다.
충돌 발견 시 canonical 지식에 명시적으로 플래그한다:

```
[CONFLICT] CLAUDE.md에서는 "파일 최대 500줄"이나 docs/style.md에서는 "제한 없음"
→ 코드베이스 실제 패턴: 평균 300줄. CLAUDE.md 규칙을 canonical로 채택.
```

## Step 5: Taskboard API로 저장

```bash
# project_context 업데이트
curl -s -X PUT "http://localhost:3006/api/context/PROJECT_ID?token=0205" \
  -H 'Content-Type: application/json' \
  -d '{
    "tech_stack": "추출한 기술 스택 내용",
    "structure": "REPO_MAP 내용",
    "rules": "STYLEGUIDE + TESTING 내용"
  }'

# 역할별 지침 저장
curl -s -X PUT "http://localhost:3006/api/context/PROJECT_ID/agent/architecture?token=0205" \
  -H 'Content-Type: application/json' \
  -d '{"directive": "아키텍처 canonical 내용"}'

curl -s -X PUT "http://localhost:3006/api/context/PROJECT_ID/agent/workflows?token=0205" \
  -H 'Content-Type: application/json' \
  -d '{"directive": "워크플로우 canonical 내용"}'

curl -s -X PUT "http://localhost:3006/api/context/PROJECT_ID/agent/tasks?token=0205" \
  -H 'Content-Type: application/json' \
  -d '{"directive": "태스크 canonical 내용"}'
```

## Step 6: 매핑 설명 출력

RESULT 형식으로 출력한다:

- 생성/업데이트된 canonical 지식 필드 목록
- 기존 문서 -> canonical 매핑 (어떤 문서에서 어떤 필드로 갔는지)
- 발견된 정책 충돌 (있으면)
- canonical 지식 요약

기존 문서는 수정하지 않는다. Taskboard DB에만 저장한다.
