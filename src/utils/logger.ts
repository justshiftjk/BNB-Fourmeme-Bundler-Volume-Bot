import chalk from 'chalk';

export class Logger {
  static info(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(chalk.blue(`[INFO ${timestamp}]`), message, data || '');
  }

  static success(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(chalk.green(`[SUCCESS ${timestamp}]`), message, data || '');
  }

  static error(message: string, error?: any) {
    const timestamp = new Date().toISOString();
    console.log(chalk.red(`[ERROR ${timestamp}]`), message);
    if (error) {
      console.error(chalk.red(error.message || error));
    }
  }

  static warn(message: string, data?: any) {
    const timestamp = new Date().toISOString();
    console.log(chalk.yellow(`[WARN ${timestamp}]`), message, data || '');
  }

  static debug(message: string, data?: any) {
    if (process.env.DEBUG === 'true') {
      const timestamp = new Date().toISOString();
      console.log(chalk.gray(`[DEBUG ${timestamp}]`), message, data || '');
    }
  }

  static trade(type: 'BUY' | 'SELL', amount: string, token: string, hash: string) {
    const timestamp = new Date().toISOString();
    const color = type === 'BUY' ? chalk.green : chalk.magenta;
    console.log(
      color(`[${type} ${timestamp}]`),
      `Amount: ${amount} | Token: ${token.slice(0, 8)}... | TX: ${hash.slice(0, 10)}...`
    );
  }

  static stats(stats: { trades: number; volume: string; buys: number; sells: number }) {
    console.log(chalk.cyan('\n=== Volume Bot Statistics ==='));
    console.log(chalk.white(`Total Trades: ${stats.trades}`));
    console.log(chalk.white(`Total Volume: ${stats.volume} BNB`));
    console.log(chalk.green(`Buys: ${stats.buys}`));
    console.log(chalk.magenta(`Sells: ${stats.sells}`));
    console.log(chalk.cyan('============================\n'));
  }
}

