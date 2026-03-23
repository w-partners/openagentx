import { createHttpClient } from '../utils/http.js';
import { config } from '../config/env.js';
import { toErrorMessage } from '../utils/constants.js';
import * as jobsRepo from '../db/repositories/jobs.js';
import { logger } from '../utils/logger.js';

const http = config.DISCORD_WEBHOOK_URL
  ? createHttpClient(config.DISCORD_WEBHOOK_URL, { timeout: 10_000 })
  : null;

async function sendWebhook(payload: Record<string, unknown>): Promise<void> {
  if (!config.ENABLE_DISCORD || !http) return;

  try {
    await http.post('', payload);
  } catch (err) {
    logger.warn({ error: toErrorMessage(err), category: 'discord' }, 'Discord webhook failed');
  }
}

export async function sendDailyReport(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  const stats = await jobsRepo.getStats(today);

  const successRate =
    stats.total_jobs > 0 ? ((stats.completed_jobs / stats.total_jobs) * 100).toFixed(1) : '0.0';

  await sendWebhook({
    embeds: [
      {
        title: `📊 Daily Report — ${today}`,
        color: stats.failed_jobs > stats.completed_jobs ? 0xff0000 : 0x00ff00,
        fields: [
          { name: 'Total Jobs', value: String(stats.total_jobs), inline: true },
          { name: 'Completed', value: String(stats.completed_jobs), inline: true },
          { name: 'Failed', value: String(stats.failed_jobs), inline: true },
          { name: 'Success Rate', value: `${successRate}%`, inline: true },
          { name: 'Revenue', value: `$${stats.total_earned.toFixed(4)}`, inline: true },
          { name: 'Avg Response', value: `${stats.avg_processing_ms}ms`, inline: true },
          {
            name: 'By Service',
            value:
              Object.entries(stats.by_service)
                .map(([k, v]) => `${k}: ${v}`)
                .join('\n') || 'None',
            inline: false,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  });
  logger.info({ category: 'discord' }, 'Daily report sent');
}

export async function sendBalanceWarning(ethBalance: string, usdcBalance: string): Promise<void> {
  await sendWebhook({
    content: `💰 **Low Balance Warning**\nETH: ${ethBalance}\nUSDC: ${usdcBalance}`,
  });
}
