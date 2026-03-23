import { ethers } from 'ethers';
import { getSharedProvider } from '../wallet/manager.js';
import { logger } from '../utils/logger.js';
import { ERC20_ABI, GAS_BUFFER_PERCENT } from '../utils/constants.js';

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
}

export interface TransactionInfo {
  hash: string;
  from: string;
  to: string | null;
  value: string;
  gasUsed: string;
  status: number;
  blockNumber: number;
}

export async function getTokenInfo(tokenAddress: string): Promise<TokenInfo> {
  logger.debug({ tokenAddress }, 'Onchain: fetching token info');
  const provider = getSharedProvider();
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

  const [name, symbol, decimals, totalSupply] = await Promise.all([
    contract.name() as Promise<string>,
    contract.symbol() as Promise<string>,
    contract.decimals() as Promise<number>,
    contract.totalSupply() as Promise<bigint>,
  ]);

  return {
    name,
    symbol,
    decimals: Number(decimals),
    totalSupply: ethers.formatUnits(totalSupply, decimals),
  };
}

export async function getTokenBalance(tokenAddress: string, walletAddress: string): Promise<string> {
  const provider = getSharedProvider();
  const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [balance, decimals] = await Promise.all([
    contract.balanceOf(walletAddress) as Promise<bigint>,
    contract.decimals() as Promise<number>,
  ]);
  return ethers.formatUnits(balance, decimals);
}

export async function getTransaction(txHash: string): Promise<TransactionInfo | null> {
  logger.debug({ txHash }, 'Onchain: fetching transaction');
  const provider = getSharedProvider();
  const [tx, receipt] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!tx || !receipt) return null;

  return {
    hash: tx.hash,
    from: tx.from,
    to: tx.to,
    value: ethers.formatEther(tx.value),
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status ?? 0,
    blockNumber: receipt.blockNumber,
  };
}

export async function getGasPrice(): Promise<string> {
  const provider = getSharedProvider();
  const feeData = await provider.getFeeData();
  return ethers.formatUnits(feeData.gasPrice ?? 0n, 'gwei');
}

export async function estimateGas(tx: {
  to: string;
  value?: bigint;
  data?: string;
}): Promise<bigint> {
  const provider = getSharedProvider();
  const estimated = await provider.estimateGas(tx);
  return (estimated * GAS_BUFFER_PERCENT) / 100n;
}
