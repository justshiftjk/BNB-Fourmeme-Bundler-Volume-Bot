# Solana Volume Bot for Raydium and Meteora

The **Solana Volume Bot** is a sophisticated automation tool designed to facilitate the distribution of SOL across multiple wallets and execute concurrent buy and sell swap transactions on the **Raydium** and **Meteora** decentralized exchanges. By leveraging the power of the **Solana blockchain**, this bot enables high-efficiency operations, ensuring fast and seamless transactions.

## 🔥Features

⚡**Automated SOL Distribution**  
  Automates the process of distributing SOL to newly created wallets for efficient fund allocation.
  
🎯**Endless Buy and Sell Swaps**  
  Executes buy and sell swap transactions concurrently on Raydium and Meteora, ensuring continuous trading activity.
  
🔍**Configurable Parameters**  
  Customize transaction settings including buy amounts, intervals, distribution configurations, and more, to tailor the bot’s performance to your specific needs.
  
🚀**Massive Buy Mode**  
  Configures multiple wallets to carry out large-scale buy operations, increasing trading volume and flexibility.
  
🛒**Sell Mode**  
  Gradually sells tokens from all sub-wallets through incremental transactions to avoid large market impacts.
  
⚙️**Token Pair Settings**  
  Set token mints and pool IDs for swap operations, providing full control over which assets are traded.
  
🖥️**Logging and Monitoring**  
  Provides adjustable logging levels for improved monitoring, debugging, and performance tracking during operation.

## Environment Variables

The bot uses the following environment variables, which should be defined in a `.env` file:

```env
PRIVATE_KEY=                 # Private key for the main wallet
RPC_ENDPOINT=                # RPC endpoint for Solana
RPC_WEBSOCKET_ENDPOINT=      # RPC WebSocket endpoint for Solana

####### BUY SETTING #######
IS_RANDOM=true               # Enable random buy amounts
DISTRIBUTION_AMOUNT=0.01     # Amount of SOL to distribute to each wallet
BUY_AMOUNT=0.01              # Fixed buy amount
BUY_UPPER_AMOUNT=0.002       # Upper limit for random buy amount
BUY_LOWER_AMOUNT=0.001       # Lower limit for random buy amount

BUY_INTERVAL_MAX=2000        # Maximum interval between buys in milliseconds
BUY_INTERVAL_MIN=4000        # Minimum interval between buys in milliseconds

CHECK_BAL_INTERVAL=3000      # Interval to check wallet balances in milliseconds
DISTRIBUTE_WALLET_NUM=8      # Number of wallets to distribute SOL to

SWAP_ROUTING=true            # Enable swap routing

###### FOR MASSIVE BUY #####
WALLET_NUM=8                 # Number of wallets for massive buy operations

########## FOR SELL MODE ##########
SELL_ALL_BY_TIMES=20         # Number of times to sell all tokens in sub-wallets gradually
SELL_PERCENT=100             # Percentage of tokens to sell from the main wallet

#### TOKEN PAIR SETTING ####
TOKEN_MINT=6VbEGuqwhjdgV9NxhMhvRkrFqXVNk53CvD7hK3C3yQS9  # Token mint address
POOL_ID=null                  # Pool ID for the token pair

TX_FEE=10                    # Transaction fee
ADDITIONAL_FEE=0.006         # Additional fee (should be larger than 0.006 SOL)
JITO_KEY=                    # Jito key
JITO_FEE=120000              # Jito fee
BLOCKENGINE_URL=ny.mainnet.block-engine.jito.wtf  # Block engine URL

###### GENERAL SETTING ######
LOG_LEVEL=info               # Logging level (info, debug, error)
```

## Usage
1. Clone the repository
```
git clone https://github.com/justshiftjk/Solana-Volume-Bot
```
2. Install dependencies
```
npm install
```
3. Configure the environment variables

Rename the .env.copy file to .env and set RPC and WSS, main keypair's secret key, and Jito auth keypair.

4. Run the bot

```
npm start
```

## Contact

If you have any questions or want a more customized app for specific use cases, don't hesitate to get in touch with me to the contacts below.

- E-Mail: adamglab0731.pl@gmail.com
- Telegram: [@bettyjk_0915](https://t.me/bettyjk_0915)
