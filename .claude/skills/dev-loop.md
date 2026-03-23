---
name: dev-loop
description: "표준 개발 루프. 사용자 요청 → 컨텍스트 확인 → 구현 → 검증 → 사용자 확인 사이클을 실행합니다."
user_invocable: true
---

# 표준 개발 루프 (Development Cycle)

이 루프는 모든 구현 작업에 적용되는 표준 사이클이다. 1회 실행이 아니라, 사용자가 만족할 때까지 반복한다.

## Phase 1: 요청 수신 및 에이전트 선택 (Agent Picker)

1. 사용자의 수정 요청 또는 새 요청을 분석한다
2. 요청의 성격을 파악한다:
   - 코딩/구현 → Builder 서브에이전트
   - 설계/기획 → Planner 서브에이전트
   - 조사/분석 → Researcher 서브에이전트
   - 배포/인프라 → Deployer 서브에이전트
   - 검증/QA → Verifier 서브에이전트
3. 적합한 에이전트를 선택하고 Taskboard에 기록한다

```bash
# 프로젝트 컨텍스트에서 에이전트 지침 확인
curl -s "http://localhost:3006/api/context/by-name/{프로젝트명}?token=0205"
```

## Phase 2: 내용 확인

1. 사용자 요청의 구체적 범위를 파악한다
2. 영향받는 파일/모듈을 식별한다
3. 기존 코드를 읽고 현재 상태를 이해한다

## Phase 3: Insights + 반복 실수 + 과거 작업 확인

1. **LEARNED_MISTAKES.md 확인** — 프로젝트 루트 또는 memory/ 폴더에서 과거 실수 목록 조회
2. **메모리 DB 검색** — 관련 키워드로 과거 작업 히스토리 검색 (hooks의 시맨틱 검색이 자동 실행됨)
3. **Taskboard 지시 히스토리** — 유사한 과거 지시가 있는지 확인

```bash
# 과거 지시 검색
curl -s "http://localhost:3006/api/instructions?project_id={id}&token=0205"
# 관련 메모리 검색
curl -s "http://localhost:3006/api/search?token=0205&q={키워드}"
```

4. 반복 실수 패턴이 있으면 이번 작업에서 반드시 주의한다
5. 과거에 유사한 작업을 했으면 해당 결과를 참고한다

## Phase 4: 기술 스펙 Context 확인

1. Taskboard에서 프로젝트 컨텍스트 조회:

```bash
curl -s "http://localhost:3006/api/context/by-name/{프로젝트명}?token=0205"
```

2. 확인 항목:
   - tech_stack: 기술 스택, 의존성
   - structure: 디렉터리 구조, 핵심 모듈
   - rules: 코딩 컨벤션, 테스트 정책
   - agent_directives: 해당 에이전트 역할별 지침
   - global_directives: 전역 규칙

3. 컨텍스트를 서브에이전트 프롬프트에 반드시 포함한다

## Phase 5: 구현

1. 서브에이전트를 실행한다 (Agent 도구, isolation: "worktree" 권장)
2. Phase 3에서 확인한 실수를 반복하지 않도록 주의사항을 프롬프트에 포함한다
3. Phase 4의 컨텍스트를 프롬프트에 포함한다
4. Taskboard에 작업 스레드를 기록한다

## Phase 6: 검증 (CLI)

구현 완료 후 CLI 레벨에서 검증한다:

1. **문법 검증**: `node -c`, `tsc --noEmit`, `python -m py_compile` 등
2. **테스트 실행**: 프로젝트의 테스트 명령 실행
3. **빌드 검증**: 빌드가 성공하는지 확인
4. **LEARNED_MISTAKES.md 체크**: completion-guard 스킬이 있으면 실행

검증 실패 시 → Phase 5로 돌아가서 수정

## Phase 7: 사용자 시나리오 테스트

CLI 검증 통과 후, 실제 사용자 시나리오를 테스트한다:

1. 변경된 기능의 핵심 사용 시나리오를 정의한다
2. 가능하면 브라우저 자동화(Playwright/Chrome MCP)로 테스트한다
3. API 엔드포인트면 curl로 실제 요청을 보내 확인한다
4. 예상 결과와 실제 결과를 비교한다

## Phase 8: 최종 검증

1. 시나리오 테스트 결과를 확인한다
2. 변경사항이 다른 기능에 영향을 주지 않았는지 확인한다
3. 검증 결과를 RESULT 형식으로 마스터에게 보고한다
4. 배포가 필요하면 deploy_queue에 추가한다 (즉시 배포하지 않음)

```bash
# 배포 큐에 추가
curl -s -X POST "http://localhost:3006/api/deploy-queue?token=0205" \
  -H 'Content-Type: application/json' \
  -d '{"project_id": ID, "description": "변경 내용", "changes": "파일 목록"}'
```

## Phase 9: 사용자 확인 → 다음 사이클

1. 마스터에게 결과를 보고한다 (RESULT 형식)
2. 마스터의 피드백을 기다린다
3. 수정 요청이 오면 → Phase 1로 돌아간다
4. 승인이면 → 배포 큐의 항목을 일괄 배포한다

**이 사이클은 마스터가 만족할 때까지 반복한다.**

## 배포 일괄 실행

마스터가 배포를 승인하면:

```bash
# 대기 중인 배포 확인
curl -s "http://localhost:3006/api/deploy-queue?status=pending&token=0205"
# 승인 → 배포 실행 → 상태 업데이트
curl -s -X PATCH "http://localhost:3006/api/deploy-queue/{id}?token=0205" \
  -H 'Content-Type: application/json' -d '{"status": "deployed"}'
```
