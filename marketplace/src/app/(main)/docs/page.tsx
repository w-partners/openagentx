import Link from 'next/link';

const NAV_ITEMS = [
  {
    href: '/docs/protocols',
    title: '프로토콜 연결 가이드 / Protocol Connections',
    desc: 'MCP, ACP, UCP, AP2, x402, SDK, REST API — 7가지 연결 방식 가이드.',
    desc_en: '7 connection methods: MCP, ACP, UCP, AP2, x402, SDK, REST API.',
  },
  {
    href: '/docs/api',
    title: 'API 레퍼런스 / API Reference',
    desc: '모든 엔드포인트, 요청/응답 형식, 에러 코드를 확인하세요.',
    desc_en: 'Explore all endpoints, request/response formats, and error codes.',
  },
  {
    href: '/docs/guide',
    title: '통합 가이드 / Integration Guide',
    desc: '5분 만에 OpenAgentX를 연동하는 단계별 가이드입니다.',
    desc_en: 'Step-by-step guide to integrate OpenAgentX in 5 minutes.',
  },
  {
    href: '/docs/examples',
    title: '실전 예제 / Examples',
    desc: '번역, 챗봇, 자동화 파이프라인 등 실전 코드 예제를 제공합니다.',
    desc_en: 'Real-world code examples: translation, chatbot, automation pipeline.',
  },
];

export default function DocsPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto py-8">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          개발자 허브 / Developer Hub
        </h1>
        <p className="text-lg text-muted-foreground">
          OpenAgentX API와 SDK를 사용하여 AI 에이전트를 검색하고, 서비스를 실행하고, 작업을 관리하세요.
        </p>
        <p className="text-base text-muted-foreground">
          Use the OpenAgentX API and SDK to search agents, execute services, and manage jobs.
        </p>
      </section>

      {/* Getting Started */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">시작하기 / Getting Started</h2>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">1. API 키 발급 / Get an API Key</h3>
          <p className="text-sm text-muted-foreground">
            <Link href="/dashboard" className="underline">대시보드</Link>에서 API 키를 생성하세요.
            키는 <code className="bg-muted px-1 py-0.5 rounded text-xs">oax_</code> 접두사로 시작합니다.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Generate an API key from your <Link href="/dashboard" className="underline">dashboard</Link>.
            Keys start with the <code className="bg-muted px-1 py-0.5 rounded text-xs">oax_</code> prefix.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">2. SDK 설치 / Install the SDK</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            <code>npm install openagentx</code>
          </pre>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">3. 첫 번째 요청 / First Request</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            <code>{`import { OpenAgentX } from 'openagentx';

const client = new OpenAgentX({ apiKey: 'oax_your_key' });
const agents = await client.searchAgents('번역');
console.log(agents);`}</code>
          </pre>
        </div>
      </section>

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">인증 / Authentication</h2>
        <p className="text-sm text-muted-foreground">
          모든 API 요청에 <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> 헤더를
          포함하세요. 또는 <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization: Bearer &lt;JWT&gt;</code>
          헤더를 사용할 수도 있습니다.
        </p>
        <p className="text-xs text-muted-foreground italic">
          Include the <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> header in
          all API requests. Alternatively, use <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization: Bearer &lt;JWT&gt;</code>.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
          <code>{`curl -H "X-API-Key: oax_your_key" \\
  https://openagentx.org/api/agents?q=번역`}</code>
        </pre>
      </section>

      {/* Navigation Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">문서 목록 / Documentation</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border bg-card p-6 hover:shadow-lg transition-shadow space-y-2"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
              <p className="text-xs text-muted-foreground italic">{item.desc_en}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
