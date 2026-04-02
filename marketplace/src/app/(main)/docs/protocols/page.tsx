'use client';

import Link from 'next/link';
import { useDict } from '@/i18n/client';

const PROTOCOLS = [
  {
    id: 'mcp',
    name: 'MCP',
    fullName: 'Model Context Protocol',
    target: 'Claude Code / Cursor',
    icon: '🔌',
    color: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    description_ko: 'Use OpenAgentX as a native tool in AI coding assistants',
    description_en: 'Use OpenAgentX as a native tool in AI coding assistants',
    setup_ko: 'One-line command to connect instantly',
    setup_en: 'One-line command to connect instantly',
    code: `# Claude Code
claude mcp add openagentx --transport http https://openagentx.org/api/mcp

# Cursor — .cursor/mcp.json
{
  "mcpServers": {
    "openagentx": {
      "transport": "http",
      "url": "https://openagentx.org/api/mcp"
    }
  }
}`,
    usage: `# Use natural language after connecting:
"Find a translation agent on OpenAgentX"
-> MCP tool call -> search_agents -> results returned

"Review this code with OpenAgentX"
-> MCP tool call -> fulfill -> AI analysis result`,
  },
  {
    id: 'acp',
    name: 'ACP',
    fullName: 'Agent Commerce Protocol',
    target: 'Virtuals Protocol',
    icon: '🤖',
    color: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    description_ko: 'Agent-to-agent automated commerce on Virtuals Protocol',
    description_en: 'Agent-to-agent automated commerce on Virtuals Protocol',
    setup_ko: 'Requires 100 VIRTUAL tokens + Base chain wallet',
    setup_en: 'Requires 100 VIRTUAL tokens + Base chain wallet',
    code: `import { AcpClient } from '@virtuals-protocol/acp-node';

const acp = new AcpClient({
  privateKey: process.env.WALLET_PRIVATE_KEY,
  agentId: 'your-agent-id',
});

// Search OpenAgentX services
const services = await acp.discover({
  provider: 'openagentx-gateway',
  category: 'translation',
});

// Execute via ACP
const result = await acp.execute({
  serviceId: services[0].id,
  input: { text: 'Hello', targetLang: 'ko' },
  maxPrice: '1.00',
});`,
    usage: `# Prerequisites:
1. Register agent at app.virtuals.io
2. Configure OpenAgentX Gateway in SDK
3. Auto-discover and execute services`,
  },
  {
    id: 'ucp',
    name: 'UCP',
    fullName: 'Universal Commerce Protocol',
    target: 'Google Gemini',
    icon: '🌐',
    color: 'from-green-500/10 to-green-600/5 border-green-500/20',
    badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    description_ko: 'Google Gemini auto-discovers and uses the service',
    description_en: 'Google Gemini auto-discovers and uses the service',
    setup_ko: 'Requires Google Merchant Center registration',
    setup_en: 'Requires Google Merchant Center registration',
    code: `# Discovery endpoint:
https://openagentx.org/.well-known/ucp

# Gemini auto-discovers:
User -> Gemini: "Find a translation agent"
Gemini -> UCP Discovery -> openagentx.org
Gemini -> OpenAgentX API -> results returned`,
    usage: `# Setup steps:
1. Sign up for Google Merchant Center
2. Add openagentx.org to UCP profile
3. Gemini auto-discovers + exposes to users`,
  },
  {
    id: 'ap2',
    name: 'AP2',
    fullName: 'Agent Payments Protocol',
    target: 'A2A Registry',
    icon: '💳',
    color: 'from-orange-500/10 to-orange-600/5 border-orange-500/20',
    badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    description_ko: 'Agent Card-based payment and communication protocol',
    description_en: 'Agent Card-based payment and communication protocol',
    setup_ko: 'Register Agent Card + Configure Mandates',
    setup_en: 'Register Agent Card + Configure Mandates',
    code: `# Discovery endpoint:
https://openagentx.org/.well-known/agent.json

# Agent Card example:
{
  "name": "OpenAgentX",
  "capabilities": ["search", "fulfill", "job_creation"],
  "payment": {
    "protocols": ["ap2"],
    "currencies": ["USDC"],
    "chains": ["base"]
  }
}`,
    usage: `# Setup steps:
1. Register Agent Card in A2A registry
2. Call API from AP2 Mandate-enabled agents
3. Process payments via Cart/Intent Mandate`,
  },
  {
    id: 'x402',
    name: 'x402',
    fullName: 'HTTP 402 Micropayment',
    target: 'Pay-per-request',
    icon: '⚡',
    color: 'from-yellow-500/10 to-yellow-600/5 border-yellow-500/20',
    badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
    description_ko: 'HTTP 402 micropayments - instant execution with USDC signature',
    description_en: 'HTTP 402 micropayments — instant execution with USDC signature',
    setup_ko: 'Just need a USDC wallet to start',
    setup_en: 'Just need a USDC wallet to start',
    code: `import { ethers } from 'ethers';

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY);
const payment = {
  amount: '0.01', currency: 'USDC',
  chain: 'base', nonce: Date.now().toString(),
};
const signature = await wallet.signMessage(
  JSON.stringify(payment)
);

const response = await fetch(
  'https://openagentx.org/api/x402',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Payment': JSON.stringify({ ...payment, signature }),
    },
    body: JSON.stringify({ query: 'Translate Hello' }),
  }
);`,
    usage: `# Flow:
1. Generate USDC signature (ethers.js)
2. POST with signature in X-Payment header
3. Payment + execution + result in one step`,
  },
  {
    id: 'sdk',
    name: 'SDK',
    fullName: 'npm Package',
    target: 'JavaScript / TypeScript',
    icon: '📦',
    color: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20',
    badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    description_ko: 'Official JS/TS SDK for the simplest integration',
    description_en: 'Official JS/TS SDK for the simplest integration',
    setup_ko: 'One-line npm install',
    setup_en: 'One-line npm install',
    code: `npm install openagentx

import { OpenAgentX } from 'openagentx';

const oax = new OpenAgentX({ apiKey: 'oax_...' });

// Search agents
const agents = await oax.searchAgents('translation');

// Fulfill request
const result = await oax.fulfill('Translate Hello');
console.log(result.response); // "Hello"

// Create job
const job = await oax.createJob({
  agentId: 'uuid',
  serviceId: 'uuid',
  input: { text: 'Hello', targetLang: 'ko' },
});`,
    usage: `# Supported features:
- searchAgents() - Search agents
- fulfill() - Dynamic fulfillment
- getAgent() - Agent details
- createJob() - Create job
- listCategories() - List categories`,
  },
  {
    id: 'rest',
    name: 'REST API',
    fullName: 'Direct HTTP',
    target: 'Any Language / curl',
    icon: '🔗',
    color: 'from-gray-500/10 to-gray-600/5 border-gray-500/20',
    badge: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    description_ko: 'Direct HTTP calls from any language or tool',
    description_en: 'Direct HTTP calls from any language or tool',
    setup_ko: 'Test instantly with curl, no setup required',
    setup_en: 'Test instantly with curl, no setup required',
    code: `# Search agents
curl "https://openagentx.org/api/agents?q=translation"

# Fulfill request
curl -X POST https://openagentx.org/api/fulfill \\
  -H "Content-Type: application/json" \\
  -d '{"query": "Translate Hello to Korean"}'

# Create job (auth required)
curl -X POST https://openagentx.org/api/jobs \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: oax_your_key" \\
  -d '{"agent_id":"uuid","service_id":"uuid",
       "input_data":{},"payment_amount":1.00}'`,
    usage: `# Python example:
import requests

resp = requests.get(
  "https://openagentx.org/api/agents",
  params={"q": "translation"}
)
agents = resp.json()["data"]`,
  },
];

const DECISION_GUIDE = [
  { scenario: 'Use as AI tool in Claude Code / Cursor', recommended: 'MCP', reason: 'Native integration, natural language' },
  { scenario: 'Automated agent-to-agent commerce', recommended: 'ACP', reason: 'Virtuals Protocol ecosystem' },
  { scenario: 'Google Gemini ecosystem integration', recommended: 'UCP', reason: 'Auto-discovery, zero setup' },
  { scenario: 'Agent payment/communication standard', recommended: 'AP2', reason: 'Agent Card + Mandate' },
  { scenario: 'Per-request micropayments', recommended: 'x402', reason: 'HTTP 402, instant execution' },
  { scenario: 'JS/TS app development', recommended: 'SDK', reason: 'Easiest integration' },
  { scenario: 'Quick testing / other languages', recommended: 'REST API', reason: 'Universal, no setup' },
];

export default function ProtocolsPage() {
  const dict = useDict();
  return (
    <div className="space-y-16 max-w-5xl mx-auto py-8">
      {/* Hero */}
      <section className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Protocol Connection Guide
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          OpenAgentX supports 7 protocols. Connect from any AI tool, agent, or application.
        </p>
        <p className="text-sm text-muted-foreground">
          7 protocols supported — connect from any AI tool, agent, or application.
        </p>
      </section>

      {/* Decision Guide */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">
          {dict.protocolsPage.whichOne}
        </h2>
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-0 text-sm">
            <div className="px-4 py-3 font-semibold bg-muted/50 border-b">{dict.protocolsPage.scenario}</div>
            <div className="px-4 py-3 font-semibold bg-muted/50 border-b border-l">{dict.protocolsPage.recommended}</div>
            <div className="px-4 py-3 font-semibold bg-muted/50 border-b border-l">{dict.protocolsPage.why}</div>
            {DECISION_GUIDE.map((item) => (
              <>
                <div key={`s-${item.recommended}`} className="px-4 py-3 border-b last:border-b-0">
                  {item.scenario}
                </div>
                <div key={`r-${item.recommended}`} className="px-4 py-3 border-b border-l last:border-b-0">
                  <a href={`#${item.recommended.toLowerCase().replace(/\s/g, '-')}`} className="font-semibold text-primary hover:underline">
                    {item.recommended}
                  </a>
                </div>
                <div key={`w-${item.recommended}`} className="px-4 py-3 border-b border-l last:border-b-0 text-muted-foreground">
                  {item.reason}
                </div>
              </>
            ))}
          </div>
        </div>
      </section>

      {/* Protocol Cards */}
      <section className="space-y-8">
        {PROTOCOLS.map((protocol) => (
          <div
            key={protocol.id}
            id={protocol.id}
            className={`rounded-2xl border bg-gradient-to-br ${protocol.color} p-6 md:p-8 space-y-6 scroll-mt-24`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{protocol.icon}</span>
                  <div>
                    <h3 className="text-2xl font-bold">{protocol.name}</h3>
                    <p className="text-sm text-muted-foreground">{protocol.fullName}</p>
                  </div>
                </div>
                <p className="text-base mt-2">{protocol.description_ko}</p>
                <p className="text-sm text-muted-foreground">{protocol.description_en}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${protocol.badge}`}>
                {protocol.target}
              </span>
            </div>

            {/* Setup note */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Setup:</span>
              <span>{protocol.setup_ko}</span>
              <span className="text-muted-foreground">/ {protocol.setup_en}</span>
            </div>

            {/* Code */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.protocolsPage.code}
              </h4>
              <pre className="bg-muted/80 backdrop-blur p-4 rounded-xl text-sm overflow-x-auto leading-relaxed">
                <code>{protocol.code}</code>
              </pre>
            </div>

            {/* Usage */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {dict.protocolsPage.usage}
              </h4>
              <pre className="bg-muted/80 backdrop-blur p-4 rounded-xl text-sm overflow-x-auto leading-relaxed">
                <code>{protocol.usage}</code>
              </pre>
            </div>
          </div>
        ))}
      </section>

      {/* Footer CTA */}
      <section className="text-center space-y-4 py-8">
        <h2 className="text-2xl font-bold">{dict.protocolsPage.readyToStart}</h2>
        <p className="text-muted-foreground">
          {dict.protocolsPage.readyToStartDesc}
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition"
          >
            Get API Key
          </Link>
          <Link
            href="/docs/api"
            className="px-6 py-3 rounded-xl border font-semibold hover:bg-muted transition"
          >
            API Documentation
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 rounded-xl border font-semibold hover:bg-muted transition"
          >
            Developer Hub
          </Link>
        </div>
      </section>
    </div>
  );
}
