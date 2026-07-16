import { NextRequest } from 'next/server';
import * as chainsRepo from '@/lib/db/repositories/chains';
import { chainEvents } from '@/lib/chains/event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function fetchChainPayload(id: string): Promise<{ success: true; data: unknown; type: 'instance' | 'flow' } | { success: false; error: string }> {
  const instance = await chainsRepo.getChainStatus(id);
  if (instance) return { success: true, data: instance, type: 'instance' };

  const flow = await chainsRepo.findFlowById(id);
  if (flow) return { success: true, data: flow, type: 'flow' };

  return { success: false, error: '체인을 찾을 수 없습니다' };
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();
  const eventKey = `chain:${id}`;

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
        try {
          const payload = await fetchChainPayload(id);
          send(payload);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          send({ success: false, error: msg });
        }
      };

      const onUpdate = () => {
        void refreshAndSend();
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        chainEvents.off(eventKey, onUpdate);
        if (heartbeat) clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Abort handling
      const signal = request.signal;
      if (signal.aborted) {
        cleanup();
        return;
      }
      signal.addEventListener('abort', cleanup);

      // Subscribe
      chainEvents.on(eventKey, onUpdate);

      // Initial payload
      await refreshAndSend();

      // Heartbeat every 25s
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
