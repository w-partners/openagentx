import { NextRequest } from 'next/server';
import { apiJson, requireAuth, AuthError } from '@/lib/utils/api-response';
import { toErrorMessage } from '@/lib/utils/constants';
import { verificationCodes } from '@/lib/telegram/bot';
import { createLink, findLinkByUserId, findLinkByChatId } from '@/lib/telegram/notifications';
import { query } from '@/lib/db/pool';

// POST /api/telegram/link
// action=generate-code: Generate a 6-digit verification code
// action=verify: Verify code and link telegram account
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const body = await request.json();
    const action = body.action as string;

    if (action === 'generate-code') {
      // Generate verification code for the user
      const code = String(Math.floor(100000 + Math.random() * 900000));

      // Get user email for display
      const userResult = await query<{ email: string; name: string }>(
        'SELECT email, name FROM users WHERE id = $1',
        [userId],
      );
      if (userResult.rows.length === 0) {
        return apiJson({ error: '사용자를 찾을 수 없습니다' }, 404);
      }

      verificationCodes.set(code, {
        userId,
        email: userResult.rows[0].email,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      });

      // Clean expired codes
      for (const [k, v] of verificationCodes.entries()) {
        if (v.expiresAt < Date.now()) verificationCodes.delete(k);
      }

      return apiJson({
        data: {
          code,
          expires_in: 600,
          instructions: '텔레그램 봇에서 /link ' + code + ' 를 입력하세요.',
        },
      });
    }

    if (action === 'verify') {
      // Verify code + chatId and link
      const { code, chat_id } = body as { code: string; chat_id: string };

      if (!code || !chat_id) {
        return apiJson({ error: 'code와 chat_id가 필요합니다' }, 400);
      }

      const stored = verificationCodes.get(code);
      if (!stored || stored.expiresAt < Date.now()) {
        return apiJson({ error: '유효하지 않거나 만료된 인증 코드입니다' }, 400);
      }

      if (stored.userId !== userId) {
        return apiJson({ error: '인증 코드가 일치하지 않습니다' }, 400);
      }

      await createLink(userId, chat_id, undefined);
      verificationCodes.delete(code);

      return apiJson({
        data: { linked: true, message: '텔레그램 연결 완료' },
      });
    }

    return apiJson({ error: '알 수 없는 action입니다. generate-code 또는 verify를 사용하세요.' }, 400);
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiJson({ error: toErrorMessage(err) }, 400);
  }
}

// GET /api/telegram/link — Check link status
export async function GET(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    const link = await findLinkByUserId(userId);

    return apiJson({
      data: {
        linked: !!link,
        telegram_chat_id: link?.telegram_chat_id ?? null,
        notifications_enabled: link?.notifications_enabled ?? false,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return apiJson({ error: err.message }, 401);
    return apiJson({ error: toErrorMessage(err) }, 400);
  }
}
