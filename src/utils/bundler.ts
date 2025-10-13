import { ethers, Wallet, TransactionRequest } from 'ethers';
import { BundleTransaction } from '../types';
import { Logger } from './logger';

/**
 * Transaction Bundler for executing multiple transactions in sequence
 */
export class TransactionBundler {
  constructor(private wallet: Wallet) {}

  /**
   * Bundles multiple transactions and executes them in sequence
   */
  async executeBundledTransactions(
    transactions: BundleTransaction[]
  ): Promise<string[]> {
    const txHashes: string[] = [];

    for (const tx of transactions) {
      try {
        const txRequest: TransactionRequest = {
          to: tx.to,
          data: tx.data,
          value: tx.value,
          gasLimit: tx.gasLimit,
        };

        const sentTx = await this.wallet.sendTransaction(txRequest);
        Logger.info(`Transaction sent: ${sentTx.hash}`);
        
        const receipt = await sentTx.wait();
        Logger.success(`Transaction confirmed: ${sentTx.hash}`);
        
        txHashes.push(sentTx.hash);
      } catch (error) {
        Logger.error('Transaction failed in bundle', error);
        throw error;
      }
    }

    return txHashes;
  }

  /**
   * Estimates total gas for a bundle of transactions
   */
  async estimateBundleGas(transactions: BundleTransaction[]): Promise<bigint> {
    let totalGas = BigInt(0);

    for (const tx of transactions) {
      const txRequest: TransactionRequest = {
        to: tx.to,
        data: tx.data,
        value: tx.value,
      };

      try {
        const gasEstimate = await this.wallet.estimateGas(txRequest);
        totalGas += gasEstimate;
      } catch (error) {
        Logger.warn(`Gas estimation failed for transaction to ${tx.to}`);
        totalGas += BigInt(tx.gasLimit);
      }
    }

    return totalGas;
  }

  /**
   * Creates a bundle transaction object
   */
  static createBundleTx(
    to: string,
    data: string,
    value: string = '0',
    gasLimit: number = 500000
  ): BundleTransaction {
    return {
      to,
      data,
      value,
      gasLimit,
    };
  }

  /**
   * Validates bundle transactions before execution
   */
  validateBundle(transactions: BundleTransaction[]): boolean {
    if (transactions.length === 0) {
      Logger.error('Bundle is empty');
      return false;
    }

    for (const tx of transactions) {
      if (!ethers.isAddress(tx.to)) {
        Logger.error(`Invalid address in bundle: ${tx.to}`);
        return false;
      }

      if (!tx.data || tx.data === '0x') {
        Logger.warn(`Empty data in transaction to ${tx.to}`);
      }
    }

    return true;
  }
}

