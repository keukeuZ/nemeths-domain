import { useCallback, useEffect, useRef, useState } from 'react';
import { Stage, Container, Graphics } from '@pixi/react';
import { useMapStore, useAuthStore, tileKey, MAP_SIZE, TILE_SIZE } from '../../stores';
import { getTileColor, SELECTION_COLOR, HOVER_COLOR } from './mapColors';
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
// TILE RENDERER
// ==========================================

interface TileProps {
  x: number;
  y: number;
  zone: Zone;
  terrain: Terrain;
  ownerId: string | null;
  ownerAddress: string | null;
  isForsaken: boolean;
  isVisible: boolean;
  hasArmy: boolean;
  isSelected: boolean;
  isHovered: boolean;
  tileSize: number;
}

function Tile({
  x,
  y,
  zone,
  terrain,
  ownerId,
  ownerAddress,
  isForsaken,
  isVisible,
  hasArmy,
  isSelected,
  isHovered,
  tileSize,
}: TileProps) {
  const { color, alpha } = getTileColor({
    zone,
    terrain,
    ownerId,
    ownerAddress,
    isForsaken,
    isVisible,
    isSelected,
    isHovered,
    hasArmy,
  });

  const draw = useCallback(
    (g: any) => {
      g.clear();

      // Main tile fill
      g.beginFill(color, alpha);
      g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      g.endFill();

      // Selection/hover border
      if (isSelected) {
        g.lineStyle(2, SELECTION_COLOR, 1);
        g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      } else if (isHovered) {
        g.lineStyle(1, HOVER_COLOR, 0.8);
        g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
      }

      // Army indicator (small dot)
      if (hasArmy && isVisible) {
        g.beginFill(0xffffff, 0.8);
        g.drawCircle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 6);
        g.endFill();
      }

      // Forsaken indicator (skull-like pattern)
      if (isForsaken && isVisible) {
        g.beginFill(0xff0000, 0.5);
        g.drawCircle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 3, tileSize / 8);
        g.endFill();
      }
    },
    [x, y, color, alpha, isSelected, isHovered, hasArmy, isForsaken, isVisible, tileSize]
  );

  return <Graphics draw={draw} />;
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
}

function Grid({ visibleMinX, visibleMaxX, visibleMinY, visibleMaxY, tileSize, selectedTile, hoveredTile }: GridProps) {
  const tiles = useMapStore((state) => state.tiles);
  const visibleTiles = useMapStore((state) => state.visibleTiles);

  const draw = useCallback(
    (g: any) => {
      g.clear();

      for (let y = visibleMinY; y <= visibleMaxY; y++) {
        for (let x = visibleMinX; x <= visibleMaxX; x++) {
          if (x < 0 || x >= MAP_SIZE || y < 0 || y >= MAP_SIZE) continue;

          const key = tileKey(x, y);
          const tile = tiles.get(key);
          const isVisible = visibleTiles.has(key);
          const isSelected = selectedTile?.x === x && selectedTile?.y === y;
          const isHovered = hoveredTile?.x === x && hoveredTile?.y === y;

          // Default values for unminted tiles
          const zone: Zone = tile?.zone ?? 'outer';
          const terrain: Terrain = tile?.terrain ?? 'plains';
          const ownerId = tile?.ownerId ?? null;
          const ownerAddress = tile?.ownerAddress ?? null;
          const isForsaken = tile?.isForsaken ?? false;
          const hasArmy = tile?.hasArmy ?? false;

          const { color, alpha } = getTileColor({
            zone,
            terrain,
            ownerId,
            ownerAddress,
            isForsaken,
            isVisible: isVisible || !tile, // Show unminted tiles
            isSelected,
            isHovered,
            hasArmy,
          });

          // Main tile fill
          g.beginFill(color, alpha);
          g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
          g.endFill();

          // Selection/hover border
          if (isSelected) {
            g.lineStyle(2, SELECTION_COLOR, 1);
            g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
            g.lineStyle(0);
          } else if (isHovered) {
            g.lineStyle(1, HOVER_COLOR, 0.8);
            g.drawRect(x * tileSize, y * tileSize, tileSize - 1, tileSize - 1);
            g.lineStyle(0);
          }

          // Army indicator
          if (hasArmy && (isVisible || !tile)) {
            g.beginFill(0xffffff, 0.8);
            g.drawCircle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2, tileSize / 6);
            g.endFill();
          }

          // Forsaken indicator
          if (isForsaken && (isVisible || !tile)) {
            g.beginFill(0xff0000, 0.5);
            g.drawCircle(x * tileSize + tileSize / 2, y * tileSize + tileSize / 3, tileSize / 8);
            g.endFill();
          }
        }
      }
    },
    [visibleMinX, visibleMaxX, visibleMinY, visibleMaxY, tileSize, tiles, visibleTiles, selectedTile, hoveredTile]
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
      g.lineStyle(2, 0xffffff, 0.3);

      const center = 50;

      // Heart zone (radius 5)
      g.drawRect(
        (center - 5) * tileSize,
        (center - 5) * tileSize,
        11 * tileSize,
        11 * tileSize
      );

      // Inner zone (radius 15)
      g.drawRect(
        (center - 15) * tileSize,
        (center - 15) * tileSize,
        31 * tileSize,
        31 * tileSize
      );

      // Middle zone (radius 30)
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
      className="relative overflow-hidden bg-gray-900"
      style={{ width, height }}
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
          backgroundColor: 0x1a1a2e,
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
          />
          <ZoneOverlay tileSize={tileSize} />
        </Container>
      </Stage>

      {/* Coordinates overlay */}
      {hoveredTile && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          ({hoveredTile.x}, {hoveredTile.y})
        </div>
      )}
    </div>
  );
}
