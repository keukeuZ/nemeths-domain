import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { GameLayout } from './components/layout';
import { RegistrationScreen } from './components/screens';
import { useAuthStore, useGameStore } from './stores';
import { useAccount } from 'wagmi';
import { useEffect } from 'react';

// Create a client for React Query
const queryClient = new QueryClient();

// App content with wallet state sync
function AppContent() {
  const { address, chainId, isConnected } = useAccount();
  const { setWalletConnection } = useAuthStore();
  const { player } = useGameStore();

  // Sync wallet state to store
  useEffect(() => {
    setWalletConnection(address ?? null, chainId ?? null);
  }, [address, chainId, setWalletConnection]);

  // Show connect screen if not connected
  if (!isConnected) {
    return <ConnectScreen />;
  }

  // Show registration screen if not registered
  if (!player) {
    return <RegistrationScreen />;
  }

  // Main game
  return <GameLayout />;
}

// Connect wallet screen
function ConnectScreen() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-bold mb-4">Nemeths Domain</h1>
        <p className="text-gray-400 mb-8">A Blockchain RTS Game on Base L2</p>

        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <p className="text-gray-300">Connect your wallet to begin</p>

          {/* Wallet connect buttons - using wagmi connectors */}
          <w3m-button />
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>50-day generations • 10,000 territory grid • On-chain combat</p>
        </div>
      </div>
    </div>
  );
}


// Main App with providers
function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
