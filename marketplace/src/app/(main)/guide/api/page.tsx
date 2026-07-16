import Link from 'next/link';
import { getLocale, getDictionary } from '@/i18n/index';
import { GuideNav } from '../guide-nav';

export const metadata = {
  title: 'API 직접 호출 가이드 - OpenAgentX',
  description: 'curl · Python · JavaScript로 OpenAgentX REST API 호출하기',
};

type Endpoint = {
  method: 'GET' | 'POST';
  path: string;
  title: string;
  desc: string;
  curl: string;
  python: string;
  js: string;
};

const ENDPOINTS: Endpoint[] = [
  {
    method: 'GET',
    path: '/api/v1/agents',
    title: '에이전트 목록 조회',
    desc: '마켓플레이스에 등록된 모든 에이전트를 가져옵니다.',
    curl: `curl -X GET https://openagentx.org/api/v1/agents \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY"`,
    python: `import os, requests

API = "https://openagentx.org/api/v1"
KEY = os.environ["OPENAGENTX_API_KEY"]
HEADERS = {"Authorization": f"Bearer {KEY}"}

r = requests.get(f"{API}/agents", headers=HEADERS)
agents = r.json()["data"]["agents"]
for a in agents:
    print(a["id"], a["name"], a["pricePoints"], "P")`,
    js: `const API = "https://openagentx.org/api/v1";
const KEY = process.env.OPENAGENTX_API_KEY;

const res = await fetch(\`\${API}/agents\`, {
  headers: { Authorization: \`Bearer \${KEY}\` },
});
const { data } = await res.json();
console.log(data.agents);`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/execute',
    title: '에이전트 실행',
    desc: '에이전트를 호출해 결과를 생성합니다. 포인트가 자동 차감됩니다.',
    curl: `curl -X POST https://openagentx.org/api/v1/agents/execute \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agentId": "eno-ex",
    "input": "이 함수를 리팩토링해줘: function add(a,b){return a+b}"
  }'`,
    python: `import requests, os

r = requests.post(
    "https://openagentx.org/api/v1/agents/execute",
    headers={
        "Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={"agentId": "eno-ex", "input": "Refactor this function..."},
)
data = r.json()["data"]
print("status:", data["status"])
print("result:", data.get("result"))
print("jobId:", data["jobId"])`,
    js: `const res = await fetch("https://openagentx.org/api/v1/agents/execute", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    agentId: "eno-ex",
    input: "Refactor this function...",
  }),
});
const { data } = await res.json();
console.log(data.status, data.jobId, data.result);`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/result/{jobId}',
    title: '실행 결과 폴링',
    desc: 'executeAgent가 processing을 반환하면 jobId로 결과를 조회합니다.',
    curl: `curl -X GET https://openagentx.org/api/v1/agents/result/$JOB_ID \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY"`,
    python: `import time, requests, os

HEADERS = {"Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}"}

def wait_for(job_id, timeout=120):
    deadline = time.time() + timeout
    while time.time() < deadline:
        r = requests.get(
            f"https://openagentx.org/api/v1/agents/result/{job_id}",
            headers=HEADERS,
        )
        d = r.json()["data"]
        if d["status"] in ("completed", "failed"):
            return d
        time.sleep(2)
    raise TimeoutError("polling timeout")

print(wait_for("job_xxxx"))`,
    js: `async function waitFor(jobId, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const r = await fetch(
      \`https://openagentx.org/api/v1/agents/result/\${jobId}\`,
      { headers: { Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\` } },
    );
    const { data } = await r.json();
    if (data.status === "completed" || data.status === "failed") return data;
    await new Promise((s) => setTimeout(s, 2000));
  }
  throw new Error("polling timeout");
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/balance',
    title: '포인트 잔액 확인',
    desc: '현재 계정의 포인트 잔액을 조회합니다.',
    curl: `curl -X GET https://openagentx.org/api/v1/balance \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY"`,
    python: `import requests, os

r = requests.get(
    "https://openagentx.org/api/v1/balance",
    headers={"Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}"},
)
print("balance:", r.json()["data"]["balance"], "P")`,
    js: `const r = await fetch("https://openagentx.org/api/v1/balance", {
  headers: { Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\` },
});
const { data } = await r.json();
console.log("balance:", data.balance, "P");`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/create',
    title: '새 에이전트 등록',
    desc: '직접 작성한 시스템 프롬프트로 새 에이전트를 마켓에 등록합니다.',
    curl: `curl -X POST https://openagentx.org/api/v1/agents/create \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "내 SQL 튜너",
    "description": "PostgreSQL 쿼리를 분석하고 EXPLAIN 기반으로 인덱스를 추천",
    "systemPrompt": "당신은 PostgreSQL 전문가입니다...",
    "category": "데이터베이스",
    "pricePoints": 200
  }'`,
    python: `import requests, os

r = requests.post(
    "https://openagentx.org/api/v1/agents/create",
    headers={
        "Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "name": "My SQL Tuner",
        "description": "PostgreSQL query analyzer",
        "systemPrompt": "You are a PostgreSQL expert...",
        "category": "database",
        "pricePoints": 200,
    },
)
print(r.json())`,
    js: `const res = await fetch("https://openagentx.org/api/v1/agents/create", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "My SQL Tuner",
    description: "PostgreSQL query analyzer",
    systemPrompt: "You are a PostgreSQL expert...",
    category: "database",
    pricePoints: 200,
  }),
});
console.log(await res.json());`,
  },
  {
    method: 'POST',
    path: '/api/v1/agents/generate',
    title: 'AI 기반 에이전트 자동 생성',
    desc: 'GitHub 레포나 참고자료를 분석해 에이전트 초안을 자동 생성합니다.',
    curl: `curl -X POST https://openagentx.org/api/v1/agents/generate \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "description": "Next.js App Router 라우팅 컨설턴트",
    "githubRepo": "vercel/next.js",
    "referenceUrls": ["https://nextjs.org/docs/app"]
  }'`,
    python: `import requests, os

r = requests.post(
    "https://openagentx.org/api/v1/agents/generate",
    headers={
        "Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "description": "Next.js App Router consultant",
        "githubRepo": "vercel/next.js",
        "referenceUrls": ["https://nextjs.org/docs/app"],
    },
)
draft = r.json()["data"]
print(draft["name"], draft["systemPrompt"][:200])`,
    js: `const res = await fetch("https://openagentx.org/api/v1/agents/generate", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    description: "Next.js App Router consultant",
    githubRepo: "vercel/next.js",
    referenceUrls: ["https://nextjs.org/docs/app"],
  }),
});
const { data } = await res.json();
console.log(data.name, data.systemPrompt.slice(0, 200));`,
  },
  {
    method: 'GET',
    path: '/api/v1/agents/my',
    title: '내 에이전트 목록',
    desc: '내가 등록한 에이전트 + 사용 통계를 조회합니다.',
    curl: `curl -X GET https://openagentx.org/api/v1/agents/my \\
  -H "Authorization: Bearer $OPENAGENTX_API_KEY"`,
    python: `import requests, os

r = requests.get(
    "https://openagentx.org/api/v1/agents/my",
    headers={"Authorization": f"Bearer {os.environ['OPENAGENTX_API_KEY']}"},
)
for a in r.json()["data"]["agents"]:
    print(a["name"], "—", a["usageCount"], "calls")`,
    js: `const r = await fetch("https://openagentx.org/api/v1/agents/my", {
  headers: { Authorization: \`Bearer \${process.env.OPENAGENTX_API_KEY}\` },
});
const { data } = await r.json();
data.agents.forEach((a) => console.log(a.name, a.usageCount));`,
  },
];

function CodeBlock({ label, code }: { label: string; code: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
      <pre className="bg-muted/60 rounded p-3 text-xs overflow-x-auto"><code>{code}</code></pre>
    </div>
  );
}

export default async function GuideApiPage() {
  const locale = await getLocale();
  const dict = await getDictionary();
  const prefix = `/${locale}`;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-8">
      <section className="text-center space-y-3">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          REST API 직접 호출 가이드
        </h1>
        <p className="text-base text-muted-foreground max-w-2xl mx-auto">
          curl · Python · JavaScript 어떤 환경에서든 OpenAgentX 에이전트를 직접 호출하세요.
          자동화·CI/CD·서버 통합에 적합합니다.
        </p>
      </section>

      <GuideNav dict={dict} locale={locale} current="api" />

      {/* Quick start */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">빠른 시작</h2>
        <div className="rounded-lg border p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            <strong>Base URL:</strong>{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">https://openagentx.org/api/v1</code>
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>OpenAPI 스펙:</strong>{' '}
            <a
              href="https://openagentx.org/api/v1/openapi.json"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              openagentx.org/api/v1/openapi.json
            </a>
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>인증:</strong> 모든 요청 헤더에{' '}
            <code className="rounded bg-muted px-1.5 py-0.5">Authorization: Bearer oax_xxx</code> 추가
          </p>
        </div>
      </section>

      {/* Auth */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">인증 (Authentication)</h2>
        <ol className="text-sm list-decimal pl-6 space-y-2 text-muted-foreground">
          <li>
            <Link href={`${prefix}/login`} className="text-primary underline">로그인</Link>
            {' '}후{' '}
            <Link href={`${prefix}/profile#api-keys`} className="text-primary underline">
              프로필 &gt; API Keys
            </Link>
            {' '}에서 새 키 발급
          </li>
          <li>
            발급된 <code className="rounded bg-muted px-1">oax_xxxxxxxxxxxx</code> 키를 환경변수로 저장
          </li>
        </ol>
        <pre className="bg-muted/60 rounded p-3 text-xs overflow-x-auto"><code>{`# Linux/Mac
export OPENAGENTX_API_KEY="oax_xxxxxxxxxxxx"

# Windows (PowerShell)
$env:OPENAGENTX_API_KEY="oax_xxxxxxxxxxxx"`}</code></pre>
      </section>

      {/* Endpoints */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold">핵심 엔드포인트</h2>
        {ENDPOINTS.map((e) => (
          <article key={e.path} className="rounded-xl border p-5 space-y-4">
            <header className="flex items-center gap-3 flex-wrap">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  e.method === 'GET'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                }`}
              >
                {e.method}
              </span>
              <code className="text-sm font-mono">{e.path}</code>
              <span className="text-sm font-bold ml-auto">{e.title}</span>
            </header>
            <p className="text-sm text-muted-foreground">{e.desc}</p>
            <div className="grid gap-3">
              <CodeBlock label="cURL" code={e.curl} />
              <CodeBlock label="Python (requests)" code={e.python} />
              <CodeBlock label="JavaScript (fetch)" code={e.js} />
            </div>
          </article>
        ))}
      </section>

      {/* Error codes */}
      <section className="space-y-3">
        <h2 className="text-2xl font-bold">주요 에러 코드</h2>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2">코드</th>
              <th className="text-left py-2 px-2">의미</th>
              <th className="text-left py-2 px-2">조치</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-2 px-2"><code className="rounded bg-muted px-1">401</code></td>
              <td className="py-2 px-2">Unauthorized</td>
              <td className="py-2 px-2">API Key 확인 (oax_로 시작)</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code className="rounded bg-muted px-1">402</code></td>
              <td className="py-2 px-2">Payment Required</td>
              <td className="py-2 px-2">
                <Link href={`${prefix}/charge`} className="text-primary underline">포인트 충전</Link>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code className="rounded bg-muted px-1">404</code></td>
              <td className="py-2 px-2">Not Found</td>
              <td className="py-2 px-2">agentId / jobId 확인</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 px-2"><code className="rounded bg-muted px-1">429</code></td>
              <td className="py-2 px-2">Rate Limit</td>
              <td className="py-2 px-2">잠시 후 재시도 (지수 백오프)</td>
            </tr>
            <tr>
              <td className="py-2 px-2"><code className="rounded bg-muted px-1">500</code></td>
              <td className="py-2 px-2">Server Error</td>
              <td className="py-2 px-2">재시도 또는 지원팀 문의</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Other methods */}
      <section className="rounded-xl border bg-muted/30 p-6 space-y-3">
        <h2 className="text-lg font-bold">코드 작성이 부담스러우시면</h2>
        <p className="text-sm text-muted-foreground">
          ChatGPT Custom GPT가 가장 쉽습니다. 자연어로 API를 호출할 수 있어요.
        </p>
        <Link
          href={`${prefix}/guide/customgpt`}
          className="inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          ChatGPT Custom GPT 가이드 보기 &rarr;
        </Link>
      </section>
    </div>
  );
}
