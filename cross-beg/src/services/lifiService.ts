import axios from 'axios';
import { ethers } from 'ethers';
import { API_CONFIG } from '@/config/api';

const LIFI_API_URL = API_CONFIG.LIFI_BASE_URL;

// Temporary: Map testnet keys to mainnet keys for Li.Fi
const MAINNET_LIFI_CHAIN_MAPPING: Record<string, string> = {
    baseSepolia: 'base',
    mantleSepolia: 'mantle',
    optimismSepolia: 'optimism',
    arbitrumSepolia: 'arbitrum',
    polygonAmoy: 'polygon',
    sepolia: 'ethereum',
};

function toMainnetChainKey(testnetKey: string): string {
    return MAINNET_LIFI_CHAIN_MAPPING[testnetKey] || testnetKey;
}

const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';

export interface LifiQuoteParams {
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    fromAmount: string;
    fromAddress: string;
}

export interface LifiQuote {
    action: {
        fromToken: {
            address: string;
            symbol: string;
            name: string;
            decimals: number;
        };
        toToken: {
            address: string;
            symbol: string;
            name: string;
            decimals: number;
        };
        fromAmount: string;
        toAmount: string;
    };
    estimate: {
        approvalAddress: string;
        gasCosts: Array<{
            amount: string;
            token: {
                symbol: string;
            };
        }>;
        feeCosts: Array<{
            amount: string;
            token: {
                symbol: string;
            };
        }>;
    };
    transactionRequest: {
        to: string;
        data: string;
        value: string;
        gasLimit: string;
        gasPrice: string;
    };
    tool: string;
}

export interface LifiStatusResponse {
    status: 'PENDING' | 'DONE' | 'FAILED';
    substatus?: string;
    substatusMessage?: string;
}

// Chain mapping for Li.Fi API
export const LIFI_CHAIN_MAPPING: Record<string, string> = {
    'sepolia': 'ETH',
    'baseSepolia': 'BAS',
    'optimismSepolia': 'OPT',
    'mantleSepolia': 'MNT',
    'arbitrumSepolia': 'ARB',
    'polygonAmoy': 'POL'
};

// Token mapping for Li.Fi API
export const LIFI_TOKEN_MAPPING: Record<string, Record<string, string>> = {
    'ETH': {
        'ETH': '0x0000000000000000000000000000000000000000',
        'USDC': '0xA0b86a33E6417c5F4b9C3e9e8b24E8E5a5E3FC8B', // Example testnet USDC
        'USDT': '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Example testnet USDT
    },
    'BAS': {
        'ETH': '0x0000000000000000000000000000000000000000',
        'USDC': '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia USDC
    },
    'OPT': {
        'ETH': '0x0000000000000000000000000000000000000000',
        'USDC': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7', // Optimism Sepolia USDC
    },
    'MNT': {
        'MNT': '0x0000000000000000000000000000000000000000',
        'USDC': '0xf56dc6695cF1f5c364eDEbC7Dc7077ac9B586068', // Mantle Sepolia USDC
    },
    'ARB': {
        'ETH': '0x0000000000000000000000000000000000000000',
        'USDC': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia USDC
    },
    'POL': {
        'MATIC': '0x0000000000000000000000000000000000000000',
        'USDC': '0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582', // Polygon Amoy USDC
    }
};

export class LifiService {
    /**
     * Get a quote for cross-chain transfer
     */
    static async getQuote(params: LifiQuoteParams): Promise<LifiQuote> {
        try {
            const response = await axios.get(`${LIFI_API_URL}/quote`, {
                params: {
                    fromChain: toMainnetChainKey(params.fromChain),
                    toChain: toMainnetChainKey(params.toChain),
                    fromToken: NATIVE_TOKEN, // Force native token for testing
                    toToken: NATIVE_TOKEN,   // Force native token for testing
                    fromAmount: params.fromAmount,
                    fromAddress: params.fromAddress,
                }
            });

            const quote = response.data;

            // Validate the quote response to prevent null/undefined errors
            if (!quote || !quote.action || !quote.estimate || !quote.transactionRequest) {
                throw new Error('Invalid quote response from Li.Fi');
            }

            // Ensure required fields have default values
            if (!quote.action.toAmount) {
                quote.action.toAmount = '0';
            }

            if (!quote.estimate.gasCosts) {
                quote.estimate.gasCosts = [];
            }

            if (!quote.estimate.feeCosts) {
                quote.estimate.feeCosts = [];
            }

            // Validate gas costs
            quote.estimate.gasCosts = quote.estimate.gasCosts.map(cost => ({
                ...cost,
                amount: cost.amount || '0'
            }));

            // Validate fee costs
            quote.estimate.feeCosts = quote.estimate.feeCosts.map(cost => ({
                ...cost,
                amount: cost.amount || '0'
            }));

            return quote;
        } catch (error) {
            console.error('Error getting Li.Fi quote:', error);
            throw new Error('Failed to get quote from Li.Fi');
        }
    }

    /**
     * Get available routes for cross-chain transfer
     */
    static async getRoutes(params: LifiQuoteParams): Promise<LifiQuote[]> {
        try {
            const response = await axios.get(`${LIFI_API_URL}/routes`, {
                params: {
                    fromChain: toMainnetChainKey(params.fromChain),
                    toChain: toMainnetChainKey(params.toChain),
                    fromToken: NATIVE_TOKEN,
                    toToken: NATIVE_TOKEN,
                    fromAmount: params.fromAmount,
                    fromAddress: params.fromAddress,
                }
            });
            return response.data.routes;
        } catch (error) {
            console.error('Error getting Li.Fi routes:', error);
            throw new Error('Failed to get routes from Li.Fi');
        }
    }

    /**
     * Check the status of a cross-chain transfer
     */
    static async getStatus(
        bridge: string,
        fromChain: string,
        toChain: string,
        txHash: string
    ): Promise<LifiStatusResponse> {
        try {
            const response = await axios.get(`${LIFI_API_URL}/status`, {
                params: {
                    bridge,
                    fromChain: toMainnetChainKey(fromChain),
                    toChain: toMainnetChainKey(toChain),
                    txHash,
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error getting Li.Fi status:', error);
            throw new Error('Failed to get status from Li.Fi');
        }
    }

    /**
     * Check and set allowance for ERC20 tokens
     */
    static async checkAndSetAllowance(
        signer: ethers.Signer,
        tokenAddress: string,
        approvalAddress: string,
        amount: string
    ): Promise<void> {
        // Native tokens don't need approval
        if (tokenAddress === ethers.ZeroAddress) {
            return;
        }

        const ERC20_ABI = [
            {
                name: "approve",
                inputs: [
                    { internalType: "address", name: "spender", type: "address" },
                    { internalType: "uint256", name: "amount", type: "uint256" }
                ],
                outputs: [{ internalType: "bool", name: "", type: "bool" }],
                stateMutability: "nonpayable",
                type: "function"
            },
            {
                name: "allowance",
                inputs: [
                    { internalType: "address", name: "owner", type: "address" },
                    { internalType: "address", name: "spender", type: "address" }
                ],
                outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
                stateMutability: "view",
                type: "function"
            }
        ];

        const erc20 = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
        const walletAddress = await signer.getAddress();
        const allowance = await erc20.allowance(walletAddress, approvalAddress);

        if (allowance < BigInt(amount)) {
            const approveTx = await erc20.approve(approvalAddress, amount);
            await approveTx.wait();
        }
    }

    /**
     * Execute a cross-chain transfer using Li.Fi
     */
    static async executeCrossChainTransfer(
        signer: ethers.Signer,
        quote: LifiQuote
    ): Promise<string> {
        try {
            // Set allowance if needed
            await this.checkAndSetAllowance(
                signer,
                quote.action.fromToken.address,
                quote.estimate.approvalAddress,
                quote.action.fromAmount
            );

            // Send the transaction
            const tx = await signer.sendTransaction(quote.transactionRequest);
            await tx.wait();

            return tx.hash;
        } catch (error) {
            console.error('Error executing cross-chain transfer:', error);
            throw new Error('Failed to execute cross-chain transfer');
        }
    }

    /**
     * Monitor the status of a cross-chain transfer until completion
     */
    static async monitorTransfer(
        bridge: string,
        fromChain: string,
        toChain: string,
        txHash: string,
        onStatusUpdate?: (status: LifiStatusResponse) => void
    ): Promise<LifiStatusResponse> {
        let result: LifiStatusResponse;

        do {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds between checks
            result = await this.getStatus(bridge, fromChain, toChain, txHash);

            if (onStatusUpdate) {
                onStatusUpdate(result);
            }
        } while (result.status !== 'DONE' && result.status !== 'FAILED');

        return result;
    }

    /**
     * Get supported tokens for a chain
     */
    static getSupportedTokens(chainKey: string): string[] {
        const lifiChain = LIFI_CHAIN_MAPPING[chainKey];
        if (!lifiChain || !LIFI_TOKEN_MAPPING[lifiChain]) {
            return [];
        }
        return Object.keys(LIFI_TOKEN_MAPPING[lifiChain]);
    }

    /**
     * Get token address for a chain and token symbol
     */
    static getTokenAddress(chainKey: string, tokenSymbol: string): string | null {
        const lifiChain = LIFI_CHAIN_MAPPING[chainKey];
        if (!lifiChain || !LIFI_TOKEN_MAPPING[lifiChain]) {
            return null;
        }
        return LIFI_TOKEN_MAPPING[lifiChain][tokenSymbol] || null;
    }
}
