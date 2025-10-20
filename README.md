# Four.meme BNB Chain Volume Bot 🚀

A powerful, automated volume bot for the [four.meme](https://four.meme) token launchpad on BNB Chain (Binance Smart Chain). This bot enables automated token creation with bundled buying and sophisticated volume boosting through multi-wallet trading strategies.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Examples](#examples)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [FAQ](#faq)
- [Disclaimer](#disclaimer)
- [License](#license)

## 🌟 Overview

This volume bot is specifically designed for the **four.meme platform** on BNB Chain, allowing you to:

1. **Create tokens** on four.meme with an automatic bundled initial purchase
2. **Boost trading volume** through automated buy/sell transactions across multiple wallets
3. **Simulate organic trading activity** with randomized amounts and intervals
4. **Support dual exchanges** - works on both four.meme bonding curve and PancakeSwap DEX

Perfect for token creators who want to establish initial trading activity and boost their token's visibility on four.meme.

## ✨ Features

### Core Functionality

- **🎯 Token Creation with Bundled Buy**
  - Create tokens directly on four.meme platform
  - Automatically bundle the first purchase with token creation
  - Configurable initial buy amount
  - Extract and save token address automatically

- **💹 Intelligent Volume Boosting**
  - Multi-wallet support for distributed trading (3-5 wallets recommended)
  - Random buy/sell amounts for organic appearance
  - Configurable time intervals between trades (10-30 seconds default)
  - Weighted trading logic (60% buys, 40% sells for volume growth)
  - Real-time statistics tracking

- **🔄 Dual Exchange Support**
  - **Four.meme Bonding Curve**: For newly created tokens
  - **PancakeSwap DEX**: For tokens that have graduated to DEX
  - **Auto-detection**: Automatically detects which exchange to use
  - Seamless transition between platforms

- **⚡ Advanced Trading Features**
  - Slippage protection (configurable tolerance)
  - Gas optimization with custom gas price settings
  - Automatic token approval management
  - Error handling with retry logic (max 3 retries)
  - Graceful shutdown on Ctrl+C

- **📊 Statistics & Monitoring**
  - Total trades executed
  - Total volume in BNB
  - Buy/sell ratio tracking
  - Real-time colored console logs
  - Transaction hash logging for verification

### Technical Features

- **TypeScript** - Type-safe development
- **Ethers.js v6** - Modern Web3 library
- **Multi-wallet Architecture** - Distributed trading
- **Environment-based Configuration** - Secure settings management
- **Modular Design** - Easy to extend and customize

## 🔧 How It Works

### Token Creation Flow

```
1. User provides token metadata (name, symbol, description, etc.)
   ↓
2. Script calls four.meme factory contract to create token
   ↓
3. Immediately executes bundled buy transaction
   ↓
4. Returns token address and transaction hashes
```

### Volume Boosting Flow

```
1. Bot selects random wallet from the pool
   ↓
2. Decides action: BUY (60% chance) or SELL (40% chance)
   ↓
3. For BUY:
   - Generates random amount (MIN_BUY_AMOUNT to MAX_BUY_AMOUNT)
   - Executes buy on four.meme or PancakeSwap
   ↓
4. For SELL:
   - Checks wallet token balance
   - Sells random percentage (MIN_SELL_PERCENTAGE to MAX_SELL_PERCENTAGE)
   - Executes sell transaction
   ↓
5. Waits random interval (MIN_INTERVAL to MAX_INTERVAL)
   ↓
6. Repeats until stopped or duration reached
```

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **BNB (BSC)** for gas fees and trading
  - Minimum 0.1 BNB per wallet recommended
  - More for higher volume trading
- **3-5 Wallet Private Keys** for multi-wallet trading
  - Use dedicated wallets (NOT your main wallet)
  - Keep private keys secure
- **Four.meme Contract Addresses**
  - Factory contract address
  - (Find on BscScan or four.meme documentation)

## 🚀 Installation

### Step 1: Clone the Repository

```bash
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
