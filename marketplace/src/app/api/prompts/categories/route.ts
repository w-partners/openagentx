import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import * as promptsRepo from '@/lib/db/repositories/prompts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/prompts/categories — 카테고리 + 카운트 목록
 */
export async function GET() {
  try {
    const cats = await promptsRepo.listCategories();
    return apiJson({ data: cats });
  } catch (err) {
    return apiCatchError(err, 400);
  }
}
