import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useLifi } from '@/hooks/useLifi';
import { useWallet } from '@/contexts/WalletContext';
import { ArrowRightLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { ethers } from 'ethers';

export function LifiTestComponent() {
    const { isConnected, userAddress, connectWallet } = useWallet();
    const [fromChain, setFromChain] = useState('baseSepolia');
    const [toChain, setToChain] = useState('optimismSepolia');
    const [fromToken, setFromToken] = useState('USDC');
    const [toToken, setToToken] = useState('USDC');
    const [amount, setAmount] = useState('1');

    const lifi = useLifi({
        onQuoteReceived: (quote) => {
            console.log('Quote received:', quote);
        },
        onTransactionSent: (txHash) => {
            console.log('Transaction sent:', txHash);
        },
        onStatusUpdate: (status) => {
            console.log('Status update:', status);
        },
        onTransferComplete: (status) => {
            console.log('Transfer complete:', status);
        },
        onError: (error) => {
            console.error('Li.Fi error:', error);
        }
    });

    const chains = [
        { key: 'baseSepolia', name: 'Base Sepolia', tokens: ['ETH', 'USDC'] },
        { key: 'optimismSepolia', name: 'Optimism Sepolia', tokens: ['ETH', 'USDC'] },
        { key: 'mantleSepolia', name: 'Mantle Sepolia', tokens: ['MNT', 'USDC'] },
        { key: 'arbitrumSepolia', name: 'Arbitrum Sepolia', tokens: ['ETH', 'USDC'] },
        { key: 'sepolia', name: 'Ethereum Sepolia', tokens: ['ETH', 'USDC', 'USDT'] },
        { key: 'polygonAmoy', name: 'Polygon Amoy', tokens: ['MATIC', 'USDC'] }
    ];

    const fromChainData = chains.find(c => c.key === fromChain);
    const toChainData = chains.find(c => c.key === toChain);

    const handleGetQuote = async () => {
        if (!userAddress) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            const amountInWei = ethers.parseUnits(amount, 6).toString(); // Assuming USDC has 6 decimals
            await lifi.getQuote(fromChain, toChain, fromToken, toToken, amountInWei);
        } catch (error) {
            console.error('Failed to get quote:', error);
        }
    };

    const handleExecuteTransfer = async () => {
        if (!lifi.quote) {
            alert('Please get a quote first');
            return;
        }

        try {
            await lifi.executeTransfer();
        } catch (error) {
            console.error('Failed to execute transfer:', error);
        }
    };

    if (!isConnected) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle>Li.Fi Cross-Chain Test</CardTitle>
                    <CardDescription>
                        Connect your wallet to test Li.Fi cross-chain transfers
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={connectWallet} className="w-full">
                        Connect Wallet
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ArrowRightLeft className="w-5 h-5" />
                    Li.Fi Cross-Chain Test
                </CardTitle>
                <CardDescription>
                    Test cross-chain transfers using Li.Fi protocol
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Connected wallet info */}
                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                    <div className="flex items-center">
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                        <span className="text-sm text-green-700">
                            Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
                        </span>
                    </div>
                </div>

                {/* From Chain */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">From Chain:</label>
                    <Select value={fromChain} onValueChange={setFromChain}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {chains.map((chain) => (
                                <SelectItem key={chain.key} value={chain.key}>
                                    {chain.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* From Token */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">From Token:</label>
                    <Select value={fromToken} onValueChange={setFromToken}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {fromChainData?.tokens.map((token) => (
                                <SelectItem key={token} value={token}>
                                    {token}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* To Chain */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">To Chain:</label>
                    <Select value={toChain} onValueChange={setToChain}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {chains.map((chain) => (
                                <SelectItem key={chain.key} value={chain.key}>
                                    {chain.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* To Token */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">To Token:</label>
                    <Select value={toToken} onValueChange={setToToken}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {toChainData?.tokens.map((token) => (
                                <SelectItem key={token} value={token}>
                                    {token}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-sm font-medium">Amount:</label>
                    <Input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                    />
                </div>

                {/* Quote Information */}
                {lifi.quote && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                        <h4 className="text-sm font-medium text-blue-900 mb-2">Quote Details:</h4>
                        <div className="text-xs text-blue-700 space-y-1">
                            <div>Bridge: {lifi.quote.tool}</div>
                            <div>
                                Receive: {ethers.formatUnits(lifi.quote.action.toAmount, 6)} {toToken}
                            </div>
                            <div>
                                Gas: ~{lifi.quote.estimate.gasCosts.reduce((sum, cost) =>
                                    sum + parseFloat(ethers.formatUnits(cost.amount, 18)), 0
                                ).toFixed(4)} ETH
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Display */}
                {lifi.error && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-center">
                            <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                            <span className="text-sm text-red-700">
                                {lifi.error}
                            </span>
                        </div>
                    </div>
                )}

                {/* Transfer Status */}
                {lifi.transferStatus && (
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                        <div className="text-sm text-orange-700">
                            Status: {lifi.transferStatus.status}
                            {lifi.transferStatus.substatusMessage && (
                                <div className="text-xs mt-1">{lifi.transferStatus.substatusMessage}</div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2">
                    <Button
                        onClick={handleGetQuote}
                        disabled={lifi.isLoading || !amount || fromChain === toChain}
                        className="w-full"
                    >
                        {lifi.isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Getting Quote...
                            </>
                        ) : (
                            'Get Quote'
                        )}
                    </Button>

                    {lifi.quote && (
                        <Button
                            onClick={handleExecuteTransfer}
                            disabled={lifi.isLoading}
                            variant="success"
                            className="w-full"
                        >
                            {lifi.isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    Executing...
                                </>
                            ) : (
                                'Execute Transfer'
                            )}
                        </Button>
                    )}

                    {lifi.quote && (
                        <Button
                            onClick={lifi.reset}
                            variant="outline"
                            className="w-full"
                        >
                            Reset
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
