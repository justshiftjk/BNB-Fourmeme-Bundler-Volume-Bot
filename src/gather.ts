import { ethers } from 'ethers';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import FourMemeTrader from './trader';
import { validatePubkey } from '@validate-pubkey/hex';
dotenv.config();

const WALLET_LOG_FILE = 'wallets.json';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const MAIN_WALLET_PK = process.env.PRIVATE_KEY!;
const RPC_URL = process.env.RPC_URL!;

interface WalletLog {
    index: number;
    address: string;
    privateKey: string;
    depositBNB: number;
    status?: string;
    lastBNB?: number;
    buyTxHash?: string;
    sellTxHash?: string;
    boughtVia?: string;
    soldVia?: string;
    estimatedTokens?: string;
    timestamp: string;
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const mainWallet = new ethers.Wallet(MAIN_WALLET_PK, provider);
    if (await validatePubkey(TOKEN_ADDRESS) === false) {
        console.log('Invalid token address');
        return;
    }
    console.log('Token address is valid');

    let wallets: WalletLog[] = JSON.parse(fs.readFileSync(WALLET_LOG_FILE, 'utf8'));
    console.log(`Found ${wallets.length} wallets.`);

    function updateWalletInList(wallet: WalletLog) {
        const idx = wallets.findIndex(w => w.address === wallet.address);
        if (idx >= 0) {
            wallets[idx] = { ...wallets[idx], ...wallet };
        }
        fs.writeFileSync(WALLET_LOG_FILE, JSON.stringify(wallets, null, 2), 'utf8');
    }

    for (const entry of wallets) {
        try {
            const wallet = new ethers.Wallet(entry.privateKey, provider);
            const trader = new FourMemeTrader();
            trader.setWallet(wallet);

            console.log(`\n--- Processing wallet: ${wallet.address} ---`);

            // 1️⃣ Sell token
            const tokenBalance = await trader.getTokenBalance(TOKEN_ADDRESS);
            console.log(`Token balance: ${tokenBalance}`);

            let sellTx: string | undefined;
            if (tokenBalance > 0n) {
                const migration = await trader.getMigrationStatus(TOKEN_ADDRESS);
                if (migration) {
                    const { txHash } = await trader.sellPancakeTokenBigInt(TOKEN_ADDRESS, tokenBalance);
                    sellTx = txHash;
                } else {
                    const sellAmount = tokenBalance;
                    const sellRealAmount = sellAmount / BigInt(10 ** 9) * BigInt(10 ** 9);
                    sellTx = await trader.sellAmountBigInt(TOKEN_ADDRESS, sellRealAmount);
                }
                console.log(`Sold tokens: tx ${sellTx}`);

                // Update wallet with new sell transaction
                const newSellTxHash = entry.sellTxHash ? `${entry.sellTxHash},${sellTx}` : sellTx;
                updateWalletInList({
                    ...entry,
                    sellTxHash: newSellTxHash,
                    status: 'SOLD',
                    timestamp: new Date().toISOString(),
                });
            } else {
                console.log('No tokens to sell.');
            }

            // 2️⃣ Send BNB back to main wallet
            const bnbBalance = await provider.getBalance(wallet.address);
            const gasLimit = 21000n;
            const feeData = await provider.getFeeData();
            console.log("feeData:", feeData);

            const gasFee = feeData.gasPrice! * gasLimit;
            const sendAmount = bnbBalance > gasFee ? bnbBalance - gasFee : 0n;

            if (sendAmount > 0n) {
                const tx = await wallet.sendTransaction({
                    to: mainWallet.address,
                    value: sendAmount,
                    gasLimit: Number(gasLimit),
                });
                await tx.wait();
                console.log(`Sent ${ethers.formatEther(sendAmount)} BNB back to main wallet -> tx ${tx.hash}`);

                // Update lastBNB to 0 or remaining balance
                const remainingBalance = await provider.getBalance(wallet.address);
                updateWalletInList({
                    ...entry,
                    lastBNB: Number(ethers.formatEther(remainingBalance)),
                    timestamp: new Date().toISOString(),
                });
            } else {
                console.log('BNB balance too low to send back.');
                // Update lastBNB even if not sent
                updateWalletInList({
                    ...entry,
                    lastBNB: Number(ethers.formatEther(bnbBalance)),
                    timestamp: new Date().toISOString(),
                });
            }

        } catch (e) {
            console.error(`Error processing wallet ${entry.address}:`, e);
            updateWalletInList({
                ...entry,
                status: 'GATHER_FAILED',
                timestamp: new Date().toISOString(),
            });
        }
    }

    console.log('✅ All wallets processed.');
}

main().catch(e => { console.error(e); process.exit(1); });
