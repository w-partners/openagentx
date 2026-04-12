import { NextRequest } from 'next/server';

export interface PartnerInfo {
  valid: boolean;
  partner?: string;
}

/**
 * 파트너 API 키를 검증합니다.
 * X-Partner-Key 헤더 또는 Authorization Bearer 토큰에서 키를 추출합니다.
 */
export function validatePartnerKey(request: NextRequest): PartnerInfo {
  const key =
    request.headers.get('X-Partner-Key') ||
    request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!key) return { valid: false };

  const expectedKey = process.env.PARTNER_API_KEY;
  if (!expectedKey) return { valid: false };

  if (key === expectedKey) {
    return { valid: true, partner: 'platformmakers' };
  }

  return { valid: false };
}
