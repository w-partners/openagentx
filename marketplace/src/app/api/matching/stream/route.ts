import { NextRequest } from 'next/server';
import * as matchingRepo from '@/lib/db/repositories/matching';
import { matchingEvents } from '@/lib/matching/event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchPayload(category?: string) {
  try {
    const result = await matchingRepo.findWaiting({ category });
    return {
      success: true as const,
      data: result.requests,
      meta: { total: result.total },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false as const, error: msg };
  }
}

export async function GET(request: NextRequest) {
  const category = request.nextUrl.searchParams.get('category') ?? undefined;
  const encoder = new TextEncoder();
  const eventKey = category ? `matching:${category}` : 'matching:any';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;

      const send = (payload: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          /* controller already closed */
        }
      };

      const sendComment = (comment: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          /* closed */
        }
      };

      const refreshAndSend = async () => {
        const payload = await fetchPayload(category);
        send(payload);
      };

      const onUpdate = () => {
        void refreshAndSend();
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        matchingEvents.off(eventKey, onUpdate);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      const signal = request.signal;
      if (signal.aborted) {
        cleanup();
        return;
      }
      signal.addEventListener('abort', cleanup);

      matchingEvents.on(eventKey, onUpdate);

      await refreshAndSend();

      heartbeat = setInterval(() => sendComment('ping'), 25000);
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
