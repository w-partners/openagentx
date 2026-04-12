const API_URL = process.env.OPENAGENTX_API_URL || 'https://openagentx.org';

export interface AgentInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  pricePoints: number;
  tags: string[];
  capabilities: string[];
}

export interface ExecuteResult {
  success: boolean;
  data?: {
    jobId: string;
    status: string;
    result?: string;
    usedPoints?: number;
    error?: string;
  };
  error?: string;
}

export interface AgentsResponse {
  success: boolean;
  data?: AgentInfo[];
  meta?: { total: number };
  error?: string;
}

export class OpenAgentXClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = API_URL;
  }

  async listAgents(): Promise<AgentsResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/agents`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json() as Promise<AgentsResponse>;
  }

  async executeAgent(agentId: string, input: string): Promise<ExecuteResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/agents/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ agentId, input }),
    });
    return res.json() as Promise<ExecuteResult>;
  }

  async getResult(jobId: string): Promise<ExecuteResult> {
    const res = await fetch(`${this.baseUrl}/api/v1/agents/result/${jobId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    return res.json() as Promise<ExecuteResult>;
  }
}
