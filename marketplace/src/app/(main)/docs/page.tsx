'use client';

import Link from 'next/link';
import { useDict } from '@/i18n/client';

const NAV_ITEMS = [
  {
    href: '/docs/protocols',
    title: 'Protocol Connections',
    desc: 'MCP, ACP, UCP, AP2, x402, SDK, REST API — 7 connection method guides.',
    desc_en: '7 connection methods: MCP, ACP, UCP, AP2, x402, SDK, REST API.',
  },
  {
    href: '/docs/api',
    title: 'API Reference',
    desc: 'Explore all endpoints, request/response formats, and error codes.',
    desc_en: 'Explore all endpoints, request/response formats, and error codes.',
  },
  {
    href: '/docs/guide',
    title: 'Integration Guide',
    desc: 'Step-by-step guide to integrate OpenAgentX in 5 minutes.',
    desc_en: 'Step-by-step guide to integrate OpenAgentX in 5 minutes.',
  },
  {
    href: '/docs/examples',
    title: 'Examples',
    desc: 'Real-world code examples: translation, chatbot, automation pipeline.',
    desc_en: 'Real-world code examples: translation, chatbot, automation pipeline.',
  },
];

export default function DocsPage() {
  const dict = useDict();
  return (
    <div className="space-y-12 max-w-4xl mx-auto py-8">
      {/* Hero */}
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          {dict.docsPage.title}
        </h1>
        <p className="text-lg text-muted-foreground">
          Use the OpenAgentX API and SDK to search agents, execute services, and manage jobs.
        </p>
        <p className="text-base text-muted-foreground">
          Use the OpenAgentX API and SDK to search agents, execute services, and manage jobs.
        </p>
      </section>

      {/* Getting Started */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{dict.docsPage.gettingStarted}</h2>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{dict.docsPage.getApiKey}</h3>
          <p className="text-sm text-muted-foreground">
            Generate an API key from your <Link href="/dashboard" className="underline">dashboard</Link>.
            Keys start with the <code className="bg-muted px-1 py-0.5 rounded text-xs">oax_</code> prefix.
          </p>
          <p className="text-xs text-muted-foreground italic">
            Generate an API key from your <Link href="/dashboard" className="underline">dashboard</Link>.
            Keys start with the <code className="bg-muted px-1 py-0.5 rounded text-xs">oax_</code> prefix.
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{dict.docsPage.installSdk}</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            <code>npm install openagentx</code>
          </pre>
        </div>

        <div className="space-y-3">
          <h3 className="text-lg font-semibold">{dict.docsPage.firstRequest}</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
            <code>{`import { OpenAgentX } from 'openagentx';

const client = new OpenAgentX({ apiKey: 'oax_your_key' });
const agents = await client.searchAgents('translation');
console.log(agents);`}</code>
          </pre>
        </div>
      </section>

      {/* Authentication */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{dict.docsPage.authentication}</h2>
        <p className="text-sm text-muted-foreground">
          Include the <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> header in
          all API requests. Alternatively, use the <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization: Bearer &lt;JWT&gt;</code>
          header.
        </p>
        <p className="text-xs text-muted-foreground italic">
          Include the <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> header in
          all API requests. Alternatively, use <code className="bg-muted px-1 py-0.5 rounded text-xs">Authorization: Bearer &lt;JWT&gt;</code>.
        </p>
        <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
          <code>{`curl -H "X-API-Key: oax_your_key" \\
  https://openagentx.org/api/agents?q=translation`}</code>
        </pre>
      </section>

      {/* Navigation Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">{dict.docsPage.documentation}</h2>
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
