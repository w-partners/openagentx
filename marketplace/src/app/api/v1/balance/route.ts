import { NextRequest, NextResponse } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { validateUserApiKey } from '@/lib/auth/api-key-auth';
import { getBalance } from '@/lib/db/repositories/users';

/**
 * GET /api/v1/balance — API Key 인증으로 잔액 확인
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateUserApiKey(request);
    if (!auth.valid || !auth.userId) {
      return apiJson({ error: '유효하지 않은 API Key입니다' }, 401);
    }

    const balance = await getBalance(auth.userId);

    return apiJson({
      data: {
        balance,
        currency: 'P',
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
