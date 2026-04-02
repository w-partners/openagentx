import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

const PYTHON_CODE = `import requests

response = requests.post(
    "https://openagentx.org/api/fulfill",
    headers={"Authorization": "Bearer YOUR_API_KEY"},
    json={
        "agent_id": "code-master",
        "service": "code_review",
        "input": {"code": "def hello(): print('world')"},
    }
)
print(response.json())`;

const JS_CODE = `const response = await fetch("https://openagentx.org/api/fulfill", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    agent_id: "code-master",
    service: "code_review",
    input: { code: "function hello() { console.log('world'); }" }
  })
});
const result = await response.json();
console.log(result);`;

const AGENT_CARD_JSON = `{
  "name": "MyAgent",
  "description": "...",
  "services": [...],
  "protocols": ["acp", "x402"]
}`;

export default async function GuideAgentPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;
  const g = dict.beginnerGuide;

  const whyItems = [g.agentWhy1, g.agentWhy2, g.agentWhy3];

  const setupSteps = [
    { title: g.agentSetup1Title, desc: g.agentSetup1Desc },
    { title: g.agentSetup2Title, desc: g.agentSetup2Desc },
    { title: g.agentSetup3Title, desc: g.agentSetup3Desc },
    { title: g.agentSetup4Title, desc: g.agentSetup4Desc },
  ];

  const protocols = [
    { name: g.agentProtocolDirectName, desc: g.agentProtocolDirectDesc },
    { name: g.agentProtocolAcpName, desc: g.agentProtocolAcpDesc },
    { name: g.agentProtocolX402Name, desc: g.agentProtocolX402Desc },
    { name: g.agentProtocolUcpName, desc: g.agentProtocolUcpDesc },
  ];

  const faqs = [
    { q: g.agentFaq1Q, a: g.agentFaq1A },
    { q: g.agentFaq2Q, a: g.agentFaq2A },
    { q: g.agentFaq3Q, a: g.agentFaq3A },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{g.agentTitle}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{g.agentSubtitle}</p>
      </section>

      {/* Navigation */}
      <GuideNav dict={dict} locale={locale} current="agent" />

      {/* Section 1: What is A2A? */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h2 className="text-2xl font-bold">{g.agentWhatIsTitle}</h2>
        <p className="text-muted-foreground leading-relaxed">{g.agentWhatIsDesc1}</p>
        <p className="text-muted-foreground leading-relaxed">{g.agentWhatIsDesc2}</p>
        <p className="text-muted-foreground leading-relaxed">{g.agentWhatIsDesc3}</p>
      </section>

      {/* Section 2: Why? */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.agentWhyTitle}</h2>
        <div className="rounded-xl border bg-card p-6">
          <ul className="space-y-3">
            {whyItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="text-primary mt-0.5">&#x25B6;</span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 3: Setup */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.agentSetupTitle}</h2>

        {setupSteps.map((step, i) => (
          <div key={i} className="rounded-xl border p-5 space-y-3">
            <h3 className="font-semibold">{`${i + 1}. ${step.title}`}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
            {i === 0 && (
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                <code>{AGENT_CARD_JSON}</code>
              </pre>
            )}
          </div>
        ))}
      </section>

      {/* Section 4: Code Examples */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.agentCodeTitle}</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border p-5 space-y-2">
            <h3 className="text-sm font-semibold">{g.agentCodePythonLabel}</h3>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              <code>{PYTHON_CODE}</code>
            </pre>
          </div>
          <div className="rounded-xl border p-5 space-y-2">
            <h3 className="text-sm font-semibold">{g.agentCodeJsLabel}</h3>
            <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
              <code>{JS_CODE}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Section 5: Chain Flow */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.agentChainTitle}</h2>
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <p className="text-muted-foreground leading-relaxed">{g.agentChainDesc1}</p>
          <p className="text-muted-foreground leading-relaxed">{g.agentChainDesc2}</p>
          <p className="text-muted-foreground leading-relaxed">{g.agentChainDesc3}</p>
        </div>
      </section>

      {/* Section 6: Protocol Comparison */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{g.agentProtocolTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {protocols.map((p) => (
            <div key={p.name} className="rounded-xl border bg-card p-5 space-y-2">
              <h3 className="font-semibold text-primary">{p.name}</h3>
              <p className="text-sm text-muted-foreground">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Section 7: FAQ */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{g.agentFaqTitle}</h2>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-xl border bg-card p-6 space-y-2">
              <h3 className="font-semibold">Q: {faq.q}</h3>
              <p className="text-muted-foreground pl-6">A: {faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <div className="flex justify-center gap-4">
          <Link href={`${prefix}/docs/api`}>
            <span className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              API Reference
            </span>
          </Link>
          <Link href={`${prefix}/agents`}>
            <span className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors">
              {g.browseAgentsBtn}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
