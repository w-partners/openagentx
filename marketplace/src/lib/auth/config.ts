import { z } from 'zod';
import bcrypt from 'bcrypt';
import { ethers } from 'ethers';
import { query } from '../db/pool';
import { cacheGet, cacheSet, cacheDel } from '../cache/redis';

import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY, type UserPayload } from './constants';

const SALT_ROUNDS = 12;
const NONCE_EXPIRY = 300; // 5 minutes

// --- Input Schemas ---

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  nickname: z.string().min(2).max(50),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const walletLoginSchema = z.object({
  address: z.string().startsWith('0x').length(42),
  signature: z.string(),
  nonce: z.string(),
});

export type { UserPayload };

// --- Registration ---

export async function registerUser(input: z.infer<typeof registerSchema>): Promise<UserPayload> {
  const { email, password, nickname } = input;

  // Check duplicate
  const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new Error('이미 등록된 이메일입니다');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await query<{ id: string; role: string }>(
    `INSERT INTO users (email, password_hash, nickname, role)
     VALUES ($1, $2, $3, 'buyer')
     RETURNING id, role`,
    [email, passwordHash, nickname],
  );

  const user = result.rows[0];
  return { id: user.id, email, nickname, role: user.role, walletAddress: null };
}

// --- Email Login ---

export async function loginWithEmail(input: z.infer<typeof loginSchema>): Promise<UserPayload> {
  const { email, password } = input;

  const result = await query<{
    id: string;
    email: string;
    password_hash: string;
    nickname: string;
    role: string;
    wallet_address: string | null;
  }>('SELECT id, email, password_hash, nickname, role, wallet_address FROM users WHERE email = $1', [
    email,
  ]);

  if (result.rows.length === 0) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new Error('이메일 또는 비밀번호가 올바르지 않습니다');
  }

  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    walletAddress: user.wallet_address,
  };
}

// --- Wallet Login ---

export async function generateNonce(address: string): Promise<string> {
  const nonce = `OpenAgentX 로그인 인증: ${crypto.randomUUID()}`;
  await cacheSet(`nonce:${address.toLowerCase()}`, nonce, NONCE_EXPIRY);
  return nonce;
}

export async function loginWithWallet(input: z.infer<typeof walletLoginSchema>): Promise<UserPayload> {
  const { address, signature, nonce } = input;
  const normalizedAddr = address.toLowerCase();

  // Verify nonce exists
  const storedNonce = await cacheGet<string>(`nonce:${normalizedAddr}`);
  if (!storedNonce || storedNonce !== nonce) {
    throw new Error('유효하지 않거나 만료된 인증 요청입니다');
  }

  // Verify signature
  const recoveredAddress = ethers.verifyMessage(nonce, signature);
  if (recoveredAddress.toLowerCase() !== normalizedAddr) {
    throw new Error('서명 검증에 실패했습니다');
  }

  // Clean up nonce
  await cacheDel(`nonce:${normalizedAddr}`);

  // Find or create user
  let result = await query<{
    id: string;
    email: string | null;
    nickname: string;
    role: string;
    wallet_address: string;
  }>('SELECT id, email, nickname, role, wallet_address FROM users WHERE wallet_address = $1', [
    normalizedAddr,
  ]);

  if (result.rows.length === 0) {
    // Auto-create user
    const nickname = `${normalizedAddr.slice(0, 6)}...${normalizedAddr.slice(-4)}`;
    result = await query(
      `INSERT INTO users (wallet_address, nickname, role, is_verified)
       VALUES ($1, $2, 'buyer', TRUE)
       RETURNING id, email, nickname, role, wallet_address`,
      [normalizedAddr, nickname],
    );
  }

  const user = result.rows[0];
  return {
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    role: user.role,
    walletAddress: user.wallet_address,
  };
}

// --- Token Management ---

export { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY };
