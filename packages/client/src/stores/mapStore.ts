import { create } from 'zustand';
import type { Zone, Terrain } from '@nemeths/shared';

// ==========================================
// TYPES
// ==========================================

export interface TileData {
  x: number;
  y: number;
  zone: Zone;
  terrain: Terrain;
  ownerId: string | null;
  ownerAddress: string | null;
  isForsaken: boolean;
  forsakenStrength: number;
  tokenId: number | null;
  isVisible: boolean; // Fog of war
  buildingCount: number;
  hasArmy: boolean;
}

export interface MapViewport {
  x: number; // Center X in world coords
  y: number; // Center Y in world coords
  zoom: number; // 0.5 to 3.0
}

// ==========================================
// CONSTANTS
// ==========================================

export const MAP_SIZE = 100;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3.0;
export const DEFAULT_ZOOM = 1.0;
export const TILE_SIZE = 32; // Pixels per tile at zoom 1.0

// ==========================================
// STORE
// ==========================================

interface MapState {
  // Map data (100x100 = 10,000 tiles)
  tiles: Map<string, TileData>;

  // Viewport
  viewport: MapViewport;

  // Selection
  selectedTile: { x: number; y: number } | null;
  hoveredTile: { x: number; y: number } | null;

  // Visibility (owned + scout range)
  visibleTiles: Set<string>;

  // Loading
  isLoading: boolean;

  // Actions
  setTiles: (tiles: TileData[]) => void;
  updateTile: (x: number, y: number, data: Partial<TileData>) => void;
  setViewport: (viewport: Partial<MapViewport>) => void;
  pan: (dx: number, dy: number) => void;
  zoom: (delta: number, centerX?: number, centerY?: number) => void;
  centerOn: (x: number, y: number) => void;
  selectTile: (x: number, y: number) => void;
  clearSelection: () => void;
  setHoveredTile: (tile: { x: number; y: number } | null) => void;
  setVisibleTiles: (tiles: Set<string>) => void;
  getTile: (x: number, y: number) => TileData | undefined;
  reset: () => void;
}

// Helper to create tile key
export const tileKey = (x: number, y: number): string => `${x},${y}`;

const initialState = {
  tiles: new Map<string, TileData>(),
  viewport: { x: 50, y: 50, zoom: DEFAULT_ZOOM },
  selectedTile: null,
  hoveredTile: null,
  visibleTiles: new Set<string>(),
  isLoading: false,
};

export const useMapStore = create<MapState>()((set, get) => ({
  ...initialState,

  setTiles: (tiles) => {
    const tileMap = new Map<string, TileData>();
    for (const tile of tiles) {
      tileMap.set(tileKey(tile.x, tile.y), tile);
    }
    set({ tiles: tileMap, isLoading: false });
  },

  updateTile: (x, y, data) => {
    set((state) => {
      const key = tileKey(x, y);
      const existing = state.tiles.get(key);
      if (!existing) return state;

      const newTiles = new Map(state.tiles);
      newTiles.set(key, { ...existing, ...data });
      return { tiles: newTiles };
    });
  },

  setViewport: (viewport) => {
    set((state) => ({
      viewport: { ...state.viewport, ...viewport },
    }));
  },

  pan: (dx, dy) => {
    set((state) => {
      const newX = Math.max(0, Math.min(MAP_SIZE - 1, state.viewport.x + dx));
      const newY = Math.max(0, Math.min(MAP_SIZE - 1, state.viewport.y + dy));
      return {
        viewport: { ...state.viewport, x: newX, y: newY },
      };
    });
  },

  zoom: (delta, _centerX, _centerY) => {
    set((state) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.viewport.zoom + delta));
      return {
        viewport: { ...state.viewport, zoom: newZoom },
      };
    });
  },

  centerOn: (x, y) => {
    set((state) => ({
      viewport: { ...state.viewport, x, y },
    }));
  },

  selectTile: (x, y) => {
    if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) return;
    set({ selectedTile: { x, y } });
  },

  clearSelection: () => {
    set({ selectedTile: null });
  },

  setHoveredTile: (tile) => {
    set({ hoveredTile: tile });
  },

  setVisibleTiles: (tiles) => {
    set({ visibleTiles: tiles });
  },

  getTile: (x, y) => {
    return get().tiles.get(tileKey(x, y));
  },

  reset: () => {
    set(initialState);
  },
}));

// ==========================================
// SELECTORS
// ==========================================

// Get tiles owned by a specific player
export const selectPlayerTiles = (state: MapState, playerId: string): TileData[] => {
  const tiles: TileData[] = [];
  state.tiles.forEach((tile) => {
    if (tile.ownerId === playerId) {
      tiles.push(tile);
    }
  });
  return tiles;
};

// Get tiles in a specific zone
export const selectTilesByZone = (state: MapState, zone: Zone): TileData[] => {
  const tiles: TileData[] = [];
  state.tiles.forEach((tile) => {
    if (tile.zone === zone) {
      tiles.push(tile);
    }
  });
  return tiles;
};

// Get forsaken tiles
export const selectForsakenTiles = (state: MapState): TileData[] => {
  const tiles: TileData[] = [];
  state.tiles.forEach((tile) => {
    if (tile.isForsaken) {
      tiles.push(tile);
    }
  });
  return tiles;
};
