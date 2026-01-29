import type { Zone, Terrain } from '@nemeths/shared';

// ==========================================
// MEDIEVAL COLOR SCHEMES
// ==========================================

// Zone colors (base tint) - more vibrant for better visibility
export const ZONE_COLORS: Record<Zone, number> = {
  outer: 0x3d5a2a,    // Forest green - wilderness
  middle: 0x5a4a32,   // Earth brown - settled
  inner: 0x7a5a2a,    // Bronze/gold - prosperous
  heart: 0x6a2a2a,    // Deep crimson - contested heart
};

// Terrain colors (overlay/modifier) - medieval palette
export const TERRAIN_COLORS: Record<Terrain, number> = {
  plains: 0x8a9a6a,     // Sage green (fields)
  forest: 0x2d4a2a,     // Dark forest green
  mountain: 0x6a6a6a,   // Stone gray
  river: 0x3a5a8a,      // Deep blue
  ruins: 0x5a4a3a,      // Ancient brown
  corruption: 0x3a2a4a, // Dark purple
};

// Player colors - medieval heraldic palette
export const PLAYER_COLORS = [
  0xd4af37, // Gold (self - always first)
  0xb22222, // Crimson red
  0x228b22, // Forest green
  0x4169e1, // Royal blue
  0xcd7f32, // Bronze
  0x6b238e, // Royal purple
  0x008b8b, // Dark cyan
  0xc71585, // Medium violet red
  0x556b2f, // Dark olive green
  0x8b4513, // Saddle brown
  0x2f4f4f, // Dark slate gray
  0xdaa520, // Goldenrod
  0x800000, // Maroon
  0x4b0082, // Indigo
  0x006400, // Dark green
  0x8b0000, // Dark red
] as const;

// Get player color by index (wraps around)
export function getPlayerColor(index: number): number {
  return PLAYER_COLORS[index % PLAYER_COLORS.length];
}

// Hash address to color index
export function addressToColorIndex(address: string): number {
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % PLAYER_COLORS.length;
}

// Forsaken (NPC) color
export const FORSAKEN_COLOR = 0x1a1a2e;

// Fog of war color - darker for medieval feel
export const FOG_COLOR = 0x0d0a07;
export const FOG_ALPHA = 0.85;

// Selection colors - gold theme
export const SELECTION_COLOR = 0xd4af37;  // Gold
export const HOVER_COLOR = 0xf5ce47;      // Bright gold
export const OWNED_BORDER_COLOR = 0xd4af37; // Gold border for owned
export const ALLY_BORDER_COLOR = 0x4a7b4a;  // Green for allies
export const ENEMY_BORDER_COLOR = 0x8b2222; // Red for enemies

// ==========================================
// COLOR UTILITIES
// ==========================================

// Blend two colors
export function blendColors(color1: number, color2: number, ratio: number): number {
  const r1 = (color1 >> 16) & 0xff;
  const g1 = (color1 >> 8) & 0xff;
  const b1 = color1 & 0xff;

  const r2 = (color2 >> 16) & 0xff;
  const g2 = (color2 >> 8) & 0xff;
  const b2 = color2 & 0xff;

  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);

  return (r << 16) | (g << 8) | b;
}

// Darken a color
export function darkenColor(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - amount * 255);
  const g = Math.max(0, ((color >> 8) & 0xff) - amount * 255);
  const b = Math.max(0, (color & 0xff) - amount * 255);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// Lighten a color
export function lightenColor(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + amount * 255);
  const g = Math.min(255, ((color >> 8) & 0xff) + amount * 255);
  const b = Math.min(255, (color & 0xff) + amount * 255);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
}

// ==========================================
// TILE COLOR CALCULATION
// ==========================================

export interface TileColorOptions {
  zone: Zone;
  terrain: Terrain;
  ownerId: string | null;
  ownerAddress: string | null;
  isForsaken: boolean;
  isVisible: boolean;
  isSelected: boolean;
  isHovered: boolean;
  hasArmy: boolean;
  currentPlayerAddress?: string | null; // For distinguishing own territories
}

export interface TileColorResult {
  color: number;
  alpha: number;
  borderColor: number | null;
  borderWidth: number;
  isOwned: boolean;
  glowColor: number | null;
}

export function getTileColor(options: TileColorOptions): { color: number; alpha: number } {
  const result = getTileColorEnhanced(options);
  return { color: result.color, alpha: result.alpha };
}

export function getTileColorEnhanced(options: TileColorOptions): TileColorResult {
  const {
    zone,
    terrain,
    ownerId,
    ownerAddress,
    isForsaken,
    isVisible,
    isSelected,
    isHovered,
    hasArmy,
    currentPlayerAddress,
  } = options;

  // Check if this is the current player's territory
  const isOwned = !!(currentPlayerAddress && ownerAddress &&
    ownerAddress.toLowerCase() === currentPlayerAddress.toLowerCase());

  // Fog of war
  if (!isVisible) {
    return {
      color: FOG_COLOR,
      alpha: FOG_ALPHA,
      borderColor: null,
      borderWidth: 0,
      isOwned: false,
      glowColor: null,
    };
  }

  // Base color from zone and terrain - more terrain influence for better visibility
  let baseColor = blendColors(ZONE_COLORS[zone], TERRAIN_COLORS[terrain], 0.6);

  // Border settings
  let borderColor: number | null = null;
  let borderWidth = 0;
  let glowColor: number | null = null;

  // Owner color - stronger tinting for owned territories
  if (isForsaken) {
    baseColor = blendColors(baseColor, FORSAKEN_COLOR, 0.5);
  } else if (ownerAddress) {
    if (isOwned) {
      // Current player's territory - gold tint with glow
      baseColor = blendColors(baseColor, 0xd4af37, 0.35);
      borderColor = OWNED_BORDER_COLOR;
      borderWidth = 2;
      glowColor = 0xd4af37;
    } else {
      // Other player's territory - use their color
      const playerColor = getPlayerColor(addressToColorIndex(ownerAddress));
      baseColor = blendColors(baseColor, playerColor, 0.45);
      borderColor = playerColor;
      borderWidth = 1;
    }
  }

  // Has army indicator (slightly brighter)
  if (hasArmy && ownerId) {
    baseColor = lightenColor(baseColor, 0.08);
  }

  // Selection/hover highlight
  if (isSelected) {
    baseColor = lightenColor(baseColor, 0.25);
    borderColor = SELECTION_COLOR;
    borderWidth = 3;
  } else if (isHovered) {
    baseColor = lightenColor(baseColor, 0.12);
    if (!borderColor) {
      borderColor = HOVER_COLOR;
      borderWidth = 1;
    }
  }

  return {
    color: baseColor,
    alpha: 1,
    borderColor,
    borderWidth,
    isOwned,
    glowColor,
  };
}
