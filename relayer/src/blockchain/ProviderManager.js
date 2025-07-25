/**
 * Provider Manager Module
 * Manages blockchain providers, wallets, and contracts
 */

const { ethers } = require('ethers');
const { getAllChains, getChainConfig } = require('../config/chains');
const { CONTRACT_ABI, DEFAULT_CONFIG } = require('../config/constants');
const logger = require('../utils/logger');

class ProviderManager {
    constructor() {
        this.providers = {};
        this.wallets = {};
        this.contracts = {};
        this.isInitialized = false;
    }

    /**
     * Initialize all providers, wallets, and contracts
     */
    async initialize() {
        try {
            await this.initializeProviders();
            await this.initializeContracts();
            await this.validateWalletBalances();

            this.isInitialized = true;
            logger.info('✅ ProviderManager initialized successfully');
        } catch (error) {
            logger.error('❌ Failed to initialize ProviderManager:', error);
            throw error;
        }
    }

    /**
     * Initialize blockchain providers and wallets
     */
    async initializeProviders() {
        const chains = getAllChains();

        for (const [chainKey, config] of Object.entries(chains)) {
            try {
                // Create provider based on chain configuration
                if (config.disableEventFilters) {
                    // Use JsonRpcProvider with polling disabled for chains that don't support event filters
                    this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl, {
                        chainId: config.chainId,
                        name: config.name
                    });
                    // Disable polling to avoid using event filters
                    this.providers[chainKey].pollingInterval = 0;
                    logger.info(`✅ Using JsonRpcProvider with polling disabled for ${config.name} (event filters disabled)`);
                } else {
                    // Use regular JsonRpcProvider for chains that support event filters
                    this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl);
                }

                // Test connection
                await this.providers[chainKey].getBlockNumber();

                // Initialize wallet if private key is provided
                const privateKey = process.env.RELAYER_PRIVATE_KEY;
                if (privateKey) {
                    this.wallets[chainKey] = new ethers.Wallet(privateKey, this.providers[chainKey]);
                    logger.info(`✅ Initialized provider and wallet for ${config.name}`);
                } else {
                    logger.warn(`⚠️ No private key provided, wallet not initialized for ${config.name}`);
                }

            } catch (error) {
                logger.error(`❌ Failed to initialize provider for ${config.name}:`, error.message);
                throw error;
            }
        }
    }

    /**
     * Initialize smart contracts
     */
    async initializeContracts() {
        const chains = getAllChains();

        for (const [chainKey, config] of Object.entries(chains)) {
            this.contracts[chainKey] = new ethers.Contract(
                config.contractAddress,
                CONTRACT_ABI,
                this.providers[chainKey]
            );
            logger.info(`✅ Initialized contract for ${config.name}: ${config.contractAddress}`);
        }
    }

    /**
     * Validate wallet balances across all chains
     */
    async validateWalletBalances() {
        const minBalance = DEFAULT_CONFIG.MIN_WALLET_BALANCE;

        for (const [chainKey, wallet] of Object.entries(this.wallets)) {
            try {
                const balance = await wallet.provider.getBalance(wallet.address);
                const balanceEth = ethers.formatEther(balance);
                const config = getChainConfig(chainKey);

                logger.info(`💰 ${config.name} balance: ${balanceEth} ETH`);

                if (parseFloat(balanceEth) < minBalance) {
                    logger.warn(`⚠️ Low balance on ${config.name}: ${balanceEth} ETH`);
                }
            } catch (error) {
                logger.error(`❌ Failed to check balance for ${chainKey}:`, error.message);
            }
        }
    }

    /**
     * Get provider for a specific chain
     * @param {string} chainKey - Chain identifier
     * @returns {ethers.JsonRpcProvider|null} Provider instance
     */
    getProvider(chainKey) {
        return this.providers[chainKey] || null;
    }

    /**
     * Get wallet for a specific chain
     * @param {string} chainKey - Chain identifier
     * @returns {ethers.Wallet|null} Wallet instance
     */
    getWallet(chainKey) {
        return this.wallets[chainKey] || null;
    }

    /**
     * Get contract for a specific chain
     * @param {string} chainKey - Chain identifier
     * @returns {ethers.Contract|null} Contract instance
     */
    getContract(chainKey) {
        return this.contracts[chainKey] || null;
    }

    /**
     * Get contract with signer for a specific chain
     * @param {string} chainKey - Chain identifier
     * @returns {ethers.Contract|null} Contract with signer
     */
    getContractWithSigner(chainKey) {
        const contract = this.contracts[chainKey];
        const wallet = this.wallets[chainKey];

        if (contract && wallet) {
            return contract.connect(wallet);
        }

        return null;
    }

    /**
     * Get all providers
     * @returns {Object} All provider instances
     */
    getAllProviders() {
        return { ...this.providers };
    }

    /**
     * Get all wallets
     * @returns {Object} All wallet instances
     */
    getAllWallets() {
        return { ...this.wallets };
    }

    /**
     * Get all contracts
     * @returns {Object} All contract instances
     */
    getAllContracts() {
        return { ...this.contracts };
    }

    /**
     * Get wallet balances for all chains
     * @returns {Promise<Object>} Wallet balances
     */
    async getWalletBalances() {
        const balances = {};

        for (const [chainKey, wallet] of Object.entries(this.wallets)) {
            try {
                const balance = await wallet.provider.getBalance(wallet.address);
                const config = getChainConfig(chainKey);

                balances[chainKey] = {
                    address: wallet.address,
                    balance: ethers.formatEther(balance),
                    chainName: config.name,
                    chainId: config.chainId
                };
            } catch (error) {
                const config = getChainConfig(chainKey);
                balances[chainKey] = {
                    address: wallet.address,
                    error: error.message,
                    chainName: config.name,
                    chainId: config.chainId
                };
            }
        }

        return balances;
    }

    /**
     * Check if a specific chain is ready (has provider, wallet, and contract)
     * @param {string} chainKey - Chain identifier
     * @returns {boolean} True if chain is ready
     */
    isChainReady(chainKey) {
        return !!(this.providers[chainKey] && this.wallets[chainKey] && this.contracts[chainKey]);
    }

    /**
     * Get status of all chains
     * @returns {Object} Chain status information
     */
    getChainStatus() {
        const chains = getAllChains();
        const status = {};

        for (const [chainKey, config] of Object.entries(chains)) {
            status[chainKey] = {
                name: config.name,
                chainId: config.chainId,
                hasProvider: !!this.providers[chainKey],
                hasWallet: !!this.wallets[chainKey],
                hasContract: !!this.contracts[chainKey],
                isReady: this.isChainReady(chainKey),
                contractAddress: config.contractAddress,
                rpcUrl: config.rpcUrl
            };
        }

        return status;
    }

    /**
     * Refresh connection for a specific chain
     * @param {string} chainKey - Chain identifier
     */
    async refreshChain(chainKey) {
        const config = getChainConfig(chainKey);
        if (!config) {
            throw new Error(`Invalid chain key: ${chainKey}`);
        }

        try {
            // Reinitialize provider
            this.providers[chainKey] = new ethers.JsonRpcProvider(config.rpcUrl);
            await this.providers[chainKey].getBlockNumber();

            // Reinitialize wallet if private key exists
            const privateKey = process.env.RELAYER_PRIVATE_KEY;
            if (privateKey) {
                this.wallets[chainKey] = new ethers.Wallet(privateKey, this.providers[chainKey]);
            }

            // Reinitialize contract
            this.contracts[chainKey] = new ethers.Contract(
                config.contractAddress,
                CONTRACT_ABI,
                this.providers[chainKey]
            );

            logger.info(`✅ Refreshed connection for ${config.name}`);
        } catch (error) {
            logger.error(`❌ Failed to refresh connection for ${config.name}:`, error.message);
            throw error;
        }
    }

    /**
     * Get network information for a specific chain
     * @param {string} chainKey - Chain identifier
     * @returns {Promise<Object>} Network information
     */
    async getNetworkInfo(chainKey) {
        const provider = this.getProvider(chainKey);
        const config = getChainConfig(chainKey);

        if (!provider || !config) {
            throw new Error(`Invalid chain key: ${chainKey}`);
        }

        try {
            const network = await provider.getNetwork();
            const blockNumber = await provider.getBlockNumber();
            const gasPrice = await provider.getFeeData();

            return {
                chainKey,
                name: config.name,
                chainId: Number(network.chainId),
                blockNumber,
                gasPrice: {
                    gasPrice: gasPrice.gasPrice ? ethers.formatUnits(gasPrice.gasPrice, 'gwei') : null,
                    maxFeePerGas: gasPrice.maxFeePerGas ? ethers.formatUnits(gasPrice.maxFeePerGas, 'gwei') : null,
                    maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas ? ethers.formatUnits(gasPrice.maxPriorityFeePerGas, 'gwei') : null
                },
                blockExplorer: config.blockExplorer
            };
        } catch (error) {
            logger.error(`❌ Failed to get network info for ${chainKey}:`, error.message);
            throw error;
        }
    }
}

module.exports = ProviderManager; 