import { quickScan, quickScanInputSchema } from '../services/quick-scan.js';
import { txPreflight, txPreflightInputSchema } from '../services/tx-preflight.js';
import { deepDive, deepDiveInputSchema } from '../services/deep-dive.js';
import * as jobsRepo from '../db/repositories/jobs.js';
import { logger } from '../utils/logger.js';
import { SERVICE_NAMES, toErrorMessage } from '../utils/constants.js';
import { createHttpClient } from '../utils/http.js';

export interface JobRequest {
  acpJobId: string;
  offeringName: string;
  input: Record<string, unknown>;
  buyerAddress?: string;
  priceUsd: number;
}

export interface JobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

const MARKETPLACE_BASE_URL = 'https://openagentx.org';

const marketplaceClient = createHttpClient(MARKETPLACE_BASE_URL, { timeout: 10_000 });

const SERVICE_TIMEOUTS: Record<string, number> = {
  [SERVICE_NAMES.QUICK_SCAN]: 10_000,
  [SERVICE_NAMES.TX_PREFLIGHT]: 5_000,
  [SERVICE_NAMES.DEEP_DIVE]: 30_000,
  [SERVICE_NAMES.AGENT_DISCOVERY]: 5_000,
  [SERVICE_NAMES.MARKETPLACE_CONCIERGE]: 10_000,
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer!));
}

export async function routeJob(request: JobRequest): Promise<JobResult> {
  const startTime = Date.now();

  const dbJobId = await jobsRepo.createJob({
    acp_job_id: request.acpJobId,
    service_type: request.offeringName,
    buyer_address: request.buyerAddress,
    input_data: request.input,
    price_usdc: request.priceUsd,
  });

  try {
    const timeout = SERVICE_TIMEOUTS[request.offeringName] ?? 10_000;
    let result: unknown;

    switch (request.offeringName) {
      case SERVICE_NAMES.QUICK_SCAN: {
        const token = quickScanInputSchema.parse(request.input.token);
        result = await withTimeout(quickScan(token), timeout, 'quick_scan');
        break;
      }
      case SERVICE_NAMES.TX_PREFLIGHT: {
        const tx = txPreflightInputSchema.parse(request.input.tx);
        result = await withTimeout(txPreflight(tx), timeout, 'tx_preflight');
        break;
      }
      case SERVICE_NAMES.DEEP_DIVE: {
        const addr = deepDiveInputSchema.parse(request.input.token_address);
        result = await withTimeout(deepDive(addr), timeout, 'deep_dive');
        break;
      }
      case SERVICE_NAMES.AGENT_DISCOVERY: {
        const query = String(request.input.query ?? '');
        const category = request.input.category ? String(request.input.category) : undefined;
        const params: Record<string, string> = { q: query };
        if (category) params.category = category;
        const res = await withTimeout(
          marketplaceClient.get('/api/agents', { params }),
          timeout,
          'agent_discovery',
        );
        const agents = res.data?.data ?? [];
        result = {
          agents,
          total: res.data?.meta?.total ?? agents.length,
          marketplace_url: `${MARKETPLACE_BASE_URL}/agents?q=${encodeURIComponent(query)}`,
          deep_link: `${MARKETPLACE_BASE_URL}/agents`,
        };
        break;
      }
      case SERVICE_NAMES.MARKETPLACE_CONCIERGE: {
        const message = String(request.input.message ?? '');
        const sessionId = String(request.input.session_id ?? `acp-${request.acpJobId}`);
        const res = await withTimeout(
          marketplaceClient.post('/api/concierge', {
            sessionId,
            message,
            type: 'guide',
          }),
          timeout,
          'marketplace_concierge',
        );
        result = {
          response: res.data?.data?.response ?? '',
          marketplace_url: MARKETPLACE_BASE_URL,
          deep_link: `${MARKETPLACE_BASE_URL}/agents`,
        };
        break;
      }
      default: {
        // 동적 이행 폴백 — 등록되지 않은 서비스도 마켓플레이스의 동적 에이전트로 처리 시도
        logger.info(
          { offeringName: request.offeringName, jobId: request.acpJobId, category: 'acp' },
          '등록되지 않은 서비스 — 동적 이행 시도',
        );
        const fulfillRes = await withTimeout(
          marketplaceClient.post('/api/fulfill', {
            query: request.offeringName,
            input: request.input,
          }),
          15_000,
          'dynamic_fulfill',
        );
        if (fulfillRes.data?.success) {
          result = {
            ...fulfillRes.data,
            marketplace_url: MARKETPLACE_BASE_URL,
            dynamic: true,
          };
        } else {
          throw new Error(`Unknown service: ${request.offeringName}`);
        }
        break;
      }
    }

    const processingMs = Date.now() - startTime;
    await jobsRepo.updateJob(dbJobId, {
      status: 'completed',
      result_data: result as Record<string, unknown>,
      processing_ms: processingMs,
    });

    return { success: true, data: result };
  } catch (err) {
    const processingMs = Date.now() - startTime;
    const errorMessage = toErrorMessage(err);

    logger.error({ jobId: request.acpJobId, error: errorMessage, category: 'acp' }, 'Job failed');
    await jobsRepo.updateJob(dbJobId, {
      status: 'failed',
      error_message: errorMessage,
      processing_ms: processingMs,
    });

    return { success: false, error: errorMessage };
  }
}
