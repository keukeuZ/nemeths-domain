import { useMapStore, useGameStore, tileKey } from '../../stores';

// Building definitions
const BUILDINGS = [
  { id: 'farm', name: 'Farm', icon: '🌾', production: '+10 Food/tick', cost: { gold: 100, wood: 50 } },
  { id: 'mine', name: 'Mine', icon: '⛏️', production: '+10 Stone/tick', cost: { gold: 100, wood: 50 } },
  { id: 'lumber_mill', name: 'Lumber Mill', icon: '🪓', production: '+10 Wood/tick', cost: { gold: 100, stone: 50 } },
  { id: 'gold_mine', name: 'Gold Mine', icon: '💰', production: '+10 Gold/tick', cost: { stone: 100, wood: 100 } },
  { id: 'mana_well', name: 'Mana Well', icon: '✨', production: '+5 Mana/tick', cost: { gold: 200, stone: 100 } },
  { id: 'barracks', name: 'Barracks', icon: '⚔️', production: 'Train Tier 1-2 units', cost: { gold: 150, wood: 100 } },
  { id: 'war_forge', name: 'War Forge', icon: '🔨', production: 'Train Tier 3 + siege', cost: { gold: 300, stone: 200 } },
  { id: 'watchtower', name: 'Watchtower', icon: '🗼', production: '+3 Vision range', cost: { gold: 100, stone: 100 } },
  { id: 'fortress', name: 'Fortress', icon: '🏰', production: '+50% Defense', cost: { gold: 500, stone: 300 } },
  { id: 'temple', name: 'Temple', icon: '⛪', production: '+10% Spell power', cost: { gold: 200, mana: 50 } },
  { id: 'market', name: 'Market', icon: '🏪', production: 'Trade resources', cost: { gold: 150, wood: 100 } },
  { id: 'embassy', name: 'Embassy', icon: '🏛️', production: 'Alliance bonuses', cost: { gold: 300, stone: 150 } },
  { id: 'prison', name: 'Prison', icon: '⛓️', production: 'Hold prisoners', cost: { gold: 200, stone: 200 } },
  { id: 'bridge', name: 'Bridge', icon: '🌉', production: 'Cross rivers', cost: { wood: 200, stone: 100 } },
] as const;

export function BuildingsPanel() {
  const selectedTile = useMapStore((state) => state.selectedTile);
  const tiles = useMapStore((state) => state.tiles);
  const player = useGameStore((state) => state.player);

  if (!player) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="text-lg mb-2">🏰 Buildings</p>
        <p className="text-sm">Register to view buildings</p>
      </div>
    );
  }

  // Get selected tile if owned
  const tile = selectedTile ? tiles.get(tileKey(selectedTile.x, selectedTile.y)) : null;
  const isOwnedTile = tile?.ownerAddress === player.walletAddress;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🏰 Buildings</h3>
        {selectedTile && isOwnedTile && (
          <span className="text-gray-400 text-sm">
            ({selectedTile.x}, {selectedTile.y})
          </span>
        )}
      </div>

      {/* Territory selection prompt */}
      {!selectedTile && (
        <div className="bg-gray-700/30 border border-gray-600 rounded p-3 text-center">
          <p className="text-gray-400 text-sm">
            Select one of your territories to view and construct buildings
          </p>
        </div>
      )}

      {selectedTile && !isOwnedTile && (
        <div className="bg-gray-700/30 border border-gray-600 rounded p-3 text-center">
          <p className="text-gray-400 text-sm">
            You can only build on territories you own
          </p>
        </div>
      )}

      {/* Building list */}
      {isOwnedTile && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {BUILDINGS.map((building) => (
            <BuildingCard
              key={building.id}
              building={building}
              canAfford={canAffordBuilding(player.resources, building.cost)}
              onBuild={() => console.log('Build:', building.id)}
            />
          ))}
        </div>
      )}

      {/* Current buildings on tile */}
      {isOwnedTile && tile && tile.buildingCount > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Current Buildings ({tile.buildingCount})
          </h4>
          <p className="text-xs text-gray-500">
            Building details would be loaded from server
          </p>
        </div>
      )}
    </div>
  );
}

interface BuildingCardProps {
  building: (typeof BUILDINGS)[number];
  canAfford: boolean;
  onBuild: () => void;
}

function BuildingCard({ building, canAfford, onBuild }: BuildingCardProps) {
  return (
    <div className={`bg-gray-700/30 border rounded p-2 ${canAfford ? 'border-gray-600' : 'border-red-900/50'}`}>
      <div className="flex items-start gap-2">
        <span className="text-2xl">{building.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium">{building.name}</p>
          <p className="text-xs text-gray-400">{building.production}</p>
          <div className="flex items-center gap-2 mt-1 text-xs">
            {Object.entries(building.cost).map(([resource, amount]) => (
              <span key={resource} className="text-gray-500">
                {amount} {resource}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={onBuild}
          disabled={!canAfford}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            canAfford
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          Build
        </button>
      </div>
    </div>
  );
}

function canAffordBuilding(
  resources: { gold: number; stone: number; wood: number; food: number; mana: number },
  cost: Record<string, number>
): boolean {
  for (const [resource, amount] of Object.entries(cost)) {
    if ((resources[resource as keyof typeof resources] || 0) < amount) {
      return false;
    }
  }
  return true;
}
