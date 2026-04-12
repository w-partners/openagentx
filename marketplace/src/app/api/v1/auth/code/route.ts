import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { createAuthCode } from '@/lib/db/repositories/auth-codes';

const codeSchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/v1/auth/code — 인증코드 발송
 * 6자리 인증코드를 생성하여 DB에 저장 (이메일 발송은 TODO)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = codeSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { expiresIn } = await createAuthCode(parsed.data.email);

    return apiJson({
      data: {
        sent: true,
        expiresIn,
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
