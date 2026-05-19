/**
 * lib/email/send.ts — Email send stub.
 *
 * Beta: SMTP/SES 미구현. console.log fallback으로 ADMIN_EMAIL 알림 등 흐름 유지.
 * GA: SMTP(nodemailer) 또는 SES 실제 발송.
 *
 * 사용처:
 *   - api/disputes (분쟁 신청 → ADMIN_EMAIL 알림)
 *   - 회원가입 verification code (Beta — auth-codes 패턴)
 *
 * 활성화 시 PRD-OpenAgentX §4.11 GA 단계.
 */

export interface EmailMessage {
  to: string;
  subject?: string;
  body?: string;
  html?: string;
  text?: string;
  template?: string;
  data?: Record<string, unknown>;
  [k: string]: unknown;
}

export interface SendResult {
  ok: boolean;
  stub?: boolean;
  id?: string;
  error?: string;
}

/**
 * Send an email. Currently console.log stub.
 */
export async function sendEmail(msg: EmailMessage): Promise<SendResult> {
  const id = `stub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log('[email/stub]', JSON.stringify({ id, to: msg.to, subject: msg.subject, template: msg.template }));
  return { ok: true, stub: true, id };
}

// Common alias used by some routes
export const send = sendEmail;

/**
 * sendMail — disputes/route.ts 등이 import { sendMail } 패턴으로 호출.
 * 가벼운 wrapper: { to, subject, text } → sendEmail({to, subject, text}).
 */
export async function sendMail(args: {
  to: string;
  subject: string;
  text: string;
}): Promise<void> {
  await sendEmail({ to: args.to, subject: args.subject, text: args.text });
}

export default sendEmail;
