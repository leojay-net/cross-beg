'use client';

import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalContent,
  ModalFooter,
  Button,
  Badge,
} from '@/components/ui';
import { formatUSDAmount, truncateAddress, getChainName } from '@/lib/format';
import type { NewRequestFormData } from './NewRequestForm';

export interface ReviewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: NewRequestFormData;
  gasEstimate?: string;
  isLoading?: boolean;
  userChain: number;
}

export function ReviewRequestModal({
  isOpen,
  onClose,
  onConfirm,
  formData,
  gasEstimate = '0.001',
  isLoading = false,
  userChain,
}: ReviewRequestModalProps) {
  const isCrossChain = formData.chain !== userChain;
  const estimatedGasCostUSD = parseFloat(gasEstimate) * 2000; // Assuming ETH price

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>Review Payment Request</ModalHeader>

      <ModalContent>
        <div className="space-y-6">
          {/* Request Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <h3 className="font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-3">
              Request Summary
            </h3>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">To:</span>
                <span className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  {truncateAddress(formData.recipient)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  {formData.amount} {formData.token}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Chain:</span>
                <span className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  {getChainName(formData.chain)}
                </span>
              </div>

              {formData.message && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Message:</span>
                  <span className="font-medium text-[#343A40] dark:text-[#EAEBF0] max-w-48 text-right">
                    &ldquo;{formData.message}&rdquo;
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Cross-chain Notice */}
          {isCrossChain && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  Cross-Chain Request
                </span>
                <Badge variant="info" size="sm">Hyperlane</Badge>
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                This request will be sent via Hyperlane messaging to {getChainName(formData.chain)}.
              </p>
            </div>
          )}

          {/* Gas Estimate */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
              Network Fees
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-yellow-700 dark:text-yellow-400">
                  {isCrossChain ? 'Cross-chain messaging fee:' : 'Transaction fee:'}
                </span>
                <span className="font-medium text-yellow-800 dark:text-yellow-300">
                  {gasEstimate} ETH ({formatUSDAmount(estimatedGasCostUSD)})
                </span>
              </div>
              {isCrossChain && (
                <p className="text-xs text-yellow-600 dark:text-yellow-500">
                  This fee covers the cost of sending your request across chains
                </p>
              )}
            </div>
          </div>

          {/* Confirmation */}
          <div className="text-center">
            <p className="text-lg font-medium text-[#343A40] dark:text-[#EAEBF0]">
              You are about to request{' '}
              <span className="text-[#6F42C1]">
                {formData.amount} {formData.token}
              </span>
              {' '}from{' '}
              <span className="text-[#6F42C1]">
                {truncateAddress(formData.recipient)}
              </span>
            </p>
          </div>
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
          onClick={onConfirm}
          isLoading={isLoading}
          className="bg-[#6F42C1] hover:bg-[#5a359a]"
        >
          Send Request
        </Button>
      </ModalFooter>
    </Modal>
  );
}
