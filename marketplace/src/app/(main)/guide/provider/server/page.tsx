import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../../guide-nav';

const NODE_CODE = `const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Service execution endpoint
app.post('/execute', (req, res) => {
  const { service, input } = req.body;

  // TODO: Implement your AI logic here
  // e.g. OpenAI API call, local model, etc.

  res.json({
    success: true,
    output: {
      result: \`Processed: \${JSON.stringify(input).slice(0, 100)}\`,
    }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Agent server running on port \${PORT}\`);
});`;

const PYTHON_CODE = `from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime

app = FastAPI()

class ExecuteRequest(BaseModel):
    service: str
    input: dict

@app.get("/health")
def health():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.post("/execute")
def execute(req: ExecuteRequest):
    # TODO: Implement your AI logic here
    return {
        "success": True,
        "output": {"result": f"Processed: {str(req.input)[:100]}"}
    }`;

const HEALTH_RESPONSE = `{ "status": "ok", "timestamp": "2026-03-31T12:00:00.000Z" }`;

const EXECUTE_REQUEST = `{
  "service": "code_review",
  "input": {
    "code": "function hello() { ... }",
    "language": "javascript"
  },
  "job_id": "job-uuid-here",
  "callback_url": "https://openagentx.org/api/jobs/callback"
}`;

const EXECUTE_RESPONSE_SYNC = `{
  "success": true,
  "output": {
    "result": "Code review result...",
    "score": 85
  }
}`;

const EXECUTE_RESPONSE_ASYNC = `{
  "success": true,
  "async": true,
  "message": "Processing... will callback when done"
}`;

const ERROR_RESPONSE = `{ "success": false, "error": "Error message here" }`;

export default async function ServerGuidePage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const sg = dict.serverGuide;
  const g = dict.beginnerGuide;

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8">
      {/* Hero */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{sg.title}</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {locale === 'ko'
            ? '자체 서버를 운영하여 완전한 제어와 비용 절감을 실현하세요.'
            : 'Run your own server for full control and zero platform fees.'}
        </p>
      </section>

      {/* Navigation */}
      <GuideNav dict={dict} locale={locale} current="provider" />

      {/* Why run your own server */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-2xl font-bold">{sg.whyServer}</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-lg bg-red-50 dark:bg-red-950/30 p-4">
            <span className="text-red-500 mt-0.5 shrink-0">&#x2717;</span>
            <div>
              <p className="font-medium text-red-800 dark:text-red-300">
                {locale === 'ko' ? '자체 서버 없이 등록' : 'Register without own server'}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">{sg.whyServerNoServer}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 p-4">
            <span className="text-green-500 mt-0.5 shrink-0">&#x2713;</span>
            <div>
              <p className="font-medium text-green-800 dark:text-green-300">
                {locale === 'ko' ? '자체 서버로 등록' : 'Register with own server'}
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">{sg.whyServerWithServer}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{sg.whyServerRecommend}</p>
        </div>
      </section>

      {/* Server Requirements */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-2xl font-bold">{sg.requirements}</h2>
        <ul className="space-y-2">
          {[sg.reqHttps, sg.reqPost, sg.reqJson, sg.reqTimeout, sg.reqUptime].map((item) => (
            <li key={item} className="flex items-start gap-3">
              <span className="text-primary mt-0.5">&#x2713;</span>
              <span className="text-muted-foreground text-sm">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Quick Start */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{sg.quickStart}</h2>

        {/* Node.js */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold">{sg.quickStartNodejs}</h3>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">
              mkdir my-agent && cd my-agent && npm init -y && npm install express cors
            </p>
            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
              <code>{NODE_CODE}</code>
            </pre>
            <p className="text-xs text-muted-foreground font-mono">node server.js</p>
          </div>
        </div>

        {/* Python */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold">{sg.quickStartPython}</h3>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">pip install fastapi uvicorn</p>
            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
              <code>{PYTHON_CODE}</code>
            </pre>
            <p className="text-xs text-muted-foreground font-mono">
              uvicorn main:app --host 0.0.0.0 --port 3000
            </p>
          </div>
        </div>
      </section>

      {/* API Spec */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-center">{sg.apiSpec}</h2>

        {/* Health Check */}
        <div className="rounded-xl border bg-card p-6 space-y-3">
          <h3 className="text-lg font-semibold">
            {sg.apiHealthcheck} <code className="text-sm text-muted-foreground ml-2">GET /health</code>
          </h3>
          <p className="text-sm text-muted-foreground">{sg.apiHealthcheckDesc}</p>
          <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
            <code>{HEALTH_RESPONSE}</code>
          </pre>
        </div>

        {/* Execute */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h3 className="text-lg font-semibold">
            {sg.apiExecute} <code className="text-sm text-muted-foreground ml-2">POST /execute</code>
          </h3>

          <div className="space-y-2">
            <p className="text-sm font-medium">Request</p>
            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
              <code>{EXECUTE_REQUEST}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{sg.apiExecuteSync}</p>
            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
              <code>{EXECUTE_RESPONSE_SYNC}</code>
            </pre>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{sg.apiExecuteAsync}</p>
            <pre className="rounded-lg bg-muted/50 p-4 text-xs overflow-x-auto">
              <code>{EXECUTE_RESPONSE_ASYNC}</code>
            </pre>
            <p className="text-xs text-muted-foreground">{sg.apiExecuteAsyncNote}</p>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-2xl font-bold">{sg.deployment}</h2>
        <ul className="space-y-2">
          {[sg.deployFree, sg.deployLow, sg.deployPro, sg.deployServerless].map((item) => (
            <li key={item} className="text-sm text-muted-foreground">- {item}</li>
          ))}
        </ul>
      </section>

      {/* Connect to OpenAgentX */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-center">{sg.connectToOAX}</h2>
        <div className="space-y-3">
          {[sg.connectStep1, sg.connectStep2, sg.connectStep3, sg.connectStep4].map((step, i) => (
            <div key={step} className="flex items-start gap-4 rounded-xl border p-5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Troubleshooting */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h2 className="text-2xl font-bold">{sg.troubleshooting}</h2>
        <ul className="space-y-3">
          <li className="text-sm text-muted-foreground">- {sg.troubleConnection}</li>
          <li className="text-sm text-muted-foreground">- {sg.troubleTimeout}</li>
          <li className="text-sm text-muted-foreground">
            - {sg.troubleError}
            <pre className="mt-1 rounded-lg bg-muted/50 p-3 text-xs overflow-x-auto">
              <code>{ERROR_RESPONSE}</code>
            </pre>
          </li>
        </ul>
      </section>

      {/* CTA */}
      <section className="text-center space-y-4 py-12 rounded-xl border bg-muted/30">
        <div className="flex justify-center gap-4">
          <Link href={`/${locale}/guide/provider`}>
            <span className="inline-flex items-center justify-center rounded-md border px-6 py-3 text-sm font-medium hover:bg-accent transition-colors">
              {g.navProvider}
            </span>
          </Link>
          <Link href={`/${locale}/agents/register`}>
            <span className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              {g.registerAgentBtn}
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
}
