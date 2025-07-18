'use client';

import React, { useState } from 'react';
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui';
import { PaymentRequestList } from './PaymentRequestList';
import type { PaymentRequest } from '@/types';

export interface DashboardProps {
  user: {
    address: string;
    ensName?: string;
    avatar?: string;
  };
  incomingRequests: PaymentRequest[];
  outgoingRequests: PaymentRequest[];
  historyRequests: PaymentRequest[];
  onNewRequest: () => void;
  onSendMoney: () => void;
  onPayRequest: (requestId: string) => void;
  onDeclineRequest: (requestId: string) => void;
  onCancelRequest: (requestId: string) => void;
  isLoading?: boolean;
}

export function Dashboard({
  user,
  incomingRequests,
  outgoingRequests,
  historyRequests,
  onNewRequest,
  onSendMoney,
  onPayRequest,
  onDeclineRequest,
  onCancelRequest,
  isLoading = false,
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState('incoming');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#343A40] dark:text-[#EAEBF0] mb-2">
          Welcome back, {user.ensName || 'there'}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Manage your cross-chain payment requests and send money globally.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <Button
          onClick={onNewRequest}
          size="lg"
          className="flex-1 sm:flex-none bg-gradient-to-r from-[#6F42C1] to-[#20C997] hover:from-[#5a359a] hover:to-[#1ba085]"
          leftIcon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
          }
        >
          New Request
        </Button>
        
        <Button
          onClick={onSendMoney}
          variant="outline"
          size="lg"
          className="flex-1 sm:flex-none"
          leftIcon={
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          }
        >
          Send Money
        </Button>
      </div>

      {/* Requests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto mb-6">
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

        <TabsContent value="incoming">
          <PaymentRequestList
            requests={incomingRequests}
            type="incoming"
            onPayRequest={onPayRequest}
            onDeclineRequest={onDeclineRequest}
            isLoading={isLoading}
            emptyMessage="No incoming payment requests"
            emptyDescription="When someone requests money from you, it will appear here."
          />
        </TabsContent>

        <TabsContent value="outgoing">
          <PaymentRequestList
            requests={outgoingRequests}
            type="outgoing"
            onCancelRequest={onCancelRequest}
            isLoading={isLoading}
            emptyMessage="No outgoing payment requests"
            emptyDescription="Your payment requests to others will appear here."
          />
        </TabsContent>

        <TabsContent value="history">
          <PaymentRequestList
            requests={historyRequests}
            type="history"
            isLoading={isLoading}
            emptyMessage="No payment history"
            emptyDescription="Your completed and cancelled requests will appear here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
