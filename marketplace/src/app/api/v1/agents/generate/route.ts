import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { callGeminiProxy } from '@/lib/ai/gemini-proxy';

const generateSchema = z.object({
  description: z.string().min(1),
  githubRepo: z.string().max(500).optional(),
  referenceUrls: z.array(z.string()).optional(),
});

/**
 * POST /api/v1/agents/generate — AI가 에이전트 초안 자동 생성
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { description, githubRepo, referenceUrls } = parsed.data;

    const systemPrompt = `당신은 AI 에이전트 설계 전문가입니다. 사용자의 설명과 참고자료를 분석하여 에이전트 초안을 생성합니다.
반드시 아래 JSON 형식으로만 응답하세요:
{
  "name": "에이전트 이름 (한국어, 50자 이내)",
  "description": "에이전트 설명 (한국어, 200자 이내)",
  "systemPrompt": "에이전트가 사용할 시스템 프롬프트 (한국어, 상세하게)",
  "category": "카테고리 (general|content|analysis|marketing|coding|data|translation|automation 중 하나)",
  "tags": ["관련", "태그", "목록"],
  "capabilities": ["기능1", "기능2", "기능3"],
  "sampleInput": "예시 입력",
  "sampleOutput": "예시 출력"
}`;

    let userContent = `에이전트 설명: ${description}`;
    if (githubRepo) userContent += `\nGitHub 레포: ${githubRepo}`;
    if (referenceUrls?.length) userContent += `\n참고 URL: ${referenceUrls.join(', ')}`;

    const content = await callGeminiProxy([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ]);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다');
    const draft = JSON.parse(jsonMatch[0]);

    return apiJson({
      data: {
        draft: {
          name: draft.name ?? '새 에이전트',
          description: draft.description ?? description,
          systemPrompt: draft.systemPrompt ?? '',
          category: draft.category ?? 'general',
          tags: draft.tags ?? [],
          capabilities: draft.capabilities ?? [],
          sampleInput: draft.sampleInput ?? '',
          sampleOutput: draft.sampleOutput ?? '',
        },
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-API-Key',
    },
  });
}
