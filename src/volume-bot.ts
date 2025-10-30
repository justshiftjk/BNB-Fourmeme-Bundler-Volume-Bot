import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import FourMemeTrader from './trader';
import StealthFundABI from './Stealth-utils/StealthFund.json';

dotenv.config();

/* ---------- Types ---------- */

type VolumeBotParameters = {
    totalBNB: number;
    minDepositBNB: number;
    maxDepositBNB: number;
    minBuyWalletsNum: number;
    maxBuyWalletsNum: number;
    minPerCycleTime: number;
    maxPerCycleTime: number;
    minSellWalletsNum: number;
    maxSellWalletsNum: number;
    minPercentSellAmountAfterBuy: number;
    maxPercentSellAmountAfterBuy: number;
    cyclesLimit?: number;
    mnemonicPathPrefix?: string;
    networkRpc?: string;
    pancakeRouter?: string;
    wbnb?: string;
    tokenAddress: string;
    usePancakeAfterMigration?: boolean;
    minDelayBuy?: number;
    maxDelayBuy?: number;
    minDelaySell?: number;
    maxDelaySell?: number;
    gasBufferBNB: number;
};

interface WalletLog {
    index: number;
    address: string;
    privateKey: string;
    depositBNB: number;
    buyTxHash?: string;
    sellTxHash?: string;
    boughtVia?: string;
    soldVia?: string;
    estimatedTokens?: string;
    timestamp: string;
}

/* ---------- Helpers ---------- */

const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min;

const randFloat = (min: number, max: number) =>
    Math.random() * (max - min) + min;

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

/* ---------- Main Class ---------- */

export default class VolumeBot {
    provider: ethers.JsonRpcProvider;
    mainWallet: ethers.Wallet;
    params: VolumeBotParameters;
    wbnbAddress: string;
    pancakeRouterAddress: string;
    walletLogFile = 'wallets.json';
    walletLogs: WalletLog[] = [];
    stealthFundAddress: string;
    stealthMode: boolean;

    constructor(params: VolumeBotParameters) {
        const rpc = params.networkRpc ?? process.env.RPC_URL!;
        if (!rpc) throw new Error('RPC_URL required');

        const privateKey = process.env.PRIVATE_KEY;
        if (!privateKey) throw new Error('PRIVATE_KEY required in .env');

        this.provider = new ethers.JsonRpcProvider(rpc, { name: 'bsc', chainId: 56 });
        this.mainWallet = new ethers.Wallet(privateKey, this.provider);
        this.params = params;
        this.wbnbAddress = process.env.WBNB_ADDRESS || '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
        this.pancakeRouterAddress = process.env.PANCAKE_ROUTER_ADDRESS || '0x10ED43C718714eb63d5aA57B78B54704E256024E';
        this.stealthFundAddress = process.env.STEALTH_FUND_ADDRESS || '';
        this.stealthMode = process.env.STEALTH_MODE === 'true';

        console.log(`Main wallet: ${this.mainWallet.address}`);
        console.log(`Stealth mode: ${this.stealthMode}`);

        // ensure log file exists
        if (!fs.existsSync(this.walletLogFile)) fs.writeFileSync(this.walletLogFile, '[]', 'utf8');
        else {
            try {
                this.walletLogs = JSON.parse(fs.readFileSync(this.walletLogFile, 'utf8'));
            } catch {
                this.walletLogs = [];
            }
        }
    }

    saveWalletInfo(log: WalletLog) {
        const idx = this.walletLogs.findIndex(l => l.address === log.address);
        if (idx >= 0) this.walletLogs[idx] = { ...this.walletLogs[idx], ...log };
        else this.walletLogs.push(log);
        fs.writeFileSync(this.walletLogFile, JSON.stringify(this.walletLogs, null, 2), 'utf8');
    }

    createChildWallet(index: number) {
        const w = ethers.Wallet.createRandom().connect(this.provider);
        console.log(`Child wallet ${index}: ${w.address}`);
        return w;
    }

    async getGasPrice() {
        const gasPriceHex = await this.provider.send('eth_gasPrice', []);
        return BigInt(gasPriceHex) * 12n / 10n;
    }

    async fundStealthChild(childAddress: string, valueWei: bigint) {
        try {
            console.log(`Funding stealth child ${childAddress} with ${ethers.formatEther(valueWei)} BNB`);

            // TODO: Implement stealth funding

            console.log(`:white_check_mark: Funded ${childAddress}, gasUsed ${receipt.gasUsed.toString()}`);

            return { tx, receipt };
        } catch (e) {
            console.error(`:x: Failed to fund stealth child ${childAddress}:`, (e as any).reason ?? (e as any).message ?? (e as any));
            return { error: e };
        }
    }



    async fundChild(childAddress: string, valueWei: bigint) {
        try {
            const gasPrice = await this.getGasPrice();
            const tx = await this.mainWallet.sendTransaction({
                to: childAddress,
                value: valueWei,
                gasLimit: 21000n,
                gasPrice,
            });

            console.log(`Funding ${childAddress} -> tx ${tx.hash}`);
            const receipt = await tx.wait();
            console.log(`✅ Funded ${childAddress}, gasUsed ${receipt?.gasUsed.toString()}`);
            return { tx, receipt };
        } catch (e) {
            console.error(`❌ Failed to fund ${childAddress}:`, e);
            return { error: e };
        }
    }

    makeTraderForWallet(wallet: ethers.Wallet) {
        const base = new FourMemeTrader();
        base.setWallet(wallet.connect(this.provider));
        return base;
    }

    async runCycle(cycleIndex: number, remainingBNB: { value: number }) {
        const p = this.params;
        const buyWalletsNum = randInt(p.minBuyWalletsNum, p.maxBuyWalletsNum);
        console.log(`\n--- Cycle ${cycleIndex} start. Remaining: ${remainingBNB.value} BNB ---`);

        const deposits: number[] = [];
        for (let i = 0; i < buyWalletsNum; i++) {
            if (remainingBNB.value <= 0) break;
            const maxForThis = Math.min(p.maxDepositBNB, remainingBNB.value);
            const deposit = Math.min(maxForThis, Math.max(p.minDepositBNB, randFloat(p.minDepositBNB, maxForThis)));
            deposits.push(deposit);
            remainingBNB.value -= deposit;
        }

        const walletIndexes = deposits.map((_, i) => i);
        const buyResults: Array<Promise<any>> = [];

        // TODO: Implement buy logic

        // Wait for all buys to finish (they run in parallel)

        // TODO: Implement buy results

        // TODO: Implement sell logic

        // TODO: Implement sell results

        return { buyResults, sellResults, remainingBNB: remainingBNB.value };
    }

    async run() {
        const p = this.params;
        let cycles = 0;
        let remaining = { value: p.totalBNB };

        while (remaining.value >= p.minDepositBNB) {
            cycles++;
            if (p.cyclesLimit && cycles > p.cyclesLimit) break;
            await this.runCycle(cycles, remaining);

            const waitSec = randInt(p.minPerCycleTime, p.maxPerCycleTime);
            console.log(`Waiting ${waitSec}s before next cycle...`);
            await sleep(waitSec * 1000);
        }

        console.log('✅ VolumeBot finished. Remaining BNB:', remaining.value);
    }
}

/* ---------- Example usage ---------- */

if (require.main === module) {
    (async () => {
        console.log("Starting VolumeBot...");
        if (!process.env.TOKEN_ADDRESS) {
            console.error("TOKEN_ADDRESS is not set");
            process.exit(1);
        }
        if (!process.env.RPC_URL) {
            console.error("RPC_URL is not set");
            process.exit(1);
        }
        if (!process.env.PRIVATE_KEY) {
            console.error("PRIVATE_KEY is not set");
            process.exit(1);
        }
        const params: VolumeBotParameters = {
            totalBNB: process.env.TOTAL_BNB ? Number(process.env.TOTAL_BNB) : 18,
            minDepositBNB: process.env.MIN_DEPOSIT_BNB ? Number(process.env.MIN_DEPOSIT_BNB) : 0.01,
            maxDepositBNB: process.env.MAX_DEPOSIT_BNB ? Number(process.env.MAX_DEPOSIT_BNB) : 0.02,
            minBuyWalletsNum: process.env.MIN_BUY_WALLETS_NUM ? Number(process.env.MIN_BUY_WALLETS_NUM) : 3,
            maxBuyWalletsNum: process.env.MAX_BUY_WALLETS_NUM ? Number(process.env.MAX_BUY_WALLETS_NUM) : 5,
            minPerCycleTime: process.env.MIN_PER_CYCLE_TIME ? Number(process.env.MIN_PER_CYCLE_TIME) : 5,
            maxPerCycleTime: process.env.MAX_PER_CYCLE_TIME ? Number(process.env.MAX_PER_CYCLE_TIME) : 15,
            minSellWalletsNum: process.env.MIN_SELL_WALLETS_NUM ? Number(process.env.MIN_SELL_WALLETS_NUM) : 0,
            maxSellWalletsNum: process.env.MAX_SELL_WALLETS_NUM ? Number(process.env.MAX_SELL_WALLETS_NUM) : 0,
            minPercentSellAmountAfterBuy: process.env.MIN_PERCENT_SELL_AMOUNT_AFTER_BUY ? Number(process.env.MIN_PERCENT_SELL_AMOUNT_AFTER_BUY) : 50,
            maxPercentSellAmountAfterBuy: process.env.MAX_PERCENT_SELL_AMOUNT_AFTER_BUY ? Number(process.env.MAX_PERCENT_SELL_AMOUNT_AFTER_BUY) : 80,
            cyclesLimit: process.env.CYCLE_LIMIT ? Number(process.env.CYCLE_LIMIT) : 3,
            tokenAddress: process.env.TOKEN_ADDRESS!,
            networkRpc: process.env.RPC_URL!,
            usePancakeAfterMigration: process.env.USE_PANCAKE_AFTER_MIGRATION === 'true',
            minDelayBuy: process.env.MIN_DELAY_BUY ? Number(process.env.MIN_DELAY_BUY) : 2000,
            maxDelayBuy: process.env.MAX_DELAY_BUY ? Number(process.env.MAX_DELAY_BUY) : 8000,
            minDelaySell: process.env.MIN_DELAY_SELL ? Number(process.env.MIN_DELAY_SELL) : 4000,
            maxDelaySell: process.env.MAX_DELAY_SELL ? Number(process.env.MAX_DELAY_SELL) : 12000,
            gasBufferBNB: process.env.GAS_BUFFER_BNB ? Number(process.env.GAS_BUFFER_BNB) : 0.001,
        };

        console.log("Params:", params);

        // const bot = new VolumeBot(params);
        // await bot.run();
    })().catch(e => { console.error(e); process.exit(1); });
}