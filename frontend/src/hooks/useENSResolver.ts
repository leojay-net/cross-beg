'use client';

import { useState, useEffect } from 'react';
import { isAddress } from 'viem';
import { debounce } from '@/lib/format';

export interface ENSResult {
  address?: string;
  ensName?: string;
  avatar?: string;
  isLoading: boolean;
  error?: string;
}

// Mock ENS resolution function - replace with actual ENS API calls
async function resolveENS(input: string): Promise<{
  address?: string;
  ensName?: string;
  avatar?: string;
}> {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));

  if (isAddress(input)) {
    // Mock reverse ENS lookup
    if (input.toLowerCase() === '0x742d35Cc6639C0532fEb53E301e82ca84834F97') {
      return {
        address: input,
        ensName: 'vitalik.eth',
        avatar: 'https://metadata.ens.domains/mainnet/avatar/vitalik.eth',
      };
    }
    return { address: input };
  }

  if (input.endsWith('.eth')) {
    // Mock ENS resolution
    if (input === 'vitalik.eth') {
      return {
        address: '0x742d35Cc6639C0532fEb53E301e82ca84834F97',
        ensName: input,
        avatar: 'https://metadata.ens.domains/mainnet/avatar/vitalik.eth',
      };
    }
    if (input === 'amaka.eth') {
      return {
        address: '0x1234567890123456789012345678901234567890',
        ensName: input,
        avatar: 'https://metadata.ens.domains/mainnet/avatar/amaka.eth',
      };
    }
    // Return error for non-existent ENS names
    throw new Error('ENS name not found');
  }

  throw new Error('Invalid address or ENS name');
}

export function useENSResolver(input: string) {
  const [result, setResult] = useState<ENSResult>({
    isLoading: false,
  });

  const resolveFunction = async (value: string) => {
    if (!value.trim()) {
      setResult({ isLoading: false });
      return;
    }

    setResult(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const resolved = await resolveENS(value.trim());
      setResult({
        ...resolved,
        isLoading: false,
      });
    } catch (error) {
      setResult({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Resolution failed',
      });
    }
  };

  const debouncedResolve = debounce((value: unknown) => {
    if (typeof value === 'string') {
      resolveFunction(value);
    }
  }, 300);

  useEffect(() => {
    debouncedResolve(input);
  }, [input, debouncedResolve]);

  return result;
}
