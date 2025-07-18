import { formatUnits, parseUnits, isAddress, getAddress } from 'viem';

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: bigint | string,
  decimals: number = 18,
  maxDecimals: number = 6
): string {
  try {
    const amountBigInt = typeof amount === 'string' ? BigInt(amount) : amount;
    const formatted = formatUnits(amountBigInt, decimals);
    const num = parseFloat(formatted);

    if (num === 0) return '0';
    if (num < 0.000001) return '< 0.000001';

    return num.toLocaleString('en-US', {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 0,
    });
  } catch {
    return '0';
  }
}

/**
 * Parse token amount from user input
 */
export function parseTokenAmount(amount: string, decimals: number = 18): bigint {
  try {
    if (!amount || amount === '0') return BigInt(0);
    return parseUnits(amount, decimals);
  } catch {
    throw new Error('Invalid amount format');
  }
}

/**
 * Format USD amount
 */
export function formatUSDAmount(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num) || num === 0) return '$0.00';

  if (num < 0.01) return '< $0.01';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string, chars: number = 6): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;

  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Validate Ethereum address
 */
export function validateAddress(address: string): boolean {
  return isAddress(address);
}

/**
 * Normalize address to checksum format
 */
export function normalizeAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

/**
 * Check if string is ENS name
 */
export function isENSName(name: string): boolean {
  return name.endsWith('.eth') || name.includes('.');
}

/**
 * Format time relative to now
 */
export function formatTimeAgo(timestamp: number | Date): string {
  const now = new Date();
  const time = typeof timestamp === 'number' ? new Date(timestamp * 1000) : timestamp;
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return time.toLocaleDateString();
}

/**
 * Format expiry time
 */
export function formatExpiryTime(timestamp: number): string {
  const expiryDate = new Date(timestamp * 1000);
  const now = new Date();

  if (expiryDate < now) return 'Expired';

  const diffInSeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);

  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m left`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h left`;

  return `${Math.floor(diffInSeconds / 86400)}d left`;
}

/**
 * Generate transaction explorer URL
 */
export function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    1: 'https://etherscan.io',
    137: 'https://polygonscan.com',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    8453: 'https://basescan.org',
    11155111: 'https://sepolia.etherscan.io',
    80001: 'https://mumbai.polygonscan.com',
  };

  const baseUrl = explorers[chainId];
  if (!baseUrl) return '';

  return `${baseUrl}/tx/${txHash}`;
}

/**
 * Get chain name by ID
 */
export function getChainName(chainId: number): string {
  const chainNames: Record<number, string> = {
    1: 'Ethereum',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
    56: 'BSC',
    43114: 'Avalanche',
    11155111: 'Sepolia',
    80001: 'Mumbai',
  };

  return chainNames[chainId] || `Chain ${chainId}`;
}

/**
 * Debounce function - supports both sync and async functions
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }
}

/**
 * Generate random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}
