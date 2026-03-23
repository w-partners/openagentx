import dotenv from 'dotenv';
import { z } from 'zod';

// Load env: production uses .env.production with .env as fallback
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
}
dotenv.config(); // .env (dotenv won't override already-set vars)

const envSchema = z.object({
  // ACP
  ACP_WALLET_PRIVATE_KEY: z.string().startsWith('0x'),
  ACP_ENTITY_KEY_ID: z.string().min(1),
  ACP_AGENT_WALLET_ADDRESS: z.string().startsWith('0x').length(42),

  // Chain RPC
  BASE_RPC_URL: z.string().url().default('https://mainnet.base.org'),
  BASE_RPC_FALLBACK: z.string().url().optional(),

  // Database
  DATABASE_URL: z.string().startsWith('postgresql://'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.coerce.number().int().min(0).default(0),

  // Data Sources
  COINGECKO_API_KEY: z.string().optional(),

  // Notifications
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),
  DISCORD_WEBHOOK_URL: z.string().url().optional(),
  ENABLE_DISCORD: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),

  // Admin API
  ADMIN_API_PORT: z.coerce.number().int().positive().default(14910),
  ADMIN_API_KEY: z.string().min(8),

  // Operational
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  MAX_DAILY_SPEND: z.coerce.number().positive().default(1.0),
  DAILY_WITHDRAW_LIMIT: z.coerce.number().positive().default(10.0),
  WITHDRAW_WHITELIST: z
    .string()
    .default('')
    .transform((v) => (v ? v.split(',').map((s) => s.trim()) : [])),

  // Service Prices
  PRICE_QUICK_SCAN: z.coerce.number().positive().default(0.05),
  PRICE_TX_PREFLIGHT: z.coerce.number().positive().default(0.01),
  PRICE_DEEP_DIVE: z.coerce.number().positive().default(0.5),

  // Risk Scoring Weights
  RISK_WEIGHT_LIQUIDITY: z.coerce.number().min(0).max(1).default(0.3),
  RISK_WEIGHT_VOLATILITY: z.coerce.number().min(0).max(1).default(0.25),
  RISK_WEIGHT_HOLDER_CONCENTRATION: z.coerce.number().min(0).max(1).default(0.25),
  RISK_WEIGHT_CONTRACT_VERIFIED: z.coerce.number().min(0).max(1).default(0.2),
});

type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\n❌ Environment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
