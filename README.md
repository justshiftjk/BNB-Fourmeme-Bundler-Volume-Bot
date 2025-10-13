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

## 🔍 Troubleshooting

### Common Issues and Solutions

#### ❌ "No private keys provided"

**Problem:** Private keys not configured in `.env`

**Solution:**
```bash
# Edit .env file
PRIVATE_KEYS=0xYOUR_KEY_1,0xYOUR_KEY_2,0xYOUR_KEY_3
```

#### ❌ "Insufficient funds for gas"

**Problem:** Wallets don't have enough BNB

**Solution:**
```bash
# Check balances
npm run dev

# Transfer BNB to wallets (minimum 0.1 BNB each)
```

#### ❌ "Transaction failed"

**Problem:** Gas price too low or network congestion

**Solution:**
```env
# Increase gas price in .env
GAS_PRICE=10  # or higher

# Or increase slippage
SLIPPAGE_TOLERANCE=15
```

#### ❌ "No tokens to sell"

**Problem:** Wallet hasn't bought tokens yet

**Solution:**
- This is normal - the bot will skip sells until tokens are bought
- The bot automatically executes more buys initially

#### ❌ "Invalid token address"

**Problem:** Incorrect token address format

**Solution:**
- Ensure address starts with `0x`
- Verify address is correct (42 characters total)
- Check on BscScan

#### ❌ "Connection timeout"

**Problem:** RPC node not responding

**Solution:**
```env
# Try different RPC URL
RPC_URL=https://bsc-dataseed2.binance.org/

# Or use private RPC for better reliability
```

#### ❌ "Contract not found"

**Problem:** Four.meme factory address incorrect

**Solution:**
1. Go to [BscScan](https://bscscan.com/)
2. Search for four.meme verified contracts
3. Update `FOURMEME_FACTORY_ADDRESS` in `.env`

### Debug Mode

Enable detailed logging:

```env
DEBUG=true
```

Then run your command to see detailed debug information.

### Testing on Testnet

Test everything safely on BSC testnet first:

```env
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
CHAIN_ID=97
```

Get testnet BNB from [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart)

## 🔒 Security

### Security Best Practices

#### ✅ Private Key Safety

- **NEVER** commit `.env` file to Git (already in `.gitignore`)
- **NEVER** share private keys with anyone
- **NEVER** post private keys in Discord, Telegram, or screenshots
- Use **dedicated wallets** for the bot (not your main wallet)
- Store backup of `.env` file **encrypted** in secure location

#### ✅ Smart Contract Verification

Before using any contract:

1. Verify on [BscScan](https://bscscan.com/)
2. Check contract is verified ✅
3. Review contract source code
4. Ensure contract has recent activity
5. Check for red flags in comments

#### ✅ Operational Security

- Run bot on **secure computer** (not public/shared)
- Use **firewall** to restrict network access
- Keep **software updated** (Node.js, dependencies)
- Monitor **wallet balances** regularly
- Set **maximum loss limits** before running

#### ✅ Risk Management

- Start with **small amounts** for testing
- Use **testnet first** to verify everything works
- Don't invest more than you can afford to lose
- Understand the **risks of volume boosting**
- Be aware of **legal implications** in your jurisdiction

### What Gets Logged

The bot logs:
- Transaction hashes (public information)
- Wallet addresses (public information)
- Trade amounts and statistics
- **NEVER** logs private keys

### Environment File Security

```bash
# Verify .env is ignored
git status

# .env should NOT appear in untracked files
# If it does, run:
git rm --cached .env
echo ".env" >> .gitignore
```

## ❓ FAQ

### General Questions

**Q: What is four.meme?**  
A: Four.meme is a memecoin launchpad on BNB Chain that uses a bonding curve mechanism for token creation and initial trading.

**Q: Is this legal?**  
A: Volume boosting can have legal implications. Consult legal counsel and understand regulations in your jurisdiction. This software is for educational purposes.

**Q: How much BNB do I need?**  
A: Minimum 0.1 BNB per wallet. For serious volume, 0.5-1 BNB per wallet recommended.

**Q: How many wallets should I use?**  
A: 3-5 wallets recommended for good distribution. More wallets = more organic appearance.

### Technical Questions

**Q: Why use multiple wallets?**  
A: Multiple wallets make trading appear more organic and distributed, similar to real market activity.

**Q: What's the difference between four.meme and PancakeSwap trading?**  
A: Four.meme uses a bonding curve for new tokens. When tokens graduate, they move to PancakeSwap DEX. The bot handles both automatically.

**Q: Can I run multiple bots simultaneously?**  
A: Yes! Open multiple terminals and run `npm run volume` for different tokens.

**Q: How do I calculate profit/loss?**  
A: The bot tracks volume. To calculate P/L, compare initial BNB balance with final balance across all wallets.

**Q: Does this work on other chains?**  
A: Currently only BNB Chain. Multi-chain support planned for future versions.

### Configuration Questions

**Q: What's the best configuration?**  
A: Depends on your goal:
- **Organic growth**: Long intervals (60-180s), small amounts
- **Quick volume**: Short intervals (5-15s), larger amounts
- **Balanced**: Medium intervals (15-45s), moderate amounts

**Q: How to make trading look more organic?**  
A: Use longer random intervals, smaller amounts, more wallets, and vary your configuration daily.

**Q: What slippage tolerance should I use?**  
A: 10% is balanced. Increase to 15% for volatile tokens, decrease to 5% for stable trading.

## 🚨 Disclaimer

### Important Legal Notice

This software is provided **for educational and research purposes only**. By using this software, you acknowledge that:

1. **Market Manipulation Risks**: Artificially inflating trading volume may be considered market manipulation in many jurisdictions and could have legal consequences.

2. **Financial Risk**: Trading cryptocurrencies involves substantial risk of loss. You may lose all funds used with this bot.

3. **No Warranty**: This software is provided "as is" without warranty of any kind, express or implied.

4. **Your Responsibility**: You are solely responsible for:
   - Compliance with local laws and regulations
   - Securing your private keys and funds
   - Any financial losses incurred
   - Understanding the risks involved

5. **Not Financial Advice**: Nothing in this documentation constitutes financial, legal, or investment advice.

6. **Platform Terms**: Ensure your use complies with four.meme's terms of service and applicable exchange policies.

### Use at Your Own Risk

The developers and contributors:
- Are NOT responsible for any losses, damages, or legal issues
- Make NO guarantees about profitability or performance
- Provide NO support for illegal activities
- Recommend consulting with legal and financial professionals

**By using this software, you agree to these terms and accept all risks.**

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test thoroughly on testnet
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Use TypeScript for type safety
- Follow existing code style
- Add comments for complex logic
- Test on BSC testnet first
- Update documentation for new features

## 📞 Support

For issues and questions:

1. ✅ Check this README thoroughly
2. ✅ Review troubleshooting section
3. ✅ Test on testnet first
4. ✅ Verify configuration is correct
5. ✅ Check BscScan for transaction details

**Common Resources:**
- [BscScan](https://bscscan.com/) - Verify transactions
- [BSC Testnet Faucet](https://testnet.binance.org/faucet-smart) - Get testnet BNB
- [Four.meme Platform](https://four.meme) - Token launchpad
- [PancakeSwap](https://pancakeswap.finance/) - DEX trading

## 🎯 Quick Start Summary

```bash
# 1. Install
npm install

# 2. Configure
cp config.example.env .env
# Edit .env with your settings

# 3. Test
npm run dev

# 4. Create token
npm run create

# 5. Boost volume
npm run volume
```

## 📊 Project Stats

- **Language:** TypeScript
- **Blockchain:** BNB Chain (BSC)
- **Platform:** four.meme + PancakeSwap
- **Total Files:** 28
- **Lines of Code:** ~3,500
- **Version:** 1.0.0

---

<div align="center">

**Built for four.meme platform on BNB Chain 🚀**

Made with ❤️ by the community

[⬆ Back to Top](#fourmeme-bnb-chain-volume-bot-)

</div>
