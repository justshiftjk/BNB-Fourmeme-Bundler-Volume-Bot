import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import { ERC20_ABI, HELPER3_ABI, PANCAKE_ROUTER_ABI, TOKEN_MANAGER_ABI } from './4meme-utils/abi';

dotenv.config();

export default class FourMemeTrader {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private tokenManagerAddress: string;
  private helper3Address: string;
  private pancakeRouterAddress: string;
  private wbnbAddress: string;

  constructor() {
    // Load environment variables matching Rust implementation
    const privateKey = process.env.PRIVATE_KEY;
    const rpcUrl = process.env.RPC_URL;
    const managerAddress = process.env.TOKEN_MANAGER2;
    const helper3Address = process.env.HELPER3_ADDRESS;
    const pancakeRouterAddress = process.env.PANCAKE_ROUTER_ADDRESS;
    const wbnbAddress = process.env.WBNB_ADDRESS;
    if (!pancakeRouterAddress) {
      throw new Error('Missing PANCAKE_ROUTER_ADDRESS in .env');
    }
    if (!wbnbAddress) {
      throw new Error('Missing WBNB_ADDRESS in .env');
    }
    if (!privateKey) {
      throw new Error('Missing PRIVATE_KEY in .env');
    }
    if (!rpcUrl) {
      throw new Error('Missing RPC_URL in .env');
    }
    if (!managerAddress) {
      throw new Error('Missing TOKEN_MANAGER2 in .env');
    }
    if (!helper3Address) {
      throw new Error('Missing HELPER3_ADDRESS in .env');
    }

    // Initialize provider + wallet matching Rust
    this.provider = new ethers.JsonRpcProvider(rpcUrl, {
      name: 'bsc',
      chainId: 56
    });

    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.tokenManagerAddress = managerAddress;
    this.helper3Address = helper3Address;
    this.pancakeRouterAddress = pancakeRouterAddress;
    this.wbnbAddress = wbnbAddress;
    console.log(`🔗 Connected wallet: ${this.wallet.address}`);
  }

  setWallet(wallet: ethers.Wallet) {
    this.wallet = wallet;
    console.log(`🔗 Set wallet: ${this.wallet.address}`);
  }

  getWallet(): ethers.Wallet {
    return this.wallet;
  }

  // Fetch current gas price for BNB chain
  private async getGasPrice(): Promise<bigint> {
    const gasPrice = BigInt(await this.provider.send("eth_gasPrice", []));
    return gasPrice;
  }

  async getMigrationStatus(tokenAddress: string): Promise<boolean> {
    try {
      const helperContract = new ethers.Contract(this.helper3Address, HELPER3_ABI, this.provider);
      const tokenInfo = await helperContract.getTokenInfo(tokenAddress);
      const liquidityAdded = tokenInfo[11] as boolean;
      return liquidityAdded;
    } catch (error) {
      return false;
    }
  }

  async approveToken(tokenAddress: string): Promise<boolean> {
    try {
      const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

      // Check current allowance
      console.log('🔍 Checking current allowance...');
      const currentAllowance = await erc20Contract.allowance(this.wallet.address, this.tokenManagerAddress);
      console.log(`📊 Current allowance: ${ethers.formatEther(currentAllowance)} tokens`);

      // Only approve if allowance is insufficient (less than 1 token)
      const minAllowance = ethers.parseEther('1');
      if (currentAllowance >= minAllowance) {
        console.log('✅ Sufficient allowance already exists, skipping approval');
        return true;
      }

      console.log('🔓 Approving TokenManager as spender...');
      const tx = await erc20Contract.approve(this.tokenManagerAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
      console.log(`✅ Approval tx sent: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`✅ Approval confirmed! Gas used: ${receipt?.gasUsed.toString()}`);

      // Verify the approval
      const newAllowance = await erc20Contract.allowance(this.wallet.address, this.tokenManagerAddress);
      console.log(`📊 New allowance: ${ethers.formatEther(newAllowance)} tokens`);

      return true;
    } catch (error) {
      console.error('❌ Failed to approve token:', error);
      return false;
    }
  }

  // Four.Meme buy token before migration
  async buyToken(tokenAddress: string, bnbAmount: number): Promise<{ estimatedTokens: string, realTokenBalance: bigint, txHash: string, gasUsed: string, duration: number }> {
    // TODO: Implement buy token
  }

  async buyTokenBigInt(tokenAddress: string, bnbAmount: BigInt): Promise<{ estimatedTokens: string, realTokenBalance: bigint, txHash: string, gasUsed: string, duration: number }> {
    // TODO: Implement buy token big int
  }


  async getTokenBalance(tokenAddress: string): Promise<bigint> {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    const balance = await tokenContract.balanceOf(this.wallet.address);
    return balance;
  }

  async getTokenDecimals(tokenAddress: string): Promise<number> {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    const decimals = await tokenContract.decimals();
    return decimals;
  }

  // Four.Meme sell token before migration
  async sellAmount(tokenAddress: string, tokenAmount: number): Promise<string> {
    // TODO: Implement sell amount
  }

  // Four.Meme sell token before migration
  async sellAmountBigInt(tokenAddress: string, tokenAmount: bigint): Promise<string> {
    // TODO: Implement sell amount big int
  }

  // Buy token via PancakeRouter after migration
  async buyPancakeToken(tokenAddress: string, bnbAmount: number): Promise<{ realTokenBalance: bigint, txHash: string, gasUsed: string }> {
    // TODO: Implement buy pancake token
  }

  async buyPancakeTokenBigInt(tokenAddress: string, bnbAmount: BigInt): Promise<{ realTokenBalance: bigint, txHash: string, gasUsed: string }> {
    // TODO: Implement buy pancake token big int
  }

  // Sell token via PancakeRouter after migration
  async sellPancakeToken(tokenAddress: string, tokenAmount: number): Promise<{ txHash: string, gasUsed: string }> {
    // TODO: Implement sell pancake token
  }

  async sellPancakeTokenBigInt(tokenAddress: string, tokenAmount: bigint): Promise<{ txHash: string, gasUsed: string }> {
    // TODO: Implement sell pancake token big int
  }
}