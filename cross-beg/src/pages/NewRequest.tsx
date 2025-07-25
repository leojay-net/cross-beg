import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ReviewRequestModal } from '@/components/ReviewRequestModal';
import { ArrowLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Jazzicon } from '@/components/Jazzicon';
import { contractService } from '@/services/contractService';
import { getAllChains, getChainKeyById } from '@/config/chains';
import { toast } from '@/components/ui/use-toast';
import { ethers } from 'ethers';

export default function NewRequest() {
  const navigate = useNavigate();
  const { signer, chainId, userAddress, switchChain } = useWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [message, setMessage] = useState('');
  const [targetChain, setTargetChain] = useState<string>('');
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [addressValidation, setAddressValidation] = useState<{
    isValid: boolean;
    ens?: string;
    address?: string;
  } | null>(null);

  const chains = getAllChains();
  const currentChainKey = chainId ? getChainKeyById(chainId) : null;

  const validateAddress = async (input: string) => {
    if (!input) {
      setAddressValidation(null);
      return;
    }

    try {
      if (input.endsWith('.eth')) {
        // In a real app, you'd resolve ENS here
        setAddressValidation({
          isValid: true,
          ens: input,
          address: '0x1234567890123456789012345678901234567890' // Mock address
        });
      } else if (ethers.isAddress(input)) {
        setAddressValidation({
          isValid: true,
          address: input,
          ens: undefined
        });
      } else {
        setAddressValidation({
          isValid: false
        });
      }
    } catch (error) {
      setAddressValidation({
        isValid: false
      });
    }
  };

  const handleRecipientChange = (value: string) => {
    setRecipient(value);
    validateAddress(value);
  };

  const isFormValid = recipient && amount && addressValidation?.isValid && targetChain && signer;

  const handleCreateRequest = async () => {
    if (!isFormValid || !signer || !addressValidation?.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields and connect your wallet.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const targetChainConfig = chains[targetChain];
      if (!targetChainConfig) {
        throw new Error('Invalid target chain selected');
      }

      const result = await contractService.createPaymentRequest(
        {
          target: addressValidation.address,
          amount: amount,
          token: token,
          targetChain: targetChainConfig.chainId,
          message: message || '',
        },
        signer
      );

      toast({
        title: "Success!",
        description: `Payment request created successfully. Request ID: ${result.requestId}`,
      });

      // Navigate back to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error creating payment request:', error);

      // Handle network switch errors specially
      if (error.code === 'UNSUPPORTED_NETWORK') {
        const shouldSwitch = window.confirm(
          `${error.message}\n\nWould you like to switch to ${error.suggestedChainName} now?`
        );

        if (shouldSwitch && switchChain) {
          try {
            await switchChain(error.suggestedChainId);
            toast({
              title: "Network Switched",
              description: `Successfully switched to ${error.suggestedChainName}. You can now create your payment request.`,
            });
          } catch (switchError) {
            toast({
              title: "Network Switch Failed",
              description: "Failed to switch networks. Please switch manually in your wallet.",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to create payment request. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReviewRequest = () => {
    if (isFormValid) {
      setReviewModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold">New Payment Request</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Request Payment</CardTitle>
            {currentChainKey && (
              <p className="text-sm text-muted-foreground">
                Currently connected to: {chains[currentChainKey]?.name}
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Recipient Field */}
            <div className="space-y-2">
              <Label htmlFor="recipient">To: (ENS Name or Address) *</Label>
              <Input
                id="recipient"
                placeholder="vitalik.eth or 0x..."
                value={recipient}
                onChange={(e) => handleRecipientChange(e.target.value)}
                className={
                  addressValidation?.isValid === false
                    ? 'border-destructive focus:border-destructive'
                    : addressValidation?.isValid === true
                      ? 'border-success focus:border-success'
                      : ''
                }
              />

              {/* Address Validation */}
              {addressValidation?.isValid === true && (
                <div className="flex items-center gap-2 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  <div className="flex items-center gap-2">
                    <Jazzicon address={addressValidation.address || ''} size={20} />
                    <span>
                      {addressValidation.ens
                        ? `${addressValidation.ens} (${addressValidation.address?.slice(0, 6)}...${addressValidation.address?.slice(-4)})`
                        : `${addressValidation.address?.slice(0, 6)}...${addressValidation.address?.slice(-4)}`
                      }
                    </span>
                  </div>
                </div>
              )}

              {addressValidation?.isValid === false && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="w-4 h-4" />
                  <span>Invalid address or ENS name</span>
                </div>
              )}
            </div>

            {/* Amount and Token */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1"
                />
                <Select value={token} onValueChange={setToken}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC</SelectItem>
                    <SelectItem value="USDT">USDT</SelectItem>
                    <SelectItem value="DAI">DAI</SelectItem>
                    <SelectItem value="ETH">ETH</SelectItem>
                    <SelectItem value="MATIC">MATIC</SelectItem>
                    <SelectItem value="MNT">MNT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Target Chain Selection */}
            <div className="space-y-2">
              <Label htmlFor="targetChain">Target Chain *</Label>
              <Select value={targetChain} onValueChange={setTargetChain}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the chain where the recipient should pay" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(chains).map(([key, chain]) => (
                    <SelectItem key={key} value={key}>
                      {chain.name} (Chain ID: {chain.chainId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The recipient will receive this request on the selected chain
              </p>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <Label htmlFor="message">Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a note for the recipient..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            {/* Create Request Button */}
            <Button
              onClick={handleCreateRequest}
              disabled={!isFormValid || isLoading}
              variant="hero"
              size="lg"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Creating Request...
                </>
              ) : (
                'Create Payment Request'
              )}
            </Button>

            {/* Network Fee Info */}
            <div className="p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>Network Fee:</strong> ~$0.50 (estimated)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Fees may vary based on network congestion. Cross-chain requests are processed by the relayer.
              </p>
            </div>

            {/* Cross-chain Info */}
            {targetChain && currentChainKey && targetChain !== currentChainKey && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Cross-chain Request:</strong> This request will be sent from {chains[currentChainKey]?.name} to {chains[targetChain]?.name} via our relayer service.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Request Modal */}
        {addressValidation?.address && (
          <ReviewRequestModal
            isOpen={reviewModalOpen}
            onClose={() => setReviewModalOpen(false)}
            recipient={addressValidation.ens || recipient}
            amount={amount}
            token={token}
            targetChain={targetChain}
            message={message}
            recipientAddress={addressValidation.address}
            onConfirm={handleCreateRequest}
            isLoading={isLoading}
          />
        )}
      </main>
    </div>
  );
}