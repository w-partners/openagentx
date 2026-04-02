import { NextRequest } from 'next/server';
import { apiJson, apiError, requireAuth, AuthError } from '@/lib/utils/api-response';
import { query } from '@/lib/db/pool';

async function ensureServerColumns() {
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_url VARCHAR(500)`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_status VARCHAR(20) DEFAULT 'unknown'`);
  await query(`ALTER TABLE agents ADD COLUMN IF NOT EXISTS server_checked_at TIMESTAMPTZ`);
}

// GET /api/agents/health-check?agentId=xxx — Get last check result
export async function GET(request: NextRequest) {
  try {
    requireAuth(request);
    await ensureServerColumns();

    const agentId = request.nextUrl.searchParams.get('agentId');
    if (!agentId) return apiError('agentId is required');

    const result = await query<{
      server_url: string | null;
      server_status: string;
      server_checked_at: string | null;
    }>(
      `SELECT server_url, COALESCE(server_status, 'unknown') as server_status, server_checked_at
       FROM agents WHERE id = $1`,
      [agentId],
    );

    if (result.rows.length === 0) return apiError('Agent not found', 404);

    const row = result.rows[0];
    return apiJson({
      serverUrl: row.server_url,
      status: row.server_status,
      checkedAt: row.server_checked_at,
    });
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}

// POST /api/agents/health-check — Run health check
export async function POST(request: NextRequest) {
  try {
    const userId = requireAuth(request);
    await ensureServerColumns();

    const body = await request.json();
    const { agentId, serverUrl } = body;

    if (!agentId) return apiError('agentId is required');

    // Verify ownership or admin
    const agent = await query<{ owner_id: string; server_url: string | null }>(
      'SELECT owner_id, server_url FROM agents WHERE id = $1',
      [agentId],
    );

    if (agent.rows.length === 0) return apiError('Agent not found', 404);

    const row = agent.rows[0];
    const isOwner = row.owner_id === userId;

    // Check admin
    const userResult = await query<{ role: string }>(
      'SELECT role FROM users WHERE id = $1',
      [userId],
    );
    const isAdmin = userResult.rows[0]?.role === 'admin';

    if (!isOwner && !isAdmin) {
      return apiError('Permission denied', 403);
    }

    // If serverUrl is provided, update it
    const urlToCheck = serverUrl || row.server_url;
    if (!urlToCheck) {
      return apiError('No server URL configured. Please provide a serverUrl.');
    }

    // Save the server URL if provided
    if (serverUrl) {
      await query('UPDATE agents SET server_url = $1, updated_at = NOW() WHERE id = $2', [
        serverUrl,
        agentId,
      ]);
    }

    // Perform health check
    const startTime = Date.now();
    let status: 'online' | 'offline' | 'error' = 'offline';
    let message = '';

    try {
      const healthUrl = urlToCheck.replace(/\/$/, '') + '/health';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'User-Agent': 'OpenAgentX-HealthCheck/1.0' },
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'ok') {
          status = 'online';
          message = `OK (${latency}ms)`;
        } else {
          status = 'error';
          message = `Unexpected response: ${JSON.stringify(data).slice(0, 200)}`;
        }
      } else {
        status = 'error';
        message = `HTTP ${response.status}: ${response.statusText}`;
      }

      // Save result
      await query(
        `UPDATE agents SET server_status = $1, server_checked_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [status, agentId],
      );

      return apiJson({ status, latency, message });
    } catch (fetchError) {
      const latency = Date.now() - startTime;
      status = 'offline';
      message =
        fetchError instanceof Error
          ? fetchError.name === 'AbortError'
            ? 'Connection timed out (10s)'
            : fetchError.message
          : 'Unknown error';

      await query(
        `UPDATE agents SET server_status = $1, server_checked_at = NOW(), updated_at = NOW() WHERE id = $2`,
        [status, agentId],
      );

      return apiJson({ status, latency, message });
    }
  } catch (err) {
    if (err instanceof AuthError) return apiError(err.message, 401);
    return apiError(err instanceof Error ? err.message : 'Server error', 500);
  }
}
