import { ethers, parseEther, Wallet } from 'ethers';
import { BotConfig, VolumeStats } from '../types';
import { ContractManager } from '../utils/contracts';
import { WalletManager } from '../utils/walletManager';
import { TokenCreator } from './tokenCreator';
import { Logger } from '../utils/logger';

export class VolumeBooster {
  private contractManager: ContractManager;
  private tokenCreator: TokenCreator;
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
    this.contractManager = new ContractManager(config);
    this.tokenCreator = new TokenCreator(config);
  }

  /**
   * Starts the volume boosting bot
   */
  async start(tokenAddress: string, duration?: number) {
    this.isRunning = true;
    Logger.info(`Starting volume bot for token: ${tokenAddress}`);
    
    const startTime = Date.now();
    const endTime = duration ? startTime + duration : null;

    while (this.isRunning) {
      if (endTime && Date.now() >= endTime) {
        Logger.info('Volume boosting duration completed');
        break;
      }

      try {
        // Random wallet selection
        const wallet = this.walletManager.getRandomWallet();
        
        // Random action: buy or sell (60% buy, 40% sell for volume growth)
        const shouldBuy = Math.random() < 0.6;

        if (shouldBuy) {
          await this.executeBuy(tokenAddress, wallet);
        } else {
          await this.executeSell(tokenAddress, wallet);
        }

        // Random interval between trades
        const interval = this.getRandomInterval();
        Logger.info(`Waiting ${interval / 1000}s before next trade...`);
        await this.sleep(interval);

      } catch (error) {
        Logger.error('Error during volume boosting', error);
        await this.sleep(5000); // Wait 5s on error
      }
    }

    this.printStats();
  }

  /**
   * Stops the volume boosting bot
   */
  stop() {
    this.isRunning = false;
    Logger.warn('Stopping volume bot...');
  }

  /**
   * Executes a buy transaction
   */
  private async executeBuy(tokenAddress: string, wallet: Wallet) {
    const buyAmount = this.getRandomBuyAmount();
    
    Logger.info(`Executing buy: ${buyAmount} BNB from wallet ${wallet.address.slice(0, 8)}...`);
    
    try {
      const txHash = await this.tokenCreator.buyToken(tokenAddress, buyAmount, wallet);
      
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
   * Executes a sell transaction
   */
  private async executeSell(tokenAddress: string, wallet: Wallet) {
    try {
      // Get token balance
      const balance = await this.contractManager.getTokenBalance(
        tokenAddress,
        wallet.address,
        wallet
      );

      if (balance === BigInt(0)) {
        Logger.warn('No tokens to sell, skipping sell transaction');
        return;
      }

      // Sell random percentage of balance
      const sellPercentage = this.getRandomSellPercentage();
      const sellAmount = (balance * BigInt(sellPercentage)) / BigInt(100);

      if (sellAmount === BigInt(0)) {
        Logger.warn('Sell amount too small, skipping');
        return;
      }

      Logger.info(
        `Executing sell: ${sellPercentage}% of balance from wallet ${wallet.address.slice(0, 8)}...`
      );

      const txHash = await this.tokenCreator.sellToken(tokenAddress, sellAmount, wallet);
      
      this.stats.totalTrades++;
      this.stats.sells++;
      
      return txHash;
    } catch (error) {
      Logger.error('Sell transaction failed', error);
      throw error;
    }
  }

  /**
   * Gets a random buy amount within configured range
   */
  private getRandomBuyAmount(): number {
    const min = this.config.minBuyAmount;
    const max = this.config.maxBuyAmount;
    return Math.random() * (max - min) + min;
  }

  /**
   * Gets a random sell percentage within configured range
   */
  private getRandomSellPercentage(): number {
    const min = this.config.minSellPercentage;
    const max = this.config.maxSellPercentage;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Gets a random interval within configured range
   */
  private getRandomInterval(): number {
    const min = this.config.minInterval;
    const max = this.config.maxInterval;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Sleeps for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Prints volume statistics
   */
  private printStats() {
    Logger.stats({
      trades: this.stats.totalTrades,
      volume: this.stats.totalVolume,
      buys: this.stats.buys,
      sells: this.stats.sells,
    });
  }

  /**
   * Gets current statistics
   */
  getStats(): VolumeStats {
    return { ...this.stats };
  }

  /**
   * Resets statistics
   */
  resetStats() {
    this.stats = {
      totalTrades: 0,
      totalVolume: '0',
      buys: 0,
      sells: 0,
      profitLoss: '0',
    };
  }
}

