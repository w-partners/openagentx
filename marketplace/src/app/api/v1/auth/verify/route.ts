import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { verifyAuthCode } from '@/lib/db/repositories/auth-codes';

const verifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

/**
 * POST /api/v1/auth/verify — 인증코드 확인 + API Key 자동 발급
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const result = await verifyAuthCode(parsed.data.email, parsed.data.code);

    return apiJson({
      data: {
        apiKey: result.apiKey,
        userId: result.userId,
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
