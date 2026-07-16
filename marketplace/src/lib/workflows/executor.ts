/**
 * Workflow Executor
 *
 * Loads a workflow definition (DAG), topo-sorts the nodes,
 * and executes them in order — passing each node's output as the next node's input.
 *
 * Node types:
 *   - input  : passes the workflow's `input` argument through.
 *   - prompt : loads prompts.system_prompt by slug → runClaude(systemPrompt, prevOutput)
 *   - agent  : loads agents.system_prompt by slug → runClaude(...)
 *   - output : passes the previous node's output through (acts as the final sink).
 *
 * All step results are stored in workflow_runs.step_results jsonb.
 */
import { query } from '@/lib/db/pool';
import * as workflowsRepo from '@/lib/db/repositories/workflows';
import { runClaude } from '@/lib/partner/claude-runner';
import type {
  Workflow,
  WorkflowDefinition,
  WorkflowNode,
} from '@/lib/db/repositories/workflows';

export interface StepResult {
  status: 'success' | 'error' | 'skipped';
  output?: string;
  duration_ms?: number;
  error?: string;
}

export interface ExecutionResult {
  runId: string;
  output: string;
  stepResults: Record<string, StepResult>;
  status: 'success' | 'error';
  total_duration_ms: number;
}

/**
 * Topologically sort the DAG. Throws on cycles or missing nodes.
 */
function topoSort(def: WorkflowDefinition): WorkflowNode[] {
  const nodeMap = new Map<string, WorkflowNode>();
  for (const n of def.nodes) {
    if (!n?.id) throw new Error('워크플로우 노드에 id가 없습니다');
    nodeMap.set(n.id, n);
  }

  // validate edges reference existing nodes
  for (const e of def.edges) {
    if (!nodeMap.has(e.from)) throw new Error(`엣지의 from 노드가 누락: ${e.from}`);
    if (!nodeMap.has(e.to)) throw new Error(`엣지의 to 노드가 누락: ${e.to}`);
  }

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of def.nodes) {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of def.edges) {
    adj.get(e.from)!.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }

  const queueIds: string[] = [];
  for (const [id, d] of inDegree) {
    if (d === 0) queueIds.push(id);
  }

  const result: WorkflowNode[] = [];
  while (queueIds.length) {
    const id = queueIds.shift()!;
    const n = nodeMap.get(id)!;
    result.push(n);
    for (const next of adj.get(id) ?? []) {
      const d = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, d);
      if (d === 0) queueIds.push(next);
    }
  }
  if (result.length !== def.nodes.length) {
    throw new Error('워크플로우에 순환이 있습니다');
  }
  return result;
}

function predecessorsOf(def: WorkflowDefinition, nodeId: string): string[] {
  return def.edges.filter((e) => e.to === nodeId).map((e) => e.from);
}

async function loadSystemPromptBySlug(
  type: 'prompt' | 'agent',
  slug: string,
): Promise<string> {
  if (type === 'prompt') {
    const r = await query<{ system_prompt: string }>(
      `SELECT system_prompt FROM prompts WHERE slug = $1 AND status = 'active' LIMIT 1`,
      [slug],
    );
    if (!r.rows[0]) throw new Error(`프롬프트를 찾을 수 없습니다: ${slug}`);
    return r.rows[0].system_prompt;
  }
  // agent
  const r = await query<{ system_prompt: string | null; description: string | null; name: string }>(
    `SELECT system_prompt, description, name FROM agents WHERE slug = $1 LIMIT 1`,
    [slug],
  );
  if (!r.rows[0]) throw new Error(`에이전트를 찾을 수 없습니다: ${slug}`);
  return (
    r.rows[0].system_prompt ??
    `당신은 "${r.rows[0].name}" 에이전트입니다. ${r.rows[0].description ?? ''}`
  );
}

async function executeNode(
  node: WorkflowNode,
  prevOutput: string,
): Promise<StepResult> {
  const startedAt = Date.now();
  try {
    let output = '';
    switch (node.type) {
      case 'input':
        output = prevOutput;
        break;
      case 'output':
        output = prevOutput;
        break;
      case 'prompt': {
        const slug = node.data?.slug;
        if (!slug) throw new Error(`prompt 노드(${node.id})에 slug 없음`);
        const sys = await loadSystemPromptBySlug('prompt', slug);
        output = await runClaude({
          systemPrompt: sys,
          input: prevOutput,
          model: 'sonnet',
          maxTurns: 1,
          timeoutMs: 240_000,
        });
        break;
      }
      case 'agent': {
        const slug = node.data?.slug;
        if (!slug) throw new Error(`agent 노드(${node.id})에 slug 없음`);
        const sys = await loadSystemPromptBySlug('agent', slug);
        output = await runClaude({
          systemPrompt: sys,
          input: prevOutput,
          model: 'sonnet',
          maxTurns: 1,
          timeoutMs: 240_000,
        });
        break;
      }
      case 'condition':
        // simple passthrough for now — could branch on JSON parse later
        output = prevOutput;
        break;
      default:
        throw new Error(`알 수 없는 노드 타입: ${(node as { type: string }).type}`);
    }
    return { status: 'success', output, duration_ms: Date.now() - startedAt };
  } catch (e) {
    return {
      status: 'error',
      error: e instanceof Error ? e.message : String(e),
      duration_ms: Date.now() - startedAt,
    };
  }
}

export async function executeWorkflow(
  workflowId: string,
  userId: string | null,
  input: string,
): Promise<ExecutionResult> {
  const wf: Workflow | null = await workflowsRepo.findById(workflowId);
  if (!wf) throw new Error('워크플로우를 찾을 수 없습니다');

  const def: WorkflowDefinition =
    typeof wf.definition === 'string' ? JSON.parse(wf.definition) : wf.definition;

  if (!def?.nodes?.length) throw new Error('워크플로우에 노드가 없습니다');

  const sorted = topoSort(def);

  const run = await workflowsRepo.createRun({
    workflow_id: wf.id,
    user_id: userId,
    input_text: input,
  });

  const startedAt = Date.now();
  const stepResults: Record<string, StepResult> = {};
  const outputs: Record<string, string> = {};
  let lastOutput = input;
  let finalOutput = '';
  let failed = false;
  let errorMsg: string | null = null;

  for (const node of sorted) {
    const preds = predecessorsOf(def, node.id);
    // input for this node = concat of predecessor outputs (or workflow input if root)
    let nodeInput: string;
    if (preds.length === 0) {
      nodeInput = input;
    } else if (preds.length === 1) {
      nodeInput = outputs[preds[0]] ?? '';
    } else {
      nodeInput = preds.map((pid) => `[${pid}]\n${outputs[pid] ?? ''}`).join('\n\n---\n\n');
    }

    const res = await executeNode(node, nodeInput);
    stepResults[node.id] = res;

    if (res.status === 'error') {
      failed = true;
      errorMsg = `노드 "${node.id}" 실패: ${res.error}`;
      break;
    }
    outputs[node.id] = res.output ?? '';
    lastOutput = res.output ?? '';
    if (node.type === 'output') finalOutput = lastOutput;
  }

  if (!finalOutput && !failed) {
    // If no explicit output node, use last node's output
    finalOutput = lastOutput;
  }

  const totalDuration = Date.now() - startedAt;

  await workflowsRepo.finalizeRun({
    id: run.id,
    status: failed ? 'error' : 'success',
    output_text: failed ? null : finalOutput,
    step_results: stepResults,
    total_duration_ms: totalDuration,
    error_msg: errorMsg,
  });

  if (!failed) {
    await workflowsRepo.incrementUseCount(wf.id).catch(() => {});
  }

  return {
    runId: run.id,
    output: finalOutput,
    stepResults,
    status: failed ? 'error' : 'success',
    total_duration_ms: totalDuration,
  };
}
