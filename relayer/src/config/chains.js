require("dotenv").config();

const CHAIN_CONFIGS = {
  sepolia: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: process.env.SEPOLIA_RPC_URL,
    contractAddress: process.env.SEPOLIA_CROSSBEG || '0xfCeE63FC08D18A63e069536586Da11e32B49000B',
    blockExplorer: 'https://sepolia.etherscan.io',
    gasMultiplier: 1.2,
    maxLogBlockRange: 400 // Reduced from 2000 - Alchemy has 500 block limit
  },
  baseSepolia: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL,
    contractAddress: process.env.BASE_SEPOLIA_CROSSBEG || '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia.basescan.org',
    gasMultiplier: 1.1,
    maxLogBlockRange: 500
  },
  optimismSepolia: {
    name: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: process.env.OPTIMISM_SEPOLIA_RPC_URL,
    contractAddress: process.env.OPTIMISM_SEPOLIA_CROSSBEG || '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    gasMultiplier: 1.0,
    maxLogBlockRange: 500 // Reduced from 1000 - Optimism Sepolia has 500 block limit
  },
  mantleSepolia: {
    name: 'Mantle Sepolia',
    chainId: 5003,
    rpcUrl: process.env.MANTLE_SEPOLIA_RPC_URL,
    contractAddress: process.env.MANTLE_SEPOLIA_CROSSBEG || '0x14F50e6BeC9cE288b1De41A161F2e698C7EA485a',
    blockExplorer: 'https://explorer.sepolia.mantle.xyz',
    gasMultiplier: 1.1,
    maxLogBlockRange: 1000,
    disableEventFilters: true // Mantle doesn't support eth_newFilter methods
  },
  polygonAmoy: {
    name: 'Polygon Amoy',
    chainId: 80002,
    rpcUrl: process.env.POLYGON_AMOY_RPC_URL,
    contractAddress: process.env.POLYGON_AMOY_CROSSBEG || '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://amoy.polygonscan.com',
    gasMultiplier: 1.3,
    maxLogBlockRange: 3500
  },
  arbitrumSepolia: {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL,
    contractAddress: process.env.ARBITRUM_SEPOLIA_CROSSBEG || '0x603067937be01a88e5Bd848FD4930a9b28da8fE6',
    blockExplorer: 'https://sepolia.arbiscan.io',
    gasMultiplier: 1.0,
    maxLogBlockRange: 10000
  }
};

/**
 * Get chain configuration by key
 * @param {string} chainKey - Chain identifier
 * @returns {Object|null} Chain configuration or null if not found
 */
function getChainConfig(chainKey) {
  return CHAIN_CONFIGS[chainKey] || null;
}

/**
 * Get chain key by chain ID
 * @param {number} chainId - Chain ID
 * @returns {string|null} Chain key or null if not found
 */
function getChainKeyById(chainId) {
  return Object.keys(CHAIN_CONFIGS).find(key =>
    CHAIN_CONFIGS[key].chainId === chainId
  ) || null;
}

/**
 * Get all supported chains
 * @returns {Object} All chain configurations
 */
function getAllChains() {
  return { ...CHAIN_CONFIGS };
}

/**
 * Get supported chain IDs
 * @returns {number[]} Array of supported chain IDs
 */
function getSupportedChainIds() {
  return Object.values(CHAIN_CONFIGS).map(config => config.chainId);
}

/**
 * Validate chain configuration
 * @param {string} chainKey - Chain key to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidChain(chainKey) {
  const config = CHAIN_CONFIGS[chainKey];
  return !!(config && config.rpcUrl && config.contractAddress);
}

module.exports = {
  CHAIN_CONFIGS,
  getChainConfig,
  getChainKeyById,
  getAllChains,
  getSupportedChainIds,
  isValidChain
}; 