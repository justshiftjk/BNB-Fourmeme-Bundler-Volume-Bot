import { botConfig } from './config';
import { WalletManager } from './utils/walletManager';
import { TokenCreator } from './services/tokenCreator';
import { Logger } from './utils/logger';
import { TokenMetadata } from './types';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    Logger.info('=== Four.meme Token Creator with Bundled Buy ===\n');

    // Initialize wallet manager
    const walletManager = new WalletManager(botConfig);
    const wallet = walletManager.getWallet(0); // Use first wallet

    Logger.info(`Using wallet: ${wallet.address}`);
    const balance = await walletManager.getBalance(0);
    Logger.info(`Wallet balance: ${balance} BNB\n`);

    // Get token metadata from user
    const name = await question('Token Name: ');
    const symbol = await question('Token Symbol: ');
    const description = await question('Token Description: ');
    const logoUrl = await question('Logo URL (optional): ');
    const twitter = await question('Twitter (optional): ');
    const telegram = await question('Telegram (optional): ');
    const website = await question('Website (optional): ');

    const metadata: TokenMetadata = {
      name,
      symbol,
      description,
      logoUrl: logoUrl || undefined,
      twitter: twitter || undefined,
      telegram: telegram || undefined,
      website: website || undefined,
    };

    Logger.info('\n=== Creating Token ===');
    Logger.info(`Initial buy amount: ${botConfig.initialBuyAmount} BNB\n`);

    const tokenCreator = new TokenCreator(botConfig);
    const result = await tokenCreator.createTokenWithBuy(metadata, wallet);

    Logger.success('\n=== Token Creation Successful ===');
    Logger.success(`Token Address: ${result.tokenAddress}`);
    Logger.success(`Creation TX: ${result.createTxHash}`);
    Logger.success(`Initial Buy TX: ${result.buyTxHash}`);

    // Get token info
    const tokenInfo = await tokenCreator.getTokenInfo(result.tokenAddress, wallet);
    Logger.info('\n=== Token Information ===');
    Logger.info(`Name: ${tokenInfo.name}`);
    Logger.info(`Symbol: ${tokenInfo.symbol}`);
    Logger.info(`Decimals: ${tokenInfo.decimals}`);
    Logger.info(`Total Supply: ${tokenInfo.totalSupply}`);

    Logger.info('\n=== Next Steps ===');
    Logger.info(`1. Save your token address: ${result.tokenAddress}`);
    Logger.info(`2. Run volume bot: npm run volume`);
    Logger.info(`3. Provide the token address when prompted\n`);

    rl.close();
  } catch (error) {
    Logger.error('Token creation failed', error);
    rl.close();
    process.exit(1);
  }
}

main();

