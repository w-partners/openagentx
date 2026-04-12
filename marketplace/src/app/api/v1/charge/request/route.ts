import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { createRequest } from '@/lib/db/repositories/topup';

const chargeSchema = z.object({
  amount: z.number().int().min(1000).max(1000000),
});

/**
 * POST /api/v1/charge/request — 계좌이체 충전 요청
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const body = await request.json();
    const parsed = chargeSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { amount } = parsed.data;

    const topupRequest = await createRequest(auth.userId, amount);

    return apiJson({
      data: {
        requestId: topupRequest.id,
        bankInfo: {
          bank: '카카오뱅크',
          account: '3333-25-0000000',
          holder: '카피라이트 쉐어',
        },
        amount,
        expectedPoints: amount, // 1원 = 1P
      },
    }, 201);
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
