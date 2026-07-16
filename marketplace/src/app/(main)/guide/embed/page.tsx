import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export const metadata = {
  title: '임베드 위젯 가이드 - OpenAgentX',
  description: '내 사이트에 AI 에이전트 5분 만에 임베드 (script 1줄)',
};

export default async function GuideEmbedPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  const sample = `<script src="https://openagentx.org/embed.js?token=oaw_xxxxxxxxxxxxxxxxxxxxxxxx" async></script>`;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-500/10 border border-sky-500/30 px-3 py-1 text-xs font-bold text-sky-600 dark:text-sky-400">
          <span>5분 설정</span>
          <span>·</span>
          <span>script 1줄</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          내 사이트에 AI 에이전트 5분 만에 임베드
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          script 한 줄을 붙여넣으면 사이트 방문자가 가입 없이 즉시 AI 챗봇과 대화할 수 있습니다.
          비용은 사이트 운영자의 OpenAgentX 포인트에서 차감됩니다.
        </p>
      </section>

      <GuideNav dict={dict} locale={locale} current="embed" />

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">왜 좋은가요?</h2>
        <ul className="text-sm list-disc pl-6 space-y-2 text-muted-foreground">
          <li><strong>설치 X</strong> — npm/python/MCP 설정 불필요. <code>&lt;script&gt;</code> 한 줄로 끝.</li>
          <li><strong>방문자 가입 X</strong> — 사이트 방문자는 그대로 챗봇과 대화 가능.</li>
          <li><strong>호출당 과금</strong> — 월 정액 X. 운영자 포인트에서 호출 1건당 자동 차감.</li>
          <li><strong>도메인 화이트리스트</strong> — CORS origins 로 토큰 무단 사용 차단.</li>
          <li><strong>페이지 컨텍스트 자동 주입</strong> — 현재 페이지 URL/title 을 system prompt 에 추가해 더 정확한 답변.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">5단계로 설정하기</h2>
        <ol className="text-sm list-decimal pl-6 space-y-3 text-muted-foreground">
          <li>
            <Link href={`${prefix}/login`} className="text-primary underline">openagentx.org 로그인</Link> 후 <Link href={`${prefix}/dashboard/widgets`} className="text-primary underline">대시보드 → 위젯</Link> 이동.
          </li>
          <li><strong>"새 위젯"</strong> 버튼 클릭.</li>
          <li>
            <strong>대상 선택</strong> — 등록된 에이전트(예: Eno-ex / FAQ봇 / 마케팅카피) 또는 프롬프트 1개를 선택합니다.
          </li>
          <li>
            <strong>CORS 도메인 등록</strong> — 자기 사이트 도메인을 한 줄에 1개씩 입력
            (예: <code>https://example.com</code>). 모든 도메인 허용은 <code>*</code>.
          </li>
          <li>
            <strong>발급된 script</strong> 를 복사해 자기 사이트의
            <code> &lt;body&gt; </code> 끝에 붙여넣으면 즉시 floating chat button 이 나타납니다.
          </li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">코드 예시</h2>
        <pre className="rounded-lg bg-muted/60 p-4 text-xs overflow-x-auto"><code>{sample}</code></pre>
        <p className="text-xs text-muted-foreground">
          token 은 위젯 생성 시 1번 표시됩니다. 외부에 노출되지만 CORS origin 화이트리스트로 보호됩니다.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">동작 원리</h2>
        <ol className="text-sm list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>방문자 브라우저가 <code>/embed.js?token=oaw_xxx</code> 를 로드.</li>
          <li>script 가 <code>/api/embed/config</code> 로 위젯 설정(이름/색상/환영 메시지)을 받아 floating button 렌더링.</li>
          <li>방문자가 메시지 전송 → <code>POST /api/embed/chat</code> (token, session_id, message, page_context).</li>
          <li>서버가 token → widget → CORS 검증 → quota 체크 → system_prompt 로드 → Claude 호출.</li>
          <li>호출당 비용을 owner 의 USDC 잔액에서 차감, <code>widget_runs</code> 에 기록.</li>
        </ol>
      </section>

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">트러블슈팅</h2>
        <div className="space-y-2 text-sm">
          <details className="rounded border p-3">
            <summary className="font-semibold cursor-pointer">위젯이 안 보여요</summary>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>script 의 <code>token</code> query 가 정확한지 확인.</li>
              <li>브라우저 콘솔에서 CORS 에러 → CORS 도메인 화이트리스트에 호출 도메인 추가.</li>
              <li><code>is_active</code> 가 켜져 있는지 대시보드에서 확인.</li>
            </ul>
          </details>
          <details className="rounded border p-3">
            <summary className="font-semibold cursor-pointer">응답이 없거나 quota_exceeded</summary>
            <ul className="mt-2 list-disc pl-5 text-muted-foreground space-y-1">
              <li>월 호출 한도 초과 → 대시보드에서 한도 증가.</li>
              <li>운영자 포인트 잔액 부족 → <Link href={`${prefix}/charge`} className="text-primary underline">충전</Link>.</li>
            </ul>
          </details>
          <details className="rounded border p-3">
            <summary className="font-semibold cursor-pointer">스타일이 깨져요</summary>
            <p className="mt-2 text-muted-foreground">
              현재 위젯은 inline style 로 렌더링되어 대부분의 사이트와 충돌하지 않습니다.
              z-index 가 가장 높은 다른 요소(2147483647 이상)가 있다면 보고해주세요.
            </p>
          </details>
        </div>
      </section>

      <section className="rounded-xl border bg-gradient-to-br from-sky-500/10 to-emerald-500/10 p-6 text-center space-y-3">
        <h3 className="text-xl font-bold">지금 바로 시작하기</h3>
        <p className="text-sm text-muted-foreground">로그인 → 위젯 등록 → script 복사 → 5분 안에 끝.</p>
        <Link href={`${prefix}/dashboard/widgets`} className="inline-block rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          위젯 만들기 →
        </Link>
      </section>
    </div>
  );
}
