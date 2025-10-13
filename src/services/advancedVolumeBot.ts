import { Wallet } from 'ethers';
import { BotConfig, VolumeStats } from '../types';
import { WalletManager } from '../utils/walletManager';
import { TokenCreator } from './tokenCreator';
import { PancakeSwapTrader } from './pancakeswapTrader';
import { Logger } from '../utils/logger';

/**
 * Advanced volume bot that automatically detects and uses the appropriate exchange
 */
export class AdvancedVolumeBot {
  private tokenCreator: TokenCreator;
  private pancakeTrader: PancakeSwapTrader;
  private usePancakeSwap = false;
  private stats: VolumeStats = {
    totalTrades: 0,
    totalVolume: '0',
    buys: 0,
    sells: 0,
    profitLoss: '0',
  };
  private isRunning = false;

  constructor(
    private config: BotConfig,
    private walletManager: WalletManager
  ) {
    this.tokenCreator = new TokenCreator(config);
    this.pancakeTrader = new PancakeSwapTrader(config);
  }

  /**
   * Starts advanced volume bot with auto-detection
   */
  async start(tokenAddress: string, duration?: number) {
    this.isRunning = true;
    
    // Detect which exchange to use
    const wallet = this.walletManager.getWallet(0);
    this.usePancakeSwap = await this.pancakeTrader.hasLiquidity(tokenAddress, wallet);
    
    if (this.usePancakeSwap) {
      Logger.info('Token detected on PancakeSwap, using PancakeSwap for trading');
    } else {
      Logger.info('Token on four.meme bonding curve, using four.meme for trading');
    }

    Logger.info(`Starting advanced volume bot for token: ${tokenAddress}`);
    
    const startTime = Date.now();
    const endTime = duration ? startTime + duration : null;

    while (this.isRunning) {
      if (endTime && Date.now() >= endTime) {
        Logger.info('Volume boosting duration completed');
        break;
      }

      try {
        const wallet = this.walletManager.getRandomWallet();
        const shouldBuy = Math.random() < 0.6;

        if (shouldBuy) {
          await this.executeBuy(tokenAddress, wallet);
        } else {
          await this.executeSell(tokenAddress, wallet);
        }

        const interval = this.getRandomInterval();
        Logger.info(`Waiting ${interval / 1000}s before next trade...`);
        await this.sleep(interval);

      } catch (error) {
        Logger.error('Error during volume boosting', error);
        await this.sleep(5000);
      }
    }

    this.printStats();
  }

  /**
   * Stops the bot
   */
  stop() {
    this.isRunning = false;
    Logger.warn('Stopping advanced volume bot...');
  }

  /**
   * Executes buy on appropriate exchange
   */
  private async executeBuy(tokenAddress: string, wallet: Wallet) {
    const buyAmount = this.getRandomBuyAmount();
    
    Logger.info(`Executing buy: ${buyAmount} BNB from wallet ${wallet.address.slice(0, 8)}...`);
    
    try {
      let txHash: string;

      if (this.usePancakeSwap) {
        txHash = await this.pancakeTrader.buyOnPancakeSwap(tokenAddress, buyAmount, wallet);
      } else {
        txHash = await this.tokenCreator.buyToken(tokenAddress, buyAmount, wallet);
      }

      this.stats.totalTrades++;
      this.stats.buys++;
      this.stats.totalVolume = (parseFloat(this.stats.totalVolume) + buyAmount).toString();
      
      return txHash;
    } catch (error) {
      Logger.error('Buy transaction failed', error);
      throw error;
    }
  }

  /**
   * Executes sell on appropriate exchange
   */
  private async executeSell(tokenAddress: string, wallet: Wallet) {
    try {
      const balance = await this.getTokenBalance(tokenAddress, wallet.address, wallet);

      if (balance === BigInt(0)) {
        Logger.warn('No tokens to sell, skipping');
        return;
      }

      const sellPercentage = this.getRandomSellPercentage();
      const sellAmount = (balance * BigInt(sellPercentage)) / BigInt(100);

      if (sellAmount === BigInt(0)) {
        Logger.warn('Sell amount too small, skipping');
        return;
      }

      Logger.info(
        `Executing sell: ${sellPercentage}% of balance from wallet ${wallet.address.slice(0, 8)}...`
      );

      let txHash: string;

      if (this.usePancakeSwap) {
        txHash = await this.pancakeTrader.sellOnPancakeSwap(tokenAddress, sellAmount, wallet);
      } else {
        txHash = await this.tokenCreator.sellToken(tokenAddress, sellAmount, wallet);
      }

      this.stats.totalTrades++;
      this.stats.sells++;
      
      return txHash;
    } catch (error) {
      Logger.error('Sell transaction failed', error);
      throw error;
    }
  }

  private async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    wallet: Wallet
  ): Promise<bigint> {
    const tokenContract = await this.getTokenContract(tokenAddress, wallet);
    const balance = await tokenContract.balanceOf(walletAddress);
    return balance;
  }

  private async getTokenContract(tokenAddress: string, wallet: Wallet) {
    const { ethers } = await import('ethers');
    const ERC20_ABI = await import('../abis/ERC20.json');
    return new ethers.Contract(tokenAddress, ERC20_ABI.default, wallet);
  }

  private getRandomBuyAmount(): number {
    const min = this.config.minBuyAmount;
    const max = this.config.maxBuyAmount;
    return Math.random() * (max - min) + min;
  }

  private getRandomSellPercentage(): number {
    const min = this.config.minSellPercentage;
    const max = this.config.maxSellPercentage;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getRandomInterval(): number {
    const min = this.config.minInterval;
    const max = this.config.maxInterval;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private printStats() {
    Logger.stats({
      trades: this.stats.totalTrades,
      volume: this.stats.totalVolume,
      buys: this.stats.buys,
      sells: this.stats.sells,
    });
  }

  getStats(): VolumeStats {
    return { ...this.stats };
  }
}

