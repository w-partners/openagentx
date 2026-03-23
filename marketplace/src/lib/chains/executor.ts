/**
 * Chain Executor
 * 체인 플로우의 각 스텝을 실행하고, 완료 시 다음 스텝을 자동 트리거
 */
import * as chainsRepo from '../db/repositories/chains';
import type { ChainStep, ChainInstance, StepResult } from '../db/repositories/chains';
import { query } from '../db/pool';

export interface StepExecutionResult {
  job_id?: string;
  auction_id?: string;
  matching_id?: string;
}

/**
 * 스텝 타입에 따라 적절한 작업을 생성
 */
export async function executeStep(
  instance: ChainInstance,
  step: ChainStep,
  stepIndex: number,
  previousResult?: Record<string, unknown>,
): Promise<StepExecutionResult> {
  const inputData = {
    ...instance.input_data,
    chain_instance_id: instance.id,
    chain_step_index: stepIndex,
    previous_result: previousResult ?? null,
  };

  switch (step.type) {
    case 'fixed':
      return await executeFixedStep(instance, step, stepIndex, inputData);
    case 'auction':
      return await executeAuctionStep(instance, step, stepIndex, inputData);
    case 'matching':
      return await executeMatchingStep(instance, step, stepIndex, inputData);
    case 'fulfill':
      return await executeFulfillStep(instance, step, stepIndex, inputData);
    default:
      throw new Error(`지원하지 않는 스텝 타입: ${step.type}`);
  }
}

async function executeFixedStep(
  instance: ChainInstance,
  step: ChainStep,
  stepIndex: number,
  inputData: Record<string, unknown>,
): Promise<StepExecutionResult> {
  if (!step.config.agent_id) {
    // 에이전트 미지정 시 카테고리로 검색
    const agentResult = await query<{ id: string; owner_id: string }>(
      `SELECT id, owner_id FROM agents WHERE status = 'active'
       AND category = $1 ORDER BY total_jobs DESC LIMIT 1`,
      [step.category],
    );
    if (agentResult.rows.length === 0) {
      throw new Error(`카테고리 '${step.category}'에 활성 에이전트가 없습니다`);
    }
    step.config.agent_id = agentResult.rows[0].id;
  }

  // 서비스 조회
  const svcResult = await query<{ id: string }>(
    `SELECT id FROM agent_services WHERE agent_id = $1 AND is_active = true LIMIT 1`,
    [step.config.agent_id],
  );
  const serviceId = svcResult.rows[0]?.id;

  const jobResult = await query<{ id: string }>(
    `INSERT INTO marketplace_jobs
       (agent_id, buyer_id, input_data, payment_amount, commission_rate, status,
        chain_instance_id, chain_step_index, service_id)
     SELECT $1, $2, $3, $4,
            COALESCE((SELECT commission_rate FROM agents WHERE id = $1), 0),
            'pending', $5, $6, $7
     RETURNING id`,
    [
      step.config.agent_id,
      instance.requester_id,
      JSON.stringify(inputData),
      step.config.max_price ?? 10,
      instance.id,
      stepIndex,
      serviceId,
    ],
  );

  return { job_id: jobResult.rows[0].id };
}

async function executeAuctionStep(
  instance: ChainInstance,
  step: ChainStep,
  stepIndex: number,
  inputData: Record<string, unknown>,
): Promise<StepExecutionResult> {
  const auctionResult = await query<{ id: string }>(
    `INSERT INTO auction_requests
       (requester_id, title, description, category, budget_max, expires_at,
        chain_instance_id, chain_step_index)
     VALUES ($1, $2, $3, $4, $5, NOW() + make_interval(mins => $6), $7, $8)
     RETURNING id`,
    [
      instance.requester_id,
      step.name,
      step.description + '\n\n입력 데이터: ' + JSON.stringify(inputData),
      step.category,
      step.config.max_price ?? null,
      step.config.timeout_minutes ?? 60,
      instance.id,
      stepIndex,
    ],
  );

  return { auction_id: auctionResult.rows[0].id };
}

async function executeMatchingStep(
  instance: ChainInstance,
  step: ChainStep,
  stepIndex: number,
  inputData: Record<string, unknown>,
): Promise<StepExecutionResult> {
  const matchingResult = await query<{ id: string }>(
    `INSERT INTO matching_requests
       (requester_id, title, description, category, urgency, connection_fee,
        chain_instance_id, chain_step_index, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + make_interval(mins => $9))
     RETURNING id`,
    [
      instance.requester_id,
      step.name,
      step.description + '\n\n입력 데이터: ' + JSON.stringify(inputData),
      step.category,
      step.config.urgency ?? 'normal',
      step.config.connection_fee ?? 1.0,
      instance.id,
      stepIndex,
      step.config.timeout_minutes ?? 10,
    ],
  );

  return { matching_id: matchingResult.rows[0].id };
}

async function executeFulfillStep(
  instance: ChainInstance,
  step: ChainStep,
  stepIndex: number,
  inputData: Record<string, unknown>,
): Promise<StepExecutionResult> {
  // fulfill 타입: Dynamic Factory를 직접 호출하여 AI 처리
  const { fulfillDynamically } = await import('../agents/dynamic-factory');

  const prompt = step.description + '\n\n입력 데이터: ' + JSON.stringify(inputData);
  const result = await fulfillDynamically(prompt, inputData, {
    agentId: step.config.agent_id,
    serviceName: step.name,
  });

  // fulfill은 즉시 완료 -> 바로 completeStep 호출
  await onStepComplete(instance.id, stepIndex, {
    response: result.response,
    provider: result.provider,
    category: result.category,
    processingMs: result.processingMs,
  });

  return {};
}

/**
 * 스텝 완료 콜백
 * job/auction/matching 완료 시 호출
 */
export async function onStepComplete(
  instanceId: string,
  stepIndex: number,
  result: Record<string, unknown>,
  cost?: number,
): Promise<void> {
  const { hasMore, autoTrigger } = await chainsRepo.completeStep(
    instanceId,
    stepIndex,
    result,
    cost,
  );

  if (hasMore && autoTrigger) {
    // 다음 스텝 자동 실행
    const instance = await chainsRepo.advanceChain(instanceId);
    if (!instance || !instance.flow_steps) return;

    const nextStep = instance.flow_steps[instance.current_step];
    if (!nextStep) return;

    // 이전 스텝 결과를 다음 스텝에 전달
    const stepResults: StepResult[] = instance.step_results;
    const prevResult = stepResults[stepIndex]?.result_data;

    try {
      await executeStep(instance, nextStep, instance.current_step, prevResult);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      await chainsRepo.failChain(instanceId, `스텝 ${instance.current_step} 실행 실패: ${errMsg}`);
    }
  }
}

/**
 * 작업 완료 시 체인 연동 확인
 * 기존 job/auction/matching 완료 로직에서 호출
 */
export async function checkChainCompletion(
  type: 'job' | 'auction' | 'matching',
  entityId: string,
  result: Record<string, unknown>,
  cost?: number,
): Promise<void> {
  let tableName: string;
  switch (type) {
    case 'job': tableName = 'marketplace_jobs'; break;
    case 'auction': tableName = 'auction_requests'; break;
    case 'matching': tableName = 'matching_requests'; break;
  }

  const row = await query<{ chain_instance_id: string | null; chain_step_index: number | null }>(
    `SELECT chain_instance_id, chain_step_index FROM ${tableName} WHERE id = $1`,
    [entityId],
  );

  const data = row.rows[0];
  if (!data?.chain_instance_id || data.chain_step_index === null) return;

  await onStepComplete(data.chain_instance_id, data.chain_step_index, result, cost);
}
