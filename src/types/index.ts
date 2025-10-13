export interface BotConfig {
  rpcUrl: string;
  chainId: number;
  privateKeys: string[];
  
  // Four.meme contracts
  fourMemeFactory: string;
  fourMemeRouter: string;
  
  // PancakeSwap
  pancakeswapRouter: string;
  pancakeswapFactory: string;
  wbnbAddress: string;
  
  // Volume settings
  minBuyAmount: number;
  maxBuyAmount: number;
  minSellPercentage: number;
  maxSellPercentage: number;
  minInterval: number;
  maxInterval: number;
  
  // Token creation
  initialBuyAmount: number;
  gasPrice: string;
  gasLimit: number;
  
  // Bot settings
  maxRetries: number;
  slippageTolerance: number;
}

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  logoUrl?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  creator: string;
}

export interface TradeParams {
  tokenAddress: string;
  amountIn: string;
  minAmountOut: string;
  isBuy: boolean;
  walletIndex: number;
}

export interface BundleTransaction {
  to: string;
  data: string;
  value: string;
  gasLimit: number;
}

export interface VolumeStats {
  totalTrades: number;
  totalVolume: string;
  buys: number;
  sells: number;
  profitLoss: string;
}

