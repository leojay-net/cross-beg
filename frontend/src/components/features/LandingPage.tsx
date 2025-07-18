'use client';

import React from 'react';
import { ArrowLeftRight, Shield, Clock } from 'lucide-react';
import { Logo, ThemeToggle, SimpleConnectButton } from '@/components/common';
import { Card } from '@/components/ui';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header with Logo and Theme Toggle */}
        <div className="flex justify-between items-center mb-16">
          <Logo size="lg" />
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="text-center">
          {/* Hero Section */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-[#343A40] dark:text-[#EAEBF0] mb-6">
              Cross-chain payments,{' '}
              <span className="bg-gradient-to-r from-[#6F42C1] to-[#20C997] bg-clip-text text-transparent">
                simplified.
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              CrossBeg is a social payments protocol that lets you safely request and receive money
              from anyone across any blockchain using just a username or wallet address.
            </p>
          </div>

          {/* Connect Wallet Button */}
          <div className="mb-16">
            <SimpleConnectButton className="px-12 py-4 text-xl mx-auto" />
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowLeftRight className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-2">
                Cross-Chain
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Send and receive payments across multiple blockchains seamlessly
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-2">
                Secure
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Built with security-first approach using proven protocols
              </p>
            </Card>

            <Card className="p-8 text-center hover:shadow-lg transition-shadow">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-[#343A40] dark:text-[#EAEBF0] mb-2">
                Simple
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Easy-to-use interface that anyone can understand
              </p>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 dark:text-gray-400">
            <p>Connect your wallet to get started</p>
          </div>
        </div>
      </div>
    </div>
  );
}
