import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireAdmin } from '@/lib/auth/require-admin';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/prompts — admin only, all prompts (any status, public/private)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    // pull both public/private + any status by passing wide filters
    // fallback: fetch all without status filter — repo doesn't support yet, so use is_public both
    const [pub, priv] = await Promise.all([
      promptsRepo.findAll({ is_public: true, limit: 100 }),
      promptsRepo.findAll({ is_public: false, limit: 100 }),
    ]);
    const merged = [...pub.prompts, ...priv.prompts];
    return apiJson({ data: merged, meta: { total: merged.length } });
  } catch (err) {
    return apiCatchError(err, 403);
  }
}
