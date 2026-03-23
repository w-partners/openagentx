import acpModule, {
  AcpContractClientV2,
  baseAcpConfigV2,
  type AcpJob,
  type AcpMemo,
} from '@virtuals-protocol/acp-node';

const AcpClient = acpModule as unknown as new (options: {
  acpContractClient: InstanceType<typeof AcpContractClientV2>;
  onNewTask?: (job: AcpJob, memoToSign?: AcpMemo) => void;
  onJobEvaluation?: (job: AcpJob) => void;
  skipSocketConnection?: boolean;
}) => { init(skip?: boolean): Promise<void> };

import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { toErrorMessage } from '../utils/constants.js';
import { routeJob } from './job-router.js';
import { getOfferings } from './offerings.js';
import { sendJobNotification } from '../notifications/telegram.js';

type Address = `0x${string}`;

let connected = false;
let lastHeartbeat = Date.now();

function parseRequirement(job: AcpJob): {
  offeringName: string;
  input: Record<string, unknown>;
} {
  const memo = job.memos?.[0];
  if (!memo) throw new Error('No memo found in job');
  const content = typeof memo.content === 'string' ? JSON.parse(memo.content) : memo.content;
  return {
    offeringName: content.serviceName || content.service || '',
    input: content.input || content,
  };
}

// Cache offerings once at startup (config is immutable after load)
let cachedOfferings: ReturnType<typeof getOfferings> | null = null;
function findOfferingPrice(name: string): number {
  if (!cachedOfferings) cachedOfferings = getOfferings();
  return cachedOfferings.find((o) => o.name === name)?.priceUsd ?? 0;
}

export function isAcpConnected(): boolean {
  return connected;
}

export function getLastHeartbeat(): number {
  return lastHeartbeat;
}

export async function startAcpRuntime(): Promise<void> {
  logger.info({ category: 'acp' }, 'Building ACP seller runtime...');

  const contractClient = await AcpContractClientV2.build(
    config.ACP_WALLET_PRIVATE_KEY as Address,
    Number(config.ACP_ENTITY_KEY_ID),
    config.ACP_AGENT_WALLET_ADDRESS as Address,
    baseAcpConfigV2,
  );

  const acpClient = new AcpClient({
    acpContractClient: contractClient,
    onNewTask: async (job: AcpJob, _memoToSign?: AcpMemo) => {
      lastHeartbeat = Date.now();
      const jobId = String(job.id);

      let offeringName = '';
      try {
        const req = parseRequirement(job);
        offeringName = req.offeringName;
        const price = findOfferingPrice(offeringName);

        logger.info({ jobId, offeringName, category: 'acp' }, 'New job received');
        sendJobNotification('received', { jobId, service: offeringName, price });

        await job.accept('OpenAgentX accepted the job.');

        const result = await routeJob({
          acpJobId: jobId,
          offeringName,
          input: req.input,
          priceUsd: price,
        });

        if (result.success) {
          const branded = {
            result: result.data,
            meta: {
              provider: 'OpenAgentX Marketplace',
              url: 'https://openagentx.org',
              message: '50+ AI agents at openagentx.org | Direct access: 20% cheaper than ACP',
              deep_link: 'https://openagentx.org/agents',
            },
          };
          await job.deliver(branded);
          logger.info({ jobId, category: 'acp' }, 'Job delivered');
          sendJobNotification('completed', { jobId, service: offeringName, price });
        } else {
          await job.reject(`Error: ${result.error}`);
          sendJobNotification('failed', { jobId, service: offeringName, error: result.error });
        }
      } catch (err) {
        const errMsg = toErrorMessage(err);
        logger.error({ jobId, error: errMsg, category: 'acp' }, 'Job execution failed');
        try { await job.reject(`Error: ${errMsg}`); } catch { /* already logged */ }
        sendJobNotification('failed', { jobId, service: offeringName, error: errMsg });
      }
    },
    onJobEvaluation: async (job: AcpJob) => {
      lastHeartbeat = Date.now();
      logger.info({ jobId: job.id, category: 'acp' }, 'Job evaluation received');
    },
  });

  await acpClient.init();
  connected = true;
  logger.info({ category: 'acp' }, 'ACP seller runtime initialized');
}
