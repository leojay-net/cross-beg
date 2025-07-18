// Contract addresses for different networks
export const CONTRACT_ADDRESSES = {
  // Ethereum Mainnet
  1: '0x...',
  // Polygon
  137: '0x...',
  // Arbitrum
  42161: '0x...',
  // Optimism
  10: '0x...',
  // Base
  8453: '0x...',
  // BSC
  56: '0x...',
  // Avalanche
  43114: '0x...',
  // Sepolia (testnet)
  11155111: '0x...',
  // Mumbai (testnet)
  80001: '0x...',
} as const;

// Supported chains configuration
export const SUPPORTED_CHAINS = [
  {
    id: 1,
    name: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://eth-mainnet.g.alchemy.com/v2/your-api-key'],
    blockExplorerUrls: ['https://etherscan.io'],
    logoURI: '/chains/ethereum.png',
  },
  {
    id: 137,
    name: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    rpcUrls: ['https://polygon-mainnet.g.alchemy.com/v2/your-api-key'],
    blockExplorerUrls: ['https://polygonscan.com'],
    logoURI: '/chains/polygon.png',
  },
  {
    id: 42161,
    name: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://arb-mainnet.g.alchemy.com/v2/your-api-key'],
    blockExplorerUrls: ['https://arbiscan.io'],
    logoURI: '/chains/arbitrum.png',
  },
  {
    id: 10,
    name: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://opt-mainnet.g.alchemy.com/v2/your-api-key'],
    blockExplorerUrls: ['https://optimistic.etherscan.io'],
    logoURI: '/chains/optimism.png',
  },
  {
    id: 8453,
    name: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://base-mainnet.g.alchemy.com/v2/your-api-key'],
    blockExplorerUrls: ['https://basescan.org'],
    logoURI: '/chains/base.png',
  },
] as const;

// Popular tokens configuration
export const POPULAR_TOKENS = {
  1: [ // Ethereum
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0xA0b86a33E6441E4515b5b08fA87E24b9f2fB0a87',
      decimals: 6,
      logoURI: '/tokens/usdc.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      logoURI: '/tokens/usdt.png',
    },
    {
      symbol: 'ETH',
      name: 'Ether',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logoURI: '/tokens/eth.png',
    },
  ],
  137: [ // Polygon
    {
      symbol: 'USDC',
      name: 'USD Coin',
      address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
      decimals: 6,
      logoURI: '/tokens/usdc.png',
    },
    {
      symbol: 'USDT',
      name: 'Tether USD',
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      decimals: 6,
      logoURI: '/tokens/usdt.png',
    },
    {
      symbol: 'MATIC',
      name: 'Polygon',
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      logoURI: '/tokens/matic.png',
    },
  ],
} as const;

export const DEFAULT_TOKEN = 'USDC';
export const DEFAULT_EXPIRY_DAYS = 7;
