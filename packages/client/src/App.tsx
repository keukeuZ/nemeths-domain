import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './config/wagmi';
import { GameLayout } from './components/layout';
import { RegistrationScreen } from './components/screens';
import { useAuthStore, useGameStore } from './stores';
import { useAccount, useSignMessage } from 'wagmi';
import { useEffect, useState, useCallback } from 'react';

// Create a client for React Query
const queryClient = new QueryClient();

// App content with wallet state sync
function AppContent() {
  const { address, chainId, isConnected } = useAccount();
  const { setWalletConnection, isAuthenticated, token, setToken } = useAuthStore();
  const { player, setPlayer, isLoadingPlayer, setLoading } = useGameStore();
  const [hasCheckedPlayer, setHasCheckedPlayer] = useState(false);

  // Sync wallet state to store
  useEffect(() => {
    setWalletConnection(address ?? null, chainId ?? null);
  }, [address, chainId, setWalletConnection]);

  // Fetch player info after authentication
  useEffect(() => {
    if (!token || hasCheckedPlayer) return;

    const fetchPlayer = async () => {
      setLoading('player', true);
      try {
        const res = await fetch('http://localhost:3000/api/player/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.data?.registered && data.data?.player) {
            // Map server response to client PlayerState format
            const serverPlayer = data.data.player;
            const territories = data.data.territories || [];
            setPlayer({
              id: serverPlayer.id,
              walletAddress: serverPlayer.walletAddress,
              race: serverPlayer.race,
              captainName: serverPlayer.captainName,
              captainClass: serverPlayer.captainClass,
              captainSkill: serverPlayer.captainSkill,
              captainAlive: serverPlayer.captainAlive,
              isPremium: serverPlayer.isPremium,
              resources: serverPlayer.resources,
              totalTerritories: territories.length,
              totalArmySize: 0, // Will be updated from army endpoint
              score: 0, // Will be calculated
              eliminated: !serverPlayer.captainAlive,
            });
          }
        }
      } catch (err) {
        console.error('Failed to fetch player:', err);
      } finally {
        setLoading('player', false);
        setHasCheckedPlayer(true);
      }
    };

    fetchPlayer();
  }, [token, hasCheckedPlayer, setPlayer, setLoading]);

  // Show connect screen if not connected
  if (!isConnected) {
    return <ConnectScreen />;
  }

  // Show auth screen if connected but not authenticated
  if (!isAuthenticated || !token) {
    return <AuthScreen address={address!} />;
  }

  // Show loading while checking player status
  if (!hasCheckedPlayer || isLoadingPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your domain...</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Nemeths Domain
        </h1>
        <p className="text-gray-400 mb-8">A Blockchain RTS Game on Base L2</p>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-gray-700/50">
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

// Authentication screen - sign message to verify wallet ownership
function AuthScreen({ address }: { address: `0x${string}` }) {
  const { setToken } = useAuthStore();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authenticate = useCallback(async () => {
    setIsAuthenticating(true);
    setError(null);

    try {
      // Step 1: Get nonce from server
      const nonceRes = await fetch('http://localhost:3000/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });

      if (!nonceRes.ok) {
        throw new Error('Failed to get nonce');
      }

      const nonceData = await nonceRes.json();
      const { nonce, message } = nonceData.data;

      // Step 2: Sign the message with wallet
      const signature = await signMessageAsync({ message });

      // Step 3: Verify signature and get token
      const verifyRes = await fetch('http://localhost:3000/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          signature,
          nonce,
        }),
      });

      if (!verifyRes.ok) {
        throw new Error('Failed to verify signature');
      }

      const verifyData = await verifyRes.json();
      setToken(verifyData.data.token);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  }, [address, signMessageAsync, setToken]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-4">
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          Nemeths Domain
        </h1>
        <p className="text-gray-400 mb-8">Verify your wallet to continue</p>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 space-y-4 border border-gray-700/50">
          <p className="text-gray-300 text-sm">
            Sign a message to prove you own this wallet:
          </p>
          <p className="text-amber-400 font-mono text-sm break-all">
            {address}
          </p>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            onClick={authenticate}
            disabled={isAuthenticating}
            className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-bold transition-all"
          >
            {isAuthenticating ? 'Signing...' : '✍️ Sign to Authenticate'}
          </button>
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
