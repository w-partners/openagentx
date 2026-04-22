/**
 * Claude Code 서브프로세스 실행기
 * executeAgent / executeCustomAgent의 실행 엔진.
 *
 * Gemini API 호출 대신 `claude -p`를 서브프로세스로 실행하여
 * Claude Code의 Tool use (WebFetch/Read/Bash 등)를 활용한다.
 */

import { spawn } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

export interface ClaudeRunnerOptions {
  systemPrompt: string;
  input: string;
  /** 허용 도구 목록 (예: ['WebFetch', 'Read']). 미지정 시 도구 사용 없음 */
  allowedTools?: string[];
  /** 최대 턴 수 (기본 5) */
  maxTurns?: number;
  /** 타임아웃 밀리초 (기본 180초) */
  timeoutMs?: number;
  /** 실행 모델 (기본 sonnet — 비용/품질 균형) */
  model?: 'sonnet' | 'opus' | 'haiku';
}

interface ClaudeResult {
  type: string;
  subtype: string;
  is_error: boolean;
  result?: string;
  total_cost_usd?: number;
  duration_ms?: number;
}

const CLAUDE_BIN = process.env.CLAUDE_BIN || '/home/llm/.local/bin/claude';

/**
 * Claude Code를 격리된 임시 디렉토리에서 실행한다.
 * CLAUDE.md 로드를 방지하여 비용을 낮추고, 사용자 환경과 격리한다.
 */
export async function runClaude(opts: ClaudeRunnerOptions): Promise<string> {
  const {
    systemPrompt,
    input,
    allowedTools = [],
    maxTurns = 5,
    timeoutMs = 180_000,
    model = 'sonnet',
  } = opts;

  // 격리용 빈 임시 디렉토리
  const workDir = await mkdtemp(join(tmpdir(), 'oax-agent-'));

  try {
    const args: string[] = [
      '-p',
      systemPrompt,
      '--output-format',
      'json',
      '--max-turns',
      String(maxTurns),
      '--model',
      model,
    ];

    if (allowedTools.length > 0) {
      args.push('--allowed-tools', allowedTools.join(','));
    }

    return await new Promise<string>((resolve, reject) => {
      const proc = spawn(CLAUDE_BIN, args, {
        cwd: workDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          // 내부 토큰 주입 방지 (화이트리스트로 제한)
          HOME: process.env.HOME,
          PATH: process.env.PATH,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      const timer = setTimeout(() => {
        proc.kill('SIGKILL');
        reject(new Error(`claude -p timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      proc.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) {
          return reject(new Error(`claude -p exited ${code}: ${stderr}`));
        }
        try {
          const parsed = JSON.parse(stdout) as ClaudeResult;
          if (parsed.is_error || !parsed.result) {
            return reject(new Error(`claude -p error: ${parsed.subtype}`));
          }
          resolve(parsed.result);
        } catch (e) {
          reject(new Error(`claude -p output parse failed: ${(e as Error).message}`));
        }
      });

      proc.stdin.write(input);
      proc.stdin.end();
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => {});
  }
}
