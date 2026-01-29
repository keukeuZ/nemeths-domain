import { create } from 'zustand';
import type {
  Race,
  CaptainClass,
  CaptainSkill,
  Resources,
  GenerationStatus,
} from '@nemeths/shared';

// ==========================================
// TYPES
// ==========================================

export interface PlayerState {
  id: string;
  walletAddress: string;
  race: Race;
  captainName: string;
  captainClass: CaptainClass;
  captainSkill: CaptainSkill;
  captainAlive: boolean;
  isPremium: boolean;
  resources: Resources;
  totalTerritories: number;
  totalArmySize: number;
  score: number;
  eliminated: boolean;
}

export interface GenerationState {
  id: string;
  number: number;
  status: GenerationStatus;
  startTime: number;
  currentDay: number;
  prizePool: number;
  totalPlayers: number;
}

// ==========================================
// STORE
// ==========================================

interface GameState {
  // Generation info
  generation: GenerationState | null;

  // Current player
  player: PlayerState | null;
  isRegistered: boolean;

  // Loading states
  isLoadingGeneration: boolean;
  isLoadingPlayer: boolean;

  // Actions
  setGeneration: (generation: GenerationState | null) => void;
  setPlayer: (player: PlayerState | null) => void;
  updateResources: (resources: Partial<Resources>) => void;
  updateScore: (score: number) => void;
  setLoading: (key: 'generation' | 'player', loading: boolean) => void;
  reset: () => void;
}

const initialState = {
  generation: null,
  player: null,
  isRegistered: false,
  isLoadingGeneration: false,
  isLoadingPlayer: false,
};

export const useGameStore = create<GameState>()((set) => ({
  ...initialState,

  setGeneration: (generation) => {
    set({ generation, isLoadingGeneration: false });
  },

  setPlayer: (player) => {
    set({
      player,
      isRegistered: !!player,
      isLoadingPlayer: false,
    });
  },

  updateResources: (resources) => {
    set((state) => {
      if (!state.player) return state;
      return {
        player: {
          ...state.player,
          resources: { ...state.player.resources, ...resources },
        },
      };
    });
  },

  updateScore: (score) => {
    set((state) => {
      if (!state.player) return state;
      return {
        player: { ...state.player, score },
      };
    });
  },

  setLoading: (key, loading) => {
    if (key === 'generation') {
      set({ isLoadingGeneration: loading });
    } else {
      set({ isLoadingPlayer: loading });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
