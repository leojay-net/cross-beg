'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, arbitrum, optimism, base } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
    appName: 'CrossBeg',
    projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-wallet-connect-project-id',
    chains: [mainnet, polygon, arbitrum, optimism, base],
    ssr: true, // If your dApp uses server side rendering (SSR)
});

export const supportedChains = [mainnet, polygon, arbitrum, optimism, base];
