import { NextRequest } from 'next/server';
import { z } from 'zod';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';
import { createUserKey, listUserKeys, deleteUserKey } from '@/lib/db/repositories/user-api-keys';

const createSchema = z.object({
  name: z.string().min(1).max(100),
});

const deleteSchema = z.object({
  keyId: z.string().uuid(),
});

/**
 * POST /api/user/api-keys — API Key 생성
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return apiJson({ error: '인증이 필요합니다' }, 401);
    }

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const { rawKey, record } = await createUserKey(user.userId, parsed.data.name);

    return apiJson({
      data: {
        apiKey: rawKey,
        id: record.id,
        name: record.name,
        prefix: record.key_prefix,
        createdAt: record.created_at,
      },
    }, 201);
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

/**
 * GET /api/user/api-keys — API Key 목록 조회
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return apiJson({ error: '인증이 필요합니다' }, 401);
    }

    const keys = await listUserKeys(user.userId);

    return apiJson({
      data: {
        keys: keys.map((k) => ({
          id: k.id,
          name: k.name,
          prefix: `${k.key_prefix}...`,
          lastUsedAt: k.last_used_at,
          createdAt: k.created_at,
        })),
      },
    });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}

/**
 * DELETE /api/user/api-keys — API Key 삭제
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return apiJson({ error: '인증이 필요합니다' }, 401);
    }

    const body = await request.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return apiJson({ error: parsed.error.issues[0].message }, 400);
    }

    const deleted = await deleteUserKey(parsed.data.keyId, user.userId);
    if (!deleted) {
      return apiJson({ error: 'API Key를 찾을 수 없습니다' }, 404);
    }

    return apiJson({ message: 'API Key가 삭제되었습니다' });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
