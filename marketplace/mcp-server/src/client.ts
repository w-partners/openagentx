const API_BASE = process.env.OPENAGENTX_API_URL || 'https://openagentx.org';
const MCP_ENDPOINT = `${API_BASE}/api/mcp`;

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
  id: string | number;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  result?: unknown;
  error?: { code: number; message: string };
  id: string | number | null;
}

export class OpenAgentXClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async call(method: string, params?: Record<string, unknown>): Promise<JsonRpcResponse> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now(),
    };

    const res = await fetch(MCP_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
      },
      body: JSON.stringify(body),
    });

    return res.json() as Promise<JsonRpcResponse>;
  }

  async listTools(): Promise<unknown[]> {
    const response = await this.call('tools/list');
    if (response.error) {
      throw new Error(`tools/list 실패: ${response.error.message}`);
    }
    const result = response.result as { tools?: unknown[] } | undefined;
    return result?.tools ?? [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await this.call('tools/call', { name, arguments: args });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }
}
