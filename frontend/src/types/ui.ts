// UI-specific types
export interface User {
  address: string;
  ensName?: string;
  avatar?: string;
  isConnected: boolean;
}

export interface NewRequestFormData {
  recipient: string;
  amount: string;
  token: string;
  chain: number;
  message: string;
}

export interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  chainId: number;
  logoURI?: string;
}

export interface ChainOption {
  id: number;
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  logoURI?: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  resolvedAddress?: string;
  ensName?: string;
  avatar?: string;
}

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}
