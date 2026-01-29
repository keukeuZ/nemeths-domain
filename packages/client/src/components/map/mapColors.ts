import type { Zone, Terrain } from '@nemeths/shared';

// ==========================================
// COLOR SCHEMES
// ==========================================

// Zone colors (base tint)
export const ZONE_COLORS: Record<Zone, number> = {
  outer: 0x2d5016,    // Dark green - wilderness
  middle: 0x4a7023,   // Medium green - settled
  inner: 0x8b6914,    // Gold - prosperous
  heart: 0xc41e3a,    // Red - contested heart
};

// Terrain colors (overlay/modifier)
export const TERRAIN_COLORS: Record<Terrain, number> = {
  plains: 0x90ee90,     // Light green
  forest: 0x228b22,     // Forest green
  mountain: 0x808080,   // Gray
  river: 0x4169e1,      // Royal blue
  ruins: 0x8b4513,      // Saddle brown
  corruption: 0x4b0082, // Indigo
};

// Player colors (for territory ownership)
// These are generated from a palette that ensures good contrast
export const PLAYER_COLORS = [
  0xe6194b, // Red
  0x3cb44b, // Green
  0xffe119, // Yellow
  0x4363d8, // Blue
  0xf58231, // Orange
  0x911eb4, // Purple
  0x46f0f0, // Cyan
  0xf032e6, // Magenta
  0xbcf60c, // Lime
  0xfabebe, // Pink
  0x008080, // Teal
  0xe6beff, // Lavender
  0x9a6324, // Brown
  0xfffac8, // Beige
  0x800000, // Maroon
  0xaaffc3, // Mint
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

// Fog of war color
export const FOG_COLOR = 0x111111;
export const FOG_ALPHA = 0.7;

// Selection colors
export const SELECTION_COLOR = 0xffffff;
export const HOVER_COLOR = 0xffff00;

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
}

export function getTileColor(options: TileColorOptions): { color: number; alpha: number } {
  const { zone, terrain, ownerId, ownerAddress, isForsaken, isVisible, isSelected, isHovered, hasArmy } = options;

  // Fog of war
  if (!isVisible) {
    return { color: FOG_COLOR, alpha: 1 };
  }

  // Base color from zone and terrain
  let baseColor = blendColors(ZONE_COLORS[zone], TERRAIN_COLORS[terrain], 0.5);

  // Owner color
  if (isForsaken) {
    baseColor = blendColors(baseColor, FORSAKEN_COLOR, 0.6);
  } else if (ownerAddress) {
    const playerColor = getPlayerColor(addressToColorIndex(ownerAddress));
    baseColor = blendColors(baseColor, playerColor, 0.4);
  }

  // Has army indicator (slightly brighter)
  if (hasArmy && ownerId) {
    baseColor = lightenColor(baseColor, 0.1);
  }

  // Selection/hover highlight
  if (isSelected) {
    baseColor = lightenColor(baseColor, 0.3);
  } else if (isHovered) {
    baseColor = lightenColor(baseColor, 0.15);
  }

  return { color: baseColor, alpha: 1 };
}
