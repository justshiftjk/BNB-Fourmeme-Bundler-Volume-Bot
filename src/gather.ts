import { ethers } from 'ethers';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import FourMemeTrader from './trader';
dotenv.config();

const WALLET_LOG_FILE = 'wallets.json';
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;
const MAIN_WALLET_PK = process.env.PRIVATE_KEY!;
const RPC_URL = process.env.RPC_URL!;

interface WalletLog {
    address: string;
    privateKey: string;
}

async function main() {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const mainWallet = new ethers.Wallet(MAIN_WALLET_PK, provider);

    const wallets: WalletLog[] = JSON.parse(fs.readFileSync(WALLET_LOG_FILE, 'utf8'));
    console.log(`Found ${wallets.length} wallets.`);

    for (const entry of wallets) {
        // TODO: Implement gather logic
    }

    console.log('✅ All wallets processed.');
}

main().catch(e => { console.error(e); process.exit(1); });