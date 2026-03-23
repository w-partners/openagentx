import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LOG_BUFFER_MAX } from './constants.js';

// Direct process.env access — intentional: logger initializes before config/env.ts
// to avoid circular dependency (logger -> db/pool -> config -> logger)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const NODE_ENV = process.env.NODE_ENV || 'development';

const consoleFormat =
  NODE_ENV === 'development'
    ? winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        }),
      )
    : winston.format.combine(winston.format.timestamp(), winston.format.json());

const transports: winston.transport[] = [
  new winston.transports.Console({ format: consoleFormat }),
  new DailyRotateFile({
    dirname: 'logs',
    filename: 'app-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxFiles: '30d',
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  }),
];

const winstonLogger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'cryptointel' },
  transports,
});

// Pino-compatible wrapper: supports logger.info({meta}, 'message') style
function createLogFn(level: string) {
  return (metaOrMsg: string | Record<string, unknown>, msg?: string) => {
    if (typeof metaOrMsg === 'string') {
      winstonLogger.log(level, metaOrMsg);
    } else {
      winstonLogger.log(level, msg ?? '', metaOrMsg);
    }
  };
}

export const logger = {
  debug: createLogFn('debug'),
  info: createLogFn('info'),
  warn: createLogFn('warn'),
  error: createLogFn('error'),
  fatal: createLogFn('error'),
};

// --- DB Log Transport (batch insert) ---

interface LogEntry {
  level: string;
  category: string;
  message: string;
  metadata: Record<string, unknown> | null;
}

const LOG_BUFFER: LogEntry[] = [];
const FLUSH_INTERVAL_MS = 5_000;
const FLUSH_THRESHOLD = 100;
let flushTimer: ReturnType<typeof setInterval> | null = null;
let isFlushing = false;

// Late-bound import to avoid circular dependency with db/pool
let queryFn: ((text: string, params?: unknown[]) => Promise<{ rowCount: number | null }>) | null =
  null;

export function bindDbQuery(
  fn: (text: string, params?: unknown[]) => Promise<{ rowCount: number | null }>,
): void {
  queryFn = fn;
}

async function flushLogs(): Promise<void> {
  if (isFlushing || LOG_BUFFER.length === 0 || !queryFn) return;
  isFlushing = true;

  const batch = LOG_BUFFER.splice(0, LOG_BUFFER.length);
  try {
    const values: unknown[] = [];
    const placeholders = batch
      .map((entry, i) => {
        const offset = i * 4;
        values.push(entry.level, entry.category, entry.message, JSON.stringify(entry.metadata));
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(', ');

    await queryFn(
      `INSERT INTO agent_logs (level, category, message, metadata) VALUES ${placeholders}`,
      values,
    );
  } catch {
    // DB not ready or insert failed — console already has these logs
  } finally {
    isFlushing = false;
  }
}

export function startDbLogTransport(): void {
  if (flushTimer) return;
  flushTimer = setInterval(flushLogs, FLUSH_INTERVAL_MS);

  winstonLogger.on('data', (info: winston.Logform.TransformableInfo) => {
    if (LOG_BUFFER.length >= LOG_BUFFER_MAX) {
      LOG_BUFFER.shift(); // Drop oldest to prevent unbounded growth
    }

    const { level, message, service: _s, ...rest } = info;
    LOG_BUFFER.push({
      level: level as string,
      category: (rest['category'] as string) || 'system',
      message: message as string,
      metadata: Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : null,
    });

    if (LOG_BUFFER.length >= FLUSH_THRESHOLD) {
      flushLogs();
    }
  });
}

export async function stopDbLogTransport(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushLogs();
}

export async function cleanOldLogs(): Promise<number> {
  if (!queryFn) return 0;
  const result = await queryFn(
    `DELETE FROM agent_logs WHERE created_at < NOW() - INTERVAL '30 days'`,
  );
  return result.rowCount ?? 0;
}
