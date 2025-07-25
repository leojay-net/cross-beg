import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Jazzicon } from '@/components/Jazzicon';
import { CheckCircle, Loader2, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { useLifi } from '@/hooks/useLifi';
import { LifiService, LIFI_CHAIN_MAPPING } from '@/services/lifiService';
import { useWallet } from '@/contexts/WalletContext';
import { ethers } from 'ethers';

interface PayRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipient: string;
  amount: number;
  token: string;
  recipientAddress: string;
  requestedChain?: string; // The chain where payment was requested
  requestedToken?: string; // The token that was requested
}

export function PayRequestModal({
  isOpen,
  onClose,
  recipient,
  amount,
  token,
  recipientAddress,
  requestedChain = 'optimismSepolia',
  requestedToken = 'USDC'
}: PayRequestModalProps) {
  const { userAddress } = useWallet();
  const [paymentChain, setPaymentChain] = useState('baseSepolia');
  const [paymentToken, setPaymentToken] = useState('ETH');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [transferStep, setTransferStep] = useState<'idle' | 'getting-quote' | 'approving' | 'sending' | 'bridging' | 'completed'>('idle');
  const [estimatedFees, setEstimatedFees] = useState<{ gas: string; bridge: string }>({ gas: '0', bridge: '0' });

  const lifi = useLifi({
    onQuoteReceived: (quote) => {
      // Calculate estimated fees from quote
      const gasCost = quote.estimate.gasCosts.reduce((sum, cost) =>
        sum + parseFloat(ethers.formatUnits(cost.amount, 18)), 0
      );
      const bridgeFee = quote.estimate.feeCosts.reduce((sum, cost) =>
        sum + parseFloat(ethers.formatUnits(cost.amount, 18)), 0
      );

      setEstimatedFees({
        gas: gasCost.toFixed(4),
        bridge: bridgeFee.toFixed(4)
      });
    },
    onTransactionSent: (txHash) => {
      console.log('Transaction sent:', txHash);
      setTransferStep('bridging');
    },
    onStatusUpdate: (status) => {
      console.log('Transfer status:', status);
      if (status.status === 'DONE') {
        setTransferStep('completed');
        setIsConfirmed(true);
        setTimeout(() => {
          setIsConfirmed(false);
          onClose();
        }, 3000);
      }
    },
    onError: (error) => {
      console.error('Li.Fi error:', error);
      setIsLoading(false);
      setTransferStep('idle');
    }
  });

  // Get quote when payment method changes
  useEffect(() => {
    if (userAddress && paymentChain !== requestedChain && isOpen) {
      const getQuote = async () => {
        try {
          setTransferStep('getting-quote');
          // Use 18 decimals for native tokens
          const amountInWei = ethers.parseUnits(amount.toString(), 18).toString();
          // Get native token for target chain
          const targetChainData = availableChains.find(c => c.key === requestedChain);
          await lifi.getQuote(paymentChain, requestedChain, paymentToken, targetChainData?.nativeToken || 'ETH', amountInWei);
          setTransferStep('idle');
        } catch (error) {
          console.error('Failed to get quote:', error);
          setTransferStep('idle');
        }
      };
      getQuote();
    }
  }, [paymentChain, requestedChain, paymentToken, amount, userAddress, isOpen]);

  // Testnet chains supported by CrossBeg
  const availableChains = [
    { key: 'baseSepolia', name: 'Base Sepolia', nativeToken: 'ETH' },
    { key: 'optimismSepolia', name: 'Optimism Sepolia', nativeToken: 'ETH' },
    { key: 'mantleSepolia', name: 'Mantle Sepolia', nativeToken: 'MNT' },
    { key: 'arbitrumSepolia', name: 'Arbitrum Sepolia', nativeToken: 'ETH' },
    { key: 'sepolia', name: 'Sepolia', nativeToken: 'ETH' },
    { key: 'polygonAmoy', name: 'Polygon Amoy', nativeToken: 'MATIC' }
  ];

  const selectedChainData = availableChains.find(chain => chain.key === paymentChain);
  const isCrossChain = paymentChain !== requestedChain;

  // Auto-set payment token based on selected chain's native token
  const chainNativeToken = selectedChainData?.nativeToken || 'ETH';
  if (paymentToken !== chainNativeToken) {
    setPaymentToken(chainNativeToken);
  }

  const handlePay = async () => {
    if (!userAddress) {
      alert('Please connect your wallet first');
      return;
    }

    setIsLoading(true);

    try {
      if (isCrossChain) {
        // Cross-chain payment using Li.Fi
        setTransferStep('approving');
        await lifi.executeTransfer();
      } else {
        // Same-chain payment - direct transaction
        setTransferStep('sending');
        // Mock same-chain payment
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTransferStep('completed');
        setIsConfirmed(true);
        setTimeout(() => {
          setIsConfirmed(false);
          onClose();
        }, 2000);
      }
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStepMessage = () => {
    switch (transferStep) {
      case 'getting-quote': return 'Getting cross-chain quote...';
      case 'approving': return 'Approving token allowance...';
      case 'sending': return 'Sending transaction...';
      case 'bridging': return 'Bridging tokens across chains...';
      case 'completed': return 'Payment completed!';
      default: return '';
    }
  };

  if (isConfirmed) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle className="w-16 h-16 text-success mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Sent!</h3>
            <p className="text-sm text-muted-foreground">
              Successfully paid ${amount} {token} to {recipient}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cross-chain indicator */}
          {isCrossChain && (
            <div className="flex items-center justify-center p-3 rounded-lg bg-blue-50 border border-blue-200">
              <ArrowRightLeft className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm text-blue-700 font-medium">
                Cross-chain payment via Li.Fi
              </span>
            </div>
          )}

          {/* Transfer status */}
          {transferStep !== 'idle' && !isConfirmed && (
            <div className="flex items-center justify-center p-3 rounded-lg bg-orange-50 border border-orange-200">
              <Loader2 className="w-4 h-4 text-orange-600 mr-2 animate-spin" />
              <span className="text-sm text-orange-700 font-medium">
                {getStepMessage()}
              </span>
            </div>
          )}

          {/* Payment Summary */}
          <div className="text-center p-6 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-center mb-4">
              <Jazzicon address={recipientAddress} size={48} />
            </div>
            <h3 className="font-semibold mb-2">
              You are paying
            </h3>
            <p className="text-2xl font-bold text-primary mb-2">
              ${amount} {token}
            </p>
            <p className="text-sm text-muted-foreground">
              to {recipient}
            </p>
            {isCrossChain && (
              <p className="text-xs text-blue-600 mt-2">
                From {selectedChainData?.name} to {availableChains.find(c => c.key === requestedChain)?.name}
              </p>
            )}
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Pay from chain:</label>
              <Select value={paymentChain} onValueChange={setPaymentChain}>
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Pay with token:</label>
              <div className="p-3 rounded-lg border bg-muted/50">
                <span className="font-medium">{chainNativeToken}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  (Native token of {selectedChainData?.name})
                </span>
              </div>
              {isCrossChain && (
                <p className="text-xs text-blue-600">
                  Will bridge to {availableChains.find(c => c.key === requestedChain)?.nativeToken} on {availableChains.find(c => c.key === requestedChain)?.name}
                </p>
              )}
            </div>
          </div>

          {/* Fee Information */}
          <div className="p-4 rounded-lg border bg-card space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="text-sm font-medium">${amount} {token}</span>
            </div>
            {isCrossChain ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Gas Fee</span>
                  <span className="text-sm font-medium">~${estimatedFees.gas || '0.00'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Bridge Fee</span>
                  <span className="text-sm font-medium">~${estimatedFees.bridge || '0.00'}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Network Fee</span>
                <span className="text-sm font-medium">~$0.25</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="text-sm font-medium">Total</span>
              <span className="text-sm font-bold">
                ${(amount + parseFloat(estimatedFees.gas || '0') + parseFloat(estimatedFees.bridge || '0') + (isCrossChain ? 0 : 0.25)).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Li.Fi Quote Info */}
          {isCrossChain && lifi.quote && (
            <div className="p-3 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm text-green-700 font-medium">
                  Route found via {lifi.quote.tool}
                </span>
              </div>
              <p className="text-xs text-green-600">
                You'll receive approximately {ethers.formatUnits(lifi.quote.action.toAmount, 6)} {requestedToken}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePay}
              disabled={isLoading || (isCrossChain && !lifi.quote)}
              variant="success"
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {getStepMessage() || 'Processing...'}
                </>
              ) : (
                `Pay ${isCrossChain ? 'Cross-Chain' : 'Direct'}`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}