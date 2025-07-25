import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '@/contexts/WalletContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Jazzicon } from '@/components/Jazzicon';
import { PayRequestModal } from '@/components/PayRequestModal';
import { Plus, Send, LogOut, Settings, Clock, CheckCircle, XCircle, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react';
import { relayerService, RelayerMessage } from '@/services/relayerService';
import { contractService } from '@/services/contractService';
import { PaymentRequest, RequestStatus } from '@/config/contracts';
import { getAllChains, getChainKeyById } from '@/config/chains';
import { toast } from '@/components/ui/use-toast';

interface DisplayPaymentRequest {
  id: string;
  type: 'incoming' | 'outgoing';
  from: string;
  to: string;
  amount: string;
  token: string;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  timestamp: Date;
  message?: string;
  originChain?: string;
  targetChain?: string;
  isCrossChain?: boolean;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userENS, userAddress, disconnectWallet, chainId } = useWallet();
  const [requests, setRequests] = useState<DisplayPaymentRequest[]>([]);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DisplayPaymentRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const chains = getAllChains();
  const currentChainKey = chainId ? getChainKeyById(chainId) : null;

  useEffect(() => {
    if (userAddress) {
      fetchPaymentRequests();
    }
  }, [userAddress, chainId]);

  const fetchPaymentRequests = async () => {
    if (!userAddress) return;

    try {
      setIsLoading(true);

      // Fetch cross-chain messages from relayer
      const relayerResponse = await relayerService.getUserMessages(userAddress, {
        limit: 100,
        includeAllChains: true
      });

      // Fetch requests from contracts across all supported chains
      let contractRequests: PaymentRequest[] = [];
      try {
        // Get sent requests from ALL chains (user might have sent from different chains)
        const sentRequests = await contractService.getUserSentRequests(userAddress);

        // Get received requests from ALL chains (cross-chain capability)
        const receivedRequests = await contractService.getUserReceivedRequests(userAddress);

        contractRequests = [...sentRequests, ...receivedRequests];
      } catch (error) {
        console.error('Error fetching contract requests:', error);
      }

      // Convert and combine all requests
      const convertedRequests: DisplayPaymentRequest[] = [];

      // Convert relayer messages
      relayerResponse.messages.forEach(message => {
        const request = convertRelayerMessageToDisplay(message);
        convertedRequests.push(request);
      });

      // Convert local contract requests (avoid duplicates using chainId + requestId)
      contractRequests.forEach(request => {
        // Create a unique identifier combining chain and request ID
        const uniqueId = `${request.originChain}-${request.id}`;
        const existingRequest = convertedRequests.find(r =>
          r.id === request.id || `${r.originChain}-${r.id}` === uniqueId
        );
        if (!existingRequest) {
          const displayRequest = convertContractRequestToDisplay(request);
          convertedRequests.push(displayRequest);
        }
      });

      // Sort by timestamp (newest first)
      convertedRequests.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setRequests(convertedRequests);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
      toast({
        title: "Error",
        description: "Failed to fetch payment requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const convertRelayerMessageToDisplay = (message: RelayerMessage): DisplayPaymentRequest => {
    const isIncoming = message.summary.target.toLowerCase() === userAddress?.toLowerCase();

    return {
      id: message.requestId,
      type: isIncoming ? 'incoming' : 'outgoing',
      from: message.summary.requester,
      to: message.summary.target,
      amount: message.summary.amount,
      token: message.summary.token,
      status: mapRelayerStatus(message.summary.status),
      timestamp: new Date(message.summary.createdAt),
      message: message.summary.message,
      originChain: message.summary.originChain,
      targetChain: message.summary.targetChain,
      isCrossChain: message.summary.crossChainContext.isCrossChain
    };
  };

  const convertContractRequestToDisplay = (request: PaymentRequest): DisplayPaymentRequest => {
    const isIncoming = request.target.toLowerCase() === userAddress?.toLowerCase();
    const originChainKey = getChainKeyById(request.originChain);
    const targetChainKey = getChainKeyById(request.targetChain);

    return {
      id: `${request.originChain}-${request.id}`, // Make ID unique across chains
      type: isIncoming ? 'incoming' : 'outgoing',
      from: request.requester,
      to: request.target,
      amount: request.amount,
      token: request.token,
      status: mapContractStatus(request.status),
      timestamp: new Date(request.timestamp),
      message: request.message,
      originChain: originChainKey ? chains[originChainKey]?.name : `Chain ${request.originChain}`,
      targetChain: targetChainKey ? chains[targetChainKey]?.name : `Chain ${request.targetChain}`,
      isCrossChain: request.originChain !== request.targetChain
    };
  };

  const mapRelayerStatus = (status: string): 'pending' | 'paid' | 'declined' | 'expired' => {
    switch (status.toLowerCase()) {
      case 'fulfilled': return 'paid';
      case 'cancelled': return 'declined';
      case 'expired': return 'expired';
      default: return 'pending';
    }
  };

  const mapContractStatus = (status: RequestStatus): 'pending' | 'paid' | 'declined' | 'expired' => {
    switch (status) {
      case RequestStatus.Fulfilled: return 'paid';
      case RequestStatus.Cancelled: return 'declined';
      case RequestStatus.Expired: return 'expired';
      default: return 'pending';
    }
  };

  const getChainKeyFromName = (chainName: string): string => {
    for (const [key, config] of Object.entries(chains)) {
      if (config.name === chainName) {
        return key;
      }
    }
    return 'optimismSepolia'; // fallback
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPaymentRequests();
    setRefreshing(false);
    toast({
      title: "Refreshed",
      description: "Payment requests have been updated.",
    });
  };

  const handleDisconnect = () => {
    disconnectWallet();
    navigate('/');
  };

  const handleNewRequest = () => {
    navigate('/request');
  };

  const handleSendMoney = () => {
    navigate('/send');
  };

  const incomingRequests = requests.filter(r => r.type === 'incoming' && r.status === 'pending');
  const outgoingRequests = requests.filter(r => r.type === 'outgoing');
  const historyRequests = requests.filter(r => r.status !== 'pending');

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handlePayRequest = (request: DisplayPaymentRequest) => {
    setSelectedRequest(request);
    setPayModalOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your payment requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Jazzicon address={userAddress || ''} size={40} />
              <div>
                <p className="font-semibold">{userENS}</p>
                <p className="text-sm text-muted-foreground">
                  {formatAddress(userAddress || '')}
                </p>
                {currentChainKey && (
                  <p className="text-xs text-muted-foreground">
                    Connected to {chains[currentChainKey]?.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/settings')}
            >
              <Settings className="w-5 h-5" />
            </Button>
            <Button
              variant="outline"
              onClick={handleDisconnect}
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <Card className="p-6 shadow-card hover:shadow-glow transition-all cursor-pointer" onClick={handleNewRequest}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">New Request</h3>
                <p className="text-sm text-muted-foreground">Request payment from someone</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 shadow-card hover:shadow-glow transition-all cursor-pointer" onClick={handleSendMoney}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent text-accent-foreground flex items-center justify-center">
                <Send className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold">Send Money</h3>
                <p className="text-sm text-muted-foreground">Send payment to someone</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Transactions */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="incoming" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="incoming">
                  Incoming ({incomingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="outgoing">
                  Outgoing ({outgoingRequests.length})
                </TabsTrigger>
                <TabsTrigger value="history">
                  History ({historyRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="incoming" className="space-y-4">
                {incomingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No pending incoming requests</p>
                    <p className="text-sm mt-2">Payment requests from other users will appear here</p>
                  </div>
                ) : (
                  incomingRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ArrowDown className="w-5 h-5 text-success" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{formatAddress(request.from)}</p>
                            {request.isCrossChain && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Cross-chain
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Requesting {request.amount} {request.token}
                          </p>
                          {request.message && (
                            <p className="text-xs text-muted-foreground mt-1">"{request.message}"</p>
                          )}
                          {request.isCrossChain && (
                            <p className="text-xs text-muted-foreground">
                              From {request.originChain} → {request.targetChain}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Decline
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePayRequest(request)}
                        >
                          Pay
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="outgoing" className="space-y-4">
                {outgoingRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No outgoing requests</p>
                    <p className="text-sm mt-2">Requests you send will appear here</p>
                  </div>
                ) : (
                  outgoingRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <ArrowUp className="w-5 h-5 text-primary" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{formatAddress(request.to)}</p>
                            {request.isCrossChain && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Cross-chain
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {request.amount} {request.token}
                          </p>
                          {request.message && (
                            <p className="text-xs text-muted-foreground mt-1">"{request.message}"</p>
                          )}
                          {request.isCrossChain && (
                            <p className="text-xs text-muted-foreground">
                              From {request.originChain} → {request.targetChain}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className="text-sm capitalize text-muted-foreground">{request.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-4">
                {historyRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transaction history</p>
                    <p className="text-sm mt-2">Completed transactions will appear here</p>
                  </div>
                ) : (
                  historyRequests.map(request => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {request.type === 'incoming' ? (
                          <ArrowDown className="w-5 h-5 text-success" />
                        ) : (
                          <ArrowUp className="w-5 h-5 text-primary" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {request.type === 'incoming'
                                ? formatAddress(request.from)
                                : formatAddress(request.to)
                              }
                            </p>
                            {request.isCrossChain && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                Cross-chain
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {request.amount} {request.token}
                          </p>
                          {request.isCrossChain && (
                            <p className="text-xs text-muted-foreground">
                              {request.originChain} → {request.targetChain}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(request.status)}
                        <span className="text-sm capitalize text-muted-foreground">{request.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pay Request Modal */}
        {selectedRequest && (
          <PayRequestModal
            isOpen={payModalOpen}
            onClose={() => {
              setPayModalOpen(false);
              setSelectedRequest(null);
            }}
            recipient={formatAddress(selectedRequest.from)}
            amount={parseFloat(selectedRequest.amount)}
            token={selectedRequest.token}
            recipientAddress={selectedRequest.from}
            requestedChain={selectedRequest.targetChain ? getChainKeyFromName(selectedRequest.targetChain) : 'optimismSepolia'}
            requestedToken={selectedRequest.token}
          />
        )}
      </main>
    </div>
  );
}