# OpenAgentX OSS 전략

YouMind-OpenLab 모델을 차용한 오픈소스 분리·마케팅 전략. 핵심 마켓플레이스는 사적으로 유지하되, **재사용 가능한 도구·큐레이션 자산을 별도 GitHub 조직 산하 OSS 리포로 분리**하여 ⭐과 SEO 유입을 누적한다.

## 1. GitHub 조직

**조직명 후보 (최종 결정 필요):**
- `OpenAgentX-Lab` ← 권장
- `OpenAgentX-OSS`
- `openagentx`

조직 생성은 GitHub UI에서 수동. 생성 후 메인테이너 권한을 마스터 계정에 부여.

## 2. 분리 대상 패키지·리포

### 2.1 즉시 분리 가능 (의존성 외부 1개·내부 0)

| 리포 | 소스 | 설명 |
|---|---|---|
| **`openagentx-mcp-server`** | `marketplace/mcp-server/` | LLM-설치형 MCP 클라이언트. 이미 `@openagentx/mcp-server` 패키지로 구성됨. LICENSE·README 준비 완료 |

### 2.2 추후 분리 후보

| 리포 | 소스 / 신규 | 설명 |
|---|---|---|
| `awesome-ai-agent-prompts` | 신규 | 카테고리별 큐레이션 시스템 프롬프트 (코딩·번역·암호화폐 등 12 카테고리). README + 영어/한국어 + 결과 미리보기 |
| `awesome-agent-workflows` | 신규 | Pack(체인) 큐레이션 — 5개 단계 묶음 워크플로우 모음 |
| `openagentx-skill-recommend` | 신규 | Claude Skill 패키지: 자연어로 OpenAgentX 에이전트를 추천 |
| `openagentx-discord-bot` | `marketplace/src/lib/discord/` | Discord Interactions 봇 (Ed25519 서명 검증 포함) |
| `openagentx-telegram-bot` | `marketplace/src/lib/telegram/` | Telegram webhook 봇 |

### 2.3 분리 절차

각 패키지 분리 시:

1. 새 GitHub 리포 생성 (조직 산하)
2. `git subtree split --prefix=marketplace/mcp-server -b mcp-server-split` 으로 히스토리 분리
3. 새 리포 push
4. main repo의 해당 디렉토리에 git submodule 또는 npm 의존성으로 다시 연결
5. CI/CD: 새 리포에서 npm publish 워크플로우 추가

## 3. 마케팅 깔때기

```
GitHub ⭐ (awesome-* 리포)
   ↓ README의 openagentx.org 링크
openagentx.org/skills (Skill 카탈로그)
   ↓ "설치하기" 클릭
mcp.json 스니펫 → API Key 발급 → 첫 결제
```

각 OSS 리포 README 상단에 다음을 고정:
- **Hero 영역**: 결과 미리보기 이미지 (시나리오 #3 갤러리와 동일 자산 재활용)
- **CTA**: "설치하기" → openagentx.org/skills
- **Quick start**: 30초 안에 첫 결과 받는 흐름

## 4. SEO·다국어

- 모든 OSS 리포 README는 **16개 언어** 지원 (시나리오 #4와 동일 i18n 자산 재활용)
- 디렉토리 구조: `README.md` (영어) + `README.ko.md`, `README.ja.md`, ... 16개

## 5. 기여 가이드

각 리포에 `CONTRIBUTING.md`:
- 큐레이션 리포: PR로 새 프롬프트·워크플로우 제안
- 코드 리포: lint·tsc·테스트 통과 필수
- DCO sign-off

## 6. 라이선스

전부 **MIT**. 핵심 마켓플레이스는 사적 유지.

## 7. 우선순위 (Phase별)

| Phase | 작업 |
|---|---|
| 1 | `openagentx-mcp-server` 리포 분리 + npm publish |
| 2 | `awesome-ai-agent-prompts` 큐레이션 시드 (카테고리별 5~10개) |
| 3 | `openagentx-discord-bot` 분리 |
| 4 | `awesome-agent-workflows` |
| 5 | 16개 언어 README 자동화 (`scripts/translate-locales.ts` 응용) |

Phase 1은 본 PR(시나리오 #2)에서 코드·문서 준비 완료. 실 GitHub 조직 생성·push는 마스터가 외부에서 진행.
