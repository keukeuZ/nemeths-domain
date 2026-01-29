import { useCallback, useRef, useState } from 'react';
import { Stage, Container, Graphics } from '@pixi/react';
import { useMapStore, useAuthStore, tileKey, MAP_SIZE, TILE_SIZE } from '../../stores';
import { getTileColorEnhanced, SELECTION_COLOR, HOVER_COLOR, OWNED_BORDER_COLOR } from './mapColors';
import type { Zone, Terrain } from '@nemeths/shared';

// ==========================================
// TYPES
// ==========================================

interface GameMapProps {
  width: number;
  height: number;
  onTileClick?: (x: number, y: number) => void;
  onTileRightClick?: (x: number, y: number) => void;
}

// ==========================================
// GRID RENDERER (optimized batch)
// ==========================================

interface GridProps {
  visibleMinX: number;
  visibleMaxX: number;
  visibleMinY: number;
  visibleMaxY: number;
  tileSize: number;
  selectedTile: { x: number; y: number } | null;
  hoveredTile: { x: number; y: number } | null;
  currentPlayerAddress: string | null;
}

function Grid({
  visibleMinX,
  visibleMaxX,
  visibleMinY,
  visibleMaxY,
  tileSize,
  selectedTile,
  hoveredTile,
  currentPlayerAddress,
}: GridProps) {
  const tiles = useMapStore((state) => state.tiles);
  const visibleTiles = useMapStore((state) => state.visibleTiles);

  const draw = useCallback(
    (g: any) => {
      g.clear();

      // First pass: draw all tile fills
      for (let y = visibleMinY; y <= visibleMaxY; y++) {
        for (let x = visibleMinX; x <= visibleMaxX; x++) {
          if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;

          const key = tileKey(x, y);
          const tile = tiles.get(key);
          const isVisible = visibleTiles.has(key) || visibleTiles.size === 0; // Show all if visibility not set
          const isSelected = selectedTile?.x === x && selectedTile?.y === y;
          const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

          // Default values for unminted tiles
          const zone: Zone = tile?.zone ?? 'outer';
          const terrain: Terrain = tile?.terrain ?? 'plains';
          const ownerId = tile?.ownerId ?? null;
          const ownerAddress = tile?.ownerAddress ?? null;
          const isForsaken = tile?.isForsaken ?? false;
          const hasArmy = tile?.hasArmy ?? false;

          const result = getTileColorEnhanced({
            zone,
            terrain,
            ownerId,
            ownerAddress,
            isForsaken,
            isVisible: isVisible || !tile, // Show unminted tiles
            isSelected,
            isHovered,
            hasArmy,
            currentPlayerAddress,
          });

          // Main tile fill
          g.beginFill(result.color, result.alpha);
          g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
          g.endFill();
        }
      }

      // Second pass: draw borders (so they're on top)
      for (let y = visibleMinY; y <= visibleMaxY; y++) {
        for (let x = visibleMinX; x <= visibleMaxX; x++) {
          if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;

          const key = tileKey(x, y);
          const tile = tiles.get(key);
          const isVisible = visibleTiles.has(key) || visibleTiles.size === 0;
          const isSelected = selectedTile?.x === x && selectedTile?.y === y;
          const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

          const zone: Zone = tile?.zone ?? 'outer';
          const terrain: Terrain = tile?.terrain ?? 'plains';
          const ownerId = tile?.ownerId ?? null;
          const ownerAddress = tile?.ownerAddress ?? null;
          const isForsaken = tile?.isForsaken ?? false;
          const hasArmy = tile?.hasArmy ?? false;

          const result = getTileColorEnhanced({
            zone,
            terrain,
            ownerId,
            ownerAddress,
            isForsaken,
            isVisible: isVisible || !tile,
            isSelected,
            isHovered,
            hasArmy,
            currentPlayerAddress,
          });

          // Draw border if needed
          if (result.borderColor !== null && result.borderWidth > 0) {
            g.lineStyle(result.borderWidth, result.borderColor, 1);
            g.drawRect(
              x * tileSize + result.borderWidth / 2,
              y * tileSize + result.borderWidth / 2,
              tileSize - 1 - result.borderWidth,
              tileSize - 1 - result.borderWidth
            );
            g.lineStyle(0);
          }

          // Draw glow effect for owned territories (outer glow)
          if (result.isOwned && result.glowColor !== null && !isSelected) {
            g.lineStyle(1, result.glowColor, 0.3);
            g.drawRect(
              x * tileSize - 1,
              y * tileSize - 1,
              tileSize + 1,
              tileSize + 1
            );
            g.lineStyle(0);
          }

          // Army indicator (shield icon)
          if (hasArmy && (isVisible || !tile)) {
            // Small shield shape for army
            const cx = x * tileSize + tileSize / 2;
            const cy = y * tileSize + tileSize / 2;
            const size = tileSize / 5;

            g.beginFill(0xffffff, 0.9);
            g.drawRect(cx - size, cy - size, size * 2, size * 2);
            g.endFill();

            // Dark outline
            g.lineStyle(1, 0x000000, 0.5);
            g.drawRect(cx - size, cy - size, size * 2, size * 2);
            g.lineStyle(0);
          }

          // Forsaken indicator (skull-like red dot)
          if (isForsaken && (isVisible || !tile)) {
            const cx = x * tileSize + tileSize / 2;
            const cy = y * tileSize + tileSize / 3;

            g.beginFill(0x8b0000, 0.8);
            g.drawCircle(cx, cy, tileSize / 6);
            g.endFill();

            // Skull eyes effect
            g.beginFill(0xff0000, 0.6);
            g.drawCircle(cx - tileSize / 12, cy, tileSize / 12);
            g.drawCircle(cx + tileSize / 12, cy, tileSize / 12);
            g.endFill();
          }

          // Flag icon for owned territories (small banner at top)
          if (result.isOwned && tileSize >= 24) {
            const flagX = x * tileSize + tileSize - 6;
            const flagY = y * tileSize + 2;

            // Flag pole
            g.lineStyle(1, 0x8b4513, 1);
            g.moveTo(flagX, flagY);
            g.lineTo(flagX, flagY + 10);
            g.lineStyle(0);

            // Flag
            g.beginFill(OWNED_BORDER_COLOR, 0.9);
            g.moveTo(flagX, flagY);
            g.lineTo(flagX - 5, flagY + 3);
            g.lineTo(flagX, flagY + 6);
            g.closePath();
            g.endFill();
          }
        }
      }
    },
    [visibleMinX, visibleMaxX, visibleMinY, visibleMaxY, tileSize, tiles, visibleTiles, selectedTile, hoveredTile, currentPlayerAddress]
  );

  return <Graphics draw={draw} />;
}

// ==========================================
// ZONE OVERLAY
// ==========================================

function ZoneOverlay({ tileSize }: { tileSize: number }) {
  const draw = useCallback(
    (g: any) => {
      g.clear();

      const center = 50;

      // Heart zone (radius 5) - darker red glow
      g.lineStyle(2, 0x8b2222, 0.5);
      g.drawRect(
        (center - 5) * tileSize,
        (center - 5) * tileSize,
        11 * tileSize,
        11 * tileSize
      );

      // Inner zone (radius 15) - bronze
      g.lineStyle(2, 0xcd7f32, 0.4);
      g.drawRect(
        (center - 15) * tileSize,
        (center - 15) * tileSize,
        31 * tileSize,
        31 * tileSize
      );

      // Middle zone (radius 30) - earth brown
      g.lineStyle(2, 0x8b7355, 0.3);
      g.drawRect(
        (center - 30) * tileSize,
        (center - 30) * tileSize,
        61 * tileSize,
        61 * tileSize
      );
    },
    [tileSize]
  );

  return <Graphics draw={draw} />;
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export function GameMap({ width, height, onTileClick, onTileRightClick }: GameMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const viewport = useMapStore((state) => state.viewport);
  const selectedTile = useMapStore((state) => state.selectedTile);
  const hoveredTile = useMapStore((state) => state.hoveredTile);
  const { pan, zoom, selectTile, setHoveredTile } = useMapStore();

  // Get current player's address for ownership highlighting
  const currentPlayerAddress = useAuthStore((state) => state.address);

  // Calculate effective tile size based on zoom
  const tileSize = TILE_SIZE * viewport.zoom;

  // Calculate visible tile range
  const visibleTilesX = Math.ceil(width / tileSize) + 2;
  const visibleTilesY = Math.ceil(height / tileSize) + 2;

  const visibleMinX = Math.floor(viewport.x - visibleTilesX / 2);
  const visibleMaxX = Math.ceil(viewport.x + visibleTilesX / 2);
  const visibleMinY = Math.floor(viewport.y - visibleTilesY / 2);
  const visibleMaxY = Math.ceil(viewport.y + visibleTilesY / 2);

  // Calculate container offset to center viewport
  const offsetX = width / 2 - viewport.x * tileSize;
  const offsetY = height / 2 - viewport.y * tileSize;

  // Convert screen coords to tile coords
  const screenToTile = useCallback(
    (screenX: number, screenY: number) => {
      const tileX = Math.floor((screenX - offsetX) / tileSize);
      const tileY = Math.floor((screenY - offsetY) / tileSize);
      return { x: tileX, y: tileY };
    },
    [offsetX, offsetY, tileSize]
  );

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        // Left click
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
      }
    },
    []
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const tile = screenToTile(screenX, screenY);

      // Update hovered tile
      if (tile.x >= 0 && tile.x < MAP_SIZE && tile.y >= 0 && tile.y < MAP_SIZE) {
        setHoveredTile(tile);
      } else {
        setHoveredTile(null);
      }

      // Handle dragging
      if (isDragging) {
        const dx = (dragStart.x - e.clientX) / tileSize;
        const dy = (dragStart.y - e.clientY) / tileSize;

        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          pan(dx, dy);
          setDragStart({ x: e.clientX, y: e.clientY });
        }
      }
    },
    [isDragging, dragStart, tileSize, pan, screenToTile, setHoveredTile]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0 && !isDragging) {
        // Click without drag - select tile
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const screenX = e.clientX - rect.left;
        const screenY = e.clientY - rect.top;
        const tile = screenToTile(screenX, screenY);

        if (tile.x >= 0 && tile.x < MAP_SIZE && tile.y >= 0 && tile.y < MAP_SIZE) {
          selectTile(tile.x, tile.y);
          onTileClick?.(tile.x, tile.y);
        }
      }
      setIsDragging(false);
    },
    [isDragging, screenToTile, selectTile, onTileClick]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const tile = screenToTile(screenX, screenY);

      if (tile.x >= 0 && tile.x < MAP_SIZE && tile.y >= 0 && tile.y < MAP_SIZE) {
        onTileRightClick?.(tile.x, tile.y);
      }
    },
    [screenToTile, onTileRightClick]
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      zoom(delta);
    },
    [zoom]
  );

  // Mouse leave handler
  const handleMouseLeave = useCallback(() => {
    setHoveredTile(null);
    setIsDragging(false);
  }, [setHoveredTile]);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      style={{
        width,
        height,
        backgroundColor: '#0d0a07', // Medieval dark background
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      onWheel={handleWheel}
    >
      <Stage
        width={width}
        height={height}
        options={{
          backgroundColor: 0x0d0a07, // Medieval dark
          antialias: false,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true,
        }}
      >
        <Container x={offsetX} y={offsetY}>
          <Grid
            visibleMinX={visibleMinX}
            visibleMaxX={visibleMaxX}
            visibleMinY={visibleMinY}
            visibleMaxY={visibleMaxY}
            tileSize={tileSize}
            selectedTile={selectedTile}
            hoveredTile={hoveredTile}
            currentPlayerAddress={currentPlayerAddress}
          />
          <ZoneOverlay tileSize={tileSize} />
        </Container>
      </Stage>

      {/* Coordinates overlay - medieval styled */}
      {hoveredTile && (
        <div className="absolute bottom-2 left-2 bg-medieval-800/90 border border-gold-500/30 text-parchment-100 text-xs px-3 py-1.5 rounded font-medieval">
          <span className="text-gold-400">Coordinates:</span> ({hoveredTile.x}, {hoveredTile.y})
        </div>
      )}
    </div>
  );
}
