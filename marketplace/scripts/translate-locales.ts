/**
 * 자동 번역 스크립트 (Gemini 기반).
 *
 * 사용법:
 *   GOOGLE_AI_API_KEYS=key1,key2 npx tsx scripts/translate-locales.ts [--target=de,it,...]
 *
 * 동작:
 *   - en.json을 마스터 사전으로 사용
 *   - 각 대상 locale의 기존 JSON과 비교
 *   - 영어와 동일하거나 누락된 키만 번역 (idempotent — 이미 번역된 키는 건드리지 않음)
 *   - 번역 결과를 locale JSON에 머지하여 저장
 *
 * 주의:
 *   - LLM 번역은 검수 필요. 도메인 용어(에이전트, USDC, ACP 등)는 영문 유지 권장
 *   - 비용/시간은 키 개수에 비례. 1628줄 1회 번역 ~약 1분
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import * as fs from 'fs';
import * as path from 'path';

const LOCALES_DIR = path.resolve(__dirname, '../src/i18n/locales');
const SOURCE_LOCALE = 'en';

const ALL_TARGETS = [
  'ko', 'ja', 'zh', 'es', 'fr',
  'de', 'it', 'pt', 'ru', 'vi', 'id', 'th', 'tr', 'ar', 'hi',
];

const LANGUAGE_LABELS: Record<string, string> = {
  ko: 'Korean (한국어)',
  ja: 'Japanese (日本語)',
  zh: 'Simplified Chinese (简体中文)',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  it: 'Italian (Italiano)',
  pt: 'Portuguese (Português)',
  ru: 'Russian (Русский)',
  vi: 'Vietnamese (Tiếng Việt)',
  id: 'Indonesian (Bahasa Indonesia)',
  th: 'Thai (ไทย)',
  tr: 'Turkish (Türkçe)',
  ar: 'Arabic (العربية)',
  hi: 'Hindi (हिन्दी)',
};

const apiKeys = (process.env.GOOGLE_AI_API_KEYS ?? '').split(',').map((k) => k.trim()).filter(Boolean);
if (apiKeys.length === 0) {
  console.error('GOOGLE_AI_API_KEYS 환경변수가 필요합니다');
  process.exit(1);
}
let keyIndex = 0;
function nextKey(): string {
  const k = apiKeys[keyIndex % apiKeys.length];
  keyIndex++;
  return k;
}

interface JsonObject {
  [k: string]: unknown;
}

function readJson(p: string): JsonObject {
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

function writeJson(p: string, data: JsonObject): void {
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function findMissingOrIdentical(
  source: JsonObject,
  target: JsonObject,
  prefix = '',
): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(source)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      const tv = (target as Record<string, unknown>)[k];
      if (tv == null || tv === v) out.push(key);
    } else if (v && typeof v === 'object' && !Array.isArray(v)) {
      const tv = (target as Record<string, unknown>)[k];
      const subTarget = (tv && typeof tv === 'object' ? tv : {}) as JsonObject;
      out.push(...findMissingOrIdentical(v as JsonObject, subTarget, key));
    }
  }
  return out;
}

function getByPath(obj: JsonObject, dotPath: string): string | null {
  const parts = dotPath.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return null;
    }
  }
  return typeof cur === 'string' ? cur : null;
}

function setByPath(obj: JsonObject, dotPath: string, value: string): void {
  const parts = dotPath.split('.');
  let cur: JsonObject = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (!cur[k] || typeof cur[k] !== 'object') cur[k] = {};
    cur = cur[k] as JsonObject;
  }
  cur[parts[parts.length - 1]] = value;
}

async function translateBatch(
  texts: string[],
  targetLanguage: string,
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(nextKey());
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `Translate the following UI strings to ${targetLanguage}.
Rules:
1. Preserve placeholders like {count}, {query}, {rate} exactly
2. Keep brand names (OpenAgentX, USDC, ACP, PortOne, Telegram, Discord) in English
3. Output JSON array of translated strings, in the same order
4. No explanations, only the JSON array

Input:
${JSON.stringify(texts, null, 2)}

Output (JSON array only):`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Translation parse failed: ${text.slice(0, 200)}`);
  const arr = JSON.parse(match[0]);
  if (!Array.isArray(arr) || arr.length !== texts.length) {
    throw new Error(`Translation length mismatch: expected ${texts.length}, got ${arr.length}`);
  }
  return arr.map(String);
}

async function translateLocale(target: string): Promise<void> {
  const sourcePath = path.join(LOCALES_DIR, `${SOURCE_LOCALE}.json`);
  const targetPath = path.join(LOCALES_DIR, `${target}.json`);

  if (!fs.existsSync(targetPath)) {
    console.log(`[${target}] file not found — skipped`);
    return;
  }

  const source = readJson(sourcePath);
  const targetData = readJson(targetPath);

  const missing = findMissingOrIdentical(source, targetData);
  if (missing.length === 0) {
    console.log(`[${target}] no missing keys`);
    return;
  }

  console.log(`[${target}] translating ${missing.length} keys → ${LANGUAGE_LABELS[target]}`);

  const BATCH = 30;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    const texts = slice.map((p) => getByPath(source, p) ?? '');
    try {
      const translated = await translateBatch(texts, LANGUAGE_LABELS[target]);
      slice.forEach((p, idx) => setByPath(targetData, p, translated[idx]));
      console.log(`  batch ${Math.floor(i / BATCH) + 1}: +${slice.length}`);
    } catch (err) {
      console.error(`  batch ${Math.floor(i / BATCH) + 1} failed:`, err);
    }
  }

  writeJson(targetPath, targetData);
  console.log(`[${target}] saved`);
}

async function main(): Promise<void> {
  const arg = process.argv.find((a) => a.startsWith('--target='));
  const targets = arg ? arg.replace('--target=', '').split(',') : ALL_TARGETS;

  for (const t of targets) {
    if (!ALL_TARGETS.includes(t)) {
      console.error(`unknown target: ${t}`);
      continue;
    }
    await translateLocale(t);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
