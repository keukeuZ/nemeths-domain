import { useCallback } from 'react';
import { useMapStore, MIN_ZOOM, MAX_ZOOM, DEFAULT_ZOOM } from '../../stores';

export function MapControls() {
  const viewport = useMapStore((state) => state.viewport);
  const { zoom, centerOn, setViewport } = useMapStore();

  const handleZoomIn = useCallback(() => {
    zoom(0.25);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    zoom(-0.25);
  }, [zoom]);

  const handleResetZoom = useCallback(() => {
    setViewport({ zoom: DEFAULT_ZOOM });
  }, [setViewport]);

  const handleCenterHeart = useCallback(() => {
    centerOn(50, 50);
  }, [centerOn]);

  const zoomPercentage = Math.round(viewport.zoom * 100);

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {/* Zoom controls */}
      <div className="bg-gray-800/90 rounded-lg p-2 flex flex-col items-center gap-1">
        <button
          onClick={handleZoomIn}
          disabled={viewport.zoom >= MAX_ZOOM}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom In"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={handleResetZoom}
          className="w-8 h-6 flex items-center justify-center text-xs text-gray-300 hover:bg-gray-700 rounded"
          title="Reset Zoom"
        >
          {zoomPercentage}%
        </button>

        <button
          onClick={handleZoomOut}
          disabled={viewport.zoom <= MIN_ZOOM}
          className="w-8 h-8 flex items-center justify-center text-white hover:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="Zoom Out"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
      </div>

      {/* Quick navigation */}
      <div className="bg-gray-800/90 rounded-lg p-2 flex flex-col items-center gap-1">
        <button
          onClick={handleCenterHeart}
          className="w-8 h-8 flex items-center justify-center text-red-400 hover:bg-gray-700 rounded"
          title="Center on Heart"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Minimap component
export function Minimap() {
  const viewport = useMapStore((state) => state.viewport);
  const tiles = useMapStore((state) => state.tiles);
  const { centerOn } = useMapStore();

  const MINIMAP_SIZE = 150;
  const SCALE = MINIMAP_SIZE / 100;

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / SCALE);
    const y = Math.floor((e.clientY - rect.top) / SCALE);
    centerOn(x, y);
  };

  // Viewport indicator size
  const viewportSize = Math.round(20 * viewport.zoom);
  const viewportX = viewport.x * SCALE - viewportSize / 2;
  const viewportY = viewport.y * SCALE - viewportSize / 2;

  return (
    <div className="absolute bottom-4 right-4 bg-gray-800/90 rounded-lg p-2">
      <div
        className="relative cursor-pointer"
        style={{ width: MINIMAP_SIZE, height: MINIMAP_SIZE }}
        onClick={handleClick}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gray-900 rounded">
          {/* Zone rings */}
          <div
            className="absolute border border-gray-600 rounded-sm"
            style={{
              left: 20 * SCALE,
              top: 20 * SCALE,
              width: 60 * SCALE,
              height: 60 * SCALE,
            }}
          />
          <div
            className="absolute border border-gray-500 rounded-sm"
            style={{
              left: 35 * SCALE,
              top: 35 * SCALE,
              width: 30 * SCALE,
              height: 30 * SCALE,
            }}
          />
          <div
            className="absolute border border-red-500 rounded-sm"
            style={{
              left: 45 * SCALE,
              top: 45 * SCALE,
              width: 10 * SCALE,
              height: 10 * SCALE,
            }}
          />
        </div>

        {/* Viewport indicator */}
        <div
          className="absolute border-2 border-white/70 rounded-sm pointer-events-none"
          style={{
            left: Math.max(0, Math.min(MINIMAP_SIZE - viewportSize, viewportX)),
            top: Math.max(0, Math.min(MINIMAP_SIZE - viewportSize, viewportY)),
            width: viewportSize,
            height: viewportSize,
          }}
        />
      </div>

      {/* Coordinates */}
      <div className="text-xs text-gray-400 text-center mt-1">
        {Math.round(viewport.x)}, {Math.round(viewport.y)}
      </div>
    </div>
  );
}
