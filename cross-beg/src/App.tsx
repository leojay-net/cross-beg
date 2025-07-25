import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { PrivyProvider } from '@privy-io/react-auth';
import { ThemeProvider } from "@/contexts/ThemeContext";
import { WalletProvider, useWallet } from "@/contexts/WalletContext";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import NewRequest from "./pages/NewRequest";
import SendMoney from "./pages/SendMoney";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { LifiTest } from "./pages/LifiTest";

const queryClient = new QueryClient();

// Privy configuration
const privyConfig = {
  appId: import.meta.env.VITE_PRIVY_APP_ID || 'clynhblkn0s7n10ougoyuq19x', // Default Privy App ID for development
  config: {
    loginMethods: ['wallet'] as const,
    appearance: {
      theme: 'light' as const,
      accentColor: '#676FFF',
    },
    embeddedWallets: {
      createOnLogin: 'users-without-wallets' as const,
    },
    defaultChain: {
      id: 11155111, // Sepolia testnet
      name: 'Sepolia',
      network: 'sepolia',
      nativeCurrency: {
        decimals: 18,
        name: 'Ethereum',
        symbol: 'ETH',
      }, rpcUrls: {
        default: {
          http: [import.meta.env.SEPOLIA_RPC_URL],
        },
        public: {
          http: [import.meta.env.SEPOLIA_RPC_URL],
        },
      },
      blockExplorers: {
        default: {
          name: 'Etherscan',
          url: 'https://sepolia.etherscan.io',
        },
      },
    },
    supportedChains: [
      {
        id: 11155111, // Sepolia
        name: 'Sepolia',
        network: 'sepolia',
        nativeCurrency: {
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.SEPOLIA_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Etherscan',
            url: 'https://sepolia.etherscan.io',
          },
        },
      },
      {
        id: 84532, // Base Sepolia
        name: 'Base Sepolia',
        network: 'base-sepolia',
        nativeCurrency: {
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.BASE_SEPOLIA_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Basescan',
            url: 'https://sepolia.basescan.org',
          },
        },
      },
      {
        id: 11155420, // Optimism Sepolia
        name: 'Optimism Sepolia',
        network: 'optimism-sepolia',
        nativeCurrency: {
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.OPTIMISM_SEPOLIA_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Optimism Etherscan',
            url: 'https://sepolia-optimism.etherscan.io',
          },
        },
      },
      {
        id: 5003, // Mantle Sepolia
        name: 'Mantle Sepolia',
        network: 'mantle-sepolia',
        nativeCurrency: {
          decimals: 18,
          name: 'Mantle',
          symbol: 'MNT',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.MANTLE_SEPOLIA_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Mantle Explorer',
            url: 'https://explorer.sepolia.mantle.xyz',
          },
        },
      },
      {
        id: 80002, // Polygon Amoy
        name: 'Polygon Amoy',
        network: 'polygon-amoy',
        nativeCurrency: {
          decimals: 18,
          name: 'Polygon',
          symbol: 'MATIC',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.POLYGON_AMOY_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Polygonscan',
            url: 'https://amoy.polygonscan.com',
          },
        },
      },
      {
        id: 421614, // Arbitrum Sepolia
        name: 'Arbitrum Sepolia',
        network: 'arbitrum-sepolia',
        nativeCurrency: {
          decimals: 18,
          name: 'Ethereum',
          symbol: 'ETH',
        },
        rpcUrls: {
          default: {
            http: [import.meta.env.ARBITRUM_SEPOLIA_RPC_URL],
          },
        },
        blockExplorers: {
          default: {
            name: 'Arbiscan',
            url: 'https://sepolia.arbiscan.io',
          },
        },
      },
    ],
  },
};

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isConnected ? <>{children}</> : <Navigate to="/" replace />;
}

// Public Route Component (redirect to dashboard if already connected)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isConnected, isLoading } = useWallet();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return isConnected ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <PrivyProvider
      appId={privyConfig.appId}
      config={privyConfig.config}
    >
      <ThemeProvider>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={
                  <PublicRoute>
                    <Landing />
                  </PublicRoute>
                } />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } />
                <Route path="/request" element={
                  <ProtectedRoute>
                    <NewRequest />
                  </ProtectedRoute>
                } />
                <Route path="/send" element={
                  <ProtectedRoute>
                    <SendMoney />
                  </ProtectedRoute>
                } />
                <Route path="/settings" element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                } />
                <Route path="/lifi-test" element={
                  <ProtectedRoute>
                    <LifiTest />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </ThemeProvider>
    </PrivyProvider>
  </QueryClientProvider>
);

export default App;
