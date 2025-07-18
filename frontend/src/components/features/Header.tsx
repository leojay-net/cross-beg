'use client';

import React from 'react';
import { Logo, ThemeToggle, WalletConnection } from '@/components/common';

export function Header() {
  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Logo />

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletConnection />
        </div>
      </div>
    </header>
  );
}
