'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Button,
  Badge,
} from '@/components/ui';
import { formatTokenAmount, formatUSDAmount, truncateAddress, getChainName } from '@/lib/format';
import { SUPPORTED_CHAINS } from '@/config';
import { useLiFi } from '@/hooks/useLiFi';
import type { PaymentRequest, LiFiRoute } from '@/types';

export interface PayRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (route: LiFiRoute, fromChain: number, fromToken: string) => void;
  request: PaymentRequest | null;
  userChain: number;
  userAddress: string;
  isLoading?: boolean;
}

export function PayRequestModal({
  isOpen,
  onClose,
  onConfirm,
  request,
  userChain,
  userAddress,
  isLoading = false,
}: PayRequestModalProps) {
  const [selectedFromChain, setSelectedFromChain] = useState(userChain);
  const [selectedFromToken, setSelectedFromToken] = useState('USDC');
  const [routes, setRoutes] = useState<LiFiRoute[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<LiFiRoute | null>(null);

  const { getQuote, isQuoting } = useLiFi();

  // Get quote when payment options change
  useEffect(() => {
    if (!request || !isOpen) return;

    const fetchQuote = async () => {
      try {
        const quoteRoutes = await getQuote({
          fromChain: selectedFromChain,
          toChain: request.targetChain,
          fromToken: selectedFromToken,
          toToken: request.token,
          fromAmount: request.amount.toString(),
          fromAddress: userAddress,
          toAddress: request.target,
          slippage: 0.5,
          integrator: 'crossbeg',
        });

        setRoutes(quoteRoutes);
        setSelectedRoute(quoteRoutes[0] || null);
      } catch (error) {
        console.error('Failed to get quote:', error);
        setRoutes([]);
        setSelectedRoute(null);
      }
    };

    fetchQuote();
  }, [request, selectedFromChain, selectedFromToken, userAddress, isOpen, getQuote]);

  if (!request) return null;

  const isCrossChain = selectedFromChain !== request.targetChain;
  const needsBridge = selectedFromToken !== request.token || isCrossChain;

  const handleConfirm = () => {
    if (selectedRoute) {
      onConfirm(selectedRoute, selectedFromChain, selectedFromToken);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>Pay Request</ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-3">
              Payment Details
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Requesting:</span>
                <span className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  {truncateAddress(request.requester)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-bold text-lg text-[#343A40] dark:text-[#EAEBF0]">
                  {formatTokenAmount(request.amount, 18, 6)} {request.token}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">On:</span>
                <span className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  {getChainName(request.targetChain)}
                </span>
              </div>

              {request.message && (
                <div className="mt-3 p-3 bg-white dark:bg-gray-700 rounded border-l-4 border-[#6F42C1]">
                  <p className="text-sm text-[#343A40] dark:text-[#EAEBF0]">
                    &ldquo;{request.message}&rdquo;
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h3 className="font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-3">
              Pay With
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* From Chain */}
              <div>
                <label className="block text-sm font-medium text-[#343A40] dark:text-[#EAEBF0] mb-1">
                  From Chain
                </label>
                <select
                  value={selectedFromChain}
                  onChange={(e) => setSelectedFromChain(Number(e.target.value))}
                  className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:border-transparent dark:bg-[#161B22] dark:border-[#30363D] dark:text-[#EAEBF0]"
                >
                  {SUPPORTED_CHAINS.map((chain) => (
                    <option key={chain.id} value={chain.id}>
                      {chain.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Token */}
              <div>
                <label className="block text-sm font-medium text-[#343A40] dark:text-[#EAEBF0] mb-1">
                  Token
                </label>
                <select
                  value={selectedFromToken}
                  onChange={(e) => setSelectedFromToken(e.target.value)}
                  className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:border-transparent dark:bg-[#161B22] dark:border-[#30363D] dark:text-[#EAEBF0]"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="ETH">ETH</option>
                </select>
              </div>
            </div>

            {/* Bridge Notice */}
            {needsBridge && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Cross-Chain Payment
                  </span>
                  <Badge variant="info" size="sm">LI.FI</Badge>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  Your {selectedFromToken} on {getChainName(selectedFromChain)} will be bridged to {request.token} on {getChainName(request.targetChain)}
                </p>
              </div>
            )}
          </div>

          {/* Route Information */}
          {isQuoting ? (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-[#6F42C1] rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Getting best route...
                </span>
              </div>
            </div>
          ) : selectedRoute ? (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <h4 className="font-medium text-green-800 dark:text-green-300 mb-2">
                Best Route Found
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-400">You pay:</span>
                  <span className="font-medium text-green-800 dark:text-green-300">
                    {formatTokenAmount(BigInt(selectedRoute.fromAmount), 18, 6)} {selectedFromToken}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-400">They receive:</span>
                  <span className="font-medium text-green-800 dark:text-green-300">
                    {formatTokenAmount(BigInt(selectedRoute.toAmount), 18, 6)} {request.token}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-400">Gas cost:</span>
                  <span className="font-medium text-green-800 dark:text-green-300">
                    {formatUSDAmount(selectedRoute.gasCostUSD)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700 dark:text-green-400">Route:</span>
                  <span className="font-medium text-green-800 dark:text-green-300">
                    {selectedRoute.steps[0]?.toolDetails.name || 'Direct'}
                  </span>
                </div>
              </div>
            </div>
          ) : routes.length === 0 && !isQuoting ? (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-red-700 dark:text-red-300">
                No route available for this payment. Try selecting a different chain or token.
              </p>
            </div>
          ) : null}
        </div>
      </ModalContent>

      <ModalFooter>
        <Button
          variant="outline"
          onClick={onClose}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          disabled={!selectedRoute || isLoading || isQuoting}
          isLoading={isLoading}
          className="bg-[#20C997] hover:bg-[#1ba085]"
        >
          Approve & Pay
        </Button>
      </ModalFooter>
    </Modal>
  );
}
