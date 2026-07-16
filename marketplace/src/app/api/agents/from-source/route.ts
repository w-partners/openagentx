/**
 * POST /api/agents/from-source
 *
 * 자료(URL/텍스트/코드)를 첨부받아 Claude로 분석한 뒤
 * agents + agent_services 를 자동 부트스트랩한다.
 *
 * Body:
 *   {
 *     source_type: 'url' | 'text' | 'code' | 'image' | 'pdf',
 *     source_data: string,
 *     hints?: { name?, category?, tags?[] }
 *   }
 *
 * v1: image/pdf 미지원 (400)
 */
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { transaction } from '@/lib/db/pool';
import { runClaude } from '@/lib/partner/claude-runner';
import { apiJson, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  source_type: z.enum(['url', 'text', 'code', 'image', 'pdf']),
  source_data: z.string().min(1).max(200_000),
  hints: z
    .object({
      name: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

const SYSTEM_PROMPT = `아래 자료를 분석해 OpenAgentX 마켓에 등록할 에이전트 사양을 JSON으로 반환하라.
필수 필드: name, slug(영문 kebab), description, description_ko, category, tags(배열), system_prompt(에이전트 역할), services(배열, 각 {name, name_ko, description, description_ko, price_usdc(0.5~10), input_schema(object), output_schema(object)}).
JSON만 출력. 마크다운 코드블록 사용 금지.`;

const MAX_FETCH_BYTES = 8 * 1024;

async function fetchAndExtractText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'OpenAgentX-Bootstrap/1.0' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`URL fetch 실패: HTTP ${res.status}`);
  const html = await res.text();

  // 매우 단순한 본문 추출: <p>, <h*> 만 모음
  const blocks: string[] = [];
  const re = /<(p|h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const text = m[2]
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text) blocks.push(text);
    if (blocks.join('\n').length > MAX_FETCH_BYTES) break;
  }
  let body = blocks.join('\n').slice(0, MAX_FETCH_BYTES);
  if (!body) {
    // 최후의 수단: 태그 제거 후 cap
    body = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_FETCH_BYTES);
  }
  return body;
}

function parseJsonFromText(raw: string): unknown {
  const s = raw.trim();
  // 코드블록 안에 있으면 추출
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : s;
  // 첫 { 부터 마지막 } 까지
  const first = candidate.indexOf('{');
  const last = candidate.lastIndexOf('}');
  if (first === -1 || last === -1) throw new Error('JSON 객체를 찾을 수 없음');
  return JSON.parse(candidate.slice(first, last + 1));
}

function toKebab(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60) || 'agent';
}

interface AgentSpecService {
  name?: string;
  name_ko?: string;
  description?: string;
  description_ko?: string;
  price_usdc?: number;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
}

interface AgentSpec {
  name?: string;
  slug?: string;
  description?: string;
  description_ko?: string;
  category?: string;
  tags?: string[];
  system_prompt?: string;
  services?: AgentSpecService[];
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }
    const { source_type, source_data, hints } = parsed.data;

    if (source_type === 'image' || source_type === 'pdf') {
      return apiJson(
        { error: `source_type "${source_type}" 는 v1에서 지원 예정입니다 (텍스트/URL만 사용)` },
        400,
      );
    }

    let sourceText: string;
    if (source_type === 'url') {
      try {
        sourceText = await fetchAndExtractText(source_data);
      } catch (err) {
        return apiJson(
          { error: `URL 처리 실패: ${(err as Error).message}` },
          400,
        );
      }
      if (!sourceText) return apiJson({ error: 'URL 본문을 추출할 수 없음' }, 400);
    } else {
      sourceText = source_data.slice(0, MAX_FETCH_BYTES);
    }

    // hints 가 있으면 모델에 힌트 주입
    let inputForModel = sourceText;
    if (hints && (hints.name || hints.category || (hints.tags?.length ?? 0) > 0)) {
      const hintLines: string[] = [];
      if (hints.name) hintLines.push(`힌트 name: ${hints.name}`);
      if (hints.category) hintLines.push(`힌트 category: ${hints.category}`);
      if (hints.tags?.length) hintLines.push(`힌트 tags: ${hints.tags.join(', ')}`);
      inputForModel = `${hintLines.join('\n')}\n\n---\n\n${sourceText}`;
    }

    const rawOutput = await runClaude({
      systemPrompt: SYSTEM_PROMPT,
      input: inputForModel,
      model: 'sonnet',
      maxTurns: 3,
      timeoutMs: 180_000,
    });

    let spec: AgentSpec;
    try {
      spec = parseJsonFromText(rawOutput) as AgentSpec;
    } catch (err) {
      return apiJson(
        {
          error: `에이전트 사양 JSON 파싱 실패: ${(err as Error).message}`,
          raw_output: rawOutput.slice(0, 500),
        },
        502,
      );
    }

    // 필수 필드 보정
    const name = (spec.name ?? hints?.name ?? '신규 에이전트').slice(0, 100);
    const description = (spec.description ?? '자동 생성된 에이전트').slice(0, 5000);
    const description_ko = spec.description_ko ?? null;
    const category = spec.category ?? hints?.category ?? 'general';
    const tags = Array.isArray(spec.tags)
      ? spec.tags.map(String).slice(0, 20)
      : hints?.tags ?? [];
    const systemPromptVal = spec.system_prompt ?? `당신은 ${name} 입니다.`;

    // slug: spec → 없으면 name 변환, 항상 timestamp 접미
    const baseSlug = toKebab(spec.slug ?? name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // metadata 에 system_prompt 저장 (invoke 라우트에서 사용)
    const metadata = {
      system_prompt: systemPromptVal,
      bootstrap: { source_type, hints: hints ?? null },
    };

    // INSERT (트랜잭션)
    const inserted = await transaction(async (client) => {
      const agentRow = await client.query<{ id: string }>(
        `INSERT INTO agents
           (owner_id, name, slug, description, description_ko, category, tags,
            commission_rate, ranking_score, status, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0, 'pending', $8::jsonb)
         RETURNING id`,
        [
          userId,
          name,
          slug,
          description,
          description_ko,
          category,
          tags,
          JSON.stringify(metadata),
        ],
      );
      const agentId = agentRow.rows[0].id;

      const services: { id: string; name: string }[] = [];
      const specServices = Array.isArray(spec.services) ? spec.services : [];
      // 최소 한 개의 default service 보장
      const safeServices: AgentSpecService[] =
        specServices.length > 0
          ? specServices
          : [
              {
                name: 'default',
                description: description.slice(0, 500),
                price_usdc: 1,
                input_schema: { type: 'object', properties: { input: { type: 'string' } } },
                output_schema: { type: 'object', properties: { output: { type: 'string' } } },
              },
            ];

      for (const svc of safeServices.slice(0, 10)) {
        const svcName = (svc.name ?? 'service').slice(0, 100);
        const svcDesc = (svc.description ?? svcName).slice(0, 5000);
        const priceRaw = Number(svc.price_usdc ?? 1);
        const price = Math.min(Math.max(isFinite(priceRaw) ? priceRaw : 1, 0.5), 10);
        const inputSchema =
          svc.input_schema && typeof svc.input_schema === 'object'
            ? svc.input_schema
            : { type: 'object', properties: { input: { type: 'string' } } };
        const outputSchema =
          svc.output_schema && typeof svc.output_schema === 'object'
            ? svc.output_schema
            : { type: 'object', properties: { output: { type: 'string' } } };

        const r = await client.query<{ id: string; name: string }>(
          `INSERT INTO agent_services
             (agent_id, name, name_ko, description, description_ko,
              price_usdc, input_schema, output_schema, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, TRUE)
           RETURNING id, name`,
          [
            agentId,
            svcName,
            svc.name_ko ?? null,
            svcDesc,
            svc.description_ko ?? null,
            price,
            JSON.stringify(inputSchema),
            JSON.stringify(outputSchema),
          ],
        );
        services.push(r.rows[0]);
      }

      return { id: agentId, slug, services };
    });

    return apiJson({ data: inserted }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err, 500);
  }
}
