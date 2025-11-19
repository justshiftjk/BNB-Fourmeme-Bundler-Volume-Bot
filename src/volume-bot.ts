import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import FourMemeTrader from './trader';
import StealthFundABI from './Stealth-utils/StealthFund.json';
import { validatePubkey } from '@validate-pubkey/hex';

dotenv.config();

/* ---------- Types ---------- */

type VolumeBotParameters = {
    totalBNB: number;
    totalNumWallets: number;
    minDepositBNB: number;
    maxDepositBNB: number;
    minBuyNumPerCycle: number;
    maxBuyNumPerCycle: number;
    minPerCycleTime: number;
    maxPerCycleTime: number;
    minSellPercentWallets: number; // percent of bought wallets to sell per cycle
    maxSellPercentWallets: number; // percent of bought wallets to sell per cycle
    minPercentSellAmountAfterBuy: number;
    maxPercentSellAmountAfterBuy: number;
    minBuyPercentBNB: number; // percent of available BNB (excl gas) to spend
    maxBuyPercentBNB: number; // percent of available BNB (excl gas) to spend
    cyclesLimit?: number;
    mnemonicPathPrefix?: string;
    networkRpc?: string;
    pancakeRouter?: string;
    wbnb?: string;
    tokenAddress?: string; // Optional for distribution phase
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
    status?: 'CREATED' | 'DEPOSITED' | 'LOW_GAS' | 'BOUGHT' | 'SOLD' | 'NO_TOKENS' | 'FAILED';
    lastBNB?: number;
    buyTxHash?: string;
    sellTxHash?: string;
    boughtVia?: string;
    soldVia?: string;
    estimatedTokens?: string;
    timestamp: string;
}

interface BotState {
    currentCycle: number;
    totalCycles: number;
    startedAt: string;
    lastUpdated: string;
    tokenAddress?: string;
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
    stateFile = 'bot-state.json';
    shouldStop: boolean = false;

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
        this.stealthFundAddress = process.env.STEALTH_FUND_ADDRESS || '0x3774b227aee720423a62710c7Ce2D70EA16eE0D0';
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

    saveBotState(state: BotState) {
        fs.writeFileSync(this.stateFile, JSON.stringify(state, null, 2), 'utf8');
    }

    loadBotState(): BotState | null {
        if (!fs.existsSync(this.stateFile)) return null;
        try {
            const raw = fs.readFileSync(this.stateFile, 'utf8');
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    clearBotState() {
        if (fs.existsSync(this.stateFile)) {
            fs.unlinkSync(this.stateFile);
        }
    }

    reloadWalletLogsFromDisk() {
        try {
            const raw = fs.readFileSync(this.walletLogFile, 'utf8');
            this.walletLogs = JSON.parse(raw);
        } catch {
            // ignore
        }
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

            const stealthFund = new ethers.Contract(this.stealthFundAddress, StealthFundABI.abi, this.mainWallet);

            // :two: Get gas price
            const gasPrice = await this.getGasPrice();

            // :three: Send tx (optional)
            const tx = await stealthFund.stealthMultipleFund([valueWei], [childAddress], {
                value: valueWei,
                gasPrice: await this.getGasPrice()
            });

            console.log(`Funding ${childAddress} -> tx ${tx.hash}`);
            const receipt = await tx.wait();
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

    /**
     * Check if wallets are already fully funded by checking actual blockchain balances
     * This is more accurate than checking depositBNB field (which persists after gather)
     */
    async areWalletsFunded(): Promise<boolean> {
        if (this.walletLogs.length === 0) return false;
        if (this.walletLogs.length < this.params.totalNumWallets) return false;

        // Check actual blockchain balances, not just depositBNB field
        // (depositBNB persists even after gather empties wallets)
        const minBalance = this.params.minDepositBNB;
        let fundedCount = 0;

        for (const wl of this.walletLogs) {
            try {
                const balance = await this.provider.getBalance(wl.address);
                const balanceBNB = Number(ethers.formatEther(balance));
                if (balanceBNB >= minBalance) {
                    fundedCount++;
                }
            } catch (e) {
                console.warn(`Failed to check balance for ${wl.address}:`, e);
                // On error, assume not funded
            }
        }

        // Consider wallets funded if at least 80% have sufficient balance
        // This allows for some wallets that might have been used for gas
        const threshold = Math.floor(this.params.totalNumWallets * 0.8);
        return fundedCount >= threshold;
    }

    /**
     * Ensure a pool of wallets are created and deposited per TOTAL_BNB budget.
     * Will create up to totalNumWallets and distribute deposits randomly within min/max bounds.
     * Token approvals are only done if tokenAddress is provided.
     */
    async ensureDeposits(remainingBNB: { value: number }, skipApprovals = false) {
        console.log('Ensuring deposits...', remainingBNB.value);
        const p = this.params;
        // Create missing wallets
        for (let i = this.walletLogs.length; i < p.totalNumWallets; i++) {
            const w = this.createChildWallet(i);
            this.saveWalletInfo({
                index: i,
                address: w.address,
                privateKey: w.privateKey,
                depositBNB: 0,
                status: 'CREATED',
                timestamp: new Date().toISOString(),
            });
        }

        // Deposit into wallets that need funding (check actual blockchain balance, not just depositBNB field)
        for (const wl of this.walletLogs) {
            if (remainingBNB.value <= p.minDepositBNB) break;

            // Check actual blockchain balance instead of relying on depositBNB field
            // (depositBNB may persist after gather even though balance is 0)
            let currentBalance = 0;
            try {
                const balance = await this.provider.getBalance(wl.address);
                currentBalance = Number(ethers.formatEther(balance));

                // Update wallet log with current balance
                if (currentBalance !== (wl.lastBNB ?? 0)) {
                    this.saveWalletInfo({
                        ...wl,
                        lastBNB: currentBalance,
                        timestamp: new Date().toISOString(),
                    });
                }
            } catch (e) {
                console.warn(`Failed to check balance for ${wl.address}:`, e);
                // Continue to next wallet on error
                continue;
            }

            // Skip if wallet already has sufficient balance
            if (currentBalance >= p.minDepositBNB) {
                console.log(`Wallet ${wl.address} already has ${currentBalance} BNB, skipping...`);
                continue;
            }

            // Calculate deposit amount
            const maxForThis = Math.min(p.maxDepositBNB, remainingBNB.value);
            if (maxForThis < p.minDepositBNB) continue;
            const deposit = Math.min(maxForThis, Math.max(p.minDepositBNB, randFloat(p.minDepositBNB, maxForThis)));

            try {
                console.log(`Depositing ${deposit} BNB to ${wl.address} (current balance: ${currentBalance})`);
                const valueWei = ethers.parseEther(deposit.toFixed(18));
                this.stealthMode
                    ? await this.fundStealthChild(wl.address, valueWei)
                    : await this.fundChild(wl.address, valueWei);

                await sleep(500);
                const bnbBalance = await this.provider.getBalance(wl.address);
                const deposited = Number(ethers.formatEther(bnbBalance));
                this.saveWalletInfo({
                    ...wl,
                    depositBNB: deposited,
                    lastBNB: deposited,
                    status: 'DEPOSITED',
                    timestamp: new Date().toISOString(),
                });
                remainingBNB.value -= deposit;

                // Only do token approvals if tokenAddress is provided and not skipping
                if (!skipApprovals && p.tokenAddress) {
                    try {
                        const child = new ethers.Wallet(wl.privateKey, this.provider);
                        const trader = this.makeTraderForWallet(child);
                        const migration = await trader.getMigrationStatus(p.tokenAddress).catch(() => false);
                        if (migration) {
                            await trader.approvePancakeRouter(p.tokenAddress);
                        } else {
                            await trader.approveTokenManager(p.tokenAddress);
                        }
                    } catch (e) {
                        console.warn(`Failed to approve token for ${wl.address}, continuing...`);
                    }
                }
            } catch (e) {
                this.saveWalletInfo({ ...wl, status: 'FAILED', timestamp: new Date().toISOString() });
            }
        }
    }

    /**
     * Phase 1: Create wallets and distribute BNB without requiring token address
     */
    async distributeBNB() {
        const p = this.params;
        let remaining = { value: p.totalBNB };

        console.log('=== Phase 1: Distributing BNB to wallets ===');
        console.log(`Total BNB: ${p.totalBNB}, Target wallets: ${p.totalNumWallets}`);

        // Check if wallets are already funded (check actual blockchain balances)
        const alreadyFunded = await this.areWalletsFunded();
        if (alreadyFunded) {
            console.log('✅ Wallets are already funded. Skipping distribution.');
            return;
        }

        await this.ensureDeposits(remaining, true); // Skip token approvals during distribution

        console.log(`✅ Distribution complete. Remaining BNB: ${remaining.value}`);
        console.log(`Funded ${this.walletLogs.filter(w => (w.depositBNB ?? 0) > 0).length} wallets`);
    }

    async runCycle(cycleIndex: number) {
        if (!this.params.tokenAddress) {
            throw new Error('tokenAddress is required for trading cycles');
        }

        const p = this.params;
        const tokenAddress = p.tokenAddress!; // Non-null: we checked above
        const buyWalletsNum = randInt(p.minBuyNumPerCycle, p.maxBuyNumPerCycle);
        console.log(`\n--- Cycle ${cycleIndex} start. Target buys: ${buyWalletsNum} ---`);

        // Check for stop signal
        if (this.shouldStop) {
            console.log('Stop signal received, saving state...');
            this.saveBotState({
                currentCycle: cycleIndex,
                totalCycles: p.cyclesLimit ?? 0,
                startedAt: this.loadBotState()?.startedAt || new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                tokenAddress: tokenAddress,
            });
            throw new Error('Bot stopped by user');
        }

        // Candidate wallets are those with a deposit
        const deposited = this.walletLogs.filter(w => (w.depositBNB ?? 0) > 0);

        // Pre-calc sell bounds for this cycle (percent of intended buys)
        const minPct = Math.max(0, Math.min(100, p.minSellPercentWallets));
        const maxPct = Math.max(minPct, Math.min(100, p.maxSellPercentWallets));
        const targetSellPercent = randFloat(minPct, maxPct);
        const minSellCount = Math.floor((buyWalletsNum * minPct) / 100);
        const maxSellCount = Math.ceil((buyWalletsNum * maxPct) / 100);
        let sellsDone = 0;
        let buysProcessed = 0;
        const boughtThisCycle: Array<WalletLog> = [];
        const soldSet = new Set<string>();

        // Helper to pick random wallet not yet chosen
        const chosen = new Set<string>();
        const pickRandomWallet = () => {
            const pool = deposited.filter(w => !chosen.has(w.address));
            if (pool.length === 0) return undefined;
            const w = pool[Math.floor(Math.random() * pool.length)];
            chosen.add(w.address);
            return w;
        };

        for (let i = 0; i < buyWalletsNum; i++) {
            const wl = pickRandomWallet();
            if (!wl) break;

            const gasBufferBNB = p.gasBufferBNB;
            const child = new ethers.Wallet(wl.privateKey, this.provider);

            const bnbBalance = await this.provider.getBalance(wl.address);
            const bnb = Number(ethers.formatEther(bnbBalance));
            if (bnb <= gasBufferBNB) {
                this.saveWalletInfo({ ...wl, lastBNB: bnb, status: 'LOW_GAS', timestamp: new Date().toISOString() });
                i--; // try another wallet for this slot
                continue;
            }

            const available = Math.max(0, bnb - gasBufferBNB);
            const buyPercent = randFloat(p.minBuyPercentBNB, p.maxBuyPercentBNB); // percent [min,max]
            const spendBNB = Math.min(available, available * (buyPercent / 100));
            if (spendBNB <= 0) {
                this.saveWalletInfo({ ...wl, lastBNB: bnb, status: 'LOW_GAS', timestamp: new Date().toISOString() });
                i--;
                continue;
            }

            try {
                const delay = randInt(p.minDelayBuy ?? 1000, p.maxDelayBuy ?? 5000);
                console.log(`Delay before buy: ${delay} ms`);
                await sleep(delay);

                const trader = this.makeTraderForWallet(child);
                const migration = await trader.getMigrationStatus(tokenAddress).catch(() => false);

                const buyAmount = ethers.parseEther(spendBNB.toFixed(18));
                const result = migration && (p.usePancakeAfterMigration ?? true)
                    ? await trader.buyPancakeTokenBigInt(tokenAddress, buyAmount)
                    : await trader.buyTokenBigInt(tokenAddress, buyAmount);

                const bnbBalanceAfterBuy = await this.provider.getBalance(wl.address);
                const bnbAfterBuy = Number(ethers.formatEther(bnbBalanceAfterBuy));

                const log: WalletLog = {
                    ...wl,
                    lastBNB: bnbAfterBuy,
                    buyTxHash: result.txHash,
                    boughtVia: migration ? 'pancake' : 'fourmeme',
                    estimatedTokens: result.realTokenBalance.toString(),
                    status: 'BOUGHT',
                    timestamp: new Date().toISOString(),
                };
                this.saveWalletInfo(log);
                console.log(`[BUY ${log.boughtVia}] ${wl.address} -> tx ${log.buyTxHash}`);
                boughtThisCycle.push(log);

                // After each buy, decide sell or not immediately for a wallet chosen from the global buy list
                buysProcessed++;
                const walletsLeft = buyWalletsNum - buysProcessed + 1; // including this one for decision context
                const mustSellRemaining = Math.max(0, minSellCount - sellsDone);
                const capacityRemaining = Math.max(0, maxSellCount - sellsDone);

                let shouldSell = false;
                if (capacityRemaining <= 0) {
                    shouldSell = false;
                } else if (walletsLeft <= mustSellRemaining) {
                    // Force sell to meet minimum target
                    shouldSell = true;
                } else {
                    // Probabilistic within remaining capacity
                    const probability = capacityRemaining / walletsLeft;
                    shouldSell = Math.random() < probability;
                }

                if (shouldSell) {
                    const delaySell = randInt(p.minDelaySell ?? 2000, p.maxDelaySell ?? 10000);
                    console.log(`Decided to sell now. Delay before sell: ${delaySell} ms`);
                    await sleep(delaySell);

                    // Refresh from disk and choose a wallet from the overall buy list across all cycles
                    this.reloadWalletLogsFromDisk();
                    const candidates = this.walletLogs
                        .filter(b => !!b.buyTxHash) // can include previously partially sold wallets
                        .filter(b => !soldSet.has(b.address));
                    if (candidates.length === 0) {
                        console.log('No candidates to sell from bought list.');
                    } else {
                        let soldThisAttempt = false;
                        // Try a few random candidates until one has tokens or we exhaust options
                        const attemptsOrder = [...candidates].sort(() => Math.random() - 0.5);
                        for (const candidate of attemptsOrder) {
                            const sellWallet = new ethers.Wallet(candidate.privateKey, this.provider);
                            const sellTrader = this.makeTraderForWallet(sellWallet);
                            const migrationSell = await sellTrader.getMigrationStatus(tokenAddress).catch(() => false);
                            const tokenBal = await sellTrader.getTokenBalance(tokenAddress);
                            if (tokenBal <= 0n) {
                                this.saveWalletInfo({ ...candidate, status: 'NO_TOKENS', timestamp: new Date().toISOString() });
                                continue; // pick another
                            }
                            const sellPercentAmt = randFloat(p.minPercentSellAmountAfterBuy ?? 100, p.maxPercentSellAmountAfterBuy ?? 100);
                            const sellAmount = (tokenBal * BigInt(Math.floor(sellPercentAmt * 100))) / BigInt(100 * 100);
                            const sellRealAmount = sellAmount / BigInt(10 ** 9) * BigInt(10 ** 9);
                            if (sellRealAmount <= 0n || sellRealAmount > tokenBal) {
                                continue;
                            }
                            try {
                                const res = migrationSell && (p.usePancakeAfterMigration ?? true)
                                    ? await sellTrader.sellPancakeTokenBigInt(tokenAddress, sellRealAmount)
                                    : { txHash: await sellTrader.sellAmountBigInt(tokenAddress, sellRealAmount) };
                                // After sell, fetch real remaining token balance and persist
                                const remainingTokens = await sellTrader.getTokenBalance(tokenAddress);
                                this.saveWalletInfo({
                                    index: candidate.index,
                                    address: candidate.address,
                                    privateKey: candidate.privateKey,
                                    depositBNB: candidate.depositBNB,
                                    buyTxHash: candidate.buyTxHash,
                                    sellTxHash: res.txHash,
                                    soldVia: migrationSell ? 'pancake' : 'fourmeme',
                                    estimatedTokens: remainingTokens.toString(),
                                    status: 'SOLD',
                                    timestamp: new Date().toISOString(),
                                });
                                console.log(`[SELL ${migrationSell ? 'pancake' : 'fourmeme'}] ${candidate.address} -> tx ${res.txHash}`);
                                soldSet.add(candidate.address);
                                sellsDone++;
                                soldThisAttempt = true;
                                break;
                            } catch (e) {
                                console.error(`Sell failed for ${candidate.address}:`, e);
                            }
                        }
                        if (!soldThisAttempt) console.log('Could not sell any candidate this attempt.');
                    }
                }
            } catch (e) {
                console.error(`Buy failed for ${wl.address}:`, e);
                this.saveWalletInfo({ ...wl, status: 'FAILED', timestamp: new Date().toISOString() });
            }
        }
        console.log(`Cycle ${cycleIndex} complete. Sells executed: ${sellsDone}.`);
        return { sellsDone };
    }

    async run() {
        const p = this.params;

        if (!p.tokenAddress) {
            throw new Error('tokenAddress is required for trading. Use distributeBNB() first to distribute funds.');
        }

        // Load saved state or start fresh
        let savedState = this.loadBotState();
        let startCycle = 1;
        let cycles = 0;

        if (savedState) {
            // Check if token address changed
            if (savedState.tokenAddress && savedState.tokenAddress !== p.tokenAddress) {
                console.log('⚠️ Token address changed. Clearing previous state and starting fresh.');
                this.clearBotState();
                savedState = null;
            } else if (savedState.currentCycle) {
                startCycle = savedState.currentCycle;
                cycles = startCycle - 1;
                console.log(`🔄 Resuming from cycle ${startCycle}`);
            }
        }

        // Ensure wallets are funded (reuse existing if already funded)
        let remaining = { value: p.totalBNB };
        const alreadyFunded = await this.areWalletsFunded();
        if (!alreadyFunded) {
            console.log('Wallets not fully funded, ensuring deposits...');
            await this.ensureDeposits(remaining);
        } else {
            console.log('✅ Using existing funded wallets');
        }

        // Approve token for all funded wallets if not already done
        if (p.tokenAddress) {
            console.log('Approving token for all wallets...');
            for (const wl of this.walletLogs.filter(w => (w.depositBNB ?? 0) > 0)) {
                try {
                    const child = new ethers.Wallet(wl.privateKey, this.provider);
                    const trader = this.makeTraderForWallet(child);
                    const migration = await trader.getMigrationStatus(p.tokenAddress).catch(() => false);
                    if (migration) {
                        await trader.approvePancakeRouter(p.tokenAddress);
                    } else {
                        await trader.approveTokenManager(p.tokenAddress);
                    }
                } catch (e) {
                    console.warn(`Failed to approve token for ${wl.address}, continuing...`);
                }
            }
        }

        // Initialize state if starting fresh
        if (!savedState) {
            this.saveBotState({
                currentCycle: startCycle,
                totalCycles: p.cyclesLimit ?? 0,
                startedAt: new Date().toISOString(),
                lastUpdated: new Date().toISOString(),
                tokenAddress: p.tokenAddress,
            });
        }

        const totalCycles = p.cyclesLimit ?? Infinity;
        this.shouldStop = false;

        try {
            while (cycles < totalCycles && startCycle <= totalCycles) {
                if (this.shouldStop) {
                    console.log('Stop signal received, saving state...');
                    this.saveBotState({
                        currentCycle: startCycle,
                        totalCycles: p.cyclesLimit ?? 0,
                        startedAt: savedState?.startedAt || new Date().toISOString(),
                        lastUpdated: new Date().toISOString(),
                        tokenAddress: p.tokenAddress,
                    });
                    break;
                }

                await this.runCycle(startCycle);

                // Update state after successful cycle
                cycles++;
                startCycle++;
                this.saveBotState({
                    currentCycle: startCycle,
                    totalCycles: p.cyclesLimit ?? 0,
                    startedAt: savedState?.startedAt || new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    tokenAddress: p.tokenAddress,
                });

                if (startCycle > totalCycles) break;

                const waitSec = randInt(p.minPerCycleTime, p.maxPerCycleTime);
                console.log(`Waiting ${waitSec / 1000}s before next cycle...`);
                await sleep(waitSec);
            }

            // Clear state when all cycles complete
            if (startCycle > totalCycles) {
                console.log('✅ All cycles completed. Clearing state file.');
                this.clearBotState();
            }

            console.log('✅ VolumeBot finished. Remaining BNB:', remaining.value);
        } catch (e: any) {
            if (e.message === 'Bot stopped by user') {
                console.log('Bot paused. State saved. Resume to continue from cycle', startCycle);
            } else {
                // Save state on error
                this.saveBotState({
                    currentCycle: startCycle,
                    totalCycles: p.cyclesLimit ?? 0,
                    startedAt: savedState?.startedAt || new Date().toISOString(),
                    lastUpdated: new Date().toISOString(),
                    tokenAddress: p.tokenAddress,
                });
                throw e;
            }
        }
    }

    stop() {
        this.shouldStop = true;
        console.log('Stop signal set. Bot will pause after current cycle.');
    }
}

/* ---------- Example usage ---------- */

if (require.main === module) {
    (async () => {
        console.log("Starting VolumeBot...");

        // Check for distribution-only mode:
        // 1. --distribute flag = distribution mode (UI or CLI)
        // 2. --trading flag = trading mode (UI explicitly, ignores .env)
        // 3. No flags = check DISTRIBUTE_ONLY env var (CLI only)
        // This ensures UI buttons control behavior via flags, while CLI can use .env
        const hasDistributeFlag = process.argv.includes('--distribute');
        const hasTradingFlag = process.argv.includes('--trading');

        let distributionOnly = false;
        if (hasDistributeFlag) {
            distributionOnly = true; // UI "Distribute BNB" or CLI with --distribute
        } else if (hasTradingFlag) {
            distributionOnly = false; // UI "START TRADING" - explicitly trading, ignore .env
        } else {
            distributionOnly = process.env.DISTRIBUTE_ONLY === 'true'; // CLI without flags - use .env
        }

        if (!process.env.RPC_URL) {
            console.error("RPC_URL is not set");
            process.exit(1);
        }
        if (!process.env.PRIVATE_KEY) {
            console.error("PRIVATE_KEY is not set");
            process.exit(1);
        }

        // Token address is optional for distribution phase
        const tokenAddress = process.env.TOKEN_ADDRESS;
        if (!distributionOnly && (!tokenAddress || await validatePubkey(tokenAddress) === false)) {
            console.error("TOKEN_ADDRESS is not set or invalid (required for trading)");
            process.exit(1);
        }

        const params: VolumeBotParameters = {
            networkRpc: process.env.RPC_URL!,
            tokenAddress: tokenAddress,
            totalBNB: process.env.TOTAL_BNB ? Number(process.env.TOTAL_BNB) : 18,
            totalNumWallets: process.env.TOTAL_NUM_WALLETS ? Number(process.env.TOTAL_NUM_WALLETS) : 50,
            minDepositBNB: process.env.MIN_DEPOSIT_BNB ? Number(process.env.MIN_DEPOSIT_BNB) : 0.01,
            maxDepositBNB: process.env.MAX_DEPOSIT_BNB ? Number(process.env.MAX_DEPOSIT_BNB) : 0.02,
            minPerCycleTime: process.env.MIN_PER_CYCLE_TIME ? Number(process.env.MIN_PER_CYCLE_TIME) : 5000,
            maxPerCycleTime: process.env.MAX_PER_CYCLE_TIME ? Number(process.env.MAX_PER_CYCLE_TIME) : 10000,
            minBuyNumPerCycle: process.env.MIN_BUY_NUM_PER_CYCLE ? Number(process.env.MIN_BUY_NUM_PER_CYCLE) : 3,
            maxBuyNumPerCycle: process.env.MAX_BUY_NUM_PER_CYCLE ? Number(process.env.MAX_BUY_NUM_PER_CYCLE) : 5,
            minBuyPercentBNB: process.env.MIN_BUY_PERCENT_BNB ? Number(process.env.MIN_BUY_PERCENT_BNB) : 100,
            maxBuyPercentBNB: process.env.MAX_BUY_PERCENT_BNB ? Number(process.env.MAX_BUY_PERCENT_BNB) : 100,
            minSellPercentWallets: process.env.MIN_PERCENT_SELL ? Number(process.env.MIN_PERCENT_SELL) : 0,
            maxSellPercentWallets: process.env.MAX_PERCENT_SELL ? Number(process.env.MAX_PERCENT_SELL) : 0,
            minPercentSellAmountAfterBuy: process.env.MIN_PERCENT_SELL_AMOUNT_AFTER_BUY ? Number(process.env.MIN_PERCENT_SELL_AMOUNT_AFTER_BUY) : 50,
            maxPercentSellAmountAfterBuy: process.env.MAX_PERCENT_SELL_AMOUNT_AFTER_BUY ? Number(process.env.MAX_PERCENT_SELL_AMOUNT_AFTER_BUY) : 80,
            cyclesLimit: process.env.CYCLE_LIMIT ? Number(process.env.CYCLE_LIMIT) : 3,
            minDelayBuy: process.env.MIN_DELAY_BUY ? Number(process.env.MIN_DELAY_BUY) : 2000,
            maxDelayBuy: process.env.MAX_DELAY_BUY ? Number(process.env.MAX_DELAY_BUY) : 8000,
            minDelaySell: process.env.MIN_DELAY_SELL ? Number(process.env.MIN_DELAY_SELL) : 4000,
            maxDelaySell: process.env.MAX_DELAY_SELL ? Number(process.env.MAX_DELAY_SELL) : 12000,
            gasBufferBNB: process.env.GAS_BUFFER_BNB ? Number(process.env.GAS_BUFFER_BNB) : 0.001,
            usePancakeAfterMigration: process.env.USE_PANCAKE_AFTER_MIGRATION === 'true',
        };

        console.log("Params:", params);

        const bot = new VolumeBot(params);

        // Handle graceful shutdown (ensure single execution)
        let shutdownInitiated = false;
        const handleShutdown = () => {
            if (shutdownInitiated) return;
            shutdownInitiated = true;
            console.log('\n⚠️ Shutdown signal received. Stopping bot gracefully...');
            bot.stop();
            // Give bot time to save state
            setTimeout(() => process.exit(0), 2000);
        };

        process.on('SIGINT', handleShutdown);
        process.on('SIGTERM', handleShutdown);

        if (distributionOnly) {
            console.log("Running in distribution-only mode...");
            await bot.distributeBNB();
            console.log("✅ Distribution complete. You can now set TOKEN_ADDRESS and run trading.");
        } else {
            await bot.run();
        }
    })().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
