import { ethers, Contract, Wallet } from 'ethers';
import ERC20_ABI from '../abis/ERC20.json';
import PANCAKE_ROUTER_ABI from '../abis/PancakeRouter.json';
import FOURMEME_FACTORY_ABI from '../abis/FourMemeFactory.json';
import { BotConfig } from '../types';

export class ContractManager {
  constructor(private config: BotConfig) {}

  getERC20Contract(tokenAddress: string, wallet: Wallet): Contract {
    return new Contract(tokenAddress, ERC20_ABI, wallet);
  }

  getPancakeRouterContract(wallet: Wallet): Contract {
    return new Contract(this.config.pancakeswapRouter, PANCAKE_ROUTER_ABI, wallet);
  }

  getFourMemeFactoryContract(wallet: Wallet): Contract {
    return new Contract(this.config.fourMemeFactory, FOURMEME_FACTORY_ABI, wallet);
  }

  async getTokenInfo(tokenAddress: string, wallet: Wallet) {
    const tokenContract = this.getERC20Contract(tokenAddress, wallet);
    
    try {
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        tokenContract.name(),
        tokenContract.symbol(),
        tokenContract.decimals(),
        tokenContract.totalSupply(),
      ]);

      return {
        address: tokenAddress,
        name,
        symbol,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString(),
      };
    } catch (error) {
      throw new Error(`Failed to get token info: ${error}`);
    }
  }

  async getTokenBalance(tokenAddress: string, walletAddress: string, wallet: Wallet): Promise<bigint> {
    const tokenContract = this.getERC20Contract(tokenAddress, wallet);
    const balance = await tokenContract.balanceOf(walletAddress);
    return balance;
  }

  async approveToken(
    tokenAddress: string,
    spenderAddress: string,
    amount: bigint,
    wallet: Wallet
  ): Promise<string> {
    const tokenContract = this.getERC20Contract(tokenAddress, wallet);
    
    const allowance = await tokenContract.allowance(wallet.address, spenderAddress);
    
    if (allowance >= amount) {
      return 'Already approved';
    }

    const tx = await tokenContract.approve(spenderAddress, amount);
    await tx.wait();
    return tx.hash;
  }

  async estimateGas(contract: Contract, method: string, args: any[]): Promise<bigint> {
    try {
      const gasEstimate = await contract[method].estimateGas(...args);
      return gasEstimate;
    } catch (error) {
      throw new Error(`Gas estimation failed: ${error}`);
    }
  }
}

