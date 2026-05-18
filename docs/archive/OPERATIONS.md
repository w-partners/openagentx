# OpenAgentX 운영 가이드

이 문서는 OpenAgentX 마켓플레이스를 실 운영 환경에서 구동하기 위한 외부 작업을 한 곳에 정리한다.

## 1. 환경변수

`.env.local` (또는 운영 환경)에 다음을 설정한다.

### 필수
```
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SITE_URL=https://openagentx.org
GOOGLE_AI_API_KEYS=key1,key2,...   # 채팅 엔진 + 자동번역
PORTONE_API_SECRET=...             # 결제 검증
```

### Discord (양방향 봇 사용 시)
```
DISCORD_PUBLIC_KEY=...        # /api/discord 서명 검증
DISCORD_APP_ID=...            # 슬래시 커맨드 등록
DISCORD_BOT_TOKEN=...
DISCORD_GUILD_ID=...          # (선택) 길드 한정 등록 — 빠른 테스트
```

### Telegram
```
TELEGRAM_BOT_TOKEN=...
NEXTAUTH_URL=https://openagentx.org   # chat engine 함수 호출 시 base URL
```

## 2. 데이터베이스 마이그레이션

`marketplace/migrations/`의 SQL 파일을 순서대로 적용:

```bash
psql $DATABASE_URL -f marketplace/migrations/001_feedback_comments.sql
psql $DATABASE_URL -f marketplace/migrations/002_chain_flows_pack_meta.sql
psql $DATABASE_URL -f marketplace/migrations/003_agents_sample_images.sql
psql $DATABASE_URL -f marketplace/migrations/004_seed_featured_chains.sql
```

004는 5종 추천 Pack 시드 (멱등성 — 재실행 안전).

## 3. i18n 자동번역

```bash
cd marketplace
GOOGLE_AI_API_KEYS=$GOOGLE_AI_API_KEYS npx tsx scripts/translate-locales.ts

# 특정 locale만 번역
GOOGLE_AI_API_KEYS=$GOOGLE_AI_API_KEYS npx tsx scripts/translate-locales.ts --target=de,it,pt
```

스크립트는 idempotent — 이미 번역된 키는 건드리지 않음. en.json이 마스터.

## 4. Discord 슬래시 커맨드 등록

봇 코드는 자동 노출되지 않음 — Discord에 별도 등록 필요:

```bash
cd marketplace
DISCORD_APP_ID=... DISCORD_BOT_TOKEN=... \
  npx tsx scripts/register-discord-commands.ts

# 빠른 테스트 (길드 한정, 즉시 반영)
DISCORD_GUILD_ID=... npx tsx scripts/register-discord-commands.ts
```

이후 Discord Developer Portal에서 **Interactions Endpoint URL**을 `https://openagentx.org/api/discord`로 설정.

## 5. Telegram Webhook

```bash
curl -F "url=https://openagentx.org/api/telegram" \
  https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook
```

## 6. MCP Server 패키지 분리·발행

`OPEN-SOURCE-STRATEGY.md` 참고. 요약:

```bash
# 1. 별도 GitHub 조직(OpenAgentX-Lab) 생성
# 2. mcp-server 디렉토리를 새 repo로 분리
git subtree split --prefix=marketplace/mcp-server -b mcp-server-only
# 3. 새 repo에 push
git push <new-repo> mcp-server-only:main
# 4. 새 repo에서 npm publish
cd <new-repo-clone>
npm login    # @openagentx scope
npm version patch
npm run build
npm publish --access public
```

## 7. 빌드·배포

```bash
cd marketplace
npm install
npm run build
npm start    # 또는 PM2/Vercel/도커
```

업로드 디렉토리(`public/uploads/`)는 정적 자산으로 서빙되며 git에서는 무시됨. 배포 시 영구 볼륨 마운트가 필요할 수 있다.

## 8. 라이브 sanity 체크

```bash
# 1. MCP HTTP 게이트웨이 — 도구 목록
curl -s -X POST https://openagentx.org/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' | jq '.result.tools | length'

# 2. 검색
curl -s -X POST https://openagentx.org/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","id":2,"params":{"name":"search_agents","arguments":{"query":"번역"}}}' | jq

# 3. 업로드 (인증 토큰 필요)
curl -s -X POST https://openagentx.org/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@./sample.jpg" | jq
```

## 9. OSS 깔때기 트래킹

`OPEN-SOURCE-STRATEGY.md` Phase 1~5 진행 후 다음을 모니터링:

- GitHub ⭐ 누적 (조직 단위)
- npm 다운로드 (`@openagentx/mcp-server`)
- `/skills` 페이지 → 설치 클릭률
- 신규 가입 중 OSS 유입 비율

## 10. 운영 체크리스트

```
[ ] 마이그레이션 001~004 적용
[ ] 환경변수 일괄 설정
[ ] i18n 자동번역 (16 locale)
[ ] Discord 봇 등록 + Endpoint URL 설정
[ ] Telegram 웹훅 등록
[ ] mcp-server OSS repo 분리 + npm publish
[ ] /api/mcp / /api/upload 라이브 sanity 통과
[ ] OPEN-SOURCE-STRATEGY.md Phase 1 완료
```
