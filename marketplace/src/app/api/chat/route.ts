import { NextRequest } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { apiJson, apiError } from '@/lib/utils/api-response';
import * as chatProfilesRepo from '@/lib/db/repositories/chat-profiles';
import { transaction } from '@/lib/db/pool';
import { chat } from '@/lib/chat/engine';

const SALT_ROUNDS = 10;
const SIGNUP_BONUS = 2.0;

const bootstrapSchema = z.object({
  action: z.literal('bootstrap'),
  name: z.string().min(1).max(100),
  passcode: z.string().regex(/^\d{4,6}$/, '4~6자리 숫자만 가능합니다'),
  mode: z.enum(['user', 'provider', 'both']),
});

const messageSchema = z.object({
  action: z.literal('message'),
  profileId: z.string().uuid(),
  message: z.string().min(1).max(5000),
});

const loginSchema = z.object({
  action: z.literal('login'),
  profileId: z.string().uuid(),
  passcode: z.string().min(4).max(6),
});

// GET /api/chat — get chat history
export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get('profileId');
  if (!profileId) return apiError('profileId가 필요합니다');

  const profile = await chatProfilesRepo.findById(profileId);
  if (!profile) return apiError('프로필을 찾을 수 없습니다', 404);

  const history = await chatProfilesRepo.getHistory(profileId, 50);
  return apiJson({
    data: {
      profileId: profile.id,
      displayName: profile.display_name,
      mode: profile.user_mode,
      onboardingCompleted: profile.onboarding_completed,
      history,
    },
  });
}

// POST /api/chat — action-based routing
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError('잘못된 요청 형식입니다');
  }

  const action = body.action as string;

  // --- Bootstrap: create profile ---
  if (action === 'bootstrap') {
    const parsed = bootstrapSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { name, passcode, mode } = parsed.data;

    // Check if name already exists
    const existing = await chatProfilesRepo.findByName(name);
    if (existing) {
      return apiJson({ success: false, error: 'name_taken', message: '이미 사용 중인 이름입니다.' }, 400);
    }

    // Hash passcode
    const passcodeHash = await bcrypt.hash(passcode, SALT_ROUNDS);

    // Create user account + profile in transaction
    const result = await transaction(async (client) => {
      // Create user account
      const nickname = name;
      const userResult = await client.query<{ id: string }>(
        `INSERT INTO users (nickname, role, balance_usdc, is_verified)
         VALUES ($1, 'buyer', $2, TRUE)
         RETURNING id`,
        [nickname, SIGNUP_BONUS],
      );
      const userId = userResult.rows[0].id;

      // Generate referral code
      const code = generateReferralCode();
      await client.query(
        `INSERT INTO referral_codes (user_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [userId, code],
      );

      // Create chat profile
      const profileResult = await client.query<{ id: string }>(
        `INSERT INTO chat_profiles (user_id, display_name, gemini_key_encrypted, passcode_hash, user_mode, onboarding_completed)
         VALUES ($1, $2, '', $3, $4, TRUE)
         RETURNING id`,
        [userId, name, passcodeHash, mode],
      );

      return { profileId: profileResult.rows[0].id, userId };
    });

    return apiJson({
      data: {
        profileId: result.profileId,
        userId: result.userId,
        displayName: name,
        mode,
        signupBonus: SIGNUP_BONUS,
      },
    }, 201);
  }

  // --- Login: verify passcode ---
  if (action === 'login') {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { profileId, passcode } = parsed.data;
    const profile = await chatProfilesRepo.findById(profileId);
    if (!profile) return apiError('프로필을 찾을 수 없습니다', 404);

    const valid = await bcrypt.compare(passcode, profile.passcode_hash);
    if (!valid) {
      return apiJson({ success: false, error: 'invalid_passcode', message: '패스코드가 틀렸습니다.' }, 401);
    }

    const history = await chatProfilesRepo.getHistory(profileId, 50);
    return apiJson({
      data: {
        profileId: profile.id,
        displayName: profile.display_name,
        mode: profile.user_mode,
        authenticated: true,
        history,
      },
    });
  }

  // --- Message: chat with AI ---
  if (action === 'message') {
    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message);
    }

    const { profileId, message } = parsed.data;

    try {
      const response = await chat(profileId, message);
      return apiJson({ data: { response } });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '알 수 없는 오류';
      return apiError(`AI 응답 오류: ${msg}`, 500);
    }
  }

  return apiError('올바른 action을 지정해주세요 (bootstrap, login, message)');
}

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'OAX-';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
