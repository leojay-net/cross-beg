import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Loader2, AlertCircle, CheckCircle, Network } from 'lucide-react';
import { useLifi } from '@/hooks/useLifi';
import { LifiService, LIFI_CHAIN_MAPPING } from '@/services/lifiService';
import { addOrSwitchToMainnetNetwork, getMainnetChainConfig } from '@/config/mainnetChains';
import { ethers } from 'ethers';
import { toast } from '@/components/ui/use-toast';

export default function SendMoney() {
    const navigate = useNavigate();
    const { userAddress, signer } = useWallet();
    const [recipientAddress, setRecipientAddress] = useState('');
    const [amount, setAmount] = useState('');
    const [token, setToken] = useState('ETH');
    const [sourceChain, setSourceChain] = useState('baseSepolia');
    const [targetChain, setTargetChain] = useState('mantleSepolia');
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [transferStep, setTransferStep] = useState<'idle' | 'getting-quote' | 'switching-network' | 'approving' | 'sending' | 'bridging' | 'completed'>('idle');
    const [estimatedFees, setEstimatedFees] = useState<{ gas: string; bridge: string }>({ gas: '0', bridge: '0' });
    const [txHash, setTxHash] = useState<string>('');

    // Testnet chains supported by CrossBeg
    const availableChains = [
        { key: 'baseSepolia', name: 'Base Sepolia', nativeToken: 'ETH' },
        { key: 'mantleSepolia', name: 'Mantle Sepolia', nativeToken: 'MNT' },
        { key: 'optimismSepolia', name: 'Optimism Sepolia', nativeToken: 'ETH' },
        { key: 'arbitrumSepolia', name: 'Arbitrum Sepolia', nativeToken: 'ETH' },
        { key: 'sepolia', name: 'Sepolia', nativeToken: 'ETH' },
        { key: 'polygonAmoy', name: 'Polygon Amoy', nativeToken: 'MATIC' }
    ];

    const selectedSourceChain = availableChains.find(chain => chain.key === sourceChain);
    const selectedTargetChain = availableChains.find(chain => chain.key === targetChain);
    const isCrossChain = sourceChain !== targetChain;

    // Auto-set token based on source chain's native token
    const sourceNativeToken = selectedSourceChain?.nativeToken || 'ETH';

    // Update token when source chain changes
    React.useEffect(() => {
        if (token !== sourceNativeToken) {
            setToken(sourceNativeToken);
        }
    }, [sourceChain, sourceNativeToken]);

    const lifi = useLifi({
        onQuoteReceived: (quote) => {
            try {
                const gasCost = quote.estimate.gasCosts.reduce((sum, cost) => {
                    const amount = cost.amount || '0';
                    if (amount && amount !== '0') {
                        return sum + parseFloat(ethers.formatUnits(amount, 18));
                    }
                    return sum;
                }, 0);
                const bridgeFee = quote.estimate.feeCosts.reduce((sum, cost) => {
                    const amount = cost.amount || '0';
                    if (amount && amount !== '0') {
                        return sum + parseFloat(ethers.formatUnits(amount, 18));
                    }
                    return sum;
                }, 0);

                setEstimatedFees({
                    gas: gasCost.toFixed(4),
                    bridge: bridgeFee.toFixed(4)
                });
                setTransferStep('idle');
            } catch (error) {
                console.error('Error processing quote:', error);
                setEstimatedFees({ gas: '0', bridge: '0' });
                setTransferStep('idle');
            }
        },
        onTransactionSent: (hash) => {
            setTxHash(hash);
            setTransferStep('bridging');
            toast({
                title: "Transaction Sent",
                description: `Transaction hash: ${hash.slice(0, 10)}...`,
            });
        },
        onStatusUpdate: (status) => {
            if (status.status === 'DONE') {
                setTransferStep('completed');
                toast({
                    title: "Transfer Completed",
                    description: "Your cross-chain transfer has been completed successfully!",
                });
            }
        },
        onError: (error) => {
            setIsLoading(false);
            setTransferStep('idle');
            toast({
                title: "Transfer Failed",
                description: error.message,
                variant: "destructive",
            });
        }
    });

    const handleGetQuote = async () => {
        if (!userAddress || !amount || !recipientAddress) {
            toast({
                title: "Missing Information",
                description: "Please fill in all required fields",
                variant: "destructive",
            });
            return;
        }

        if (!ethers.isAddress(recipientAddress)) {
            toast({
                title: "Invalid Address",
                description: "Please enter a valid Ethereum address",
                variant: "destructive",
            });
            return;
        }

        if (isCrossChain) {
            try {
                setTransferStep('getting-quote');
                // Use 18 decimals for native tokens (ETH, MNT, MATIC)
                const amountInWei = ethers.parseUnits(amount, 18).toString();
                await lifi.getQuote(sourceChain, targetChain, token, selectedTargetChain?.nativeToken || 'ETH', amountInWei);
            } catch (error) {
                console.error('Failed to get quote:', error);
                setTransferStep('idle');
            }
        }
    };

    const handleSendMoney = async () => {
        if (!userAddress || !signer) {
            toast({
                title: "Wallet Not Connected",
                description: "Please connect your wallet first",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            if (isCrossChain) {
                // Cross-chain transfer using Li.Fi
                if (!lifi.quote) {
                    toast({
                        title: "No Quote Available",
                        description: "Please get a quote first",
                        variant: "destructive",
                    });
                    setIsLoading(false);
                    return;
                }

                // Show network switching step
                setTransferStep('switching-network');
                toast({
                    title: "Network Switch Required",
                    description: `Please switch to ${selectedSourceChain?.name} to complete the transfer`,
                });

                await lifi.executeTransfer();
            } else {
                // Same-chain direct transfer
                setTransferStep('sending');

                // All native tokens use 18 decimals
                const amountInWei = ethers.parseUnits(amount, 18);

                // Native token transfer (ETH, MNT, MATIC)
                const tx = await signer.sendTransaction({
                    to: recipientAddress,
                    value: amountInWei,
                });

                await tx.wait();
                setTxHash(tx.hash);
                setTransferStep('completed');

                toast({
                    title: "Transfer Completed",
                    description: `Successfully sent ${amount} ${token} to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
                });
            }
        } catch (error: any) {
            console.error('Transfer failed:', error);
            toast({
                title: "Transfer Failed",
                description: error.message || 'Unknown error occurred',
                variant: "destructive",
            });
            setTransferStep('idle');
        } finally {
            setIsLoading(false);
        }
    };

    const getStepMessage = () => {
        switch (transferStep) {
            case 'getting-quote': return 'Getting cross-chain quote...';
            case 'switching-network': return 'Switch to mainnet network to continue...';
            case 'approving': return 'Approving token allowance...';
            case 'sending': return 'Sending transaction...';
            case 'bridging': return 'Bridging tokens across chains...';
            case 'completed': return 'Transfer completed!';
            default: return '';
        }
    };

    const resetForm = () => {
        setRecipientAddress('');
        setAmount('');
        setMessage('');
        setTransferStep('idle');
        setTxHash('');
        setEstimatedFees({ gas: '0', bridge: '0' });
        lifi.reset();
    };

    if (transferStep === 'completed') {
        return (
            <div className="min-h-screen bg-background">
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-md mx-auto">
                        <Card className="shadow-card">
                            <CardContent className="p-8 text-center">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h2 className="text-2xl font-bold mb-2">Transfer Successful!</h2>
                                <p className="text-muted-foreground mb-4">
                                    Your payment of {amount} {token} has been sent successfully.
                                </p>
                                {txHash && (
                                    <p className="text-xs text-muted-foreground mb-6">
                                        Transaction: {txHash.slice(0, 10)}...{txHash.slice(-10)}
                                    </p>
                                )}
                                <div className="space-y-2">
                                    <Button onClick={resetForm} className="w-full">
                                        Send Another Payment
                                    </Button>
                                    <Button variant="outline" onClick={() => navigate('/dashboard')} className="w-full">
                                        Back to Dashboard
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-md mx-auto space-y-6">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                        <h1 className="text-2xl font-bold">Send Money</h1>
                    </div>

                    <Card className="shadow-card">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Send Payment
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Cross-chain network info */}
                            {isCrossChain && (
                                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <div className="flex items-center mb-2">
                                        <Network className="w-4 h-4 text-blue-600 mr-2" />
                                        <span className="text-sm text-blue-700 font-medium">
                                            Cross-chain Transfer (Li.Fi)
                                        </span>
                                    </div>
                                    <p className="text-xs text-blue-600">
                                        You'll need to switch to {selectedSourceChain?.name} during the transfer process
                                    </p>
                                </div>
                            )}

                            {/* Transfer Status */}
                            {transferStep !== 'idle' && (
                                <div className="flex items-center justify-center p-3 rounded-lg bg-orange-50 border border-orange-200">
                                    <Loader2 className="w-4 h-4 text-orange-600 mr-2 animate-spin" />
                                    <span className="text-sm text-orange-700 font-medium">
                                        {getStepMessage()}
                                    </span>
                                </div>
                            )}

                            {/* Recipient Address */}
                            <div className="space-y-2">
                                <Label htmlFor="recipient">Recipient Address *</Label>
                                <Input
                                    id="recipient"
                                    placeholder="0x..."
                                    value={recipientAddress}
                                    onChange={(e) => setRecipientAddress(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <Label htmlFor="amount">Amount *</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={isLoading}
                                />
                            </div>

                            {/* Source Chain */}
                            <div className="space-y-2">
                                <Label>From Chain *</Label>
                                <Select value={sourceChain} onValueChange={setSourceChain} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableChains.map((chain) => (
                                            <SelectItem key={chain.key} value={chain.key}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Target Chain */}
                            <div className="space-y-2">
                                <Label>To Chain *</Label>
                                <Select value={targetChain} onValueChange={setTargetChain} disabled={isLoading}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableChains.map((chain) => (
                                            <SelectItem key={chain.key} value={chain.key}>
                                                {chain.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Token - Now shows native token of selected chain */}
                            <div className="space-y-2">
                                <Label>Token</Label>
                                <div className="p-3 rounded-lg border bg-muted/50">
                                    <span className="font-medium">{sourceNativeToken}</span>
                                    <span className="text-sm text-muted-foreground ml-2">
                                        (Native token of {selectedSourceChain?.name})
                                    </span>
                                </div>
                                {isCrossChain && (
                                    <p className="text-xs text-blue-600">
                                        Will bridge to {selectedTargetChain?.nativeToken} on {selectedTargetChain?.name}
                                    </p>
                                )}
                            </div>

                            {/* Message */}
                            <div className="space-y-2">
                                <Label htmlFor="message">Message (Optional)</Label>
                                <Textarea
                                    id="message"
                                    placeholder="Add a note for this payment..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    disabled={isLoading}
                                    rows={3}
                                />
                            </div>


                            {/* Fee Estimation */}
                            {(isCrossChain && lifi.quote) || !isCrossChain ? (
                                <div className="p-4 rounded-lg border bg-card space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Amount</span>
                                        <span className="text-sm font-medium">{amount} {token}</span>
                                    </div>
                                    {isCrossChain ? (
                                        <>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Gas Fee</span>
                                                <span className="text-sm font-medium">~${estimatedFees.gas}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-muted-foreground">Bridge Fee</span>
                                                <span className="text-sm font-medium">~${estimatedFees.bridge}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-muted-foreground">Network Fee</span>
                                            <span className="text-sm font-medium">~$0.25</span>
                                        </div>
                                    )}
                                    <div className="border-t pt-2 flex justify-between items-center">
                                        <span className="text-sm font-medium">Total Cost</span>
                                        <span className="text-sm font-bold">
                                            ~${(parseFloat(amount || '0') + parseFloat(estimatedFees.gas || '0') + parseFloat(estimatedFees.bridge || '0') + (isCrossChain ? 0 : 0.25)).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            ) : null}

                            {/* Li.Fi Quote Info */}
                            {isCrossChain && lifi.quote && (
                                <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                                    <div className="flex items-center mb-2">
                                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                                        <span className="text-sm text-green-700 font-medium">
                                            Route found via {lifi.quote.tool}
                                        </span>
                                    </div>                    <p className="text-xs text-green-600">
                                        Recipient will receive approximately {
                                            lifi.quote.action.toAmount && lifi.quote.action.toAmount !== '0'
                                                ? ethers.formatUnits(lifi.quote.action.toAmount, 18)
                                                : '0'
                                        } {selectedTargetChain?.nativeToken}
                                    </p>
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

                            {/* Actions */}
                            <div className="space-y-3">
                                {isCrossChain && !lifi.quote && (
                                    <Button
                                        onClick={handleGetQuote}
                                        disabled={!amount || !recipientAddress || transferStep === 'getting-quote'}
                                        className="w-full"
                                        variant="outline"
                                    >
                                        {transferStep === 'getting-quote' ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                                Getting Quote...
                                            </>
                                        ) : (
                                            'Get Quote'
                                        )}
                                    </Button>
                                )}

                                <Button
                                    onClick={handleSendMoney}
                                    disabled={
                                        isLoading ||
                                        !amount ||
                                        !recipientAddress ||
                                        (isCrossChain && !lifi.quote)
                                    }
                                    className="w-full"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                            {getStepMessage() || 'Processing...'}
                                        </>
                                    ) : (
                                        `Send ${isCrossChain ? 'Cross-Chain' : 'Direct'}`
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
