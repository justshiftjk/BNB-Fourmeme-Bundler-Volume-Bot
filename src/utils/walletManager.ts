import { ethers, Wallet, JsonRpcProvider } from 'ethers';
import { BotConfig } from '../types';
import { Logger } from './logger';

export class WalletManager {
  private wallets: Wallet[] = [];
  private provider: JsonRpcProvider;

  constructor(private config: BotConfig) {
    this.provider = new JsonRpcProvider(config.rpcUrl);
    this.initializeWallets();
  }

  private initializeWallets() {
    for (const privateKey of this.config.privateKeys) {
      try {
        const wallet = new Wallet(privateKey, this.provider);
        this.wallets.push(wallet);
        Logger.info(`Wallet loaded: ${wallet.address}`);
      } catch (error) {
        Logger.error(`Failed to load wallet from private key`, error);
      }
    }

    if (this.wallets.length === 0) {
      throw new Error('No valid wallets loaded');
    }
  }

  getWallet(index: number): Wallet {
    if (index < 0 || index >= this.wallets.length) {
      throw new Error(`Invalid wallet index: ${index}`);
    }
    return this.wallets[index];
  }

  getRandomWallet(): Wallet {
    const randomIndex = Math.floor(Math.random() * this.wallets.length);
    return this.wallets[randomIndex];
  }

  getAllWallets(): Wallet[] {
    return this.wallets;
  }

  getProvider(): JsonRpcProvider {
    return this.provider;
  }

  async getBalance(walletIndex: number): Promise<string> {
    const wallet = this.getWallet(walletIndex);
    const balance = await this.provider.getBalance(wallet.address);
    return ethers.formatEther(balance);
  }

  async getAllBalances(): Promise<Map<string, string>> {
    const balances = new Map<string, string>();
    
    for (const wallet of this.wallets) {
      const balance = await this.provider.getBalance(wallet.address);
      balances.set(wallet.address, ethers.formatEther(balance));
    }
    
    return balances;
  }
}

