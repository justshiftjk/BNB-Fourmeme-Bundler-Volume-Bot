# Four.meme Trading Bot

A TypeScript trading bot for four.meme tokens with automatic migration detection, dual exchange support, and volume trading capabilities.

## Features

- **Migration Detection**: Automatically detects if token has migrated to PancakeSwap
- **Four.meme Trading**: Buy/sell tokens before migration (using Four.meme contracts)
- **PancakeSwap Trading**: Buy/sell tokens after migration (using PancakeRouter)
- **Smart Routing**: Automatically chooses the correct exchange based on migration status
- **Volume Bot**: Automated multi-wallet volume trading with stealth funding
- **Stealth Mode**: Use StealthFund contract for anonymous wallet funding
- **Simple Setup**: Just install and run with environment variables

## Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Environment**
   Create a `.env` file with your configuration (see `.env.example`):

   ```bash
   # Required
   PRIVATE_KEY=0x...
   RPC_URL=https://bsc-dataseed.binance.org
   TOKEN_ADDRESS=0x... # Token to trade

   # Web UI
   UI_PORT=3000

   # Contract Addresses (defaults provided in code)
   PANCAKE_ROUTER_ADDRESS=0x10ED43C718714eb63d5aA57B78B54704E256024E
   WBNB_ADDRESS=0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c
   STEALTH_FUND_ADDRESS=0x3774b227aee720423a62710c7Ce2D70EA16eE0D0

   # Volume Bot Budget / Wallets
   TOTAL_BNB=18
   TOTAL_NUM_WALLETS=50
   MIN_DEPOSIT_BNB=0.01
   MAX_DEPOSIT_BNB=0.02

   # Per-cycle Buy Count
   MIN_BUY_NUM_PER_CYCLE=3
   MAX_BUY_NUM_PER_CYCLE=5

   # Buy amount as percent of (BNB - GAS_BUFFER_BNB)
   MIN_BUY_PERCENT_BNB=100
   MAX_BUY_PERCENT_BNB=100

   # Per-cycle Sell: percent of bought wallets to sell
   MIN_PERCENT_SELL=0
   MAX_PERCENT_SELL=0

   # Per-wallet Sell: percent of token balance to sell
   MIN_PERCENT_SELL_AMOUNT_AFTER_BUY=50
   MAX_PERCENT_SELL_AMOUNT_AFTER_BUY=80

   # Cycle control
   CYCLE_LIMIT=3
   MIN_PER_CYCLE_TIME=5000
   MAX_PER_CYCLE_TIME=10000

   # Timing
   MIN_DELAY_BUY=2000
   MAX_DELAY_BUY=8000
   MIN_DELAY_SELL=4000
   MAX_DELAY_SELL=12000

   # Gas buffer (BNB left for gas)
   GAS_BUFFER_BNB=0.001

   # Features
   STEALTH_MODE=false
   USE_PANCAKE_AFTER_MIGRATION=true
   ```

3. **Run the Bot**

   **Option 1: Web UI (Recommended)**

   ```bash
   npm run ui
   ```

   Then open http://localhost:3000 in your browser

   **Option 2: Command Line**

   ```bash
   npm run start    # Start volume bot
   npm run gather   # Gather funds from wallets
   ```

## How It Works

### Volume Bot Mode

The VolumeBot creates multiple random wallets and executes coordinated trading:

1. **Wallet Creation**: Generates random wallets for each trading cycle
2. **Funding**: Uses either direct transfers or StealthFund contract (stealth mode)
3. **Sequential Funding**: Funds wallets one by one to avoid nonce conflicts
4. **Parallel Trading**: Executes buy orders in parallel after funding
5. **Sell Strategy**: Randomly selects wallets to sell based on configuration
6. **Cycle Management**: Repeats process for specified number of cycles

### Migration Detection

The bot automatically detects the migration status of any four.meme token:

- **Before Migration**: Uses Four.meme contracts for trading
- **After Migration**: Uses PancakeSwap Router for trading

The bot checks the `liquidityAdded` status from the Helper3 contract:

- `false` = Token still on Four.meme (use Four.meme contracts)
- `true` = Token migrated to PancakeSwap (use PancakeRouter)

### Trading Flow

1. **Check Migration Status**: Determines if token has migrated
2. **Route to Correct Exchange**:
   - Four.meme → Uses `buyTokenAMAP` and `sellToken`
   - PancakeSwap → Uses `swapExactETHForTokens` and `swapExactTokensForETH`
3. **Execute Trade**: Handles approvals, timing, and transaction execution

### Stealth Mode

When `STEALTH_MODE=true`, the bot uses the StealthFund contract to fund wallets:

- Creates anonymous funding transactions
- Hides the connection between main wallet and trading wallets
- Uses `stealthMultipleFund` function for efficient batch funding

## Code Structure

### Main Components

- **`FourMemeTrader`**: Main trading class with migration detection
- **`VolumeBot`**: Automated multi-wallet volume trading bot
- **`getMigrationStatus()`**: Checks if token has migrated
- **`buyToken()`**: Four.meme buy (before migration)
- **`sellAmount()`**: Four.meme sell (before migration)
- **`buyPancakeToken()`**: PancakeSwap buy (after migration)
- **`sellPancakeToken()`**: PancakeSwap sell (after migration)
- **`fundStealthChild()`**: Stealth funding via StealthFund contract
- **`fundChild()`**: Direct wallet funding

### Example Usage

#### Basic Trading

```typescript
const trader = new FourMemeTrader();
const tokenAddress = "0x...";

// Check migration status
const migrated = await trader.getMigrationStatus(tokenAddress);

if (migrated) {
  // Token migrated to PancakeSwap
  await trader.buyPancakeToken(tokenAddress, 0.01); // Buy with 0.01 BNB
  await trader.sellPancakeToken(tokenAddress, 1000); // Sell 1000 tokens
} else {
  // Token still on Four.meme
  const result = await trader.buyToken(tokenAddress, 0.01);
  console.log(`Estimated tokens: ${result.estimatedTokens}`);
  await trader.sellAmount(tokenAddress, parseFloat(result.estimatedTokens));
}
```

#### Volume Bot Usage

```typescript
import VolumeBot from "./src/volume-bot";

const params = {
  totalBNB: 1.0, // Total BNB to use
  minDepositBNB: 0.01, // Min BNB per wallet
  maxDepositBNB: 0.05, // Max BNB per wallet
  minBuyWalletsNum: 3, // Min wallets per cycle
  maxBuyWalletsNum: 5, // Max wallets per cycle
  minSellWalletsNum: 1, // Min wallets to sell
  maxSellWalletsNum: 3, // Max wallets to sell
  minPercentSellAmountAfterBuy: 50, // Min % to sell
  maxPercentSellAmountAfterBuy: 80, // Max % to sell
  cyclesLimit: 3, // Number of cycles
  tokenAddress: "0x...", // Token to trade
  gasBufferBNB: 0.001, // Gas buffer
  // ... other parameters
};

const bot = new VolumeBot(params);
await bot.run();
```

## Environment Variables

### Required Variables

| Variable        | Description                     | Default  |
| --------------- | ------------------------------- | -------- |
| `PRIVATE_KEY`   | Your wallet private key         | Required |
| `RPC_URL`       | BSC RPC endpoint                | Required |
| `TOKEN_ADDRESS` | Token contract address to trade | Required |

### Contract Addresses

| Variable                 | Description                                | Default                                      |
| ------------------------ | ------------------------------------------ | -------------------------------------------- |
| `PANCAKE_ROUTER_ADDRESS` | PancakeSwap Router contract                | `0x10ED43C718714eb63d5aA57B78B54704E256024E` |
| `WBNB_ADDRESS`           | Wrapped BNB contract                       | `0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c` |
| `STEALTH_FUND_ADDRESS`   | StealthFund contract for anonymous funding | `0x3774b227aee720423a62710c7Ce2D70EA16eE0D0` |

### Volume Bot Configuration

| Variable                            | Description                               | Default |
| ----------------------------------- | ----------------------------------------- | ------- |
| `TOTAL_BNB`                         | Total BNB to use for volume trading       | `18`    |
| `TOTAL_NUM_WALLETS`                 | Total wallets to create and deposit into  | `50`    |
| `MIN_DEPOSIT_BNB`                   | Minimum BNB per wallet                    | `0.01`  |
| `MAX_DEPOSIT_BNB`                   | Maximum BNB per wallet                    | `0.02`  |
| `MIN_BUY_NUM_PER_CYCLE`             | Min wallets to buy per cycle              | `3`     |
| `MAX_BUY_NUM_PER_CYCLE`             | Max wallets to buy per cycle              | `5`     |
| `MIN_BUY_PERCENT_BNB`               | Min % of available BNB to spend           | `100`   |
| `MAX_BUY_PERCENT_BNB`               | Max % of available BNB to spend           | `100`   |
| `MIN_PERCENT_SELL`                  | Min % of bought wallets to sell per cycle | `0`     |
| `MAX_PERCENT_SELL`                  | Max % of bought wallets to sell per cycle | `0`     |
| `MIN_PERCENT_SELL_AMOUNT_AFTER_BUY` | Min % of tokens to sell                   | `50`    |
| `MAX_PERCENT_SELL_AMOUNT_AFTER_BUY` | Max % of tokens to sell                   | `80`    |
| `CYCLE_LIMIT`                       | Number of trading cycles                  | `3`     |
| `MIN_PER_CYCLE_TIME`                | Min ms between cycles                     | `5000`  |
| `MAX_PER_CYCLE_TIME`                | Max ms between cycles                     | `10000` |
| `MIN_DELAY_BUY`                     | Min delay before buy (ms)                 | `2000`  |
| `MAX_DELAY_BUY`                     | Max delay before buy (ms)                 | `8000`  |
| `MIN_DELAY_SELL`                    | Min delay before sell (ms)                | `4000`  |
| `MAX_DELAY_SELL`                    | Max delay before sell (ms)                | `12000` |
| `GAS_BUFFER_BNB`                    | BNB buffer for gas fees                   | `0.001` |

### Optional Features

| Variable                      | Description                                | Default |
| ----------------------------- | ------------------------------------------ | ------- |
| `STEALTH_MODE`                | Use StealthFund for wallet funding         | `true`  |
| `USE_PANCAKE_AFTER_MIGRATION` | Auto-switch to PancakeSwap after migration | `true`  |

## Security Notes

- Keep your private keys secure
- Use environment variables for sensitive data
- Test with small amounts first
- Consider using hardware wallets for large amounts

## Error Handling

Common errors and solutions:

- **"Disabled"**: Token has migrated, use PancakeSwap methods
- **"Insufficient BNB balance"**: Add more BNB to your wallet
- **"Insufficient token balance"**: You don't have enough tokens to sell
- **"Missing environment variable"**: Check your `.env` file
- **"Selling amount is 0 or greater than estimated tokens"**: Adjust sell percentage or check token balance
- **"Funding failed"**: Check StealthFund contract or increase gas price
- **"SKIPPED_LOW_DEPOSIT"**: Increase deposit amount or reduce gas buffer

## Wallet Logs

The VolumeBot creates a `wallets.json` file to track all trading activity:

```json
[
  {
    "index": 0,
    "address": "0x...",
    "privateKey": "0x...",
    "depositBNB": 0.01,
    "buyTxHash": "0x...",
    "sellTxHash": "0x...",
    "boughtVia": "fourmeme",
    "soldVia": "pancake",
    "estimatedTokens": "1000000",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
]
```

## Development

```bash
<<<<<<< HEAD
# Install dependencies
npm install

# Run the volume bot
npm run start

# Run gather from wallet.json
npm run gather

# Type checking
npx tsc --noEmit
```

## License

MIT
=======
git clone <your-repo-url>
cd Solana-Volume-Bot
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment

```bash
# Copy the example configuration
cp config.example.env .env

# Edit the .env file with your settings
nano .env
# or
notepad .env
```

### Step 4: Verify Installation

```bash
npm run dev
```

You should see wallet balances and configuration details displayed without errors.

## ⚙️ Configuration

### Environment Variables (.env)

Edit your `.env` file with the following settings:

#### Network Configuration

```env
# BNB Chain RPC URL (Public or Private)
RPC_URL=https://bsc-dataseed1.binance.org/

# Chain ID (56 for BSC Mainnet, 97 for Testnet)
CHAIN_ID=56
```

**Alternative RPCs for better performance:**
- `https://bsc-dataseed2.binance.org/`
- `https://bsc-dataseed3.binance.org/`
- Private RPCs: Ankr, QuickNode, GetBlock (faster, paid)

#### Wallet Configuration

```env
# Private Keys (comma-separated, NO SPACES)
PRIVATE_KEYS=0xYOUR_PRIVATE_KEY_1,0xYOUR_PRIVATE_KEY_2,0xYOUR_PRIVATE_KEY_3
```

⚠️ **Important:** 
- Use dedicated wallets, not your main wallet
- Keep private keys secure
- Each wallet needs at least 0.1 BNB

#### Four.meme Contract Addresses

```env
# Four.meme Factory Address (REQUIRED - get from BscScan)
FOURMEME_FACTORY_ADDRESS=0x...

# Four.meme Router Address (Optional)
FOURMEME_ROUTER_ADDRESS=0x...
```

**How to find contract addresses:**
1. Go to [BscScan](https://bscscan.com/)
2. Search for "four.meme" verified contracts
3. Look for Factory and Router contracts
4. Copy the addresses

#### Volume Bot Settings

```env
# Buy Amount Range (in BNB)
MIN_BUY_AMOUNT=0.001
MAX_BUY_AMOUNT=0.01

# Sell Percentage Range (% of token balance)
MIN_SELL_PERCENTAGE=50
MAX_SELL_PERCENTAGE=100

# Time Intervals (in milliseconds)
MIN_INTERVAL=10000  # 10 seconds
MAX_INTERVAL=30000  # 30 seconds
```

#### Token Creation Settings

```env
# Initial buy amount when creating token (in BNB)
INITIAL_BUY_AMOUNT=0.1

# Gas settings
GAS_PRICE=5       # in Gwei
GAS_LIMIT=500000
```

#### Advanced Settings

```env
# Slippage tolerance (%)
SLIPPAGE_TOLERANCE=10

# Maximum retry attempts for failed transactions
MAX_RETRIES=3
```

### Configuration Presets

#### 🐢 Conservative (Low Risk, Organic)
```env
MIN_BUY_AMOUNT=0.001
MAX_BUY_AMOUNT=0.005
MIN_SELL_PERCENTAGE=40
MAX_SELL_PERCENTAGE=70
MIN_INTERVAL=60000   # 1 minute
MAX_INTERVAL=180000  # 3 minutes
SLIPPAGE_TOLERANCE=5
```

#### ⚡ Aggressive (High Volume, Fast)
```env
MIN_BUY_AMOUNT=0.05
MAX_BUY_AMOUNT=0.2
MIN_SELL_PERCENTAGE=20
MAX_SELL_PERCENTAGE=50
MIN_INTERVAL=5000    # 5 seconds
MAX_INTERVAL=15000   # 15 seconds
SLIPPAGE_TOLERANCE=15
```

#### 🎯 Balanced (Recommended)
```env
MIN_BUY_AMOUNT=0.01
MAX_BUY_AMOUNT=0.05
MIN_SELL_PERCENTAGE=50
MAX_SELL_PERCENTAGE=80
MIN_INTERVAL=15000   # 15 seconds
MAX_INTERVAL=45000   # 45 seconds
SLIPPAGE_TOLERANCE=10
```

## 📖 Usage

### 1. Create a Token with Bundled Buy

```bash
npm run create
```

**Follow the interactive prompts:**

```
Token Name: My Awesome Token
Token Symbol: MAT
Token Description: The best meme token on BNB Chain!
Logo URL: https://i.imgur.com/yourlogo.png
Twitter: @myawesometoken
Telegram: t.me/myawesometoken
Website: https://myawesometoken.com
```

**Output:**
```
✅ Token created at address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5
✅ Creation TX: 0xabc123...
✅ Initial Buy TX: 0xdef456...
```

**💡 Save the token address!** You'll need it for the volume bot.

### 2. Start Volume Boosting

```bash
npm run volume
```

**Enter details:**

```
Enter token address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5
Duration in minutes (leave empty for unlimited): 60
Start volume bot? (y/n): y
```

**The bot will:**
- Load all configured wallets
- Display wallet balances
- Show configuration settings
- Start automated trading
- Display real-time trade logs
- Show statistics when stopped

### 3. Monitor the Bot

**Live Output Example:**
```
[INFO 2024-10-13T10:30:00Z] Starting volume bot for token: 0x742d35...
[BUY 2024-10-13T10:30:15Z] Amount: 0.015 | Token: 0x742d35... | TX: 0xabc123...
[SELL 2024-10-13T10:31:45Z] Amount: 0.012 | Token: 0x742d35... | TX: 0xdef456...
[INFO 2024-10-13T10:32:00Z] Waiting 18s before next trade...
```

### 4. Stop the Bot

Press **Ctrl+C** to stop gracefully.

**Final Statistics:**
```
=== Volume Bot Statistics ===
Total Trades: 147
Total Volume: 2.453 BNB
Buys: 88
Sells: 59
============================
```

### NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Test configuration and show wallet info |
| `npm run create` | Create new token with bundled buy |
| `npm run volume` | Start volume boosting bot |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run compiled production build |

## 💡 Examples

### Example 1: Launch a New Token

```bash
# Step 1: Create the token
npm run create

# Fill in details:
Token Name: Moon Doge
Token Symbol: MDOGE
Description: To the moon! 🌙
Logo URL: https://i.imgur.com/moondoge.png

# Step 2: Start volume immediately
npm run volume

# Use the token address from step 1
Token address: 0x[FROM_STEP_1]
Duration: 180  # 3 hours of volume
Confirm: y
```

### Example 2: Boost Existing Token

```bash
npm run volume

Token address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5
Duration: [leave empty]  # Run unlimited
Confirm: y

# Press Ctrl+C when you want to stop
```

### Example 3: Multiple Tokens (Run in separate terminals)

**Terminal 1:**
```bash
npm run volume
# Token A address
```

**Terminal 2:**
```bash
npm run volume
# Token B address
```

### Example 4: Testing with Small Amounts

```env
# In .env, set conservative values
MIN_BUY_AMOUNT=0.001
MAX_BUY_AMOUNT=0.005
INITIAL_BUY_AMOUNT=0.01
```

```bash
npm run create
# Create test token with minimal buy
```

## 📁 Project Structure

```
Solana-Volume-Bot/
│
├── src/                           # Source code
│   ├── abis/                      # Smart contract ABIs
│   │   ├── ERC20.json
│   │   ├── FourMemeFactory.json
│   │   └── PancakeRouter.json
│   │
│   ├── config/                    # Configuration management
│   │   └── index.ts
│   │
│   ├── services/                  # Core business logic
│   │   ├── tokenCreator.ts        # Token creation & four.meme trading
│   │   ├── volumeBooster.ts       # Volume boosting logic
│   │   ├── pancakeswapTrader.ts   # PancakeSwap integration
│   │   └── advancedVolumeBot.ts   # Auto-detecting volume bot
│   │
│   ├── types/                     # TypeScript type definitions
│   │   └── index.ts
│   │
│   ├── utils/                     # Utility functions
│   │   ├── walletManager.ts       # Multi-wallet management
│   │   ├── contracts.ts           # Contract interaction helpers
│   │   ├── logger.ts              # Colored logging system
│   │   ├── bundler.ts             # Transaction bundling
│   │   └── index.ts
│   │
│   ├── create.ts                  # Token creation CLI
│   ├── volume.ts                  # Volume boosting CLI
│   └── index.ts                   # Main entry point
│
├── .env                           # Your configuration (create this)
├── config.example.env             # Configuration template
├── .gitignore                     # Git ignore rules
├── package.json                   # Dependencies & scripts
├── tsconfig.json                  # TypeScript configuration
└── README.md                      # This file
```

## 📩 Contact  
For inquiries, custom integrations, or tailored solutions, reach out via:  

💬 **Telegram**: [@bettyjk_0915](https://t.me/bettyjk_0915)

---
>>>>>>> a5d574467c40c0ee67d55ae57738551f15e23724
