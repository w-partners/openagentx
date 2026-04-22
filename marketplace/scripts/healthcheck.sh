#!/bin/bash
# openagentx 헬스체크 — 5분마다 cron으로 실행
# 다운 감지 시 PM2 restart + 디스코드 알림

URL="http://localhost:3101/"
EXPECTED_CODE="307"
BOT="MTQ4NDYxNTE3NjM4Nzk1NjgzNw.GAdcn_.0PMhwZ3KTZ7gJbYeFLSWfTPFqImSFyEyzVxfe8"
CHANNEL="1486732103910690928"
LOG="/home/llm/projects/cryptointel/marketplace/logs/healthcheck.log"

CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")

if [ "$CODE" != "$EXPECTED_CODE" ] && [ "$CODE" != "200" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') DOWN (code=$CODE), restarting..." >> "$LOG"
  /usr/bin/pm2 restart openagentx --update-env >> "$LOG" 2>&1

  sleep 10
  NEW_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$URL")

  MSG="⚠️ [cryptointel] openagentx 다운 감지 (HTTP $CODE) → 자동 재시작 → HTTP $NEW_CODE"
  curl -s -X POST "https://discord.com/api/v10/channels/$CHANNEL/messages" \
    -H "Authorization: Bot $BOT" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"$MSG\"}" > /dev/null

  echo "$(date '+%Y-%m-%d %H:%M:%S') RESTART result: code=$NEW_CODE" >> "$LOG"
else
  # 정상 상태는 로그에 남기지 않음 (너무 많아짐)
  :
fi
