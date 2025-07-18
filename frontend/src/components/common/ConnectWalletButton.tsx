'use client';

import React from 'react';
import { Button } from '@/components/ui';

export interface ConnectWalletButtonProps {
  onConnect: () => void;
  isConnecting?: boolean;
  className?: string;
}

export function ConnectWalletButton({ onConnect, isConnecting = false, className = '' }: ConnectWalletButtonProps) {
  return (
    <Button
      onClick={onConnect}
      isLoading={isConnecting}
      size="lg"
      className={`bg-gradient-to-r from-[#6F42C1] to-[#20C997] hover:from-[#5a359a] hover:to-[#1ba085] ${className}`}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </Button>
  );
}
