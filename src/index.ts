import { config } from './config/env.js';
import { logger, startDbLogTransport, stopDbLogTransport, bindDbQuery, cleanOldLogs } from './utils/logger.js';
import { query as dbQuery, checkDb, closePool } from './db/pool.js';
import { connectRedis, checkRedis, closeRedis } from './cache/redis.js';
import { startAcpRuntime, isAcpConnected } from './acp/runtime.js';
import { startAdminApi, stopAdminApi } from './api/server.js';
import { getAddress, getEthBalance, getUsdcBalance, resetDailySpend, checkWallet, destroyProvider } from './wallet/manager.js';
import { getOfferings } from './acp/offerings.js';
import { sendTelegram, sendAgentAlert, flushTelegramQueue } from './notifications/telegram.js';
import { sendDailyReport, sendBalanceWarning } from './notifications/discord.js';
import {
  HEARTBEAT_INTERVAL_MS, HEARTBEAT_WARN_THRESHOLD, HEARTBEAT_ALERT_THRESHOLD,
  SHUTDOWN_GRACE_MS, ETH_LOW_BALANCE, USDC_LOW_BALANCE,
} from './utils/constants.js';
import cron from 'node-cron';

let isShuttingDown = false;
let heartbeatFailCount = 0;
let heartbeatAlertSent = false;
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
const cronTasks: cron.ScheduledTask[] = [];

function startHeartbeat(): void {
  heartbeatTimer = setInterval(async () => {
    if (isShuttingDown) return;

    const [db, redis, wallet] = await Promise.all([checkDb(), checkRedis(), checkWallet()]);
    const acp = isAcpConnected();

    if (!db || !redis || !acp || !wallet) {
      heartbeatFailCount++;
      logger.warn({ db, redis, acp, wallet, failCount: heartbeatFailCount, category: 'heartbeat' }, 'Degraded');

      if (heartbeatFailCount >= HEARTBEAT_ALERT_THRESHOLD && !heartbeatAlertSent) {
        sendAgentAlert('down', `DB:${db} Redis:${redis} ACP:${acp} Wallet:${wallet}`);
        heartbeatAlertSent = true;
      }
    } else {
      if (heartbeatFailCount >= HEARTBEAT_WARN_THRESHOLD) {
        sendAgentAlert('recovered');
      }
      heartbeatFailCount = 0;
      heartbeatAlertSent = false;
    }
  }, HEARTBEAT_INTERVAL_MS);
}

function startSchedulers(): void {
  // Daily report + spend reset at 00:00 UTC
  cronTasks.push(
    cron.schedule('0 0 * * *', async () => {
      try {
        await sendDailyReport();
        resetDailySpend();
        await cleanOldLogs();
        logger.info({ category: 'scheduler' }, 'Daily tasks completed');
      } catch (err) {
        logger.error({ category: 'scheduler' }, 'Daily tasks failed');
      }
    }),
  );

  // Balance check every hour
  cronTasks.push(
    cron.schedule('0 * * * *', async () => {
      try {
        const [eth, usdc] = await Promise.all([getEthBalance(), getUsdcBalance()]);
        if (parseFloat(eth) < ETH_LOW_BALANCE || parseFloat(usdc) < USDC_LOW_BALANCE) {
          sendTelegram(`⚠️ Low balance: ETH ${eth}, USDC ${usdc}`);
          await sendBalanceWarning(eth, usdc);
        }
      } catch {
        logger.error({ category: 'scheduler' }, 'Balance check failed');
      }
    }),
  );
}

async function main(): Promise<void> {
  logger.info({ category: 'system' }, 'OpenAgentX starting...');

  // DB connection + bind query to logger (breaks circular dep)
  const dbOk = await checkDb();
  if (!dbOk) {
    logger.fatal({ category: 'system' }, 'Database connection failed');
    process.exit(1);
  }
  logger.info({ category: 'system' }, 'Database connected');
  bindDbQuery(dbQuery as Parameters<typeof bindDbQuery>[0]);
  startDbLogTransport();

  await connectRedis();
  logger.info({ category: 'system' }, 'Redis connected');

  logger.info({ address: getAddress(), category: 'wallet' }, 'Wallet initialized');

  const offerings = getOfferings();
  logger.info({ count: offerings.length, category: 'acp' }, 'Offerings loaded');

  await startAcpRuntime();
  await startAdminApi();

  startHeartbeat();
  startSchedulers();

  logger.info({ category: 'system' }, 'OpenAgentX is live');
  sendTelegram('🟢 OpenAgentX started');
}

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal, category: 'system' }, 'Shutting down...');
  sendTelegram(`🔴 Agent shutting down (${signal})`);

  // Stop timers
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  cronTasks.forEach((t) => t.stop());

  // Grace period for pending work
  await new Promise((r) => setTimeout(r, SHUTDOWN_GRACE_MS));

  try {
    await stopAdminApi();
    await flushTelegramQueue();
    await stopDbLogTransport();
    await closeRedis();
    destroyProvider();
    await closePool();
  } catch (err) {
    logger.error({ category: 'system' }, 'Error during shutdown');
  }

  logger.info({ category: 'system' }, 'Shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

main().catch((err) => {
  logger.fatal({ category: 'system' }, 'Fatal error during startup');
  process.exit(1);
});
