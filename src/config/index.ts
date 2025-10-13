import { config } from 'dotenv';
import { BotConfig } from '../types';
import { parseEther } from 'ethers';

config();

export function loadConfig(): BotConfig {
  const privateKeys = process.env.PRIVATE_KEYS?.split(',').map(k => k.trim()) || [];
  
  if (privateKeys.length === 0) {
    throw new Error('No private keys provided in PRIVATE_KEYS env variable');
  }

  return {
    rpcUrl: process.env.RPC_URL || 'https://bsc-dataseed1.binance.org/',
    chainId: parseInt(process.env.CHAIN_ID || '56'),
    privateKeys,
    
    fourMemeFactory: process.env.FOURMEME_FACTORY_ADDRESS || '',
    fourMemeRouter: process.env.FOURMEME_ROUTER_ADDRESS || '',
    
    pancakeswapRouter: process.env.PANCAKESWAP_ROUTER || '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    pancakeswapFactory: process.env.PANCAKESWAP_FACTORY || '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    wbnbAddress: process.env.WBNB_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
    
    minBuyAmount: parseFloat(process.env.MIN_BUY_AMOUNT || '0.001'),
    maxBuyAmount: parseFloat(process.env.MAX_BUY_AMOUNT || '0.01'),
    minSellPercentage: parseInt(process.env.MIN_SELL_PERCENTAGE || '50'),
    maxSellPercentage: parseInt(process.env.MAX_SELL_PERCENTAGE || '100'),
    minInterval: parseInt(process.env.MIN_INTERVAL || '10000'),
    maxInterval: parseInt(process.env.MAX_INTERVAL || '30000'),
    
    initialBuyAmount: parseFloat(process.env.INITIAL_BUY_AMOUNT || '0.1'),
    gasPrice: process.env.GAS_PRICE || '5',
    gasLimit: parseInt(process.env.GAS_LIMIT || '500000'),
    
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    slippageTolerance: parseInt(process.env.SLIPPAGE_TOLERANCE || '10'),
  };
}

export const botConfig = loadConfig();

