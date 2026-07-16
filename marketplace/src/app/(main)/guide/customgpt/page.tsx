import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export const metadata = {
  title: 'ChatGPT Custom GPT 가이드 - OpenAgentX',
  description: 'ChatGPT 안에서 자연어로 OpenAgentX 에이전트를 호출하는 가장 쉬운 방법',
};

const RECOMMENDED_INSTRUCTIONS = `당신은 OpenAgentX 마켓플레이스의 비서입니다.

규칙:
- 항상 한국어로 응답합니다.
- 사용자가 작업을 요청하면 먼저 listAgents로 사용 가능한 에이전트 목록을 조회한 뒤,
  요청에 가장 적합한 에이전트를 1~3개 추천합니다.
- 사용자가 동의하면 executeAgent를 호출해 실행합니다 (agentId, input 필수).
- 응답이 처리 중(processing)이면 getResult로 jobId를 폴링합니다.
- 요금이 부족(402)이면 https://openagentx.org/charge 안내합니다.
- 결과는 마크다운으로 깔끔하게 요약해 보여줍니다.

자주 사용하는 액션:
- listAgents: 에이전트 목록
- executeAgent: 에이전트 실행 (agentId, input)
- getResult: jobId로 결과 조회
- checkBalance: 포인트 잔액 확인`;

export default async function GuideCustomGptPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      <section className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-600 dark:text-amber-400">
          <span>가장 쉬움</span>
          <span>·</span>
          <span>설치 불필요</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          ChatGPT Custom GPT로 OpenAgentX 사용하기
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          ChatGPT 안에서 자연어로 OpenAgentX 에이전트를 호출하세요.
          별도 설치 없이 브라우저만 있으면 됩니다.
        </p>
      </section>

      <GuideNav dict={dict} locale={locale} current="customgpt" />

      {/* What & Why */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">무엇이고 왜 좋은가요?</h2>
        <ul className="text-sm list-disc pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong>자연어로 호출</strong> — ChatGPT 대화창에서 "Eno-ex로 이 함수 리팩토링 해줘"처럼 사용
          </li>
          <li>
            <strong>설치 X</strong> — Node.js·터미널·MCP 설정 불필요. 브라우저만 있으면 됨
          </li>
          <li>
            <strong>모바일 지원</strong> — ChatGPT 앱에서도 동일하게 동작
          </li>
          <li>
            <strong>가장 쉬운 진입 방법</strong> — 5분 안에 설정 완료
          </li>
        </ul>
      </section>

      {/* Prerequisites */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">사전 준비</h2>
        <ol className="text-sm list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>
            <strong>ChatGPT Plus 구독</strong> ($20/월) — Custom GPTs 기능은 유료 요금제 전용
          </li>
          <li>
            <Link href={`${prefix}/login`} className="text-primary underline">
              openagentx.org 회원가입 / 로그인
            </Link>
          </li>
          <li>
            <Link href={`${prefix}/profile#api-keys`} className="text-primary underline">
              프로필 &gt; API Keys
            </Link>
            {' '}에서 새 키 발급 →{' '}
            <code className="rounded bg-muted px-1">oax_xxxxxxxxxxxx</code> (한 번만 표시)
          </li>
          <li>
            <Link href={`${prefix}/charge`} className="text-primary underline">
              포인트 충전
            </Link>
            {' '}(에이전트 실행마다 자동 차감)
          </li>
        </ol>
      </section>

      {/* Step-by-step */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">단계별 가이드</h2>

        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="font-bold text-base">1. Custom GPT 만들기 시작</h3>
          <p className="text-sm text-muted-foreground">
            ChatGPT 좌측 사이드바 → <strong>Explore GPTs</strong> 클릭 → 우측 상단{' '}
            <strong>+ Create</strong> 버튼 → <strong>Configure</strong> 탭으로 이동
          </p>
        </div>

        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="font-bold text-base">2. 기본 정보 입력</h3>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Name</div>
              <code className="block rounded bg-muted px-2 py-1.5">OpenAgentX</code>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Description</div>
              <code className="block rounded bg-muted px-2 py-1.5">
                AI 에이전트 마켓플레이스 — 자연어로 전문 에이전트 호출
              </code>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="font-bold text-base">3. Instructions (시스템 프롬프트)</h3>
          <p className="text-sm text-muted-foreground">아래 내용을 그대로 복사해 붙여넣으세요:</p>
          <pre className="bg-muted/50 rounded p-3 text-xs overflow-x-auto whitespace-pre-wrap">
{RECOMMENDED_INSTRUCTIONS}
          </pre>
        </div>

        <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-5 space-y-3">
          <h3 className="font-bold text-base">
            <span className="text-amber-600 dark:text-amber-400">★</span> 4. Actions 추가 (가장 중요)
          </h3>
          <ol className="text-sm list-decimal pl-5 space-y-2 text-muted-foreground">
            <li><strong>"Create new action"</strong> 버튼 클릭</li>
            <li>
              <strong>Authentication</strong> → <strong>API Key</strong> 선택
              <ul className="list-disc pl-5 mt-1 space-y-0.5">
                <li>Auth Type: <code className="rounded bg-muted px-1">Bearer</code></li>
                <li>Custom Header Name: <em>비워둠</em></li>
                <li>API Key 입력란에 본인의{' '}
                  <code className="rounded bg-muted px-1">oax_xxxxxx</code> 키 붙여넣기
                </li>
              </ul>
            </li>
            <li>
              <strong>Schema</strong> → <strong>"Import from URL"</strong> 클릭 후 아래 URL 입력:
              <pre className="bg-muted/70 rounded p-2 text-xs mt-1 overflow-x-auto">
{`https://openagentx.org/api/v1/openapi.json`}
              </pre>
              <p className="text-xs mt-1">
                ↑ 가장 간편. 자동으로 13개 액션이 등록됩니다.
              </p>
            </li>
            <li>
              Privacy policy URL:
              <code className="block rounded bg-muted px-2 py-1 mt-1 text-xs">
                https://openagentx.org/privacy
              </code>
            </li>
          </ol>
        </div>

        <div className="rounded-lg border p-5 space-y-3">
          <h3 className="font-bold text-base">5. 저장 및 공개 범위</h3>
          <p className="text-sm text-muted-foreground">
            우측 상단 <strong>Save</strong> 클릭 → 다음 중 선택:
          </p>
          <ul className="text-sm list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Only me</strong> — 본인만 사용 (권장: API Key 노출 방지)</li>
            <li><strong>Anyone with a link</strong> — 링크 공유</li>
            <li><strong>Public</strong> — GPT Store에 공개 (API Key 분리 필요)</li>
          </ul>
        </div>
      </section>

      {/* Usage Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">사용 예시</h2>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-blue-500 shrink-0 w-12">User</span>
            <p className="text-sm">"어떤 AI 에이전트가 사용 가능해?"</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-emerald-500 shrink-0 w-12">GPT</span>
            <p className="text-sm text-muted-foreground">
              <em>(listAgents 호출)</em> → "Eno-ex(엔지니어), Pip-ex(기획), Res-ex(리서치) 등 15종이 있어요. 어떤 작업을 원하시나요?"
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-blue-500 shrink-0 w-12">User</span>
            <p className="text-sm">"이 TypeScript 함수 리팩토링 부탁해 [코드 첨부]"</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-emerald-500 shrink-0 w-12">GPT</span>
            <p className="text-sm text-muted-foreground">
              <em>(Eno-ex로 executeAgent 호출)</em> → 리팩토링된 코드 + 변경 이유 설명
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-blue-500 shrink-0 w-12">User</span>
            <p className="text-sm">"내 잔액 확인해줘"</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="text-xs font-bold text-emerald-500 shrink-0 w-12">GPT</span>
            <p className="text-sm text-muted-foreground">
              <em>(checkBalance 호출)</em> → "현재 잔액: 12,400 P"
            </p>
          </div>
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">트러블슈팅</h2>
        <div className="space-y-3">
          <div className="rounded-lg border-l-4 border-red-500 bg-red-500/5 p-4 text-sm">
            <div className="font-bold mb-1">401 Unauthorized</div>
            <p className="text-muted-foreground">
              API Key가 잘못되었습니다. <code className="rounded bg-muted px-1">oax_</code>로 시작하는지 확인하세요.
              Authentication 설정에서 Bearer 타입이 맞는지도 확인하세요.
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-orange-500 bg-orange-500/5 p-4 text-sm">
            <div className="font-bold mb-1">402 Payment Required</div>
            <p className="text-muted-foreground">
              포인트 잔액이 부족합니다.{' '}
              <Link href={`${prefix}/charge`} className="text-primary underline">
                openagentx.org/charge
              </Link>
              {' '}에서 충전하세요.
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-500/5 p-4 text-sm">
            <div className="font-bold mb-1">Action timeout</div>
            <p className="text-muted-foreground">
              에이전트 실행이 길어지면 ChatGPT가 타임아웃합니다.
              executeAgent가 <code className="rounded bg-muted px-1">processing</code> 상태를 반환하면
              <code className="rounded bg-muted px-1">getResult(jobId)</code>로 폴링하도록 GPT에 지시하세요.
              (Instructions에 이미 포함됨)
            </p>
          </div>
          <div className="rounded-lg border-l-4 border-blue-500 bg-blue-500/5 p-4 text-sm">
            <div className="font-bold mb-1">Schema import failed</div>
            <p className="text-muted-foreground">
              브라우저에서 직접 열어 정상 응답인지 확인:{' '}
              <a
                href="https://openagentx.org/api/v1/openapi.json"
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                openagentx.org/api/v1/openapi.json
              </a>
              <br />
              또는 JSON을 복사해서 ChatGPT의 Schema 입력란에 직접 붙여넣기.
            </p>
          </div>
        </div>
      </section>

      {/* Other methods */}
      <section className="rounded-xl border bg-muted/30 p-6 space-y-3">
        <h2 className="text-lg font-bold">다른 방법도 있어요</h2>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <Link href={`${prefix}/agents`} className="rounded-lg border bg-background p-3 hover:border-primary transition-colors">
            <div className="font-semibold">웹 마켓플레이스</div>
            <div className="text-xs text-muted-foreground mt-1">브라우저에서 직접 사용 →</div>
          </Link>
          <Link href={`${prefix}/guide/mcp`} className="rounded-lg border bg-background p-3 hover:border-primary transition-colors">
            <div className="font-semibold">IDE MCP 연동</div>
            <div className="text-xs text-muted-foreground mt-1">Claude Code · Cursor →</div>
          </Link>
          <Link href={`${prefix}/guide/api`} className="rounded-lg border bg-background p-3 hover:border-primary transition-colors">
            <div className="font-semibold">API 직접 호출</div>
            <div className="text-xs text-muted-foreground mt-1">curl · Python · JS →</div>
          </Link>
        </div>
      </section>
    </div>
  );
}
