'use client';

import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect } from 'wagmi';
import { User, LogOut, Wallet } from 'lucide-react';
import { Button } from '@/components/ui';

export interface WalletConnectionProps {
    onConnect?: () => void;
    onDisconnect?: () => void;
    className?: string;
}

export function WalletConnection({ onConnect, onDisconnect, className = '' }: WalletConnectionProps) {
    const { isConnected, address } = useAccount();
    const { disconnect } = useDisconnect();

    const handleDisconnect = () => {
        disconnect();
        onDisconnect?.();
    };

    if (isConnected && address) {
        return (
            <div className={`flex items-center gap-3 ${className}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                        {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                </div>
                <Button
                    onClick={handleDisconnect}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                </Button>
            </div>
        );
    }

    return (
        <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, authenticationStatus, mounted }) => {
                const ready = mounted && authenticationStatus !== 'loading';
                const connected = ready && account && chain && (!authenticationStatus || authenticationStatus === 'authenticated');

                return (
                    <div
                        {...(!ready && {
                            'aria-hidden': true,
                            style: {
                                opacity: 0,
                                pointerEvents: 'none',
                                userSelect: 'none',
                            },
                        })}
                        className={className}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <Button
                                        onClick={() => {
                                            openConnectModal();
                                            onConnect?.();
                                        }}
                                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none"
                                    >
                                        <Wallet className="w-4 h-4" />
                                        Connect Wallet
                                    </Button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <Button
                                        onClick={openChainModal}
                                        variant="danger"
                                        className="flex items-center gap-2"
                                    >
                                        Wrong network
                                    </Button>
                                );
                            }

                            return (
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={openChainModal}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        {chain.hasIcon && (
                                            <div
                                                style={{
                                                    background: chain.iconBackground,
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: 999,
                                                    overflow: 'hidden',
                                                    marginRight: 4,
                                                }}
                                            >
                                                {chain.iconUrl && (
                                                    <img
                                                        alt={chain.name ?? 'Chain icon'}
                                                        src={chain.iconUrl}
                                                        style={{ width: 16, height: 16 }}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        {chain.name}
                                    </Button>

                                    <Button
                                        onClick={openAccountModal}
                                        variant="outline"
                                        size="sm"
                                        className="flex items-center gap-2"
                                    >
                                        <User className="w-4 h-4" />
                                        {account.displayName}
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}

// Simplified connect button for cases where you just need a basic connect button
export function SimpleConnectButton({ className = '' }: { className?: string }) {
    return (
        <ConnectButton.Custom>
            {({ openConnectModal, mounted }) => {
                return (
                    <Button
                        onClick={openConnectModal}
                        disabled={!mounted}
                        className={`flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white border-none ${className}`}
                    >
                        <Wallet className="w-4 h-4" />
                        Connect Wallet
                    </Button>
                );
            }}
        </ConnectButton.Custom>
    );
}
