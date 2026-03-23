import { NextRequest } from 'next/server';
import { z } from 'zod';
import * as apiKeysRepo from '@/lib/db/repositories/api-keys';
import { processApiKeyBonus } from '@/lib/db/repositories/rewards';
import { apiJson, apiCatchError, requireAuth, AuthError } from '@/lib/utils/api-response';

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// POST /api/keys — Generate a new API key
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const parsed = createKeySchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    // 기존 키가 있는지 확인 (첫 키 여부 판단)
    const existingKeys = await apiKeysRepo.listKeys(userId);
    const isFirstKey = existingKeys.length === 0;

    const { rawKey, record } = await apiKeysRepo.createKey(userId, parsed.data.name);

    // 첫 API 키 발급 시 무료 크레딧 지급
    let apiKeyBonus = 0;
    if (isFirstKey) {
      apiKeyBonus = await processApiKeyBonus(userId).catch(() => 0);
    }

    return apiJson({
      data: {
        id: record.id,
        name: record.name,
        key: rawKey,
        key_prefix: record.key_prefix,
        created_at: record.created_at,
        ...(apiKeyBonus > 0 ? { bonus_credited: apiKeyBonus } : {}),
      },
      message: isFirstKey && apiKeyBonus > 0
        ? `API 키가 생성되었습니다. 첫 키 발급 보너스 $${apiKeyBonus}가 지급되었습니다. 이 키는 다시 표시되지 않습니다.`
        : 'API 키가 생성되었습니다. 이 키는 다시 표시되지 않습니다.',
    }, 201);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err);
  }
}

// GET /api/keys — List user's API keys
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const keys = await apiKeysRepo.listKeys(userId);
    return apiJson({ data: keys });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err);
  }
}

// DELETE /api/keys?id=xxx — Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const keyId = request.nextUrl.searchParams.get('id');
    if (!keyId) {
      return apiJson({ error: 'id 파라미터가 필요합니다' }, 400);
    }

    const revoked = await apiKeysRepo.revokeKey(keyId, userId);
    if (!revoked) {
      return apiJson({ error: '키를 찾을 수 없거나 이미 폐기되었습니다' }, 404);
    }

    return apiJson({ message: 'API 키가 폐기되었습니다' });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiCatchError(err);
  }
}
