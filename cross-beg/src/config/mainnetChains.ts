// Mainnet chain configurations for Li.Fi bridging
export const MAINNET_CHAINS = {
    base: {
        chainId: 8453,
        name: 'Base',
        rpcUrl: 'https://mainnet.base.org',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://basescan.org'
    },
    mantle: {
        chainId: 5000,
        name: 'Mantle',
        rpcUrl: 'https://rpc.mantle.xyz',
        nativeCurrency: { name: 'Mantle', symbol: 'MNT', decimals: 18 },
        blockExplorer: 'https://explorer.mantle.xyz'
    },
    optimism: {
        chainId: 10,
        name: 'Optimism',
        rpcUrl: 'https://mainnet.optimism.io',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://optimistic.etherscan.io'
    },
    arbitrum: {
        chainId: 42161,
        name: 'Arbitrum One',
        rpcUrl: 'https://arb1.arbitrum.io/rpc',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://arbiscan.io'
    },
    ethereum: {
        chainId: 1,
        name: 'Ethereum',
        rpcUrl: 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
        nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
        blockExplorer: 'https://etherscan.io'
    },
    polygon: {
        chainId: 137,
        name: 'Polygon',
        rpcUrl: 'https://polygon-rpc.com',
        nativeCurrency: { name: 'Polygon', symbol: 'MATIC', decimals: 18 },
        blockExplorer: 'https://polygonscan.com'
    }
};

// Map testnet keys to mainnet chain configs
export const getMainnetChainConfig = (testnetKey: string) => {
    const mapping: Record<string, keyof typeof MAINNET_CHAINS> = {
        baseSepolia: 'base',
        mantleSepolia: 'mantle',
        optimismSepolia: 'optimism',
        arbitrumSepolia: 'arbitrum',
        sepolia: 'ethereum',
        polygonAmoy: 'polygon',
    };

    const mainnetKey = mapping[testnetKey];
    return mainnetKey ? MAINNET_CHAINS[mainnetKey] : null;
};

// Add or switch to a mainnet network
export const addOrSwitchToMainnetNetwork = async (testnetKey: string) => {
    const chainConfig = getMainnetChainConfig(testnetKey);
    if (!chainConfig || !window.ethereum) {
        throw new Error('Network not supported or wallet not available');
    }

    const chainIdHex = `0x${chainConfig.chainId.toString(16)}`;

    try {
        // Try to switch to the network
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });
    } catch (switchError: any) {
        // If the chain is not added, add it
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: chainIdHex,
                            chainName: chainConfig.name,
                            nativeCurrency: chainConfig.nativeCurrency,
                            rpcUrls: [chainConfig.rpcUrl],
                            blockExplorerUrls: [chainConfig.blockExplorer],
                        },
                    ],
                });
            } catch (addError) {
                throw new Error(`Failed to add network: ${addError}`);
            }
        } else {
            throw new Error(`Failed to switch network: ${switchError.message}`);
        }
    }
};
