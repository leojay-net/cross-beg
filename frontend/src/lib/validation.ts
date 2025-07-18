import { isAddress } from 'viem';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate payment request form data
 */
export function validatePaymentRequest(data: {
  recipient: string;
  amount: string;
  token: string;
  message?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate recipient
  if (!data.recipient.trim()) {
    errors.push({ field: 'recipient', message: 'Recipient is required' });
  } else if (!isAddress(data.recipient) && !isENSName(data.recipient)) {
    errors.push({ field: 'recipient', message: 'Invalid address or ENS name' });
  }

  // Validate amount
  if (!data.amount.trim()) {
    errors.push({ field: 'amount', message: 'Amount is required' });
  } else {
    const amount = parseFloat(data.amount);
    if (isNaN(amount) || amount <= 0) {
      errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
    } else if (amount > 1000000) {
      errors.push({ field: 'amount', message: 'Amount too large' });
    }
  }

  // Validate token
  if (!data.token.trim()) {
    errors.push({ field: 'token', message: 'Token is required' });
  }

  // Validate message (optional but check length if provided)
  if (data.message && data.message.length > 280) {
    errors.push({ field: 'message', message: 'Message too long (max 280 characters)' });
  }

  return errors;
}

/**
 * Check if string is ENS name
 */
function isENSName(name: string): boolean {
  return name.endsWith('.eth') || (name.includes('.') && !isAddress(name));
}

/**
 * Validate wallet address
 */
export function validateWalletAddress(address: string): {
  isValid: boolean;
  error?: string;
} {
  if (!address.trim()) {
    return { isValid: false, error: 'Address is required' };
  }

  if (isAddress(address)) {
    return { isValid: true };
  }

  if (isENSName(address)) {
    return { isValid: true };
  }

  return { isValid: false, error: 'Invalid address or ENS name' };
}

/**
 * Validate amount input
 */
export function validateAmount(amount: string, maxAmount?: number): {
  isValid: boolean;
  error?: string;
} {
  if (!amount.trim()) {
    return { isValid: false, error: 'Amount is required' };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: 'Invalid amount format' };
  }

  if (numAmount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' };
  }

  if (maxAmount && numAmount > maxAmount) {
    return { isValid: false, error: `Amount cannot exceed ${maxAmount}` };
  }

  // Check for reasonable decimal places (max 18)
  const decimalPart = amount.split('.')[1];
  if (decimalPart && decimalPart.length > 18) {
    return { isValid: false, error: 'Too many decimal places' };
  }

  return { isValid: true };
}

/**
 * Validate transaction hash
 */
export function validateTxHash(txHash: string): {
  isValid: boolean;
  error?: string;
} {
  if (!txHash.trim()) {
    return { isValid: false, error: 'Transaction hash is required' };
  }

  // Basic hex string validation (0x followed by 64 hex characters)
  const hexPattern = /^0x[a-fA-F0-9]{64}$/;
  if (!hexPattern.test(txHash)) {
    return { isValid: false, error: 'Invalid transaction hash format' };
  }

  return { isValid: true };
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>\"']/g, '');
}

/**
 * Validate message content
 */
export function validateMessage(message: string): {
  isValid: boolean;
  error?: string;
} {
  if (message.length > 280) {
    return { isValid: false, error: 'Message too long (max 280 characters)' };
  }

  // Check for potentially harmful content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return { isValid: false, error: 'Message contains invalid content' };
    }
  }

  return { isValid: true };
}
