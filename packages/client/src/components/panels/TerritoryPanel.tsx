import { useMapStore, useGameStore, useCombatStore, useUIStore, tileKey } from '../../stores';
import { ZONE_MULTIPLIERS, TERRAINS } from '@nemeths/shared';

const TERRAIN_INFO: Record<string, { icon: string; bonus: string }> = {
  plains: { icon: '🌾', bonus: '+50% Gold, +25% Food' },
  forest: { icon: '🌲', bonus: '+75% Wood, +25% Food' },
  mountain: { icon: '⛰️', bonus: '+75% Stone, +50% Defense' },
  river: { icon: '🌊', bonus: '+50% Food, Requires Bridge' },
  ruins: { icon: '🏚️', bonus: '+100% Mana, -25% Defense' },
  corruption: { icon: '☠️', bonus: '+200% Mana, Spawns Forsaken' },
};

const ZONE_INFO: Record<string, { color: string; description: string }> = {
  outer: { color: 'text-green-400', description: 'Safe starting area (1x resources)' },
  middle: { color: 'text-yellow-400', description: 'Contested territory (1.5x resources)' },
  inner: { color: 'text-orange-400', description: 'Valuable land (2x resources)' },
  heart: { color: 'text-red-400', description: 'The prize - control to win (3x resources)' },
};

export function TerritoryPanel() {
  const selectedTile = useMapStore((state) => state.selectedTile);
  const tiles = useMapStore((state) => state.tiles);
  const player = useGameStore((state) => state.player);
  const { openModal, setMapMode } = useUIStore();
  const { setPendingAttack } = useCombatStore();

  if (!selectedTile) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="text-lg mb-2">🗺️ Territory</p>
        <p className="text-sm">Click a tile on the map to view details</p>
      </div>
    );
  }

  const tile = tiles.get(tileKey(selectedTile.x, selectedTile.y));

  if (!tile) {
    // Unminted tile
    return (
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-2">
          Unclaimed Territory ({selectedTile.x}, {selectedTile.y})
        </h3>
        <p className="text-gray-400 text-sm">
          This territory has not been claimed yet. Expand your empire to conquer it!
        </p>
      </div>
    );
  }

  const isOwned = tile.ownerAddress === player?.walletAddress;
  const terrainInfo = TERRAIN_INFO[tile.terrain];
  const zoneInfo = ZONE_INFO[tile.zone];
  const multiplier = ZONE_MULTIPLIERS[tile.zone];

  const handleAttack = () => {
    if (!tile.tokenId) return;
    setPendingAttack({
      targetX: tile.x,
      targetY: tile.y,
      targetTokenId: tile.tokenId,
      strength: 0,
    });
    openModal('combat_initiate');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">
          ({tile.x}, {tile.y})
        </h3>
        {tile.isForsaken && (
          <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded">
            FORSAKEN
          </span>
        )}
        {isOwned && (
          <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">
            OWNED
          </span>
        )}
      </div>

      {/* Zone & Terrain */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Zone:</span>
          <span className={`font-medium capitalize ${zoneInfo.color}`}>
            {tile.zone} ({multiplier}x)
          </span>
        </div>
        <p className="text-xs text-gray-500">{zoneInfo.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-gray-400">Terrain:</span>
          <span className="font-medium text-white capitalize">
            {terrainInfo.icon} {tile.terrain}
          </span>
        </div>
        <p className="text-xs text-gray-500">{terrainInfo.bonus}</p>
      </div>

      {/* Owner info */}
      {tile.ownerAddress && (
        <div className="border-t border-gray-700 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Owner:</span>
            <span className="font-mono text-sm text-white">
              {tile.ownerAddress.slice(0, 6)}...{tile.ownerAddress.slice(-4)}
            </span>
          </div>
        </div>
      )}

      {/* Forsaken info */}
      {tile.isForsaken && (
        <div className="bg-red-900/30 border border-red-700 rounded p-2">
          <p className="text-red-400 text-sm font-medium">Forsaken Territory</p>
          <p className="text-gray-400 text-xs mt-1">
            Strength: {tile.forsakenStrength.toLocaleString()}
          </p>
          <p className="text-gray-500 text-xs mt-1">
            Defeat the Forsaken to claim this territory
          </p>
        </div>
      )}

      {/* Stats (if owned) */}
      {isOwned && (
        <div className="border-t border-gray-700 pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Buildings:</span>
            <span className="text-white">{tile.buildingCount}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Army:</span>
            <span className="text-white">{tile.hasArmy ? 'Stationed' : 'None'}</span>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-700 pt-3 space-y-2">
        {isOwned ? (
          <>
            <button
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              onClick={() => openModal('building_construct')}
            >
              Build
            </button>
            <button
              className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded font-medium transition-colors"
              onClick={() => openModal('unit_train')}
            >
              Train Units
            </button>
          </>
        ) : tile.ownerAddress ? (
          <button
            className="w-full py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
            onClick={handleAttack}
          >
            ⚔️ Attack
          </button>
        ) : tile.isForsaken ? (
          <button
            className="w-full py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium transition-colors"
            onClick={handleAttack}
          >
            ⚔️ Clear Forsaken
          </button>
        ) : (
          <button
            className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded font-medium transition-colors"
            onClick={() => openModal('confirm')}
          >
            🏴 Claim Territory
          </button>
        )}
      </div>
    </div>
  );
}
