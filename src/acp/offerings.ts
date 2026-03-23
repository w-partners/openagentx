import { config } from '../config/env.js';
import { SERVICE_NAMES } from '../utils/constants.js';

export interface ServiceOffering {
  name: string;
  description: string;
  priceUsd: number;
  inputSchema: Record<string, unknown>;
  slaSeconds: number;
}

export function getOfferings(): ServiceOffering[] {
  return [
    {
      name: SERVICE_NAMES.QUICK_SCAN,
      description: 'Quick token snapshot: price, volume, liquidity, risk score',
      priceUsd: config.PRICE_QUICK_SCAN,
      inputSchema: {
        type: 'object',
        properties: {
          token: { type: 'string', description: 'Token address (0x...) or symbol' },
        },
        required: ['token'],
      },
      slaSeconds: 10,
    },
    {
      name: SERVICE_NAMES.TX_PREFLIGHT,
      description: 'Transaction pre-execution analysis: gas, risk flags, recommendation',
      priceUsd: config.PRICE_TX_PREFLIGHT,
      inputSchema: {
        type: 'object',
        properties: {
          tx: { type: 'string', description: 'Transaction hash or JSON {to, value, data}' },
        },
        required: ['tx'],
      },
      slaSeconds: 5,
    },
    {
      name: SERVICE_NAMES.DEEP_DIVE,
      description: 'Comprehensive token analysis: market, onchain, risk matrix, full report',
      priceUsd: config.PRICE_DEEP_DIVE,
      inputSchema: {
        type: 'object',
        properties: {
          token_address: { type: 'string', description: 'Token contract address (0x...)' },
        },
        required: ['token_address'],
      },
      slaSeconds: 30,
    },
    {
      name: SERVICE_NAMES.AGENT_DISCOVERY,
      description: 'Search OpenAgentX marketplace for matching AI agents by keyword or category',
      priceUsd: 0.01,
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search keyword or category' },
          category: { type: 'string', description: 'Optional category filter' },
        },
        required: ['query'],
      },
      slaSeconds: 5,
    },
    {
      name: SERVICE_NAMES.MARKETPLACE_CONCIERGE,
      description: 'AI concierge proxy: ask questions about OpenAgentX marketplace and get recommendations',
      priceUsd: 0.01,
      inputSchema: {
        type: 'object',
        properties: {
          message: { type: 'string', description: 'User question or request' },
          session_id: { type: 'string', description: 'Optional session ID for conversation continuity' },
        },
        required: ['message'],
      },
      slaSeconds: 10,
    },
  ];
}
