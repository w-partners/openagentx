import { z } from 'zod';

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().startsWith('postgresql://'),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),

  // Redis (DB 1 for Phase 2, separate from Phase 1's DB 0)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().int().positive().default(6379),
  REDIS_PASSWORD: z.string().optional(),

  // NextAuth
  NEXTAUTH_SECRET: z.string().min(16),
  NEXTAUTH_URL: z.string().url(),

  // AI Providers (optional — not all features need them)
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),

  // Inngest (background job orchestration)
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),

  // Notifications
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_CHAT_ID: z.string().min(1),

  // Admin
  ADMIN_EMAIL: z.string().email(),

  // On-chain (Base)
  PLATFORM_WALLET_PRIVATE_KEY: z.string().startsWith('0x'),
  BASE_RPC_URL: z.string().url().default('https://mainnet.base.org'),

  // PayApp (KRW payment gateway)
  PAYAPP_USER_ID: z.string().min(1).optional(),
  PAYAPP_LINK_KEY: z.string().min(1).optional(),
  PAYAPP_LINK_VAL: z.string().min(1).optional(),
  PAYAPP_FEEDBACK_URL: z.string().url().optional(),

  // Partner API
  PARTNER_API_KEY: z.string().min(1).optional(),

  // Operational
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type EnvConfig = z.infer<typeof envSchema>;

function loadConfig(): EnvConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`\nEnvironment validation failed:\n${formatted}\n`);
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
