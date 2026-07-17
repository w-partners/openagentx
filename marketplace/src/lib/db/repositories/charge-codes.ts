import { query, transaction } from '../pool';

/**
 * charge_codes 접근의 단일 창구.
 *
 * SSOT: 스키마 DDL 은 migrations/016_charge_codes.sql 한 곳에만 있다. 여기서 CREATE TABLE 하지 않는다.
 * 예전에는 ensureTable() 이 런타임에 인라인 생성했는데, 그러면 이 리포지토리를 거치지 않는
 * 소비처(관리자 라우트가 query() 로 직접 조회)에서 테이블이 없어 500 이 났다.
 * charge_codes 를 읽고 쓰는 모든 코드는 이 파일의 함수만 사용한다.
 */

export interface ChargeCode {
  id: string;
  code: string;
  points: number;
  status: string;
  used_by: string | null;
  used_at: Date | null;
  created_at: Date;
}

export interface ChargeCodeWithUser extends ChargeCode {
  used_by_email: string | null;
  used_by_nickname: string | null;
}

export const CHARGE_CODE_STATUSES = ['active', 'used'] as const;

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `CODE-${part()}-${part()}`;
}

/**
 * 충전 코드 목록 + 총 건수. status 가 'active' | 'used' 가 아니면 필터를 적용하지 않는다.
 */
export async function listCodes(opts: {
  status?: string | null;
  limit: number;
  offset: number;
}): Promise<{ items: ChargeCodeWithUser[]; total: number }> {
  const conditions = ['1=1'];
  const values: unknown[] = [];
  let idx = 1;

  if (opts.status && (CHARGE_CODE_STATUSES as readonly string[]).includes(opts.status)) {
    conditions.push(`cc.status = $${idx++}`);
    values.push(opts.status);
  }
  const where = conditions.join(' AND ');

  const [dataResult, countResult] = await Promise.all([
    query<ChargeCodeWithUser>(
      `SELECT cc.id, cc.code, cc.points, cc.status, cc.used_by, cc.used_at, cc.created_at,
              u.email as used_by_email, u.nickname as used_by_nickname
         FROM charge_codes cc
         LEFT JOIN users u ON u.id = cc.used_by
        WHERE ${where}
        ORDER BY cc.created_at DESC
        LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, opts.limit, opts.offset],
    ),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM charge_codes cc WHERE ${where}`, values),
  ]);

  return {
    items: dataResult.rows,
    total: parseInt(countResult.rows[0].count, 10),
  };
}

/**
 * 충전 코드 count 개 생성. 코드 중복(UNIQUE 위반) 시 재생성해 최대 3회 시도한다.
 * 실제로 생성된 코드만 반환하므로 호출부는 length 로 성공 건수를 안다.
 */
export async function createCodes(points: number, count: number): Promise<string[]> {
  const created: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = generateCode();
    for (let retry = 0; retry < 3; retry++) {
      try {
        await query('INSERT INTO charge_codes (code, points) VALUES ($1, $2)', [code, points]);
        created.push(code);
        break;
      } catch {
        code = generateCode();
      }
    }
  }
  return created;
}

/**
 * Redeem a charge code: mark as used, increase user balance, return points.
 */
export async function redeemCode(code: string, userId: string): Promise<{ points: number }> {
  return transaction(async (client) => {
    // Lock the code row
    const codeResult = await client.query<ChargeCode>(
      `SELECT * FROM charge_codes WHERE code = $1 AND status = 'active' FOR UPDATE`,
      [code],
    );
    if (codeResult.rows.length === 0) {
      throw new Error('유효하지 않거나 이미 사용된 충전 코드입니다');
    }

    const { id, points } = codeResult.rows[0];

    // Mark code as used
    await client.query(
      `UPDATE charge_codes SET status = 'used', used_by = $1, used_at = NOW() WHERE id = $2`,
      [userId, id],
    );

    // Increase user balance
    await client.query('UPDATE users SET balance_usdc = balance_usdc + $1 WHERE id = $2', [
      points,
      userId,
    ]);

    return { points };
  });
}
