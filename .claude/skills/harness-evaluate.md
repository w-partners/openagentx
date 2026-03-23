---
name: harness-evaluate
description: "프로젝트의 Harness Design을 평가하여 리포트를 생성합니다"
user_invocable: true
---

# /harness-evaluate -- Harness Design 평가

대상 프로젝트의 Harness Design을 평가한다. 코드를 수정하지 않는다. 분석만 한다.

## Step 0: 프로젝트 ID 조회

프로젝트 이름으로 Taskboard에서 ID를 조회한다. `$ARGUMENTS`에 프로젝트명이 있으면 사용하고, 없으면 현재 디렉토리의 프로젝트를 대상으로 한다.

```bash
# 프로젝트명으로 조회
curl -s 'http://localhost:3006/api/context/by-name/{프로젝트명}?token=0205'

# 또는 전체 목록에서 확인
curl -s 'http://localhost:3006/api/context?token=0205' | jq '.[] | {id, name}'
```

PROJECT_ID를 확보한 후 다음 단계로 진행한다.

## Step 1: 문서 스캔

프로젝트 폴더의 모든 마크다운 문서를 스캔한다:

1. 루트 문서: CLAUDE.md, AGENTS.md, README.md, ARCHITECTURE.md
2. .claude/ 디렉토리: rules/, skills/, settings.json
3. docs/ 디렉토리: 아키텍처, ADR, 런북
4. memory/ 디렉토리: 메모리 파일들
5. agents/ 디렉토리: 에이전트별 CLAUDE.md

각 문서의 목적을 식별하고, 문서 간 관계를 매핑한다.

## Step 2: 7개 레이어 평가

다음 7개 레이어를 각각 평가한다:

**1. Agent Operating Layer**
- AGENTS.md / CLAUDE.md 존재 여부
- 에이전트 규칙의 명확성
- 작업 실행 루프 정의 (plan -> implement -> verify -> document)
- 역할 분리와 책임 경계

**2. Repository Knowledge Layer**
- 아키텍처 문서 존재와 정확성
- 모듈 경계 정의
- 시스템 구조 명확성
- 엔트리 포인트 문서화

**3. Workflow Layer**
- 개발 워크플로우 정의
- CI/CD 파이프라인
- 릴리스 프로세스
- 브랜치 전략

**4. Coding Convention Layer**
- 스타일 가이드 존재
- 네이밍 규칙
- 포매팅 표준
- 파일 크기/구조 규칙

**5. Testing Layer**
- 테스트 전략 정의
- 테스트 구조
- 커버리지 기대치
- 테스트 실행 방법

**6. Documentation Coherence**
- 문서 중복 여부
- 정책 충돌 여부
- 문서 권위(authority) 명확성
- 문서 최신성

**7. Harness Stability**
- 파일 경로 안정성
- 문서 간 참조 무결성
- 문서 계층 구조 일관성

## Step 3: 코드베이스 대조

코드베이스의 실제 구조와 문서의 일치도를 확인한다:
- package.json, tsconfig.json 등에서 실제 기술 스택 확인
- 디렉토리 구조와 문서화된 구조 비교
- 실제 코딩 패턴과 문서화된 컨벤션 비교

## Step 4: 리포트 생성

평가 리포트를 RESULT 형식으로 출력한다. 리포트에 포함할 내용:

- 현재 harness 아키텍처 요약
- 7개 레이어별 평가 (강점/약점)
- 문서 충돌 및 중복 목록
- harness 재설계 필요성 평가
- 재설계 권장사항

## Step 5: Taskboard에 기록

```bash
curl -s -X POST 'http://localhost:3006/api/instructions?token=0205' \
  -H 'Content-Type: application/json' \
  -d '{
    "project_id": PROJECT_ID,
    "raw_text": "Harness Design 평가 리포트: {리포트 요약}",
    "source": "skill:harness-evaluate",
    "status": "completed"
  }'
```
