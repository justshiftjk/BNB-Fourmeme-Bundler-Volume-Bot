const TOKEN_MANAGER_ABI = [
    'function buyToken(address token, uint256 amount, uint256 maxFunds) payable',
    'function buyTokenAMAP(address token, uint256 funds, uint256 minAmount) payable',
    'function sellToken(address token, uint256 amount)',
    'function sellTokenAMAP(address token, uint256 amount, uint256 minBNB)'
];

const ERC20_ABI = [
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function name() view returns (string)'
];

const HELPER3_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" }
        ],
        "name": "getTokenInfo",
        "outputs": [
            { "internalType": "uint256", "name": "version", "type": "uint256" },
            { "internalType": "address", "name": "tokenManager", "type": "address" },
            { "internalType": "address", "name": "quote", "type": "address" },
            { "internalType": "uint256", "name": "lastPrice", "type": "uint256" },
            { "internalType": "uint256", "name": "tradingFeeRate", "type": "uint256" },
            { "internalType": "uint256", "name": "minTradingFee", "type": "uint256" },
            { "internalType": "uint256", "name": "launchTime", "type": "uint256" },
            { "internalType": "uint256", "name": "offers", "type": "uint256" },
            { "internalType": "uint256", "name": "maxOffers", "type": "uint256" },
            { "internalType": "uint256", "name": "funds", "type": "uint256" },
            { "internalType": "uint256", "name": "maxFunds", "type": "uint256" },
            { "internalType": "bool", "name": "liquidityAdded", "type": "bool" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" },
            { "internalType": "uint256", "name": "funds", "type": "uint256" }
        ],
        "name": "tryBuy",
        "outputs": [
            { "internalType": "address", "name": "tokenManager", "type": "address" },
            { "internalType": "address", "name": "quote", "type": "address" },
            { "internalType": "uint256", "name": "estimatedAmount", "type": "uint256" },
            { "internalType": "uint256", "name": "estimatedCost", "type": "uint256" },
            { "internalType": "uint256", "name": "estimatedFee", "type": "uint256" },
            { "internalType": "uint256", "name": "amountMsgValue", "type": "uint256" },
            { "internalType": "uint256", "name": "amountApproval", "type": "uint256" },
            { "internalType": "uint256", "name": "amountFunds", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" },
            { "internalType": "uint256", "name": "amount", "type": "uint256" }
        ],
        "name": "trySell",
        "outputs": [
            { "internalType": "address", "name": "tokenManager", "type": "address" },
            { "internalType": "address", "name": "quote", "type": "address" },
            { "internalType": "uint256", "name": "funds", "type": "uint256" },
            { "internalType": "uint256", "name": "fee", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
] as const;

const PANCAKE_ROUTER_ABI = [
    'function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)',
    'function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)'
]

export {
    TOKEN_MANAGER_ABI,
    ERC20_ABI,
    HELPER3_ABI,
    PANCAKE_ROUTER_ABI
};