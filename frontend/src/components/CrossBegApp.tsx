'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from 'wagmi';
import {
  LandingPage,
  Header,
  Dashboard,
  NewRequestForm,
  ReviewRequestModal,
  PayRequestModal,
  SettingsPage,
} from '@/components/features';
import type { PaymentRequest, NewRequestFormData, LiFiRoute } from '@/types';

// Mock payment requests
const mockIncomingRequests: PaymentRequest[] = [
  {
    id: BigInt(1),
    requester: '0x1234567890123456789012345678901234567890',
    target: '0x742d35Cc6639C0532fEb53E301e82ca84834F970',
    amount: BigInt('100000000000000000000'), // 100 tokens
    token: 'USDC',
    originChain: 1,
    targetChain: 137,
    message: 'Payment for freelance work',
    status: 0, // Pending
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 3600), // 1 hour ago
    expiryTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 6), // 6 days from now
    fulfillmentTxHash: '',
  },
];

const mockOutgoingRequests: PaymentRequest[] = [
  {
    id: BigInt(2),
    requester: '0x742d35Cc6639C0532fEb53E301e82ca84834F970',
    target: '0x9876543210987654321098765432109876543210',
    amount: BigInt('50000000000000000000'), // 50 tokens
    token: 'USDT',
    originChain: 137,
    targetChain: 1,
    message: 'Dinner split',
    status: 0, // Pending
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 7200), // 2 hours ago
    expiryTime: BigInt(Math.floor(Date.now() / 1000) + 86400 * 5), // 5 days from now
    fulfillmentTxHash: '',
  },
];

const mockHistoryRequests: PaymentRequest[] = [
  {
    id: BigInt(3),
    requester: '0x5555555555555555555555555555555555555555',
    target: '0x742d35Cc6639C0532fEb53E301e82ca84834F970',
    amount: BigInt('25000000000000000000'), // 25 tokens
    token: 'USDC',
    originChain: 1,
    targetChain: 1,
    message: 'Coffee money',
    status: 1, // Fulfilled
    timestamp: BigInt(Math.floor(Date.now() / 1000) - 86400), // 1 day ago
    expiryTime: BigInt(Math.floor(Date.now() / 1000) - 3600), // Expired (but fulfilled)
    fulfillmentTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
];

type AppState = 'landing' | 'dashboard' | 'new-request' | 'settings';

export function CrossBegApp() {
  const { isConnected, address } = useAccount();
  const { disconnect } = useDisconnect();

  const [appState, setAppState] = useState<AppState>('landing');

  // Modal states
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedPayRequest, setSelectedPayRequest] = useState<PaymentRequest | null>(null);
  const [formData, setFormData] = useState<NewRequestFormData | null>(null);

  // Loading states
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Automatically redirect to dashboard when connected
  useEffect(() => {
    if (isConnected && address) {
      setAppState('dashboard');
    } else {
      setAppState('landing');
    }
  }, [isConnected, address]);

  const handleDisconnectWallet = () => {
    disconnect();
    setAppState('landing');
  };

  const handleNewRequest = () => {
    setAppState('new-request');
  };

  const handleSendMoney = () => {
    // Would navigate to a send money flow
    console.log('Send money clicked');
  };

  const handleNewRequestSubmit = (data: NewRequestFormData) => {
    setFormData(data);
    setShowReviewModal(true);
  };

  const handleConfirmRequest = async () => {
    setIsCreatingRequest(true);
    // Simulate request creation
    setTimeout(() => {
      setIsCreatingRequest(false);
      setShowReviewModal(false);
      setFormData(null);
      setAppState('dashboard');
      // Would refresh the requests list
    }, 3000);
  };

  const handlePayRequest = (requestId: string) => {
    const request = mockIncomingRequests.find(r => r.id.toString() === requestId);
    if (request) {
      setSelectedPayRequest(request);
      setShowPayModal(true);
    }
  };

  const handleConfirmPayment = async (_route: LiFiRoute, _fromChain: number, _fromToken: string) => {
    setIsProcessingPayment(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsProcessingPayment(false);
      setShowPayModal(false);
      setSelectedPayRequest(null);
      // Would refresh the requests list and mark as paid
    }, 5000);
  };

  const handleDeclineRequest = (requestId: string) => {
    // Would mark request as declined
    console.log('Decline request:', requestId);
  };

  const handleCancelRequest = (requestId: string) => {
    // Would cancel the request
    console.log('Cancel request:', requestId);
  };

  const renderCurrentView = () => {
    switch (appState) {
      case 'landing':
        return <LandingPage />;

      case 'dashboard':
        if (!isConnected || !address) return null;
        return (
          <>
            <Header />
            <Dashboard
              user={{ address }}
              incomingRequests={mockIncomingRequests}
              outgoingRequests={mockOutgoingRequests}
              historyRequests={mockHistoryRequests}
              onNewRequest={handleNewRequest}
              onSendMoney={handleSendMoney}
              onPayRequest={handlePayRequest}
              onDeclineRequest={handleDeclineRequest}
              onCancelRequest={handleCancelRequest}
            />
          </>
        );

      case 'new-request':
        return (
          <>
            <Header />
            <NewRequestForm
              onSubmit={handleNewRequestSubmit}
              onCancel={() => setAppState('dashboard')}
              userChain={137} // Mock current chain
            />
          </>
        );

      case 'settings':
        return (
          <>
            <Header />
            <SettingsPage
              onDisconnect={handleDisconnectWallet}
              onBack={() => setAppState('dashboard')}
            />
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
      {renderCurrentView()}

      {/* Modals */}
      {formData && (
        <ReviewRequestModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setFormData(null);
          }}
          onConfirm={handleConfirmRequest}
          formData={formData}
          gasEstimate="0.002"
          isLoading={isCreatingRequest}
          userChain={137}
        />
      )}

      <PayRequestModal
        isOpen={showPayModal}
        onClose={() => {
          setShowPayModal(false);
          setSelectedPayRequest(null);
        }}
        onConfirm={handleConfirmPayment}
        request={selectedPayRequest}
        userChain={137}
        userAddress={address || ''}
        isLoading={isProcessingPayment}
      />
    </div>
  );
}