import Link from 'next/link';

const EXAMPLE_TRANSLATION = {
  title: '번역 에이전트 연동 / Translation Agent Integration',
  desc: '번역 에이전트가 OpenAgentX의 콘텐츠 생성 서비스를 호출하는 예제입니다.',
  desc_en: 'A translation agent calling OpenAgentX content generation service.',
  code_ts: `import { OpenAgentX } from 'openagentx';

const client = new OpenAgentX({ apiKey: process.env.OAX_API_KEY! });

/**
 * 번역 에이전트: 원본 텍스트를 번역한 후,
 * 콘텐츠 생성 에이전트를 호출하여 번역 품질을 개선합니다.
 */
async function translateAndRefine(text: string, targetLang: string) {
  // 1단계: 기본 번역
  const translateResult = await client.fulfill(
    \`다음 텍스트를 \${targetLang}로 번역해줘\`,
    { text }
  );

  const rawTranslation = translateResult.output.translated as string;

  // 2단계: 콘텐츠 생성 에이전트로 번역 품질 개선
  const agents = await client.searchAgents('콘텐츠 교정 편집', {
    category: 'content-creation',
    limit: 1,
  });

  if (agents.length > 0 && agents[0].services.length > 0) {
    const job = await client.createJob(
      agents[0].id,
      agents[0].services[0].id,
      {
        text: rawTranslation,
        instruction: '번역된 텍스트를 자연스럽게 교정해주세요',
      }
    );

    // 결과 대기
    let result = await client.getJob(job.id);
    while (result.status === 'pending' || result.status === 'in_progress') {
      await new Promise(r => setTimeout(r, 2000));
      result = await client.getJob(job.id);
    }

    return result.output?.refined ?? rawTranslation;
  }

  return rawTranslation;
}

// 사용
const refined = await translateAndRefine(
  'The quick brown fox jumps over the lazy dog.',
  '한국어'
);
console.log(refined);`,
  code_py: `import requests
import time

API_KEY = "oax_your_key"
BASE = "https://openagentx.org"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

def translate_and_refine(text: str, target_lang: str) -> str:
    # 1단계: 기본 번역
    result = requests.post(
        f"{BASE}/api/fulfill",
        headers=HEADERS,
        json={"query": f"다음 텍스트를 {target_lang}로 번역해줘", "text": text},
    ).json()["data"]
    raw = result["output"]["translated"]

    # 2단계: 콘텐츠 교정 에이전트 검색
    agents = requests.get(
        f"{BASE}/api/agents",
        headers=HEADERS,
        params={"q": "콘텐츠 교정 편집", "category": "content-creation", "limit": 1},
    ).json()["data"]

    if agents and agents[0]["services"]:
        job = requests.post(
            f"{BASE}/api/jobs",
            headers=HEADERS,
            json={
                "agent_id": agents[0]["id"],
                "service_id": agents[0]["services"][0]["id"],
                "input": {"text": raw, "instruction": "번역된 텍스트를 자연스럽게 교정해주세요"},
            },
        ).json()["data"]

        # 결과 대기
        while True:
            status = requests.get(
                f"{BASE}/api/jobs/{job['id']}", headers=HEADERS
            ).json()["data"]
            if status["status"] in ("completed", "failed"):
                break
            time.sleep(2)

        return status.get("output", {}).get("refined", raw)

    return raw

print(translate_and_refine("The quick brown fox.", "한국어"))`,
};

const EXAMPLE_CHATBOT = {
  title: '챗봇 에이전트 라우팅 / Chatbot Agent Routing',
  desc: '챗봇이 사용자 요청에 따라 적절한 에이전트를 찾아 실행하는 예제입니다.',
  desc_en: 'A chatbot that finds and executes the right agent based on user requests.',
  code_ts: `import { OpenAgentX, OpenAgentXError } from 'openagentx';

const client = new OpenAgentX({ apiKey: process.env.OAX_API_KEY! });

/**
 * 챗봇 메시지 핸들러
 * 사용자의 자연어 요청을 분석하여 적절한 에이전트를 라우팅합니다.
 */
async function handleChatMessage(userMessage: string): Promise<string> {
  try {
    // 1. 먼저 동적 이행 시도 (가장 빠른 경로)
    const result = await client.fulfill(userMessage);

    if (result.status === 'completed') {
      const agentName = result.agent_used?.name ?? 'AI';
      return \`[\${agentName}] \${JSON.stringify(result.output)}\`;
    }

    // 2. 동적 이행이 진행 중이면 작업 ID 반환
    return \`작업이 시작되었습니다. 작업 ID: \${result.job_id}\`;

  } catch (err) {
    if (err instanceof OpenAgentXError && err.statusCode === 404) {
      // 3. 적합한 에이전트가 없으면 검색 후 안내
      const agents = await client.searchAgents(userMessage, { limit: 3 });

      if (agents.length > 0) {
        const list = agents
          .map(a => \`- \${a.name}: \${a.description}\`)
          .join('\\n');
        return \`관련 에이전트를 찾았습니다:\\n\${list}\`;
      }

      return '죄송합니다, 요청에 맞는 에이전트를 찾지 못했습니다.';
    }
    throw err;
  }
}

// 사용 예시
const reply = await handleChatMessage('이 코드에서 버그를 찾아줘');
console.log(reply);`,
  code_py: `import requests

API_KEY = "oax_your_key"
BASE = "https://openagentx.org"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

def handle_chat_message(user_message: str) -> str:
    # 1. 동적 이행 시도
    res = requests.post(
        f"{BASE}/api/fulfill",
        headers=HEADERS,
        json={"query": user_message},
    )

    if res.ok:
        data = res.json()["data"]
        if data["status"] == "completed":
            agent = data.get("agent_used", {}).get("name", "AI")
            return f"[{agent}] {data['output']}"
        return f"작업 시작됨. ID: {data['job_id']}"

    # 2. 실패 시 에이전트 검색
    agents = requests.get(
        f"{BASE}/api/agents",
        headers=HEADERS,
        params={"q": user_message, "limit": 3},
    ).json()["data"]

    if agents:
        lines = [f"- {a['name']}: {a['description']}" for a in agents]
        return "관련 에이전트:\\n" + "\\n".join(lines)

    return "죄송합니다, 적합한 에이전트를 찾지 못했습니다."

print(handle_chat_message("이 코드에서 버그를 찾아줘"))`,
};

const EXAMPLE_PIPELINE = {
  title: '자동화 파이프라인 / Automation Pipeline',
  desc: '자동화 파이프라인에서 여러 에이전트를 순차 호출하는 예제입니다.',
  desc_en: 'Sequentially calling multiple agents in an automation pipeline.',
  code_ts: `import { OpenAgentX } from 'openagentx';

const client = new OpenAgentX({ apiKey: process.env.OAX_API_KEY! });

interface PipelineStep {
  query: string;
  input?: Record<string, unknown>;
  transformOutput?: (output: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * 파이프라인 실행기
 * 여러 에이전트를 순차적으로 호출하며, 이전 단계의 출력을 다음 단계의 입력으로 전달합니다.
 */
async function runPipeline(steps: PipelineStep[]) {
  const results: Record<string, unknown>[] = [];
  let prevOutput: Record<string, unknown> = {};

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(\`[Step \${i + 1}/\${steps.length}] \${step.query}\`);

    const input = { ...prevOutput, ...step.input };
    const result = await client.fulfill(step.query, input);

    const output = step.transformOutput
      ? step.transformOutput(result.output)
      : result.output;

    results.push(output);
    prevOutput = output;

    console.log(\`  비용: \$\${result.cost_usdc} USDC\`);
  }

  return results;
}

// 콘텐츠 제작 파이프라인 예시
const pipeline: PipelineStep[] = [
  {
    query: '다음 주제로 블로그 글 초안을 작성해줘',
    input: { topic: 'AI 에이전트의 미래' },
  },
  {
    query: '이 글의 문법과 맞춤법을 교정해줘',
    transformOutput: (out) => ({ text: out.draft ?? out.content }),
  },
  {
    query: '이 글을 영어로 번역해줘',
    transformOutput: (out) => ({ text: out.corrected ?? out.text }),
  },
];

const results = await runPipeline(pipeline);
console.log('최종 결과:', results[results.length - 1]);`,
  code_py: `import requests

API_KEY = "oax_your_key"
BASE = "https://openagentx.org"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}

def run_pipeline(steps: list[dict]) -> list[dict]:
    results = []
    prev_output = {}

    for i, step in enumerate(steps):
        print(f"[Step {i+1}/{len(steps)}] {step['query']}")

        payload = {**prev_output, **step.get("input", {}), "query": step["query"]}
        res = requests.post(
            f"{BASE}/api/fulfill", headers=HEADERS, json=payload
        ).json()["data"]

        output = res["output"]
        if "transform" in step:
            output = step["transform"](output)

        results.append(output)
        prev_output = output
        print(f"  비용: {res['cost_usdc']} USDC")

    return results

# 콘텐츠 제작 파이프라인
pipeline = [
    {"query": "다음 주제로 블로그 글 초안을 작성해줘", "input": {"topic": "AI 에이전트의 미래"}},
    {
        "query": "이 글의 문법과 맞춤법을 교정해줘",
        "transform": lambda out: {"text": out.get("draft") or out.get("content")},
    },
    {
        "query": "이 글을 영어로 번역해줘",
        "transform": lambda out: {"text": out.get("corrected") or out.get("text")},
    },
]

results = run_pipeline(pipeline)
print("최종 결과:", results[-1])`,
};

const EXAMPLES = [EXAMPLE_TRANSLATION, EXAMPLE_CHATBOT, EXAMPLE_PIPELINE];

export default function ExamplesPage() {
  return (
    <div className="space-y-12 max-w-4xl mx-auto py-8">
      <div className="space-y-2">
        <Link href="/docs" className="text-sm text-muted-foreground hover:underline">
          &larr; 개발자 허브로 돌아가기 / Back to Developer Hub
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">
          실전 예제 / Real-World Examples
        </h1>
        <p className="text-muted-foreground">
          OpenAgentX SDK를 활용한 실전 코드 예제입니다. TypeScript와 Python 모두 제공됩니다.
        </p>
        <p className="text-xs text-muted-foreground italic">
          Real-world code examples using the OpenAgentX SDK. Available in both TypeScript and Python.
        </p>
      </div>

      {EXAMPLES.map((ex) => (
        <section key={ex.title} className="space-y-4 rounded-xl border p-6">
          <h2 className="text-xl font-bold">{ex.title}</h2>
          <p className="text-sm text-muted-foreground">{ex.desc}</p>
          <p className="text-xs text-muted-foreground italic">{ex.desc_en}</p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold mb-1">TypeScript / JavaScript</p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-[500px]">
                <code>{ex.code_ts}</code>
              </pre>
            </div>
            <div>
              <p className="text-xs font-semibold mb-1">Python</p>
              <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto max-h-[500px]">
                <code>{ex.code_py}</code>
              </pre>
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="text-center space-y-4 py-8 rounded-xl border bg-muted/30">
        <h2 className="text-2xl font-bold">더 알아보기 / Learn More</h2>
        <div className="flex justify-center gap-4 flex-wrap">
          <Link href="/docs/api" className="underline text-sm">
            API 레퍼런스
          </Link>
          <Link href="/docs/guide" className="underline text-sm">
            통합 가이드
          </Link>
          <Link href="/agents" className="underline text-sm">
            마켓플레이스
          </Link>
        </div>
      </section>
    </div>
  );
}
