import { create } from 'zustand';

// ==========================================
// TYPES
// ==========================================

export type CombatPhase =
  | 'pending'
  | 'commit'
  | 'reveal'
  | 'awaiting_vrf'
  | 'resolved'
  | 'expired';

export type CombatResult =
  | 'none'
  | 'attacker_wins'
  | 'defender_wins'
  | 'draw'
  | 'attacker_forfeit'
  | 'defender_forfeit';

export interface Combat {
  id: number;
  attacker: string;
  defender: string;
  plotTokenId: number;
  plotX: number;
  plotY: number;
  attackerStrength: number;
  defenderStrength: number;
  phase: CombatPhase;
  commitDeadline: number;
  revealDeadline: number;
  result: CombatResult;
  attackerRoll?: number;
  defenderRoll?: number;
  resolvedAt?: number;
  // Local state
  isAttacker: boolean;
  hasCommitted: boolean;
  hasRevealed: boolean;
  localSecret?: bigint;
}

export interface CombatAnimation {
  combatId: number;
  attackerRoll: number;
  defenderRoll: number;
  attackerModifier: number;
  defenderModifier: number;
  result: CombatResult;
  showRolls: boolean;
  showResult: boolean;
}

// ==========================================
// STORE
// ==========================================

interface CombatState {
  // Active combats the player is involved in
  activeCombats: Combat[];

  // Combat history
  combatHistory: Combat[];

  // Current combat being viewed/animated
  currentCombat: Combat | null;
  animation: CombatAnimation | null;

  // Pending attack (before commit)
  pendingAttack: {
    targetX: number;
    targetY: number;
    targetTokenId: number;
    strength: number;
  } | null;

  // Loading states
  isLoadingCombats: boolean;
  isInitiatingCombat: boolean;
  isCommitting: boolean;
  isRevealing: boolean;

  // Actions
  setActiveCombats: (combats: Combat[]) => void;
  addCombat: (combat: Combat) => void;
  updateCombat: (id: number, data: Partial<Combat>) => void;
  removeCombat: (id: number) => void;
  setCombatHistory: (history: Combat[]) => void;
  setCurrentCombat: (combat: Combat | null) => void;
  setPendingAttack: (attack: CombatState['pendingAttack']) => void;
  setAnimation: (animation: CombatAnimation | null) => void;
  setLoading: (key: 'combats' | 'initiating' | 'committing' | 'revealing', loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  activeCombats: [],
  combatHistory: [],
  currentCombat: null,
  animation: null,
  pendingAttack: null,
  isLoadingCombats: false,
  isInitiatingCombat: false,
  isCommitting: false,
  isRevealing: false,
};

export const useCombatStore = create<CombatState>()((set) => ({
  ...initialState,

  setActiveCombats: (combats) => {
    set({ activeCombats: combats, isLoadingCombats: false });
  },

  addCombat: (combat) => {
    set((state) => ({
      activeCombats: [...state.activeCombats, combat],
    }));
  },

  updateCombat: (id, data) => {
    set((state) => ({
      activeCombats: state.activeCombats.map((c) =>
        c.id === id ? { ...c, ...data } : c
      ),
      currentCombat:
        state.currentCombat?.id === id
          ? { ...state.currentCombat, ...data }
          : state.currentCombat,
    }));
  },

  removeCombat: (id) => {
    set((state) => ({
      activeCombats: state.activeCombats.filter((c) => c.id !== id),
      combatHistory: [
        ...state.combatHistory,
        ...state.activeCombats.filter((c) => c.id === id),
      ],
    }));
  },

  setCombatHistory: (history) => {
    set({ combatHistory: history });
  },

  setCurrentCombat: (combat) => {
    set({ currentCombat: combat });
  },

  setPendingAttack: (attack) => {
    set({ pendingAttack: attack });
  },

  setAnimation: (animation) => {
    set({ animation });
  },

  setLoading: (key, loading) => {
    switch (key) {
      case 'combats':
        set({ isLoadingCombats: loading });
        break;
      case 'initiating':
        set({ isInitiatingCombat: loading });
        break;
      case 'committing':
        set({ isCommitting: loading });
        break;
      case 'revealing':
        set({ isRevealing: loading });
        break;
    }
  },

  reset: () => {
    set(initialState);
  },
}));

// ==========================================
// HELPERS
// ==========================================

// Generate a random secret for commit-reveal
export function generateSecret(): bigint {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return BigInt('0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join(''));
}

// Hash a secret for commit
export async function hashSecret(secret: bigint): Promise<`0x${string}`> {
  const encoder = new TextEncoder();
  const data = encoder.encode(secret.toString());
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return ('0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
}

// Get D20 modifier percentage
export function getD20Modifier(roll: number): number {
  if (roll === 1) return 50; // Critical fail
  if (roll <= 4) return 70;
  if (roll <= 8) return 85;
  if (roll <= 12) return 100; // Median
  if (roll <= 16) return 110;
  if (roll <= 19) return 125;
  return 150; // Critical success (20)
}

// Get roll description
export function getRollDescription(roll: number): string {
  if (roll === 1) return 'Critical Fail!';
  if (roll === 20) return 'Critical Success!';
  if (roll <= 4) return 'Poor';
  if (roll <= 8) return 'Below Average';
  if (roll <= 12) return 'Average';
  if (roll <= 16) return 'Good';
  return 'Excellent';
}
