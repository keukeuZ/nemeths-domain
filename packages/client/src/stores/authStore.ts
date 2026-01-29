import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  // Wallet connection
  isConnected: boolean;
  address: `0x${string}` | null;
  chainId: number | null;

  // Server authentication
  token: string | null;
  isAuthenticated: boolean;

  // Actions
  setWalletConnection: (address: `0x${string}` | null, chainId: number | null) => void;
  setToken: (token: string | null) => void;
  disconnect: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isConnected: false,
      address: null,
      chainId: null,
      token: null,
      isAuthenticated: false,

      setWalletConnection: (address, chainId) => {
        set({
          isConnected: !!address,
          address,
          chainId,
        });
      },

      setToken: (token) => {
        set({
          token,
          isAuthenticated: !!token,
        });
      },

      disconnect: () => {
        set({
          isConnected: false,
          address: null,
          chainId: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'nemeths-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);
