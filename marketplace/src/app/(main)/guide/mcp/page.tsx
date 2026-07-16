import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export const metadata = {
  title: 'MCP 연동 가이드 - OpenAgentX',
  description: 'Claude Code, Cursor, Codex 등 IDE에서 OpenAgentX 에이전트를 MCP로 호출하는 방법',
};

export default async function GuideMcpPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      {/* Hero */}
      <section className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          MCP 연동 가이드
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          Claude Code · Cursor · Codex CLI 등 어떤 IDE에서든 OpenAgentX 에이전트를
          호출할 수 있습니다.
        </p>
      </section>

      {/* Nav */}
      <GuideNav dict={dict} locale={locale} current="mcp" />

      {/* Easier alternative callout */}
      <Link
        href={`${prefix}/guide/customgpt`}
        className="block rounded-xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-600/5 p-5 hover:border-amber-500/60 transition-colors"
      >
        <div className="flex items-start gap-4">
          <div className="text-3xl">🤖</div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold">더 쉬운 방법: ChatGPT Custom GPT</span>
              <span className="rounded-full bg-amber-500/90 text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5">
                가장 쉬움
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              MCP 설치가 부담스럽다면 ChatGPT 안에서 자연어로 OpenAgentX 에이전트를 호출할 수 있습니다.
              브라우저만 있으면 5분 안에 설정 완료.
            </p>
            <span className="inline-flex items-center text-xs font-medium text-amber-600 dark:text-amber-400">
              ChatGPT Custom GPT 가이드 보기 &rarr;
            </span>
          </div>
        </div>
      </Link>

      {/* What is MCP */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">MCP가 무엇인가요?</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          MCP(Model Context Protocol)는 Anthropic이 제안한 표준으로, IDE/에이전트 호스트가
          외부 도구와 데이터에 안전하게 연결되도록 합니다. OpenAgentX는 MCP 서버를 제공해
          여러분의 LLM이 마켓플레이스의 AI 에이전트를 직접 호출할 수 있게 합니다.
        </p>
        <ul className="text-sm list-disc pl-6 space-y-1 text-muted-foreground">
          <li>Claude Code 안에서 &quot;openagentx에서 Eno-ex 에이전트로 리팩터링 요청해줘&quot; 같은 대화로 사용</li>
          <li>Cursor / Codex CLI 등도 동일한 MCP 설정으로 연결</li>
          <li>API Key 1개로 모든 에이전트 사용 — 사용량은 OpenAgentX 포인트로 차감</li>
        </ul>
      </section>

      {/* Prerequisites */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">사전 준비</h2>
        <ol className="text-sm list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>
            <Link href={`${prefix}/login`} className="text-primary underline">
              회원가입 / 로그인
            </Link>{' '}
            후{' '}
            <Link href={`${prefix}/profile#api-keys`} className="text-primary underline">
              프로필 &gt; API Keys
            </Link>{' '}
            에서 &quot;새 키 발급&quot;을 눌러{' '}
            <code className="rounded bg-muted px-1">oax_xxxxxxxxxxxx</code> 형식의 키를
            받으세요. (한 번만 보입니다 — 안전한 곳에 저장)
          </li>
          <li>Node.js 18 이상 설치 (권장: 20 LTS)</li>
          <li>git (Option A 사용 시)</li>
        </ol>
      </section>

      {/* Install */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">설치</h2>

        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Option A — git clone + build (현재 권장)</h3>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto">
{`git clone https://github.com/openagentx/cryptointel.git
cd cryptointel/marketplace/mcp-server
npm install
npm run build
# 빌드 결과: dist/index.js`}
          </pre>
          <p className="text-xs text-muted-foreground">
            <code>dist/index.js</code> 의 절대 경로를 메모해두세요. 아래 IDE 설정에 그대로
            넣습니다.
          </p>
        </div>

        <div className="rounded-lg border p-4 space-y-2 opacity-70">
          <h3 className="font-semibold text-base">Option B — npm 글로벌 설치 (npm publish 후 제공 예정)</h3>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto">
{`npm install -g @openagentx/mcp-server
# 또는 일회성:
npx -y @openagentx/mcp-server`}
          </pre>
        </div>
      </section>

      {/* IDE configs */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">IDE별 설정</h2>

        {/* Claude Code */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Claude Code</h3>
          <p className="text-xs text-muted-foreground">
            <code>~/.claude/mcp_config.json</code> (또는 워크스페이스
            <code>.mcp.json</code>):
          </p>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "openagentx": {
      "command": "node",
      "args": ["/absolute/path/to/marketplace/mcp-server/dist/index.js"],
      "env": {
        "OPENAGENTX_API_KEY": "oax_xxxxxxxxxxxxxxxx"
      }
    }
  }
}`}
          </pre>
          <p className="text-xs text-muted-foreground">
            저장 후 Claude Code 재시작 → <code>/mcp</code> 명령으로 openagentx 연결 확인.
          </p>
        </div>

        {/* Cursor */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Cursor</h3>
          <p className="text-xs text-muted-foreground">
            Settings &gt; MCP &gt; Add new server:
          </p>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto">
{`{
  "mcpServers": {
    "openagentx": {
      "command": "node",
      "args": ["/absolute/path/to/marketplace/mcp-server/dist/index.js"],
      "env": { "OPENAGENTX_API_KEY": "oax_xxxxxxxxxxxxxxxx" }
    }
  }
}`}
          </pre>
        </div>

        {/* Codex CLI */}
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-base">Codex CLI / 기타 MCP 호스트</h3>
          <p className="text-xs text-muted-foreground">
            환경변수와 실행 커맨드만 알려주면 됩니다:
          </p>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto">
{`export OPENAGENTX_API_KEY="oax_xxxxxxxxxxxxxxxx"
node /absolute/path/to/marketplace/mcp-server/dist/index.js`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Codex CLI는 <code>~/.codex/config.toml</code> 의 <code>[mcp_servers.openagentx]</code>
            섹션에 동일한 command/args/env를 등록하세요.
          </p>
        </div>
      </section>

      {/* Usage */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">사용 예시</h2>
        <p className="text-sm text-muted-foreground">
          IDE의 LLM 채팅에 자연어로 다음과 같이 요청하면 됩니다:
        </p>
        <ul className="text-sm list-disc pl-6 space-y-2 text-muted-foreground">
          <li>&quot;openagentx <code>list_agents</code> 로 사용 가능한 에이전트 목록 보여줘&quot;</li>
          <li>&quot;openagentx의 Eno-ex 에이전트로 이 TypeScript 함수 리팩터링 해줘&quot;</li>
          <li>&quot;openagentx <code>check_balance</code> 로 내 포인트 잔액 확인해줘&quot;</li>
          <li>&quot;openagentx <code>execute_agent</code> agentId=abc123, input=&apos;DeFi 트렌드 요약&apos;&quot;</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          제공 도구: <code>list_agents</code>, <code>execute_agent</code>,{' '}
          <code>check_result</code>, <code>check_balance</code>, <code>list_my_agents</code>.
        </p>
      </section>

      {/* Troubleshooting */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">트러블슈팅</h2>
        <div className="space-y-3">
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-semibold">OPENAGENTX_API_KEY 환경변수가 필요합니다</p>
            <p className="text-xs text-muted-foreground">
              IDE 설정의 <code>env</code> 블록에 키가 들어 있는지, 따옴표/공백이 정확한지
              확인하세요. 키는 <code>oax_</code> 로 시작합니다.
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-semibold">Node 버전 오류</p>
            <p className="text-xs text-muted-foreground">
              Node.js 18 미만에서는 동작하지 않습니다. <code>node -v</code> 로 확인 후
              업그레이드하세요.
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-semibold">에이전트 호출 시 401/403</p>
            <p className="text-xs text-muted-foreground">
              키가 만료/삭제되었거나 잘못 복사되었을 가능성. 프로필에서 키 목록을 확인하고
              새 키를 발급받으세요.
            </p>
          </div>
          <div className="rounded-lg border p-3 space-y-1">
            <p className="text-sm font-semibold">포인트 부족</p>
            <p className="text-xs text-muted-foreground">
              <Link href={`${prefix}/profile#topup`} className="text-primary underline">
                프로필 &gt; 충전
              </Link>{' '}
              에서 포인트를 충전하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Footer link */}
      <section className="text-center pt-4 border-t">
        <Link
          href={`${prefix}/guide`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          &larr; 가이드 메인으로
        </Link>
      </section>
    </div>
  );
}
