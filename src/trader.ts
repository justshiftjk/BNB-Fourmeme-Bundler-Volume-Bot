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
    const managerAddress = process.env.TOKEN_MANAGER2 || '0x5c952063c7fc8610FFDB798152D69F0B9550762b';
    const helper3Address = process.env.HELPER3_ADDRESS || '0xF251F83e40a78868FcfA3FA4599Dad6494E46034';
    const pancakeRouterAddress = process.env.PANCAKE_ROUTER_ADDRESS || '0x10ED43C718714eb63d5aA57B78B54704E256024E';
    const wbnbAddress = process.env.WBNB_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
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
    try {
      console.log(`🟣 Running buyTokenAMAP (spend fixed BNB)... with Wallet: ${this.wallet.address} and BNB amount: ${bnbAmount}`);

      const fundsToSpend = ethers.parseEther(bnbAmount.toFixed(18));
      console.log(`Funds to spend: ${fundsToSpend}`);

      const helperContract = new ethers.Contract(
        this.helper3Address,
        HELPER3_ABI,
        this.provider
      );

      // Estimate tokens you can buy - matching Rust exactly
      console.log('📊 Estimating tokens you can buy...');
      const [, , estimatedTokens] = await helperContract.tryBuy(tokenAddress, 0, fundsToSpend);
      const estimatedTokensFormatted = ethers.formatEther(estimatedTokens);

      console.log(`💰 You'll likely receive ~${estimatedTokensFormatted} tokens for ${bnbAmount} BNB`);

      // Get start timestamp (in seconds) - matching Rust exactly
      const startTime = Math.floor(Date.now() / 1000);
      console.log(`🕒 Start time: ${startTime}`);

      const tokenManagerContract = new ethers.Contract(
        this.tokenManagerAddress,
        TOKEN_MANAGER_ABI,
        this.wallet
      );

      const tx = await tokenManagerContract.buyTokenAMAP(
        tokenAddress,
        fundsToSpend,
        0, // minAmount
        { value: fundsToSpend, gasPrice: await this.getGasPrice() }
      );

      // Get end timestamp (in seconds) - matching Rust exactly
      const endTime = Math.floor(Date.now() / 1000);
      const duration = endTime - startTime;

      console.log(`✅ Transaction confirmed in ${duration} seconds`);
      console.log(`✅ buyTokenAMAP tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);

      // ✅ Fetch real token balance after buy
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const realTokenBalance = await tokenContract.balanceOf(this.wallet.address);

      return {
        estimatedTokens: estimatedTokensFormatted,
        realTokenBalance: realTokenBalance,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString(),
        duration: duration,
      };
    } catch (error) {
      return {
        estimatedTokens: '0',
        realTokenBalance: BigInt(0),
        txHash: '',
        gasUsed: '0',
        duration: 0,
      };
    }
  }

  async buyTokenBigInt(tokenAddress: string, bnbAmount: BigInt): Promise<{ estimatedTokens: string, realTokenBalance: bigint, txHash: string, gasUsed: string, duration: number }> {
    try {
      console.log(`🟣 Running buyTokenAMAP (spend fixed BNB)... with Wallet: ${this.wallet.address} and BNB amount: ${ethers.formatEther(bnbAmount as any)}`);

      const fundsToSpend = bnbAmount;//ethers.parseEther(bnbAmount.toFixed(18));
      console.log(`Funds to spend: ${fundsToSpend}`);

      const helperContract = new ethers.Contract(
        this.helper3Address,
        HELPER3_ABI,
        this.provider
      );

      // Estimate tokens you can buy - matching Rust exactly
      console.log('📊 Estimating tokens you can buy...');
      const [, , estimatedTokens] = await helperContract.tryBuy(tokenAddress, 0, fundsToSpend);
      const estimatedTokensFormatted = ethers.formatEther(estimatedTokens);

      console.log(`💰 You'll likely receive ~${estimatedTokensFormatted} tokens for ${bnbAmount} BNB`);

      // Get start timestamp (in seconds) - matching Rust exactly
      const startTime = Math.floor(Date.now() / 1000);
      console.log(`🕒 Start time: ${startTime}`);

      const tokenManagerContract = new ethers.Contract(
        this.tokenManagerAddress,
        TOKEN_MANAGER_ABI,
        this.wallet
      );

      const tx = await tokenManagerContract.buyTokenAMAP(
        tokenAddress,
        fundsToSpend,
        0, // minAmount
        { value: fundsToSpend, gasPrice: await this.getGasPrice() }
      );

      // Get end timestamp (in seconds) - matching Rust exactly
      const endTime = Math.floor(Date.now() / 1000);
      const duration = endTime - startTime;

      console.log(`✅ Transaction confirmed in ${duration} seconds`);
      console.log(`✅ buyTokenAMAP tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);

      // ✅ Fetch real token balance after buy
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const realTokenBalance = await tokenContract.balanceOf(this.wallet.address);

      return {
        estimatedTokens: estimatedTokensFormatted,
        realTokenBalance: realTokenBalance,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString(),
        duration: duration,
      };
    } catch (error) {
      return {
        estimatedTokens: '0',
        realTokenBalance: BigInt(0),
        txHash: '',
        gasUsed: '0',
        duration: 0,
      };
    }
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

  async approveTokenManager(tokenAddress: string): Promise<boolean> {
    const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    const allowance = await erc20Contract.allowance(this.wallet.address, this.tokenManagerAddress);
    console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);
    if (allowance < ethers.MaxUint256) {
      const approveTx = await erc20Contract.approve(this.tokenManagerAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
      console.log(`✅ Approval tx sent: ${approveTx.hash}`);
      await approveTx.wait();
    }
    return true;
  }

  // Four.Meme sell token before migration
  async sellAmount(tokenAddress: string, tokenAmount: number): Promise<string> {
    try {
      console.log(`🔵 Running sellToken (sell exact amount)...`);

      const amountToSell = ethers.parseEther(tokenAmount.toString());
      console.log(`Amount to sell: ${amountToSell}`);
      console.log(`Token amount: ${tokenAmount}`);

      const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

      const allowance = await erc20Contract.allowance(this.wallet.address, this.tokenManagerAddress);
      console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);

      if (allowance < amountToSell) {
        // Approve first - matching Rust exactly
        console.log('🔓 Approving TokenManager2 as spender...');
        const approveTx = await erc20Contract.approve(this.tokenManagerAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
        console.log(`✅ Approval tx sent: ${approveTx.hash}`);
        await approveTx.wait();

        // Wait 5 seconds like Rust
        console.log('⏳ Waiting 5 seconds before sell transaction...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const tokenManagerContract = new ethers.Contract(
        this.tokenManagerAddress,
        TOKEN_MANAGER_ABI,
        this.wallet
      );

      const tx = await tokenManagerContract.sellToken(tokenAddress, amountToSell, { gasPrice: await this.getGasPrice() });
      console.log(`✅ sellToken tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to sell amount:', error);
      throw error;
    }
  }

  // Four.Meme sell token before migration
  async sellAmountBigInt(tokenAddress: string, tokenAmount: bigint): Promise<string> {
    try {
      console.log(`🔵 Running sellToken (sell exact amount)...`);

      const amountToSell = tokenAmount;

      const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

      const allowance = await erc20Contract.allowance(this.wallet.address, this.tokenManagerAddress);
      console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);

      if (allowance < amountToSell) {
        // Approve first - matching Rust exactly
        console.log('🔓 Approving TokenManager2 as spender...');
        const approveTx = await erc20Contract.approve(this.tokenManagerAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
        console.log(`✅ Approval tx sent: ${approveTx.hash}`);
        await approveTx.wait();

        // Wait 5 seconds like Rust
        console.log('⏳ Waiting 5 seconds before sell transaction...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const tokenManagerContract = new ethers.Contract(
        this.tokenManagerAddress,
        TOKEN_MANAGER_ABI,
        this.wallet
      );

      const tx = await tokenManagerContract.sellToken(tokenAddress, amountToSell, { gasPrice: await this.getGasPrice() });
      console.log(`✅ sellToken tx sent: ${tx.hash}`);

      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);

      return tx.hash;
    } catch (error) {
      console.error('❌ Failed to sell amount:', error);
      throw error;
    }
  }

  // Buy token via PancakeRouter after migration
  async buyPancakeToken(tokenAddress: string, bnbAmount: number): Promise<{ realTokenBalance: bigint, txHash: string, gasUsed: string }> {
    try {
      console.log(`🟣 Running buyPancakeToken (spend fixed BNB)...`);
      const fundsToSpend = ethers.parseEther(bnbAmount.toString());
      console.log(`💰 Funds to spend: ${fundsToSpend} BNB`);
      const pancakeRouterContract = new ethers.Contract(this.pancakeRouterAddress, PANCAKE_ROUTER_ABI, this.wallet);

      const tx = await pancakeRouterContract.swapExactETHForTokens(
        0,  // amountOutMin = 0 for maximum speed
        [this.wbnbAddress, tokenAddress],
        this.wallet.address,
        Math.floor(Date.now() / 1000) + 3600,
        { value: fundsToSpend, gasPrice: await this.getGasPrice() }
      );
      const receipt = await tx.wait();

      // ✅ Fetch real token balance after sell
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const realTokenBalance = await tokenContract.balanceOf(this.wallet.address);

      return {
        realTokenBalance: realTokenBalance,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString()
      };
    }
    catch (error) {
      return {
        realTokenBalance: BigInt(0),
        txHash: '',
        gasUsed: '0'
      };
    }
  }

  async buyPancakeTokenBigInt(tokenAddress: string, bnbAmount: BigInt): Promise<{ realTokenBalance: bigint, txHash: string, gasUsed: string }> {
    try {
      console.log(`🟣 Running buyPancakeToken (spend fixed BNB)...`);
      const fundsToSpend = bnbAmount;//ethers.parseEther(bnbAmount.toString());
      console.log(`💰 Funds to spend: ${fundsToSpend} BNB`);
      const pancakeRouterContract = new ethers.Contract(this.pancakeRouterAddress, PANCAKE_ROUTER_ABI, this.wallet);

      const tx = await pancakeRouterContract.swapExactETHForTokens(
        0,  // amountOutMin = 0 for maximum speed
        [this.wbnbAddress, tokenAddress],
        this.wallet.address,
        Math.floor(Date.now() / 1000) + 3600,
        { value: fundsToSpend, gasPrice: await this.getGasPrice() }
      );
      const receipt = await tx.wait();

      // ✅ Fetch real token balance after sell
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
      const realTokenBalance = await tokenContract.balanceOf(this.wallet.address);

      return {
        realTokenBalance: realTokenBalance,
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString()
      };
    }
    catch (error) {
      return {
        realTokenBalance: BigInt(0),
        txHash: '',
        gasUsed: '0'
      };
    }
  }

  async approvePancakeRouter(tokenAddress: string): Promise<boolean> {
    const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);
    const allowance = await erc20Contract.allowance(this.wallet.address, this.pancakeRouterAddress);
    console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);
    if (allowance < ethers.MaxUint256) {
      const approveTx = await erc20Contract.approve(this.pancakeRouterAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
      console.log(`✅ Approval tx sent: ${approveTx.hash}`);
    }
    return true;
  }

  // Sell token via PancakeRouter after migration
  async sellPancakeToken(tokenAddress: string, tokenAmount: number): Promise<{ txHash: string, gasUsed: string }> {
    try {
      console.log(`🔵 Running sellPancakeToken (sell exact amount)...`);
      const amountToSell = ethers.parseEther(tokenAmount.toString());
      console.log(`💰 Amount to sell: ${amountToSell} tokens`);
      const pancakeRouterContract = new ethers.Contract(this.pancakeRouterAddress, PANCAKE_ROUTER_ABI, this.wallet);

      const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

      const allowance = await erc20Contract.allowance(this.wallet.address, this.pancakeRouterAddress);
      console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);

      if (allowance < amountToSell) {
        // Approve first - matching Rust exactly
        console.log('🔓 Approving PancakeRouter as spender...');
        const approveTx = await erc20Contract.approve(this.pancakeRouterAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
        console.log(`✅ Approval tx sent: ${approveTx.hash}`);
        await approveTx.wait();

        // Wait 5 seconds like Rust
        console.log('⏳ Waiting 5 seconds before sell transaction...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const tx = await pancakeRouterContract.swapExactTokensForETH(
        amountToSell,
        0,
        [tokenAddress, this.wbnbAddress],
        this.wallet.address,
        Math.floor(Date.now() / 1000) + 3600,
        { gasPrice: await this.getGasPrice() }
      );
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);
      console.log(`✅ sellPancakeToken tx sent: ${tx.hash}`);
      return {
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString()
      };
    }
    catch (error) {
      console.error('❌ Failed to sell pancake token:', error);
      return {
        txHash: '',
        gasUsed: '0'
      };
    }
  }

  async sellPancakeTokenBigInt(tokenAddress: string, tokenAmount: bigint): Promise<{ txHash: string, gasUsed: string }> {
    try {
      console.log(`🔵 Running sellPancakeToken (sell exact amount)...`);
      const amountToSell = tokenAmount;
      console.log(`💰 Amount to sell: ${amountToSell} tokens`);
      const pancakeRouterContract = new ethers.Contract(this.pancakeRouterAddress, PANCAKE_ROUTER_ABI, this.wallet);

      const erc20Contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.wallet);

      const allowance = await erc20Contract.allowance(this.wallet.address, this.pancakeRouterAddress);
      console.log(`📊 Allowance: ${ethers.formatEther(allowance)} tokens`);

      if (allowance < amountToSell) {
        // Approve first - matching Rust exactly
        console.log('🔓 Approving PancakeRouter as spender...');
        const approveTx = await erc20Contract.approve(this.pancakeRouterAddress, ethers.MaxUint256, { gasPrice: await this.getGasPrice() });
        console.log(`✅ Approval tx sent: ${approveTx.hash}`);
        await approveTx.wait();

        // Wait 5 seconds like Rust
        console.log('⏳ Waiting 5 seconds before sell transaction...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const tx = await pancakeRouterContract.swapExactTokensForETH(
        amountToSell,
        0,
        [tokenAddress, this.wbnbAddress],
        this.wallet.address,
        Math.floor(Date.now() / 1000) + 3600,
        { gasPrice: await this.getGasPrice() }
      );
      const receipt = await tx.wait();
      console.log(`✅ Transaction confirmed! Gas used: ${receipt?.gasUsed.toString()}`);
      console.log(`✅ sellPancakeToken tx sent: ${tx.hash}`);
      return {
        txHash: tx.hash,
        gasUsed: receipt?.gasUsed.toString()
      };
    }
    catch (error) {
      console.error('❌ Failed to sell pancake token:', error);
      return {
        txHash: '',
        gasUsed: '0'
      };
    }
  }
}

// Main execution - matching Rust implementation exactly
// async function main() {
//   const trader = new FourMemeTrader();
//   const tokenAddress = '0xd4d5f202dc0c4395ab27bccd9ff0f55c3d1d4444';
//   const migrationStatus = await trader.getMigrationStatus(tokenAddress);
//   if (migrationStatus) {
//     console.log('✅ Migration Status: True');
//     const buyAmount = 0.00001;
//     await trader.buyPancakeToken(tokenAddress, buyAmount);
//     const sellAmount = 10;
//     await trader.sellPancakeToken(tokenAddress, sellAmount);
//   } else {
//     console.log('❌ Migration Status: False');
//     const buyAmount = 0.00001;
//     const { estimatedTokens } = await trader.buyToken(tokenAddress, buyAmount);
//     console.log(`💰 Estimated Tokens: ${estimatedTokens}`);
//     const sellAmount = estimatedTokens;
//     await trader.sellAmount(tokenAddress, Number(sellAmount));
//   }
// }

// main().catch(console.error);