'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@/components/ui';
import { useENSResolver } from '@/hooks/useENSResolver';
import { validatePaymentRequest } from '@/lib/validation';
import { truncateAddress, debounce } from '@/lib/format';
import { POPULAR_TOKENS, SUPPORTED_CHAINS, DEFAULT_TOKEN } from '@/config';

export interface NewRequestFormData {
  recipient: string;
  amount: string;
  token: string;
  chain: number;
  message: string;
}

export interface NewRequestFormProps {
  onSubmit: (data: NewRequestFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  userChain?: number;
}

export function NewRequestForm({
  onSubmit,
  onCancel,
  isLoading = false,
  userChain = 1,
}: NewRequestFormProps) {
  const [formData, setFormData] = useState<NewRequestFormData>({
    recipient: '',
    amount: '',
    token: DEFAULT_TOKEN,
    chain: userChain,
    message: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  // ENS resolution for recipient
  const ensResult = useENSResolver(formData.recipient);

  // Validate form whenever data changes
  useEffect(() => {
    const validateForm = debounce(() => {
      const validationErrors = validatePaymentRequest(formData);
      const errorMap = validationErrors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {} as Record<string, string>);

      setErrors(errorMap);
      setIsValid(validationErrors.length === 0 && !ensResult.error);
    }, 300);

    validateForm();
  }, [formData, ensResult.error]);

  const handleInputChange = (field: keyof NewRequestFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isValid && !isLoading) {
      onSubmit(formData);
    }
  };

  const availableTokens = POPULAR_TOKENS[formData.chain as keyof typeof POPULAR_TOKENS] || [];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create Payment Request</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recipient Field */}
            <div>
              <Input
                label="To: (ENS Name or Address)"
                placeholder="vitalik.eth or 0x..."
                value={formData.recipient}
                onChange={handleInputChange('recipient')}
                error={errors.recipient}
                leftIcon={
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                }
              />

              {/* Address Verification */}
              {formData.recipient && (
                <div className="mt-2">
                  {ensResult.isLoading && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-[#6F42C1] rounded-full" />
                      <span>Resolving...</span>
                    </div>
                  )}

                  {ensResult.error && (
                    <div className="flex items-center space-x-2 text-sm text-red-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                      <span>{ensResult.error}</span>
                    </div>
                  )}

                  {ensResult.address && !ensResult.isLoading && !ensResult.error && (
                    <div className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        Valid address
                        {ensResult.ensName && (
                          <span className="ml-2">
                            ({ensResult.ensName} → {truncateAddress(ensResult.address)})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount and Token */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                placeholder="0.00"
                value={formData.amount}
                onChange={handleInputChange('amount')}
                error={errors.amount}
                step="any"
                min="0"
              />

              <div>
                <label className="block text-sm font-medium text-[#343A40] dark:text-[#EAEBF0] mb-1">
                  Token
                </label>
                <select
                  value={formData.token}
                  onChange={handleInputChange('token')}
                  className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:border-transparent dark:bg-[#161B22] dark:border-[#30363D] dark:text-[#EAEBF0]"
                >
                  {availableTokens.map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol} - {token.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Chain Selection */}
            <div>
              <label className="block text-sm font-medium text-[#343A40] dark:text-[#EAEBF0] mb-1">
                Target Chain
              </label>
              <select
                value={formData.chain}
                onChange={handleInputChange('chain')}
                className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:border-transparent dark:bg-[#161B22] dark:border-[#30363D] dark:text-[#EAEBF0]"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-[#343A40] dark:text-[#EAEBF0] mb-1">
                Message (Optional)
              </label>
              <textarea
                placeholder="What's this payment for?"
                value={formData.message}
                onChange={handleInputChange('message')}
                rows={3}
                maxLength={280}
                className="w-full px-3 py-2 text-base bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6F42C1] focus:border-transparent resize-none dark:bg-[#161B22] dark:border-[#30363D] dark:text-[#EAEBF0]"
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.message.length}/280 characters
              </p>
            </div>

            {/* Cross-chain notice */}
            {formData.chain !== userChain && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <span className="font-medium">Cross-chain Request</span>
                </div>
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  This request will be sent to {SUPPORTED_CHAINS.find(c => c.id === formData.chain)?.name}.
                  Additional gas fees may apply.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!isValid || isLoading}
                isLoading={isLoading}
                className="flex-1"
              >
                Review Request
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
