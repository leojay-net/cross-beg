'use client';

import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';
import { Card, Button, Badge, Avatar } from '@/components/ui';
import { formatTokenAmount, formatTimeAgo, formatExpiryTime, truncateAddress, getChainName } from '@/lib/format';
import { RequestStatus, type PaymentRequest } from '@/types';

export interface PaymentRequestListProps {
  requests: PaymentRequest[];
  type: 'incoming' | 'outgoing' | 'history';
  onPayRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function PaymentRequestList({
  requests,
  type,
  onPayRequest,
  onDeclineRequest,
  onCancelRequest,
  isLoading = false,
  emptyMessage = 'No requests found',
  emptyDescription = 'No requests to display at the moment.',
}: PaymentRequestListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-6">
            <div className="animate-pulse">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 dark:bg-gray-700" />
                  <div className="h-3 bg-gray-200 rounded w-24 dark:bg-gray-700" />
                </div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2 dark:bg-gray-700" />
              <div className="h-4 bg-gray-200 rounded w-3/4 dark:bg-gray-700" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <Card className="p-12 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 dark:bg-gray-800">
          <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-[#343A40] dark:text-[#EAEBF0] mb-2">
          {emptyMessage}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {emptyDescription}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <PaymentRequestCard
          key={request.id.toString()}
          request={request}
          type={type}
          onPayRequest={onPayRequest}
          onDeclineRequest={onDeclineRequest}
          onCancelRequest={onCancelRequest}
        />
      ))}
    </div>
  );
}

interface PaymentRequestCardProps {
  request: PaymentRequest;
  type: 'incoming' | 'outgoing' | 'history';
  onPayRequest?: (requestId: string) => void;
  onDeclineRequest?: (requestId: string) => void;
  onCancelRequest?: (requestId: string) => void;
}

function PaymentRequestCard({
  request,
  type,
  onPayRequest,
  onDeclineRequest,
  onCancelRequest,
}: PaymentRequestCardProps) {
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.Pending:
        return <Badge variant="warning">Pending</Badge>;
      case RequestStatus.Fulfilled:
        return <Badge variant="success">Paid</Badge>;
      case RequestStatus.Cancelled:
        return <Badge variant="error">Cancelled</Badge>;
      case RequestStatus.Expired:
        return <Badge variant="error">Expired</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const isExpired = Number(request.expiryTime) * 1000 < Date.now();
  const canPay = type === 'incoming' && request.status === RequestStatus.Pending && !isExpired;
  const canCancel = type === 'outgoing' && request.status === RequestStatus.Pending;

  const otherParty = type === 'incoming' ? request.requester : request.target;
  const otherPartyDisplay = truncateAddress(otherParty);

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Avatar
            src={undefined} // Would be resolved from ENS/address
            fallback={otherPartyDisplay}
            size="md"
          />
          <div>
            <p className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
              {type === 'incoming' ? 'From' : 'To'}: {otherPartyDisplay}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatTimeAgo(Number(request.timestamp))}
              {type === 'incoming' && !isExpired && (
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                  • Expires {formatExpiryTime(Number(request.expiryTime))}
                </span>
              )}
            </p>
          </div>
        </div>
        {getStatusBadge(request.status)}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-[#343A40] dark:text-[#EAEBF0]">
            {formatTokenAmount(request.amount, 18, 6)} {request.token}
          </span>
          {request.originChain !== request.targetChain && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {getChainName(request.originChain)} → {getChainName(request.targetChain)}
            </span>
          )}
        </div>

        {request.message && (
          <p className="text-gray-600 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            &ldquo;{request.message}&rdquo;
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {canPay && (
        <div className="flex space-x-2">
          <Button
            onClick={() => onPayRequest?.(request.id.toString())}
            className="flex-1 bg-[#20C997] hover:bg-[#1ba085]"
          >
            Pay
          </Button>
          <Button
            onClick={() => onDeclineRequest?.(request.id.toString())}
            variant="outline"
            className="flex-1"
          >
            Decline
          </Button>
        </div>
      )}

      {canCancel && (
        <Button
          onClick={() => onCancelRequest?.(request.id.toString())}
          variant="outline"
          className="w-full"
        >
          Cancel Request
        </Button>
      )}

      {request.status === RequestStatus.Fulfilled && request.fulfillmentTxHash && (
        <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Payment completed
          </p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            Transaction: {truncateAddress(request.fulfillmentTxHash)}
          </p>
        </div>
      )}

      {isExpired && request.status === RequestStatus.Pending && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            This request has expired
          </p>
        </div>
      )}
    </Card>
  );
}
