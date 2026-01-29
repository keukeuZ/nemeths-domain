import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// WalletConnect project ID - replace with your own in production
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo';

export const config = createConfig({
  chains: [base, baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});

// Contract addresses by chain
export const CONTRACT_ADDRESSES = {
  [base.id]: {
    nemethsGeneration: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    plots: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    combatSystem: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    titansWitness: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`,
  },
  [baseSepolia.id]: {
    nemethsGeneration: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    plots: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    combatSystem: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    titansWitness: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as `0x${string}`,
  },
} as const;

// Get addresses for current chain
export function getContractAddresses(chainId: number) {
  return CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
}

// Default to Base Sepolia for development
export const DEFAULT_CHAIN = baseSepolia;
