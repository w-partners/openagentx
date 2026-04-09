/**
 * AgentBuilder — 에이전트를 만드는 에이전트
 * GitHub URL, 문서, 설명을 분석하여 새 에이전트를 자동 생성
 */
import { generateResponse } from '../ai/fallback-chain';
import { query } from '../db/pool';

export interface AgentBuildInput {
  title: string;
  description: string;
  source_urls?: string[];
  attachments?: { type: string; url: string; name: string }[];
  category?: string;
  urgency?: string;
}

export interface AgentBuildResult {
  agent_name: string;
  agent_description: string;
  agent_description_ko: string;
  category: string;
  tags: string[];
  system_prompt: string;
  services: { name: string; description: string; price: number }[];
  estimated_complexity: 'simple' | 'moderate' | 'complex';
  build_notes: string;
}

const AGENT_BUILDER_SYSTEM_PROMPT = `You are AgentBuilder, a specialized AI that designs and creates other AI agents.

Your job is to analyze the provided materials (GitHub URLs, documentation, descriptions) and generate a complete AI agent specification.

You MUST respond with valid JSON only, no markdown fencing, no explanation outside JSON.

JSON schema:
{
  "agent_name": "string (concise English name)",
  "agent_description": "string (English, 2-3 sentences)",
  "agent_description_ko": "string (Korean translation of description)",
  "category": "string (one of: coding, data_analysis, content_creation, translation, marketing, customer_service, research, finance, crypto, design, education, automation)",
  "tags": ["string array, 3-7 relevant tags"],
  "system_prompt": "string (the system prompt for the new agent, detailed and specific)",
  "services": [
    {
      "name": "string (service name)",
      "description": "string (what this service does)",
      "price": number (in points, 100 points = $1)
    }
  ],
  "estimated_complexity": "simple | moderate | complex",
  "build_notes": "string (Korean, notes about what was analyzed and any caveats)"
}

Guidelines:
- Analyze source URLs deeply — understand the project's purpose, tech stack, features
- Create a system_prompt that makes the agent an expert in the analyzed domain
- Price services based on complexity: simple tasks $0.5-5, moderate $5-20, complex $20-100
- Include 2-5 services per agent, from basic to advanced
- Tags should help users find this agent
- build_notes should explain what you found and any limitations`;

/**
 * GitHub URL에서 README 내용을 가져오기
 */
async function fetchGithubReadme(url: string): Promise<string | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    const [, owner, repo] = match;

    const res = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo.replace(/\.git$/, '')}/main/README.md`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (res.ok) return (await res.text()).slice(0, 8000);

    const res2 = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo.replace(/\.git$/, '')}/master/README.md`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (res2.ok) return (await res2.text()).slice(0, 8000);

    return null;
  } catch {
    return null;
  }
}

/**
 * GitHub repo 정보 가져오기 (API)
 */
async function fetchGithubRepoInfo(url: string): Promise<string | null> {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (!match) return null;
    const [, owner, repo] = match;

    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, '')}`,
      {
        headers: { Accept: 'application/vnd.github.v3+json' },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return JSON.stringify({
      name: data.name,
      description: data.description,
      language: data.language,
      topics: data.topics,
      stars: data.stargazers_count,
      forks: data.forks_count,
    });
  } catch {
    return null;
  }
}

/**
 * 일반 URL에서 텍스트 내용 가져오기
 */
async function fetchUrlContent(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 5000);
  } catch {
    return null;
  }
}

/**
 * 소스 URL들의 내용을 수집
 */
async function gatherSourceContent(input: AgentBuildInput): Promise<string> {
  const parts: string[] = [];

  parts.push(`## 요청 제목: ${input.title}`);
  parts.push(`## 설명:\n${input.description}`);

  if (input.category) parts.push(`## 선호 카테고리: ${input.category}`);
  if (input.urgency) parts.push(`## 긴급도: ${input.urgency}`);

  if (input.source_urls && input.source_urls.length > 0) {
    for (const url of input.source_urls.slice(0, 5)) {
      if (url.includes('github.com')) {
        const readme = await fetchGithubReadme(url);
        const repoInfo = await fetchGithubRepoInfo(url);
        if (repoInfo) parts.push(`## GitHub Repo Info (${url}):\n${repoInfo}`);
        if (readme) parts.push(`## GitHub README (${url}):\n${readme}`);
      } else {
        const content = await fetchUrlContent(url);
        if (content) parts.push(`## URL Content (${url}):\n${content}`);
      }
    }
  }

  if (input.attachments && input.attachments.length > 0) {
    parts.push(`## 첨부자료:`);
    for (const att of input.attachments) {
      parts.push(`- ${att.name} (${att.type}): ${att.url}`);
    }
  }

  return parts.join('\n\n');
}

/**
 * AgentBuilder 메인 실행 함수
 */
export async function buildAgent(input: AgentBuildInput): Promise<{
  spec: AgentBuildResult;
  agentId: string | null;
  provider: string;
  processingMs: number;
}> {
  const start = Date.now();

  // 1. 소스 내용 수집
  const sourceContent = await gatherSourceContent(input);

  // 2. AI로 에이전트 스펙 생성
  const { text, provider } = await generateResponse({
    systemPrompt: AGENT_BUILDER_SYSTEM_PROMPT,
    userMessage: sourceContent,
    maxTokens: 4096,
  });

  // 3. JSON 파싱
  let spec: AgentBuildResult;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    spec = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error(`AI 응답을 파싱할 수 없습니다: ${text.slice(0, 200)}`);
  }

  // 4. 생성된 에이전트를 DB에 등록
  let agentId: string | null = null;
  try {
    const slug =
      spec.agent_name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .slice(0, 80) +
      '-' +
      Date.now().toString(36);

    const result = await query<{ id: string }>(
      `INSERT INTO agents (
        owner_id, name, slug, description, description_ko, category, tags,
        status, commission_rate, ranking_score, metadata
      ) VALUES (
        (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
        $1, $2, $3, $4, $5, $6,
        'active', 0, 0,
        $7::jsonb
      ) RETURNING id`,
      [
        spec.agent_name,
        slug,
        spec.agent_description,
        spec.agent_description_ko,
        spec.category,
        spec.tags,
        JSON.stringify({
          system_prompt: spec.system_prompt,
          built_by: 'AgentBuilder',
          source: input.source_urls,
        }),
      ],
    );
    agentId = result.rows[0].id;

    // 서비스 등록
    for (const svc of spec.services) {
      await query(
        `INSERT INTO agent_services (agent_id, name, description, price_usdc, input_schema, is_active)
         VALUES ($1, $2, $3, $4, '{}'::jsonb, true)`,
        [agentId, svc.name, svc.description, svc.price / 100],
      );
    }
  } catch (dbErr) {
    console.error('AgentBuilder DB registration error:', dbErr);
  }

  // 5. Discord 알림
  const BOT =
    'MTQ4NDYxNTE3NjM4Nzk1NjgzNw.GAdcn_.0PMhwZ3KTZ7gJbYeFLSWfTPFqImSFyEyzVxfe8';
  fetch('https://discord.com/api/v10/channels/1486732103910690928/messages', {
    method: 'POST',
    headers: {
      Authorization: `Bot ${BOT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `🤖 **AgentBuilder 완료**: ${spec.agent_name}\n카테고리: ${spec.category} | 복잡도: ${spec.estimated_complexity}\n서비스: ${spec.services.map((s) => s.name).join(', ')}\n${agentId ? `에이전트 ID: ${agentId}` : '(DB 등록 실패)'}`,
    }),
  }).catch(() => {});

  return {
    spec,
    agentId,
    provider,
    processingMs: Date.now() - start,
  };
}
