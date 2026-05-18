/**
 * Discovery source types — DB + 마켓 메타에서 가공된 통합 형태.
 *
 * agent.json / ucp / mcp 세 표면이 모두 본 타입을 입력으로 받는다.
 */

export interface DiscoveryProvider {
  organization: string;
  url: string;
  contactEmail: string;
}

export interface DiscoveryAuthentication {
  type: 'bearer' | 'oauth2' | 'none';
  description?: string;
  /** OAuth2일 때 토큰 엔드포인트 */
  tokenUrl?: string;
  scopes?: string[];
}

export interface DiscoverySecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  flows?: Record<string, unknown>;
}

export interface DiscoveryPayment {
  /** 활성 결제 방법 — 메이커가 선택 */
  methods: Array<'PortOne' | 'PayPal' | 'x402' | 'PayApp' | 'Stripe'>;
  chain?: 'base' | 'optimism' | 'arbitrum';
}

export interface DiscoveryMarket {
  name: string;
  description: string;
  url: string;
  version: string;
  provider: DiscoveryProvider;
  capabilities: {
    streaming: boolean;
    sse: boolean;
    pushNotifications: boolean;
  };
  authentication: DiscoveryAuthentication;
  securitySchemes?: Record<string, DiscoverySecurityScheme>;
  payment: DiscoveryPayment;
  currencies: Array<'USD' | 'KRW' | 'USDC'>;
  locale: string;
}

export interface AgentSkillExample {
  input: string;
  description?: string;
  output?: string;
}

export interface AgentSkillDescriptor {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  inputModes?: string[];
  outputModes?: string[];
  examples?: AgentSkillExample[];
  tags?: string[];
  /** JSON Schema for params — MCP가 그대로 사용 */
  paramsSchema?: Record<string, unknown>;
}

export interface DiscoveryResource {
  uri: string;
  name: string;
  mimeType: string;
  description?: string;
}

export interface DiscoveryPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

/**
 * 모든 표면의 단일 입력.
 * 호출자 (route handler)가 DB·환경에서 조립.
 */
export interface DiscoverySource {
  market: DiscoveryMarket;
  skills: AgentSkillDescriptor[];
  resources?: DiscoveryResource[];
  prompts?: DiscoveryPrompt[];
}
