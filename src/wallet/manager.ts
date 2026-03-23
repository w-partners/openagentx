import { ethers } from 'ethers';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { ERC20_ABI, BASE_USDC_ADDRESS, USDC_DECIMALS, toErrorMessage } from '../utils/constants.js';

let providerInstance: ethers.JsonRpcProvider | null = null;
let walletInstance: ethers.Wallet | null = null;

function getProvider(): ethers.JsonRpcProvider {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(config.BASE_RPC_URL);
  }
  return providerInstance;
}

function getWallet(): ethers.Wallet {
  if (!walletInstance) {
    walletInstance = new ethers.Wallet(config.ACP_WALLET_PRIVATE_KEY, getProvider());
  }
  return walletInstance;
}

// Shared provider for base-rpc.ts — avoids duplicate Provider creation
export function getSharedProvider(): ethers.JsonRpcProvider {
  return getProvider();
}

export function getAddress(): string {
  return getWallet().address;
}

export function getSigner(): ethers.Wallet {
  return getWallet();
}

export async function getEthBalance(): Promise<string> {
  const balance = await getProvider().getBalance(getWallet().address);
  return ethers.formatEther(balance);
}

export async function getUsdcBalance(): Promise<string> {
  const contract = new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, getProvider());
  const balance = (await contract.balanceOf(getWallet().address)) as bigint;
  return ethers.formatUnits(balance, USDC_DECIMALS);
}

export async function transferUsdc(
  to: string,
  amount: number,
): Promise<{ txHash: string; blockNumber: number }> {
  const contract = new ethers.Contract(BASE_USDC_ADDRESS, ERC20_ABI, getWallet());
  const amountWei = ethers.parseUnits(amount.toString(), USDC_DECIMALS);

  logger.info({ to, amount }, 'Initiating USDC transfer');

  const tx = await (contract.transfer(to, amountWei) as Promise<ethers.ContractTransactionResponse>);
  const receipt = await tx.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error(`USDC transfer failed: ${tx.hash}`);
  }

  logger.info({ txHash: tx.hash, blockNumber: receipt.blockNumber }, 'USDC transfer confirmed');
  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

// --- Spend tracking ---
let dailySpent = 0;

export function canSpend(amountUsd: number): boolean {
  if (dailySpent + amountUsd > config.MAX_DAILY_SPEND) {
    logger.warn({ dailySpent, requested: amountUsd }, 'Daily spend limit reached');
    return false;
  }
  return true;
}

export function recordSpend(amountUsd: number): void {
  dailySpent += amountUsd;
}

export function resetDailySpend(): void {
  dailySpent = 0;
}

export function getDailySpent(): number {
  return dailySpent;
}

export async function withdraw(
  to: string,
  amount: number,
): Promise<{ txHash: string; blockNumber: number }> {
  if (config.WITHDRAW_WHITELIST.length > 0 && !config.WITHDRAW_WHITELIST.includes(to)) {
    throw new Error(`Address ${to} not in withdrawal whitelist`);
  }
  if (amount > config.DAILY_WITHDRAW_LIMIT) {
    throw new Error(`Amount ${amount} exceeds daily withdrawal limit ${config.DAILY_WITHDRAW_LIMIT}`);
  }
  const balance = parseFloat(await getUsdcBalance());
  if (amount > balance) {
    throw new Error(`Insufficient USDC balance: ${balance}, requested: ${amount}`);
  }
  return transferUsdc(to, amount);
}

export async function checkWallet(): Promise<boolean> {
  try {
    await getProvider().getBlockNumber();
    return true;
  } catch {
    return false;
  }
}

export function destroyProvider(): void {
  if (providerInstance) {
    providerInstance.destroy();
    providerInstance = null;
    walletInstance = null;
  }
}
