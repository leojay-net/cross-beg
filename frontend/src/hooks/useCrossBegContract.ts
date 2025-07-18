'use client';

import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { CROSSBEG_ABI, CONTRACT_ADDRESSES } from '@/config';
import type { PaymentRequest } from '@/types';

export function useCrossBegContract() {
  const { address, chainId } = useAccount();
  const { writeContract, isPending: isWriting } = useWriteContract();

  const contractAddress = chainId ? CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] : undefined;

  // Read user's sent requests
  const { data: sentRequestIds, isLoading: isLoadingSent, refetch: refetchSent } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CROSSBEG_ABI,
    functionName: 'getUserSentRequests',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  });

  // Read user's received requests
  const { data: receivedRequestIds, isLoading: isLoadingReceived, refetch: refetchReceived } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CROSSBEG_ABI,
    functionName: 'getUserReceivedRequests',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!contractAddress,
    },
  });

  // Read contract stats
  const { data: contractStats, isLoading: isLoadingStats } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: CROSSBEG_ABI,
    functionName: 'getContractStats',
    query: {
      enabled: !!contractAddress,
    },
  });

  // Create payment request
  const createPaymentRequest = async (params: {
    target: string;
    amount: bigint;
    token: string;
    targetChain: number;
    message: string;
    expiryTime?: bigint;
    gasPayment?: bigint;
  }) => {
    if (!contractAddress) throw new Error('Contract not available on this chain');

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: CROSSBEG_ABI,
      functionName: 'createPaymentRequest',
      args: [
        params.target as `0x${string}`,
        params.amount,
        params.token,
        params.targetChain,
        params.message,
        params.expiryTime || BigInt(0),
      ],
      value: params.gasPayment || BigInt(0),
    });
  };

  // Fulfill payment request
  const fulfillPaymentRequest = async (requestId: bigint, txHash: string) => {
    if (!contractAddress) throw new Error('Contract not available on this chain');

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: CROSSBEG_ABI,
      functionName: 'fulfillPaymentRequest',
      args: [requestId, txHash],
    });
  };

  // Cancel payment request
  const cancelPaymentRequest = async (requestId: bigint) => {
    if (!contractAddress) throw new Error('Contract not available on this chain');

    return writeContract({
      address: contractAddress as `0x${string}`,
      abi: CROSSBEG_ABI,
      functionName: 'cancelPaymentRequest',
      args: [requestId],
    });
  };

  // Get payment request details
  const getPaymentRequest = async (_requestId: bigint): Promise<PaymentRequest | null> => {
    if (!contractAddress) return null;

    try {
      // This would typically use useReadContract, but for dynamic requests we might use a different approach
      // For now, returning null as placeholder
      return null;
    } catch (error) {
      console.error('Error fetching payment request:', error);
      return null;
    }
  };

  // Quote gas payment for cross-chain requests
  const quoteGasPayment = async (_destinationChain: number, _messageBody: string) => {
    if (!contractAddress) throw new Error('Contract not available on this chain');

    // This would use useReadContract with the quoteGasPayment function
    // For now, return a mock value
    return BigInt(0);
  };

  return {
    // Data
    sentRequestIds: sentRequestIds as bigint[] | undefined,
    receivedRequestIds: receivedRequestIds as bigint[] | undefined,
    contractStats: contractStats as [bigint, bigint] | undefined,

    // Loading states
    isLoadingSent,
    isLoadingReceived,
    isLoadingStats,
    isWriting,

    // Functions
    createPaymentRequest,
    fulfillPaymentRequest,
    cancelPaymentRequest,
    getPaymentRequest,
    quoteGasPayment,

    // Refetch functions
    refetchSent,
    refetchReceived,

    // Contract info
    contractAddress,
  };
}
