import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '@/contexts/WalletContext';
import { LifiService, LifiQuote, LifiStatusResponse, LIFI_CHAIN_MAPPING } from '@/services/lifiService';
import { addOrSwitchToMainnetNetwork, getMainnetChainConfig } from '@/config/mainnetChains';

interface UseLifiOptions {
    onQuoteReceived?: (quote: LifiQuote) => void;
    onTransactionSent?: (txHash: string) => void;
    onStatusUpdate?: (status: LifiStatusResponse) => void;
    onTransferComplete?: (status: LifiStatusResponse) => void;
    onError?: (error: Error) => void;
}

export function useLifi(options: UseLifiOptions = {}) {
    const { signer, userAddress } = useWallet();
    const [isLoading, setIsLoading] = useState(false);
    const [quote, setQuote] = useState<LifiQuote | null>(null);
    const [transferStatus, setTransferStatus] = useState<LifiStatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);

    const getQuote = useCallback(async (
        fromChain: string,
        toChain: string,
        fromToken: string,
        toToken: string,
        amount: string
    ) => {
        if (!userAddress) {
            throw new Error('Wallet not connected');
        }

        setIsLoading(true);
        setError(null);

        try {
            const lifiFromChain = LIFI_CHAIN_MAPPING[fromChain];
            const lifiToChain = LIFI_CHAIN_MAPPING[toChain];

            if (!lifiFromChain || !lifiToChain) {
                throw new Error('Unsupported chain for Li.Fi');
            }

            const quoteParams = {
                fromChain: lifiFromChain,
                toChain: lifiToChain,
                fromToken: LifiService.getTokenAddress(fromChain, fromToken) || fromToken,
                toToken: LifiService.getTokenAddress(toChain, toToken) || toToken,
                fromAmount: amount,
                fromAddress: userAddress,
            };

            const newQuote = await LifiService.getQuote(quoteParams);
            setQuote(newQuote);

            if (options.onQuoteReceived) {
                options.onQuoteReceived(newQuote);
            }

            return newQuote;
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to get quote');
            setError(error.message);
            if (options.onError) {
                options.onError(error);
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [userAddress, options]);

    const executeTransfer = useCallback(async (transferQuote?: LifiQuote) => {
        if (!signer || !userAddress) {
            throw new Error('Wallet not connected');
        }

        const quoteToUse = transferQuote || quote;
        if (!quoteToUse) {
            throw new Error('No quote available');
        }

        setIsLoading(true);
        setError(null);

        try {
            // For cross-chain transfers, we need to switch to the source mainnet network
            // Extract the source chain from the quote or use a default mapping
            const sourceChainKey = Object.keys(LIFI_CHAIN_MAPPING).find(
                key => LIFI_CHAIN_MAPPING[key] === quoteToUse.action.fromToken.address
            ) || 'baseSepolia'; // Default fallback

            // Switch to the correct mainnet network
            try {
                await addOrSwitchToMainnetNetwork(sourceChainKey);

                // Wait a bit for the network switch to complete
                await new Promise(resolve => setTimeout(resolve, 1000));

                // Create a new provider connection after network switch
                if (typeof window !== 'undefined' && window.ethereum) {
                    const provider = new ethers.BrowserProvider(window.ethereum as any);
                    const newSigner = await provider.getSigner();

                    const txHash = await LifiService.executeCrossChainTransfer(newSigner, quoteToUse);

                    if (options.onTransactionSent) {
                        options.onTransactionSent(txHash);
                    }

                    // Start monitoring the transfer
                    const fromChain = Object.keys(LIFI_CHAIN_MAPPING).find(
                        key => LIFI_CHAIN_MAPPING[key] === quoteToUse.action.fromToken.address
                    ) || '';
                    const toChain = Object.keys(LIFI_CHAIN_MAPPING).find(
                        key => LIFI_CHAIN_MAPPING[key] === quoteToUse.action.toToken.address
                    ) || '';

                    if (fromChain !== toChain) {
                        const finalStatus = await LifiService.monitorTransfer(
                            quoteToUse.tool,
                            fromChain,
                            toChain,
                            txHash,
                            (status) => {
                                setTransferStatus(status);
                                if (options.onStatusUpdate) {
                                    options.onStatusUpdate(status);
                                }
                            }
                        );

                        if (options.onTransferComplete) {
                            options.onTransferComplete(finalStatus);
                        }
                    }

                    return txHash;
                } else {
                    throw new Error('Ethereum provider not available');
                }
            } catch (networkError) {
                throw new Error(`Network switching failed: ${networkError}`);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to execute transfer');
            setError(error.message);
            if (options.onError) {
                options.onError(error);
            }
            throw error;
        } finally {
            setIsLoading(false);
        }
    }, [signer, userAddress, quote, options]);

    const reset = useCallback(() => {
        setQuote(null);
        setTransferStatus(null);
        setError(null);
        setIsLoading(false);
    }, []);

    return {
        getQuote,
        executeTransfer,
        reset,
        isLoading,
        quote,
        transferStatus,
        error,
    };
}
