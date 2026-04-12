import { NextRequest } from 'next/server';
import { apiJson, apiCatchError } from '@/lib/utils/api-response';
import { requireUser } from '@/lib/auth/require-user';

// GET /api/me — current user id + role (null if not logged in)
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return apiJson({ data: null });
    }
    return apiJson({
      data: { id: user.userId, role: user.role },
    });
  } catch (err) {
    return apiCatchError(err, 500);
  }
}
