import { botConfig } from './config';
import { WalletManager } from './utils/walletManager';
import { Logger } from './utils/logger';

async function main() {
  try {
    Logger.info('=== Four.meme BNB Volume Bot ===\n');
    Logger.info('Available commands:');
    Logger.info('  npm run create  - Create a new token with bundled buy');
    Logger.info('  npm run volume  - Start volume boosting for a token');
    Logger.info('  npm run dev     - Run this help message\n');

    // Test wallet connection
    const walletManager = new WalletManager(botConfig);
    Logger.info(`Connected to BNB Chain (Chain ID: ${botConfig.chainId})`);
    Logger.info(`RPC URL: ${botConfig.rpcUrl}`);
    Logger.info(`Loaded ${walletManager.getAllWallets().length} wallet(s)\n`);

    const balances = await walletManager.getAllBalances();
    Logger.info('=== Wallet Balances ===');
    balances.forEach((balance, address) => {
      Logger.info(`${address}: ${balance} BNB`);
    });

    Logger.info('\n=== Configuration ===');
    Logger.info(`Four.meme Factory: ${botConfig.fourMemeFactory || 'NOT SET'}`);
    Logger.info(`PancakeSwap Router: ${botConfig.pancakeswapRouter}`);
    Logger.info(`Buy Range: ${botConfig.minBuyAmount} - ${botConfig.maxBuyAmount} BNB`);
    Logger.info(`Sell Range: ${botConfig.minSellPercentage}% - ${botConfig.maxSellPercentage}%`);
    Logger.info(`Interval: ${botConfig.minInterval / 1000}s - ${botConfig.maxInterval / 1000}s`);

    if (!botConfig.fourMemeFactory || botConfig.fourMemeFactory === '0x...') {
      Logger.warn('\n⚠️  WARNING: Four.meme factory address not configured!');
      Logger.warn('Please update FOURMEME_FACTORY_ADDRESS in your .env file');
    }

  } catch (error) {
    Logger.error('Failed to initialize bot', error);
    process.exit(1);
  }
}

main();

