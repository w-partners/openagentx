/**
 * PayApp 결제 모듈 (KRW 결제 게이트웨이)
 *
 * PayApp REST API 통합:
 * - 결제 요청 생성 (payrequest)
 * - 결제 콜백/피드백 처리
 * - 결제 상태 확인
 * - 결제 취소 (paycancel)
 *
 * @see https://docs.payapp.kr/dev_center01.html
 */

const PAYAPP_API_URL = 'https://api.payapp.kr/oapi/apiLoad.html';

// ─── Types ───────────────────────────────────────────────────

export interface PayAppConfig {
  userId: string;
  linkKey: string;
  linkVal: string;
  feedbackUrl?: string;
}

export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  productName: string;
  buyerName: string;
  buyerTel: string;
  returnUrl?: string;
  /** 허용 결제 수단: all, card, phone, kakaopay, naverpay 등 */
  payType?: string;
  /** 추가 메모 */
  memo?: string;
}

export interface CreatePaymentResult {
  mulNo: string;
  payUrl: string;
  qrUrl?: string;
}

export type PayState =
  | 1   // 결제 요청됨
  | 4   // 결제 완료
  | 8   // 요청 취소 (판매자)
  | 9   // 결제 취소/환불
  | 10  // 입금 대기 (가상계좌)
  | 32  // 요청 취소 (구매자)
  | 64  // 결제 취소
  | 70  // 부분 취소
  | 71; // 부분 취소

export interface FeedbackData {
  userid: string;
  linkkey: string;
  linkval: string;
  mul_no: string;
  price: string;
  pay_date?: string;
  pay_state: string;
  pay_type?: string;
  var1?: string;
  var2?: string;
  card_name?: string;
  payauthcode?: string;
  vbank?: string;
  vbankno?: string;
  depositor?: string;
  goodname?: string;
  recvphone?: string;
}

export interface CallbackResult {
  valid: boolean;
  mulNo: string;
  orderId: string;
  amount: number;
  payState: PayState;
  payDate: string | null;
  payType: string | null;
  cardName: string | null;
  authCode: string | null;
}

export interface CancelPaymentInput {
  mulNo: string;
  reason: string;
  /** 부분 취소 여부 */
  partial?: boolean;
  /** 부분 취소 금액 */
  cancelAmount?: number;
}

// ─── Config 로드 ─────────────────────────────────────────────

function getConfig(): PayAppConfig {
  const userId = process.env.PAYAPP_USER_ID;
  const linkKey = process.env.PAYAPP_LINK_KEY;
  const linkVal = process.env.PAYAPP_LINK_VAL;

  if (!userId || !linkKey || !linkVal) {
    throw new Error('PayApp 환경 변수가 설정되지 않았습니다 (PAYAPP_USER_ID, PAYAPP_LINK_KEY, PAYAPP_LINK_VAL)');
  }

  return {
    userId,
    linkKey,
    linkVal,
    feedbackUrl: process.env.PAYAPP_FEEDBACK_URL,
  };
}

// ─── 내부 HTTP 호출 ──────────────────────────────────────────

async function callPayAppApi(params: Record<string, string>): Promise<Record<string, string>> {
  const body = new URLSearchParams(params);

  const response = await fetch(PAYAPP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`PayApp API 호출 실패: HTTP ${response.status}`);
  }

  const text = await response.text();
  const result: Record<string, string> = {};
  for (const pair of text.split('&')) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      result[decodeURIComponent(pair.slice(0, eqIdx))] = decodeURIComponent(pair.slice(eqIdx + 1));
    }
  }

  return result;
}

// ─── 결제 요청 생성 ──────────────────────────────────────────

/**
 * PayApp 결제 요청을 생성합니다.
 * SMS를 통해 구매자에게 결제 링크가 발송됩니다.
 *
 * @returns mulNo (결제 번호), payUrl (결제 링크), qrUrl (QR 코드)
 */
export async function createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
  const cfg = getConfig();

  if (input.amount < 1000) {
    throw new Error('최소 결제 금액은 1,000원입니다');
  }

  if (!input.productName.trim()) {
    throw new Error('상품명은 필수입니다');
  }

  if (!input.buyerTel.trim()) {
    throw new Error('구매자 전화번호는 필수입니다');
  }

  const params: Record<string, string> = {
    cmd: 'payrequest',
    userid: cfg.userId,
    linkkey: cfg.linkKey,
    goodname: input.productName,
    price: String(input.amount),
    recvphone: input.buyerTel.replace(/[^0-9]/g, ''),
    var1: input.orderId,
    var2: input.buyerName,
    smsuse: 'y',
    checkretry: 'y',
  };

  if (cfg.feedbackUrl) {
    params.feedbackurl = cfg.feedbackUrl;
  }

  if (input.returnUrl) {
    params.returnurl = input.returnUrl;
  }

  if (input.payType) {
    params.openpaytype = input.payType;
  }

  if (input.memo) {
    params.memo = input.memo;
  }

  const result = await callPayAppApi(params);

  if (result.state !== '1') {
    const errMsg = result.errorMessage || '알 수 없는 오류';
    const errNo = result.errno || '';
    throw new Error(`PayApp 결제 요청 실패: ${errMsg} (코드: ${errNo})`);
  }

  return {
    mulNo: result.mul_no,
    payUrl: result.payurl,
    qrUrl: result.qrurl || undefined,
  };
}

// ─── 콜백(피드백) 처리 ──────────────────────────────────────

/**
 * PayApp 결제 결과 콜백(피드백)을 처리합니다.
 * userid, linkkey, linkval을 검증한 뒤 결제 정보를 반환합니다.
 *
 * 호출부에서 반드시 HTTP 200 + "SUCCESS" 응답을 반환해야 합니다.
 */
export function handleCallback(feedbackData: FeedbackData): CallbackResult {
  const cfg = getConfig();

  // 보안 검증: userid, linkkey, linkval 일치 확인
  const valid =
    feedbackData.userid === cfg.userId &&
    feedbackData.linkkey === cfg.linkKey &&
    feedbackData.linkval === cfg.linkVal;

  if (!valid) {
    return {
      valid: false,
      mulNo: feedbackData.mul_no ?? '',
      orderId: feedbackData.var1 ?? '',
      amount: 0,
      payState: 0 as PayState,
      payDate: null,
      payType: null,
      cardName: null,
      authCode: null,
    };
  }

  const payState = parseInt(feedbackData.pay_state, 10) as PayState;

  return {
    valid: true,
    mulNo: feedbackData.mul_no,
    orderId: feedbackData.var1 ?? '',
    amount: parseInt(feedbackData.price, 10),
    payState,
    payDate: feedbackData.pay_date ?? null,
    payType: feedbackData.pay_type ?? null,
    cardName: feedbackData.card_name ?? null,
    authCode: feedbackData.payauthcode ?? null,
  };
}

// ─── 결제 상태 확인 ──────────────────────────────────────────

/**
 * 결제 상태를 확인하는 헬퍼.
 * PayApp에는 별도의 상태 조회 API가 없으므로,
 * DB에 저장된 콜백 결과를 기반으로 판단합니다.
 *
 * pay_state 값 의미:
 * - 1: 결제 요청됨
 * - 4: 결제 완료
 * - 8, 32: 요청 취소
 * - 9, 64: 결제 취소/환불
 * - 10: 입금 대기 (가상계좌)
 * - 70, 71: 부분 취소
 */
export function resolvePayState(payState: number): {
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'waiting_deposit';
  label: string;
} {
  switch (payState) {
    case 1:
      return { status: 'pending', label: '결제 요청됨' };
    case 4:
      return { status: 'completed', label: '결제 완료' };
    case 8:
    case 32:
      return { status: 'cancelled', label: '요청 취소' };
    case 9:
    case 64:
      return { status: 'refunded', label: '결제 취소/환불' };
    case 10:
      return { status: 'waiting_deposit', label: '입금 대기' };
    case 70:
    case 71:
      return { status: 'refunded', label: '부분 취소' };
    default:
      return { status: 'pending', label: `알 수 없는 상태 (${payState})` };
  }
}

// ─── 결제 취소 ───────────────────────────────────────────────

/**
 * PayApp 결제를 취소합니다.
 * 전체 취소 또는 부분 취소를 지원합니다.
 */
export async function cancelPayment(input: CancelPaymentInput): Promise<void> {
  const cfg = getConfig();

  if (!input.mulNo) {
    throw new Error('결제 번호(mulNo)는 필수입니다');
  }

  if (!input.reason.trim()) {
    throw new Error('취소 사유는 필수입니다');
  }

  const params: Record<string, string> = {
    cmd: 'paycancel',
    userid: cfg.userId,
    linkkey: cfg.linkKey,
    mul_no: input.mulNo,
    cancelmemo: input.reason,
  };

  if (input.partial && input.cancelAmount) {
    params.partcancel = '1';
    params.cancelprice = String(input.cancelAmount);
  }

  const result = await callPayAppApi(params);

  if (result.state !== '1') {
    const errMsg = result.errorMessage || '알 수 없는 오류';
    throw new Error(`PayApp 결제 취소 실패: ${errMsg}`);
  }
}

// ─── pay_type 코드 → 이름 매핑 ──────────────────────────────

export function payTypeLabel(payType: string | null): string {
  if (!payType) return '알 수 없음';
  const map: Record<string, string> = {
    '1': '신용카드',
    '2': '휴대폰',
    '7': '가상계좌',
    '15': '카카오페이',
    '16': '네이버페이',
  };
  return map[payType] ?? `기타 (${payType})`;
}
