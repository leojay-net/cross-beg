export interface ChainConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  blockExplorer: string;
  gasMultiplier: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP',
    contractAddress: '0xfCeE63FC08D18A63e069536586Da11e32B49000B',
    blockExplorer: 'https://sepolia.etherscan.io',
    gasMultiplier: 1.2,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  baseSepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://base-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP',
    contractAddress: '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia.basescan.org',
    gasMultiplier: 1.1,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  optimismSepolia: {
    name: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://opt-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP',
    contractAddress: '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    gasMultiplier: 1.0,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  mantleSepolia: {
    name: 'Mantle Sepolia',
    chainId: 5003,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    contractAddress: '0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a',
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    gasMultiplier: 1.1,
    nativeCurrency: {
      name: 'Mantle',
      symbol: 'MNT',
      decimals: 18,
    },
  },
  polygonAmoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: 'https://polygon-amoy.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP',
    contractAddress: '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://amoy.polygonscan.com',
    gasMultiplier: 1.3,
    nativeCurrency: {
      name: 'Polygon',
      symbol: 'MATIC',
      decimals: 18,
    },
  },
  arbitrumSepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://arb-sepolia.g.alchemy.com/v2/kwgGr9GGk4YyLXuGfEvpITv1jpvn3PgP',
    contractAddress: '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia.arbiscan.io',
    gasMultiplier: 1.0,
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export const getChainConfig = (chainKey: string): ChainConfig | null => {
  return CHAIN_CONFIGS[chainKey] || null;
};

export const getChainKeyById = (chainId: number): string | null => {
  return Object.keys(CHAIN_CONFIGS).find(key =>
    CHAIN_CONFIGS[key].chainId === chainId
  ) || null;
};

export const getAllChains = (): Record<string, ChainConfig> => {
  return { ...CHAIN_CONFIGS };
};

export const getSupportedChainIds = (): number[] => {
  return Object.values(CHAIN_CONFIGS).map(config => config.chainId);
};

export const isValidChain = (chainKey: string): boolean => {
  const config = CHAIN_CONFIGS[chainKey];
  return !!(config && config.rpcUrl && config.contractAddress);
}; 