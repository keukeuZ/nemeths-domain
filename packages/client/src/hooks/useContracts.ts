import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useChainId } from 'wagmi';
import { keccak256, toBytes } from 'viem';
import { getContractAddresses } from '../config/wagmi';
import {
  nemethsGenerationAbi,
  plotsAbi,
  combatSystemAbi,
  titansWitnessAbi,
  erc20Abi,
} from '../config/abis';

// ==========================================
// HOOKS FOR CONTRACT ADDRESSES
// ==========================================

export function useContractAddresses() {
  const chainId = useChainId();
  return getContractAddresses(chainId);
}

// ==========================================
// NEMETHS GENERATION HOOKS
// ==========================================

export function useGenerationPhase() {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.nemethsGeneration,
    abi: nemethsGenerationAbi,
    functionName: 'generationPhase',
  });
}

export function useCurrentGenerationId() {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.nemethsGeneration,
    abi: nemethsGenerationAbi,
    functionName: 'currentGenerationId',
  });
}

export function usePrizePool() {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.nemethsGeneration,
    abi: nemethsGenerationAbi,
    functionName: 'prizePool',
  });
}

export function useIsRegistered(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.nemethsGeneration,
    abi: nemethsGenerationAbi,
    functionName: 'isRegistered',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function usePlayerData(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.nemethsGeneration,
    abi: nemethsGenerationAbi,
    functionName: 'players',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useRegisterFree() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (race: number, captainClass: number, captainSkill: number, captainName: string) => {
    if (!addresses?.nemethsGeneration) return;
    writeContract({
      address: addresses.nemethsGeneration,
      abi: nemethsGenerationAbi,
      functionName: 'registerFree',
      args: [race, captainClass, captainSkill, captainName],
    });
  };

  return { register, hash, isPending, isConfirming, isSuccess, error };
}

export function useRegisterPremium() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const register = (race: number, captainClass: number, captainSkill: number, captainName: string) => {
    if (!addresses?.nemethsGeneration) return;
    writeContract({
      address: addresses.nemethsGeneration,
      abi: nemethsGenerationAbi,
      functionName: 'registerPremium',
      args: [race, captainClass, captainSkill, captainName],
    });
  };

  return { register, hash, isPending, isConfirming, isSuccess, error };
}

// ==========================================
// PLOTS HOOKS
// ==========================================

export function usePlayerPlots(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.plots,
    abi: plotsAbi,
    functionName: 'getPlayerPlots',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function usePlayerPlotCount(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.plots,
    abi: plotsAbi,
    functionName: 'getPlayerPlotCount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function usePlotData(tokenId: number | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.plots,
    abi: plotsAbi,
    functionName: 'getPlot',
    args: tokenId !== undefined ? [BigInt(tokenId)] : undefined,
    query: {
      enabled: tokenId !== undefined,
    },
  });
}

// ==========================================
// COMBAT HOOKS
// ==========================================

export function useCombatData(combatId: number | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.combatSystem,
    abi: combatSystemAbi,
    functionName: 'getCombat',
    args: combatId !== undefined ? [BigInt(combatId)] : undefined,
    query: {
      enabled: combatId !== undefined,
    },
  });
}

export function useActiveCombatForPlot(plotTokenId: number | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.combatSystem,
    abi: combatSystemAbi,
    functionName: 'getActiveCombatForPlot',
    args: plotTokenId !== undefined ? [BigInt(plotTokenId)] : undefined,
    query: {
      enabled: plotTokenId !== undefined,
    },
  });
}

export function usePlayerAttacks(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.combatSystem,
    abi: combatSystemAbi,
    functionName: 'getPlayerAttacks',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function usePlayerDefenses(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.combatSystem,
    abi: combatSystemAbi,
    functionName: 'getPlayerDefenses',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useInitiateCombat() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const initiate = (plotTokenId: number, attackerStrength: number, secret: bigint) => {
    if (!addresses?.combatSystem) return;

    // Hash the secret for commit
    const commitHash = keccak256(toBytes(secret));

    writeContract({
      address: addresses.combatSystem,
      abi: combatSystemAbi,
      functionName: 'initiateCombat',
      args: [BigInt(plotTokenId), BigInt(attackerStrength), commitHash],
    });
  };

  return { initiate, hash, isPending, isConfirming, isSuccess, error };
}

export function useDefenderCommit() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const commit = (combatId: number, defenderStrength: number, secret: bigint) => {
    if (!addresses?.combatSystem) return;

    const commitHash = keccak256(toBytes(secret));

    writeContract({
      address: addresses.combatSystem,
      abi: combatSystemAbi,
      functionName: 'defenderCommit',
      args: [BigInt(combatId), commitHash, BigInt(defenderStrength)],
    });
  };

  return { commit, hash, isPending, isConfirming, isSuccess, error };
}

export function useAttackerReveal() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const reveal = (combatId: number, secret: bigint) => {
    if (!addresses?.combatSystem) return;

    writeContract({
      address: addresses.combatSystem,
      abi: combatSystemAbi,
      functionName: 'attackerReveal',
      args: [BigInt(combatId), secret],
    });
  };

  return { reveal, hash, isPending, isConfirming, isSuccess, error };
}

export function useDefenderReveal() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const reveal = (combatId: number, secret: bigint) => {
    if (!addresses?.combatSystem) return;

    writeContract({
      address: addresses.combatSystem,
      abi: combatSystemAbi,
      functionName: 'defenderReveal',
      args: [BigInt(combatId), secret],
    });
  };

  return { reveal, hash, isPending, isConfirming, isSuccess, error };
}

// ==========================================
// TITANS WITNESS HOOKS
// ==========================================

export function useGenerationWinner(generationId: number | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.titansWitness,
    abi: titansWitnessAbi,
    functionName: 'getWinner',
    args: generationId !== undefined ? [BigInt(generationId)] : undefined,
    query: {
      enabled: generationId !== undefined,
    },
  });
}

export function usePlayerWitnessStats(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.titansWitness,
    abi: titansWitnessAbi,
    functionName: 'getPlayerStats',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useTopPlayers(limit: number = 10) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.titansWitness,
    abi: titansWitnessAbi,
    functionName: 'getTopPlayers',
    args: [BigInt(limit)],
  });
}

// ==========================================
// USDC HOOKS
// ==========================================

export function useUSDCBalance(address: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.usdc,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });
}

export function useUSDCAllowance(owner: `0x${string}` | undefined, spender: `0x${string}` | undefined) {
  const addresses = useContractAddresses();
  return useReadContract({
    address: addresses?.usdc,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner && spender ? [owner, spender] : undefined,
    query: {
      enabled: !!owner && !!spender,
    },
  });
}

export function useApproveUSDC() {
  const addresses = useContractAddresses();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (spender: `0x${string}`, amount: bigint) => {
    if (!addresses?.usdc) return;

    writeContract({
      address: addresses.usdc,
      abi: erc20Abi,
      functionName: 'approve',
      args: [spender, amount],
    });
  };

  return { approve, hash, isPending, isConfirming, isSuccess, error };
}
