import Fastify from 'fastify';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { checkDb } from '../db/pool.js';
import { checkRedis } from '../cache/redis.js';
import { isAcpConnected } from '../acp/runtime.js';
import { getEthBalance, getUsdcBalance, withdraw } from '../wallet/manager.js';
import { getOfferings } from '../acp/offerings.js';
import * as jobsRepo from '../db/repositories/jobs.js';
import { toErrorMessage } from '../utils/constants.js';

const fastify = Fastify({ logger: false });

// Auth middleware
fastify.addHook('onRequest', async (request, reply) => {
  // Health endpoint is public
  if (request.url === '/api/health') return;

  const apiKey = request.headers['x-api-key'];
  if (apiKey !== config.ADMIN_API_KEY) {
    reply.code(401).send({ success: false, error: 'Unauthorized' });
  }
});

// --- Endpoints ---

fastify.get('/api/health', async () => {
  const [db, redis] = await Promise.all([checkDb(), checkRedis()]);
  return {
    success: true,
    data: {
      status: db && redis && isAcpConnected() ? 'healthy' : 'degraded',
      db,
      redis,
      acp: isAcpConnected(),
      uptime: process.uptime(),
    },
  };
});

fastify.get('/api/stats', async () => {
  const stats = await jobsRepo.getStats();
  return { success: true, data: stats };
});

fastify.get<{
  Querystring: { status?: string; service_type?: string; limit?: string; offset?: string };
}>('/api/jobs', async (request) => {
  const { status, service_type, limit, offset } = request.query;
  const jobs = await jobsRepo.findAll({
    status,
    service_type,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
  });
  return { success: true, data: jobs, meta: { count: jobs.length } };
});

fastify.get('/api/wallet/balance', async () => {
  const [eth, usdc] = await Promise.all([getEthBalance(), getUsdcBalance()]);
  return { success: true, data: { eth, usdc } };
});

fastify.get('/api/offerings', async () => {
  return { success: true, data: getOfferings() };
});

fastify.post<{
  Body: { amount: number; toAddress: string };
}>('/api/wallet/withdraw', async (request, reply) => {
  const { amount, toAddress } = request.body;
  if (!amount || !toAddress) {
    return reply.code(400).send({ success: false, error: 'amount and toAddress required' });
  }
  try {
    const result = await withdraw(toAddress, amount);
    return { success: true, data: result };
  } catch (err) {
    return reply.code(400).send({
      success: false,
      error: toErrorMessage(err),
    });
  }
});

// --- Server lifecycle ---

export async function startAdminApi(): Promise<void> {
  try {
    await fastify.listen({ host: '127.0.0.1', port: config.ADMIN_API_PORT });
    logger.info({ port: config.ADMIN_API_PORT, category: 'api' }, 'Admin API server started');
  } catch (err) {
    logger.error({ error: err, category: 'api' }, 'Admin API server failed to start');
    throw err;
  }
}

export async function stopAdminApi(): Promise<void> {
  await fastify.close();
}
