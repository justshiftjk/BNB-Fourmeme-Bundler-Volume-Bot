import { ethers, parseEther, Wallet } from 'ethers';
import { BotConfig, TokenMetadata, TokenInfo } from '../types';
import { ContractManager } from '../utils/contracts';
import { Logger } from '../utils/logger';

export class TokenCreator {
  private contractManager: ContractManager;

  constructor(private config: BotConfig) {
    this.contractManager = new ContractManager(config);
  }

  /**
   * Creates a token on four.meme and bundles it with an initial buy
   */
  async createTokenWithBuy(
    metadata: TokenMetadata,
    wallet: Wallet
  ): Promise<{ tokenAddress: string; createTxHash: string; buyTxHash: string }> {
    try {
      Logger.info(`Creating token: ${metadata.name} (${metadata.symbol})`);

      // Step 1: Create the token
      const fourMemeFactory = this.contractManager.getFourMemeFactoryContract(wallet);
      
      const createTx = await fourMemeFactory.createToken(
        metadata.name,
        metadata.symbol,
        metadata.description,
        metadata.logoUrl || '',
        {
          gasLimit: this.config.gasLimit,
          gasPrice: parseEther(this.config.gasPrice).toString(),
        }
      );

      Logger.info(`Token creation transaction sent: ${createTx.hash}`);
      const createReceipt = await createTx.wait();

      // Extract token address from event logs
      const tokenAddress = await this.extractTokenAddressFromReceipt(createReceipt);
      
      if (!tokenAddress) {
        throw new Error('Failed to extract token address from creation receipt');
      }

      Logger.success(`Token created at address: ${tokenAddress}`);

      // Step 2: Bundle with initial buy
      Logger.info(`Executing initial buy of ${this.config.initialBuyAmount} BNB`);
      
      const buyTxHash = await this.buyToken(
        tokenAddress,
        this.config.initialBuyAmount,
        wallet
      );

      Logger.success(`Initial buy completed: ${buyTxHash}`);

      return {
        tokenAddress,
        createTxHash: createTx.hash,
        buyTxHash,
      };
    } catch (error) {
      Logger.error('Failed to create token with bundled buy', error);
      throw error;
    }
  }

  /**
   * Buys tokens on four.meme bonding curve
   */
  async buyToken(
    tokenAddress: string,
    bnbAmount: number,
    wallet: Wallet
  ): Promise<string> {
    try {
      const fourMemeFactory = this.contractManager.getFourMemeFactoryContract(wallet);
      const bnbValue = parseEther(bnbAmount.toString());

      // Get quote for expected tokens
      const tokensOut = await fourMemeFactory.getBuyQuote(tokenAddress, bnbValue);
      
      // Apply slippage tolerance
      const minTokensOut = (tokensOut * BigInt(100 - this.config.slippageTolerance)) / BigInt(100);

      const tx = await fourMemeFactory.buy(tokenAddress, minTokensOut, {
        value: bnbValue,
        gasLimit: this.config.gasLimit,
        gasPrice: parseEther(this.config.gasPrice).toString(),
      });

      const receipt = await tx.wait();
      Logger.trade('BUY', bnbAmount.toString(), tokenAddress, tx.hash);
      
      return tx.hash;
    } catch (error) {
      Logger.error('Failed to buy token', error);
      throw error;
    }
  }

  /**
   * Sells tokens on four.meme bonding curve
   */
  async sellToken(
    tokenAddress: string,
    tokenAmount: bigint,
    wallet: Wallet
  ): Promise<string> {
    try {
      const fourMemeFactory = this.contractManager.getFourMemeFactoryContract(wallet);

      // Get quote for expected BNB
      const bnbOut = await fourMemeFactory.getSellQuote(tokenAddress, tokenAmount);
      
      // Apply slippage tolerance
      const minBnbOut = (bnbOut * BigInt(100 - this.config.slippageTolerance)) / BigInt(100);

      // Approve token if needed
      await this.contractManager.approveToken(
        tokenAddress,
        this.config.fourMemeFactory,
        tokenAmount,
        wallet
      );

      const tx = await fourMemeFactory.sell(tokenAddress, tokenAmount, minBnbOut, {
        gasLimit: this.config.gasLimit,
        gasPrice: parseEther(this.config.gasPrice).toString(),
      });

      const receipt = await tx.wait();
      Logger.trade('SELL', ethers.formatEther(bnbOut), tokenAddress, tx.hash);
      
      return tx.hash;
    } catch (error) {
      Logger.error('Failed to sell token', error);
      throw error;
    }
  }

  /**
   * Extracts token address from creation transaction receipt
   */
  private async extractTokenAddressFromReceipt(receipt: any): Promise<string | null> {
    // This depends on the actual event structure of four.meme
    // Typically, it would be in the logs of the receipt
    
    for (const log of receipt.logs) {
      try {
        // Look for TokenCreated or similar event
        // The token address is usually in the first or second parameter
        if (log.topics.length > 1) {
          // Assuming the token address is in the first indexed parameter
          const tokenAddress = ethers.getAddress('0x' + log.topics[1].slice(-40));
          return tokenAddress;
        }
      } catch (e) {
        continue;
      }
    }

    // Fallback: check for contract creation in logs
    for (const log of receipt.logs) {
      if (log.address && log.address !== this.config.fourMemeFactory) {
        return log.address;
      }
    }

    return null;
  }

  /**
   * Gets token information
   */
  async getTokenInfo(tokenAddress: string, wallet: Wallet): Promise<TokenInfo> {
    return this.contractManager.getTokenInfo(tokenAddress, wallet);
  }
}

