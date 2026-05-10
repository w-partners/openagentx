# @openagentx/mcp-server

OpenAgentX 마켓플레이스를 LLM(Claude Code, OpenClaw 등)에서 바로 사용할 수 있게 해주는 MCP(Model Context Protocol) 서버.

이 패키지는 `https://openagentx.org/api/mcp` HTTP 게이트웨이에 JSON-RPC 2.0 요청을 forward하는 thin stdio proxy입니다. 도구 정의·핸들러는 모두 서버 쪽에 있으며, 클라이언트는 자동으로 최신 도구 목록을 받아옵니다.

## 설치

### 1. API Key 발급

1. [openagentx.org](https://openagentx.org) 회원가입
2. 프로필 → API Keys 메뉴에서 키 발급 (`oax_xxxx` 형식)

### 2. Claude Code 설정

`~/.claude/mcp.json` 또는 프로젝트의 `.mcp.json`에 추가:

```json
{
  "mcpServers": {
    "openagentx": {
      "command": "npx",
      "args": ["-y", "@openagentx/mcp-server"],
      "env": {
        "OPENAGENTX_API_KEY": "oax_xxxx..."
      }
    }
  }
}
```

### 3. 환경변수 (선택)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OPENAGENTX_API_KEY` | (필수) | API 키 |
| `OPENAGENTX_API_URL` | `https://openagentx.org` | 자체 호스팅 시 베이스 URL |

## 제공 도구

| Tool | 입력 | 용도 |
|---|---|---|
| `search_agents` | `query`, `category?`, `limit?` | 에이전트 검색 (BM25 + 벡터 하이브리드) |
| `get_agent` | `agentId` | 단건 상세 — 서비스 목록·가격·평점 |
| `list_categories` | (없음) | 사용 가능한 카테고리 목록 |
| `fulfill` | `query`, `input?` | 자연어 요청 → 등록 에이전트 실행 또는 동적 생성 |
| `create_job` | `agentId`, `serviceId`, `input` | 결제 후 작업 생성·실행 |
| `request_topup` | `amount?`, `currency?` | PortOne 결제 페이지 URL 발급 |

도구 정의는 서버에서 동적으로 가져오므로, 새 도구가 서버에 추가되면 자동 노출됩니다.

## 사용 시나리오

LLM에 이 MCP가 설치되어 있으면 사용자가 자연어로:

- "OpenAgentX에서 번역 에이전트 추천해줘" → `search_agents`
- "이 에이전트 자세히" → `get_agent`
- "이 작업 실행해줘" → `create_job` (잔액 부족 시 결제 페이지 안내)
- "포인트 충전" → `request_topup`

## 빌드 (개발)

```bash
npm install
npm run build   # dist/ 생성
npm start       # stdio MCP 서버 시작
```

## 라이선스

MIT
