import { useState, useCallback, useEffect } from 'react';
import { useUIStore, useGameStore, useAuthStore, useMapStore } from '../../stores';
import { useSocket } from '../../hooks/useSocket';
import { GameMap, MapControls, Minimap } from '../map';
import { ResourceBar } from './ResourceBar';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ToastContainer } from './ToastContainer';

export function GameLayout() {
  const [mapDimensions, setMapDimensions] = useState({ width: 800, height: 600 });
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const { isRegistered } = useGameStore();
  const { isAuthenticated } = useAuthStore();
  const tiles = useMapStore((state) => state.tiles);
  const { fetchMapTiles, subscribeToMap } = useSocket();

  // Fetch map tiles on mount
  useEffect(() => {
    if (tiles.size === 0) {
      fetchMapTiles();
    }
  }, [fetchMapTiles, tiles.size]);

  // Subscribe to map updates after tiles are loaded
  useEffect(() => {
    if (tiles.size > 0) {
      subscribeToMap();
    }
  }, [tiles.size, subscribeToMap]);

  // Handle tile click
  const handleTileClick = useCallback((x: number, y: number) => {
    console.log('Tile clicked:', x, y);
    // Open territory panel
    useUIStore.getState().setActivePanel('territory');
  }, []);

  // Handle tile right click (context menu)
  const handleTileRightClick = useCallback((x: number, y: number) => {
    console.log('Tile right-clicked:', x, y);
    // Could open attack menu, etc.
  }, []);

  // Measure map container
  const mapContainerRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setMapDimensions({
            width: entry.contentRect.width,
            height: entry.contentRect.height,
          });
        }
      });
      resizeObserver.observe(node);
      return () => resizeObserver.disconnect();
    }
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-medieval-900 overflow-hidden">
      {/* Top bar with resources */}
      <TopBar />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map area */}
        <div ref={mapContainerRef} className="flex-1 relative">
          <GameMap
            width={mapDimensions.width}
            height={mapDimensions.height}
            onTileClick={handleTileClick}
            onTileRightClick={handleTileRightClick}
          />
          <MapControls />
          <Minimap />

          {/* Resource bar overlay at bottom */}
          <ResourceBar />
        </div>

        {/* Sidebar */}
        {sidebarOpen && <Sidebar />}
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}
