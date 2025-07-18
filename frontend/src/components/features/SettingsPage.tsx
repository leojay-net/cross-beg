'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent, Button } from '@/components/ui';
import { ThemeToggle } from '@/components/common';

export interface SettingsPageProps {
  onDisconnect: () => void;
  onBack: () => void;
}

export function SettingsPage({ onDisconnect, onBack }: SettingsPageProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6"
        leftIcon={
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        }
      >
        Back to Dashboard
      </Button>

      <div className="space-y-6">
        {/* Theme Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[#343A40] dark:text-[#EAEBF0]">
                  Theme
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose between light and dark mode
                </p>
              </div>
              <ThemeToggle />
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-[#343A40] dark:text-[#EAEBF0] mb-2">
                  Wallet Connection
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Disconnect your wallet to switch accounts or use a different wallet
                </p>
                <Button
                  variant="outline"
                  onClick={onDisconnect}
                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Disconnect Wallet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About CrossBeg</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  CrossBeg is a decentralized cross-chain payments protocol that enables 
                  seamless money requests and transfers across different blockchains.
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-[#343A40] dark:text-[#EAEBF0] mb-2">
                  Built with
                </h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-[#6F42C1]/10 text-[#6F42C1] rounded">
                    Hyperlane
                  </span>
                  <span className="px-2 py-1 text-xs bg-[#20C997]/10 text-[#20C997] rounded">
                    LI.FI
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded dark:bg-gray-800 dark:text-gray-300">
                    Next.js
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded dark:bg-gray-800 dark:text-gray-300">
                    Wagmi
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-[#343A40] dark:text-[#EAEBF0] mb-2">
                  Version
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  v1.0.0 Beta
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
