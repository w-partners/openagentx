/**
 * OpenXgram (a) client contract adapter
 *
 * Maps marketplace DB rows (snake_case, internal column names) to the shape the
 * OpenXgram Rust client expects from GET /api/agents?q=...:
 *
 *   Agent  = { id, name, description, maker_id?, category?, rating?, rating_count?, services: Service[] }
 *   Service = { id, name, description, price_usdc_micro(int), input_schema(object), avg_duration_sec?(int) }
 *
 * Column differences handled here:
 *   owner_id      -> maker_id
 *   avg_rating    -> rating        (numeric -> number)
 *   total_reviews -> rating_count  (int)
 *   price_usdc    -> price_usdc_micro  (numeric USDC * 1_000_000, int)
 *   avg_duration_ms -> avg_duration_sec (ms / 1000, int)
 */
import { query } from '@/lib/db/pool';

export interface XgramService {
  id: string;
  name: string;
  description: string;
  price_usdc_micro: number;
  input_schema: Record<string, unknown>;
  avg_duration_sec?: number;
}

export interface XgramAgent {
  id: string;
  name: string;
  description: string;
  maker_id?: string;
  category?: string;
  rating?: number;
  rating_count?: number;
  services: XgramService[];
}

/** A loose row type — only the fields used by the mapper are required. */
interface AgentRowLike {
  id: string;
  name: string;
  description: string;
  owner_id?: string | null;
  category?: string | null;
  avg_rating?: number | string | null;
  total_reviews?: number | string | null;
}

interface ServiceRow {
  id: string;
  agent_id: string;
  name: string;
  description: string;
  price_usdc: number | string;
  input_schema: Record<string, unknown> | null;
  avg_duration_ms: number | string | null;
}

function toNumber(v: number | string | null | undefined): number | undefined {
  if (v === null || v === undefined) return undefined;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : undefined;
}

function mapService(row: ServiceRow): XgramService {
  const usdc = toNumber(row.price_usdc) ?? 0;
  const durMs = toNumber(row.avg_duration_ms);
  const svc: XgramService = {
    id: row.id,
    name: row.name,
    description: row.description,
    // USDC (6 decimals) -> integer micro-USDC
    price_usdc_micro: Math.round(usdc * 1_000_000),
    input_schema: (row.input_schema ?? {}) as Record<string, unknown>,
  };
  if (durMs !== undefined) {
    svc.avg_duration_sec = Math.round(durMs / 1000);
  }
  return svc;
}

/**
 * Fetch active services for the given agent ids in a single query,
 * grouped by agent_id.
 */
async function fetchServicesByAgent(agentIds: string[]): Promise<Map<string, XgramService[]>> {
  const grouped = new Map<string, XgramService[]>();
  if (agentIds.length === 0) return grouped;

  const result = await query<ServiceRow>(
    `SELECT id, agent_id, name, description, price_usdc, input_schema, avg_duration_ms
       FROM agent_services
      WHERE agent_id = ANY($1::uuid[]) AND is_active = true
      ORDER BY price_usdc ASC`,
    [agentIds],
  );

  for (const row of result.rows) {
    const list = grouped.get(row.agent_id) ?? [];
    list.push(mapService(row));
    grouped.set(row.agent_id, list);
  }
  return grouped;
}

/** Map a single agent row (services injected by caller). */
export function mapAgentRow(row: AgentRowLike, services: XgramService[]): XgramAgent {
  const agent: XgramAgent = {
    id: row.id,
    name: row.name,
    description: row.description,
    services,
  };
  if (row.owner_id != null) agent.maker_id = row.owner_id;
  if (row.category != null) agent.category = row.category;
  const rating = toNumber(row.avg_rating);
  if (rating !== undefined) agent.rating = rating;
  const ratingCount = toNumber(row.total_reviews);
  if (ratingCount !== undefined) agent.rating_count = Math.round(ratingCount);
  return agent;
}

/**
 * Map a list of agent rows to the (a) contract, batch-loading their services.
 */
export async function mapAgentsToXgram(rows: AgentRowLike[]): Promise<XgramAgent[]> {
  const ids = rows.map((r) => r.id);
  const servicesByAgent = await fetchServicesByAgent(ids);
  return rows.map((r) => mapAgentRow(r, servicesByAgent.get(r.id) ?? []));
}
