import { inngest } from '../client';
import { query, transaction } from '../../src/lib/db/pool';
import { fulfillDynamically } from '../../src/lib/agents/dynamic-factory';
import type { PoolClient } from 'pg';

export const jobExecution = inngest.createFunction(
  { id: 'job-execution', retries: 2 },
  { event: 'marketplace/job.created' },
  async ({ event, step }) => {
    const { jobId, agentId, serviceId, buyerId } = event.data;

    // Step 1: Mark job as processing
    await step.run('mark-processing', async () => {
      await transaction(async (client: PoolClient) => {
        const current = await client.query<{ status: string }>(
          'SELECT status FROM marketplace_jobs WHERE id = $1 FOR UPDATE',
          [jobId],
        );
        if (current.rows.length === 0) throw new Error('Job not found');
        const status = current.rows[0].status;
        if (status !== 'deposited' && status !== 'pending') {
          throw new Error(`Cannot process job in status: ${status}`);
        }
        await client.query(
          `UPDATE marketplace_jobs SET status = 'processing', updated_at = NOW() WHERE id = $1`,
          [jobId],
        );
      });
      return { processing: true };
    });

    // Step 2: Execute agent service via Dynamic Factory
    const result = await step.run('execute-service', async () => {
      // Fetch job input data and service info
      const jobRow = await query<{
        input_data: Record<string, unknown>;
        service_id: string;
        agent_id: string;
      }>('SELECT input_data, service_id, agent_id FROM marketplace_jobs WHERE id = $1', [jobId]);

      if (jobRow.rows.length === 0) throw new Error('Job not found');
      const job = jobRow.rows[0];

      // Get service name
      const svcRow = await query<{ name: string; name_ko: string }>(
        'SELECT name, name_ko FROM agent_services WHERE id = $1',
        [job.service_id],
      );
      const serviceName = svcRow.rows[0]?.name ?? 'unknown';

      // Extract prompt from input_data
      const inputData = job.input_data ?? {};
      const prompt = (typeof inputData.prompt === 'string' ? inputData.prompt : JSON.stringify(inputData)) || 'No input provided';

      // Call Dynamic Factory with agent-specific system prompt
      const dynamicResult = await fulfillDynamically(
        prompt,
        inputData,
        { agentId: job.agent_id, serviceName },
      );

      return {
        success: true,
        response: dynamicResult.response,
        provider: dynamicResult.provider,
        category: dynamicResult.category,
        confidence: dynamicResult.confidence,
        processingMs: dynamicResult.processingMs,
      };
    });

    // Step 3: Save result and settle payment
    await step.run('settle-payment', async () => {
      if (result.success) {
        await transaction(async (client: PoolClient) => {
          // Save result_data and mark completed
          await client.query(
            `UPDATE marketplace_jobs
             SET status = 'completed',
                 result_data = $1,
                 processing_ms = $2,
                 commission_amount = payment_amount * commission_rate / 100,
                 provider_amount = payment_amount * (1 - commission_rate / 100),
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = $3`,
            [
              JSON.stringify({
                result: result.response,
                provider: result.provider,
                category: result.category,
                confidence: result.confidence,
              }),
              result.processingMs,
              jobId,
            ],
          );

          // Update agent stats
          await client.query(
            `UPDATE agents SET total_jobs = total_jobs + 1, updated_at = NOW() WHERE id = $1`,
            [agentId],
          );
        });
      } else {
        await query(
          `UPDATE marketplace_jobs
           SET status = 'failed', error_message = $1, updated_at = NOW()
           WHERE id = $2`,
          ['AI 처리 실패', jobId],
        );
      }
    });

    return { jobId, success: result.success };
  },
);
