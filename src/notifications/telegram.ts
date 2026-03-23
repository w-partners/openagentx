import { createHttpClient } from '../utils/http.js';
import { config } from '../config/env.js';
import { TELEGRAM_QUEUE_MAX } from '../utils/constants.js';

const http = createHttpClient(`https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`, {
  timeout: 10_000,
});

const messageQueue: string[] = [];
let processingQueue = false;

async function processQueue(): Promise<void> {
  if (processingQueue) return;
  processingQueue = true;

  try {
    while (messageQueue.length > 0) {
      const text = messageQueue.shift()!;
      try {
        await http.post('/sendMessage', {
          chat_id: config.TELEGRAM_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        });
      } catch {
        // Retry once after 1s
        await new Promise((r) => setTimeout(r, 1000));
        try {
          await http.post('/sendMessage', {
            chat_id: config.TELEGRAM_CHAT_ID,
            text,
            parse_mode: 'Markdown',
          });
        } catch {
          // Give up — don't crash agent for notification failure
        }
      }
      await new Promise((r) => setTimeout(r, 50));
    }
  } finally {
    processingQueue = false;
  }
}

export function sendTelegram(text: string): void {
  if (messageQueue.length >= TELEGRAM_QUEUE_MAX) {
    messageQueue.shift(); // Drop oldest
  }
  messageQueue.push(text);
  processQueue().catch(() => {});
}

/** Drain queue — call on shutdown */
export async function flushTelegramQueue(): Promise<void> {
  await processQueue();
}

export function sendJobNotification(
  type: 'received' | 'completed' | 'failed',
  info: { jobId: string; service: string; price?: number; error?: string },
): void {
  const lines: Record<typeof type, string> = {
    received: `📥 *Job Received*\nService: \`${info.service}\`\nPrice: $${info.price ?? 0}\nJob: \`${info.jobId}\``,
    completed: `✅ *Job Completed*\nService: \`${info.service}\`\nEarned: $${info.price ?? 0}\nJob: \`${info.jobId}\``,
    failed: `❌ *Job Failed*\nService: \`${info.service}\`\nError: ${info.error ?? 'Unknown'}\nJob: \`${info.jobId}\``,
  };
  sendTelegram(lines[type]);
}

export function sendAgentAlert(type: 'down' | 'recovered', details?: string): void {
  const text =
    type === 'down'
      ? `🚨 *Agent DOWN*\n${details ?? 'Connection lost'}`
      : `✅ *Agent Recovered*\n${details ?? 'Back online'}`;
  sendTelegram(text);
}
