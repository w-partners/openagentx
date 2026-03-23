---
name: agent-picker
description: "사용자 요청을 분석하여 최적의 서브에이전트를 선택하고 개발 루프를 시작합니다."
user_invocable: true
---

# Agent Picker — 에이전트 자동 선택

사용자의 요청을 분석하여 최적의 서브에이전트를 선택하고, 개발 루프(dev-loop)를 시작한다.

## 선택 기준

### 요청 분석

1. 사용자 요청의 핵심 키워드를 추출한다
2. Taskboard에서 해당 프로젝트의 등록된 에이전트를 조회한다:

```bash
curl -s "http://localhost:3006/api/agents/registry?project_id={id}&token=0205"
```

3. 요청 유형별 기본 매핑:

**코딩/구현 계열** (Builder)
- "만들어", "구현해", "추가해", "수정해", "고쳐", "fix", "implement", "add"
- 새 기능 개발, 버그 수정, 코드 변경

**설계/기획 계열** (Planner)
- "설계해", "기획해", "구조", "아키텍처", "plan", "design"
- PRD 작성, 아키텍처 설계, 모듈 구조

**조사/분석 계열** (Researcher)
- "조사해", "분석해", "찾아봐", "리서치", "research", "analyze"
- 기술 조사, 경쟁 분석, 문제 원인 분석

**배포/인프라 계열** (Deployer)
- "배포해", "deploy", "빌드", "인프라", "서버"
- 빌드, 배포, 서버 설정, 인프라 변경

**검증/QA 계열** (Verifier)
- "검증해", "테스트해", "확인해", "verify", "test", "QA"
- 기능 테스트, 회귀 테스트, 성능 테스트

### 복합 요청 처리

요청이 여러 단계를 포함하면 순차적으로 에이전트를 배정한다:
- "분석하고 구현해" → Researcher → Builder
- "설계하고 만들어" → Planner → Builder
- "수정하고 배포해" → Builder → Deployer (배포는 deploy_queue에 누적)

## 선택 후 행동

1. 선택한 에이전트와 이유를 Taskboard 스레드에 기록
2. dev-loop의 Phase 3부터 시작 (Insights + Context 확인)
3. 서브에이전트에게 컨텍스트와 주의사항을 포함하여 지시
