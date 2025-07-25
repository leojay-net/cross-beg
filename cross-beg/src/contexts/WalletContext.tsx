import React, { createContext, useContext, useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';

interface WalletContextType {
  isConnected: boolean;
  userAddress: string | null;
  userENS: string | null;
  chainId: number | null;
  signer: ethers.Signer | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchChain: (chainId: number) => Promise<void>;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userENS, setUserENS] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Get the first connected wallet
  const wallet = wallets?.[0];

  useEffect(() => {
    if (ready) {
      setIsLoading(false);
    }
  }, [ready]);

  useEffect(() => {
    if (authenticated && wallet && user) {
      // Set user address from wallet
      setUserAddress(wallet.address);

      // Try to get ENS name (this would require an ENS resolver)
      // For now, we'll use a simplified approach
      resolveENS(wallet.address);

      // Get chain ID
      if (wallet.chainId) {
        setChainId(parseInt(wallet.chainId.split(':')[1]));
      }

      // Create signer
      createSigner();
    } else {
      setUserAddress(null);
      setUserENS(null);
      setChainId(null);
      setSigner(null);
    }
  }, [authenticated, wallet, user]);

  const resolveENS = async (address: string) => {
    try {
      // Simple ENS resolution - in production you'd use a proper ENS resolver
      // For now, we'll just use the address
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      setUserENS(shortAddress);
    } catch (error) {
      console.error('Error resolving ENS:', error);
      const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
      setUserENS(shortAddress);
    }
  };

  const createSigner = async () => {
    try {
      if (wallet && typeof window !== 'undefined' && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setSigner(signer);
      }
    } catch (error) {
      console.error('Error creating signer:', error);
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      await login();
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    logout();
    setUserAddress(null);
    setUserENS(null);
    setChainId(null);
    setSigner(null);
  };

  const switchChain = async (targetChainId: number) => {
    try {
      if (wallet && typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
        setChainId(targetChainId);
      }
    } catch (error: any) {
      // If the chain hasn't been added to the wallet
      if (error.code === 4902) {
        // Add chain logic would go here
        console.error('Chain not found in wallet, need to add it first');
      } else {
        console.error('Error switching chain:', error);
      }
      throw error;
    }
  };

  return (
    <WalletContext.Provider value={{
      isConnected: authenticated && !!userAddress,
      userAddress,
      userENS,
      chainId,
      signer,
      connectWallet,
      disconnectWallet,
      switchChain,
      isLoading
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}