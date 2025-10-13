import { ethers, parseEther, Wallet } from 'ethers';
import { BotConfig } from '../types';
import { ContractManager } from '../utils/contracts';
import { Logger } from '../utils/logger';

/**
 * PancakeSwap trader for tokens that have graduated from four.meme bonding curve
 */
export class PancakeSwapTrader {
  private contractManager: ContractManager;

  constructor(private config: BotConfig) {
    this.contractManager = new ContractManager(config);
  }

  /**
   * Buys tokens on PancakeSwap
   */
  async buyOnPancakeSwap(
    tokenAddress: string,
    bnbAmount: number,
    wallet: Wallet
  ): Promise<string> {
    try {
      const router = this.contractManager.getPancakeRouterContract(wallet);
      const bnbValue = parseEther(bnbAmount.toString());

      // Create swap path: BNB -> Token
      const path = [this.config.wbnbAddress, tokenAddress];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(bnbValue, path);
      const expectedTokens = amountsOut[1];

      // Apply slippage tolerance
      const minTokensOut = (expectedTokens * BigInt(100 - this.config.slippageTolerance)) / BigInt(100);

      // Set deadline (10 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 600;

      // Execute swap
      const tx = await router.swapExactETHForTokens(
        minTokensOut,
        path,
        wallet.address,
        deadline,
        {
          value: bnbValue,
          gasLimit: this.config.gasLimit,
          gasPrice: parseEther(this.config.gasPrice).toString(),
        }
      );

      await tx.wait();
      Logger.trade('BUY', bnbAmount.toString(), tokenAddress, tx.hash);
      
      return tx.hash;
    } catch (error) {
      Logger.error('PancakeSwap buy failed', error);
      throw error;
    }
  }

  /**
   * Sells tokens on PancakeSwap
   */
  async sellOnPancakeSwap(
    tokenAddress: string,
    tokenAmount: bigint,
    wallet: Wallet
  ): Promise<string> {
    try {
      const router = this.contractManager.getPancakeRouterContract(wallet);

      // Approve router to spend tokens
      await this.contractManager.approveToken(
        tokenAddress,
        this.config.pancakeswapRouter,
        tokenAmount,
        wallet
      );

      // Create swap path: Token -> BNB
      const path = [tokenAddress, this.config.wbnbAddress];

      // Get expected output amount
      const amountsOut = await router.getAmountsOut(tokenAmount, path);
      const expectedBnb = amountsOut[1];

      // Apply slippage tolerance
      const minBnbOut = (expectedBnb * BigInt(100 - this.config.slippageTolerance)) / BigInt(100);

      // Set deadline (10 minutes from now)
      const deadline = Math.floor(Date.now() / 1000) + 600;

      // Execute swap
      const tx = await router.swapExactTokensForETH(
        tokenAmount,
        minBnbOut,
        path,
        wallet.address,
        deadline,
        {
          gasLimit: this.config.gasLimit,
          gasPrice: parseEther(this.config.gasPrice).toString(),
        }
      );

      await tx.wait();
      Logger.trade('SELL', ethers.formatEther(expectedBnb), tokenAddress, tx.hash);
      
      return tx.hash;
    } catch (error) {
      Logger.error('PancakeSwap sell failed', error);
      throw error;
    }
  }

  /**
   * Gets token price on PancakeSwap
   */
  async getTokenPrice(tokenAddress: string, wallet: Wallet): Promise<string> {
    try {
      const router = this.contractManager.getPancakeRouterContract(wallet);
      const oneToken = parseEther('1');
      
      const path = [tokenAddress, this.config.wbnbAddress];
      const amountsOut = await router.getAmountsOut(oneToken, path);
      
      return ethers.formatEther(amountsOut[1]);
    } catch (error) {
      Logger.error('Failed to get token price', error);
      return '0';
    }
  }

  /**
   * Checks if token has liquidity on PancakeSwap
   */
  async hasLiquidity(tokenAddress: string, wallet: Wallet): Promise<boolean> {
    try {
      const price = await this.getTokenPrice(tokenAddress, wallet);
      return parseFloat(price) > 0;
    } catch (error) {
      return false;
    }
  }
}

