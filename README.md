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
