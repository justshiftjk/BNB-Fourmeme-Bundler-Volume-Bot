import { botConfig } from './config';
import { WalletManager } from './utils/walletManager';
import { VolumeBooster } from './services/volumeBooster';
import { Logger } from './utils/logger';
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
    Logger.info('=== Four.meme Volume Bot ===\n');

    // Get token address from user
    const tokenAddress = await question('Enter token address: ');

    if (!tokenAddress || !tokenAddress.startsWith('0x')) {
      throw new Error('Invalid token address');
    }

    // Get optional duration
    const durationInput = await question('Duration in minutes (leave empty for unlimited): ');
    const duration = durationInput ? parseInt(durationInput) * 60 * 1000 : undefined;

    // Initialize wallet manager
    const walletManager = new WalletManager(botConfig);
    Logger.info(`\nLoaded ${walletManager.getAllWallets().length} wallets`);

    // Show wallet balances
    const balances = await walletManager.getAllBalances();
    Logger.info('\n=== Wallet Balances ===');
    balances.forEach((balance, address) => {
      Logger.info(`${address.slice(0, 8)}...: ${balance} BNB`);
    });

    Logger.info('\n=== Configuration ===');
    Logger.info(`Buy Amount: ${botConfig.minBuyAmount} - ${botConfig.maxBuyAmount} BNB`);
    Logger.info(`Sell Percentage: ${botConfig.minSellPercentage}% - ${botConfig.maxSellPercentage}%`);
    Logger.info(`Interval: ${botConfig.minInterval / 1000} - ${botConfig.maxInterval / 1000} seconds`);
    Logger.info(`Slippage Tolerance: ${botConfig.slippageTolerance}%`);
    
    if (duration) {
      Logger.info(`Duration: ${durationInput} minutes`);
    } else {
      Logger.info('Duration: Unlimited (Press Ctrl+C to stop)');
    }

    const confirm = await question('\nStart volume bot? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      Logger.warn('Volume bot cancelled');
      rl.close();
      return;
    }

    rl.close();

    // Initialize and start volume booster
    const volumeBooster = new VolumeBooster(botConfig, walletManager);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      Logger.warn('\nReceived SIGINT, stopping bot...');
      volumeBooster.stop();
    });

    process.on('SIGTERM', () => {
      Logger.warn('\nReceived SIGTERM, stopping bot...');
      volumeBooster.stop();
    });

    Logger.info('\n=== Starting Volume Bot ===\n');
    await volumeBooster.start(tokenAddress, duration);

    Logger.info('\n=== Volume Bot Stopped ===');
    process.exit(0);

  } catch (error) {
    Logger.error('Volume bot failed', error);
    rl.close();
    process.exit(1);
  }
}

main();

