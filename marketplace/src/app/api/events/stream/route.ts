/**
 * GET /api/events/stream
 *
 * Postgres LISTEN 'entity_changes' 이벤트를 SSE 로 푸시한다.
 * - 인증 필수
 * - 30초 keepalive
 * - 클라이언트 disconnect 시 UNLISTEN + client.end()
 */
import { NextRequest } from 'next/server';
import { Client } from 'pg';
import { config } from '@/lib/config/env';
import { requireAuth, AuthError } from '@/lib/utils/api-response';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CHANNEL = 'entity_changes';

export async function GET(request: NextRequest) {
  // 인증
  let userId: string;
  try {
    userId = requireAuth(request);
  } catch (err) {
    if (err instanceof AuthError) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    throw err;
  }

  const encoder = new TextEncoder();

  // 전용 connection (pool 외부) — LISTEN 은 connection-bound
  const client = new Client({ connectionString: config.DATABASE_URL });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const safeEnqueue = (chunk: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          /* controller closed */
        }
      };

      const sendData = (payload: unknown) => {
        safeEnqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      const sendComment = (text: string) => {
        safeEnqueue(encoder.encode(`: ${text}\n\n`));
      };

      const cleanup = async () => {
        if (closed) return;
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        try {
          await client.query(`UNLISTEN ${CHANNEL}`);
        } catch {
          /* ignore */
        }
        try {
          await client.end();
        } catch {
          /* ignore */
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      try {
        await client.connect();
      } catch (err) {
        sendData({
          success: false,
          error: `DB connect 실패: ${(err as Error).message}`,
        });
        await cleanup();
        return;
      }

      client.on('notification', (msg) => {
        if (msg.channel !== CHANNEL || !msg.payload) return;
        try {
          const parsed = JSON.parse(msg.payload);
          sendData({ success: true, event: parsed });
        } catch {
          sendData({ success: true, event: { raw: msg.payload } });
        }
      });

      client.on('error', (err) => {
        sendData({ success: false, error: `pg client error: ${err.message}` });
        void cleanup();
      });

      try {
        await client.query(`LISTEN ${CHANNEL}`);
      } catch (err) {
        sendData({
          success: false,
          error: `LISTEN 실패: ${(err as Error).message}`,
        });
        await cleanup();
        return;
      }

      // ready 이벤트
      sendData({ success: true, event: { type: 'ready', user_id: userId, channel: CHANNEL } });

      // 30초 heartbeat
      heartbeat = setInterval(() => sendComment('keepalive'), 30_000);

      // disconnect 처리
      const signal = request.signal;
      if (signal.aborted) {
        await cleanup();
        return;
      }
      signal.addEventListener('abort', () => {
        void cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
