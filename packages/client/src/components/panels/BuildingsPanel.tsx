import { useMapStore, useGameStore, tileKey } from '../../stores';
import { PanelHeader, PanelSection } from '../ui';
import { MedievalButton } from '../ui';

// Building icons as SVG
const BuildingIcons = {
  farm: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-3 0-6 2-6 4 0 1 1 2 2 3-2 0-4 2-4 4s3 4 6 4h4c3 0 6-2 6-4s-2-4-4-4c1-1 2-2 2-3 0-2-3-4-6-4z" fill="#6B8B4A" />
      <rect x="11" y="12" width="2" height="10" fill="#5A4A2A" />
    </svg>
  ),
  mine: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 20l8-16 8 16H4z" fill="#6A6A6A" />
      <rect x="10" y="14" width="4" height="6" fill="#3A3A3A" />
    </svg>
  ),
  lumbermill: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="10" width="16" height="12" rx="1" fill="#5A3A2A" />
      <path d="M12 2L6 10h12L12 2z" fill="#8B5A3A" />
    </svg>
  ),
  market: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="12" width="20" height="10" fill="#7A5A3A" />
      <path d="M2 12l10-10 10 10H2z" fill="#D4AF37" />
    </svg>
  ),
  barracks: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="8" width="16" height="14" fill="#5A4A4A" />
      <rect x="6" y="2" width="4" height="6" fill="#6A5A5A" />
      <rect x="14" y="2" width="4" height="6" fill="#6A5A5A" />
    </svg>
  ),
  warhall: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="10" width="20" height="12" fill="#4A3A3A" />
      <path d="M2 10l10-8 10 8H2z" fill="#6A5A5A" />
      <rect x="10" y="14" width="4" height="8" fill="#3A2A2A" />
    </svg>
  ),
  siegeworkshop: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="12" width="20" height="10" fill="#5A4A3A" />
      <circle cx="8" cy="17" r="3" fill="#8A7A6A" />
      <circle cx="16" cy="17" r="3" fill="#8A7A6A" />
    </svg>
  ),
  armory: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="6" width="16" height="16" fill="#6A5A4A" />
      <path d="M12 2L4 6h16L12 2z" fill="#8A7A6A" />
      <path d="M12 10l-4 4h8l-4-4z" fill="#D4AF37" />
    </svg>
  ),
  wall: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="4" width="20" height="18" fill="#7A7A7A" />
      <rect x="4" y="8" width="4" height="6" fill="#5A5A5A" />
      <rect x="10" y="8" width="4" height="6" fill="#5A5A5A" />
      <rect x="16" y="8" width="4" height="6" fill="#5A5A5A" />
    </svg>
  ),
  watchtower: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="8" y="8" width="8" height="14" fill="#6A5A4A" />
      <path d="M6 8l6-6 6 6H6z" fill="#8A7A6A" />
      <rect x="10" y="12" width="4" height="4" fill="#4A9ADA" />
    </svg>
  ),
  gate: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="4" width="8" height="18" fill="#7A7A7A" />
      <rect x="14" y="4" width="8" height="18" fill="#7A7A7A" />
      <path d="M10 10v12h4V10a2 2 0 00-4 0z" fill="#4A3A2A" />
    </svg>
  ),
  magetower: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="8" y="8" width="8" height="14" fill="#5A4A6A" />
      <path d="M6 8l6-6 6 6H6z" fill="#7A6A8A" />
      <circle cx="12" cy="4" r="2" fill="#9A8ABA" />
    </svg>
  ),
  shrine: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="10" width="12" height="12" fill="#8A8A9A" />
      <path d="M4 10l8-8 8 8H4z" fill="#AAAABC" />
      <circle cx="12" cy="6" r="2" fill="#D4AF37" />
    </svg>
  ),
  warehouse: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="10" width="20" height="12" fill="#6A5A4A" />
      <path d="M2 10l10-8 10 8H2z" fill="#8A7A6A" />
      <rect x="8" y="14" width="8" height="8" fill="#5A4A3A" />
    </svg>
  ),
};

// Building definitions with medieval styling
const BUILDINGS = [
  { id: 'farm', name: 'Farm', icon: BuildingIcons.farm, production: '+10 Food/day', cost: { gold: 100, wood: 50 }, category: 'resource' },
  { id: 'mine', name: 'Mine', icon: BuildingIcons.mine, production: '+10 Stone/day', cost: { gold: 100, wood: 50 }, category: 'resource' },
  { id: 'lumbermill', name: 'Lumber Mill', icon: BuildingIcons.lumbermill, production: '+10 Wood/day', cost: { gold: 100, stone: 50 }, category: 'resource' },
  { id: 'market', name: 'Market', icon: BuildingIcons.market, production: '+15 Gold/day', cost: { stone: 100, wood: 100 }, category: 'resource' },
  { id: 'barracks', name: 'Barracks', icon: BuildingIcons.barracks, production: 'Train Tier 1-2', cost: { gold: 150, wood: 100 }, category: 'military' },
  { id: 'warhall', name: 'War Hall', icon: BuildingIcons.warhall, production: 'Train Tier 3', cost: { gold: 300, stone: 200 }, category: 'military' },
  { id: 'siegeworkshop', name: 'Siege Workshop', icon: BuildingIcons.siegeworkshop, production: 'Build siege', cost: { gold: 400, stone: 300, wood: 200 }, category: 'military' },
  { id: 'armory', name: 'Armory', icon: BuildingIcons.armory, production: '+10% Attack', cost: { gold: 250, stone: 150 }, category: 'military' },
  { id: 'wall', name: 'Wall', icon: BuildingIcons.wall, production: '+25% Defense', cost: { stone: 200 }, category: 'defense' },
  { id: 'watchtower', name: 'Watchtower', icon: BuildingIcons.watchtower, production: '+3 Vision', cost: { gold: 100, stone: 100 }, category: 'defense' },
  { id: 'gate', name: 'Gate', icon: BuildingIcons.gate, production: 'Fortified entry', cost: { stone: 150, gold: 100 }, category: 'defense' },
  { id: 'magetower', name: 'Mage Tower', icon: BuildingIcons.magetower, production: '+10% Spell', cost: { gold: 200, mana: 50 }, category: 'magic' },
  { id: 'shrine', name: 'Shrine', icon: BuildingIcons.shrine, production: '+5 Mana/day', cost: { gold: 150, stone: 100 }, category: 'magic' },
  { id: 'warehouse', name: 'Warehouse', icon: BuildingIcons.warehouse, production: '+500 Storage', cost: { gold: 100, wood: 150 }, category: 'utility' },
] as const;

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  resource: { label: 'Resources', color: 'text-green-400' },
  military: { label: 'Military', color: 'text-red-400' },
  defense: { label: 'Defense', color: 'text-blue-400' },
  magic: { label: 'Magic', color: 'text-purple-400' },
  utility: { label: 'Utility', color: 'text-bronze-400' },
};

export function BuildingsPanel() {
  const selectedTile = useMapStore((state) => state.selectedTile);
  const tiles = useMapStore((state) => state.tiles);
  const player = useGameStore((state) => state.player);

  if (!player) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 text-parchment-500">
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5zM8 14h8v2H8v-2z" />
          </svg>
        </div>
        <h3 className="font-medieval text-lg text-parchment-300 mb-2">Buildings</h3>
        <p className="text-sm text-parchment-500">Register to view buildings</p>
      </div>
    );
  }

  // Get selected tile if owned
  const tile = selectedTile ? tiles.get(tileKey(selectedTile.x, selectedTile.y)) : null;
  const isOwnedTile = tile?.ownerAddress?.toLowerCase() === player.walletAddress?.toLowerCase();

  // Group buildings by category
  const buildingsByCategory = BUILDINGS.reduce((acc, building) => {
    if (!acc[building.category]) acc[building.category] = [];
    acc[building.category].push(building);
    return acc;
  }, {} as Record<string, typeof BUILDINGS[number][]>);

  return (
    <div className="space-y-4">
      <PanelHeader
        title="Buildings"
        subtitle={selectedTile && isOwnedTile ? `(${selectedTile.x}, ${selectedTile.y})` : undefined}
      />

      {/* Territory selection prompt */}
      {!selectedTile && (
        <div className="bg-medieval-800/50 border border-gold-700/20 rounded p-4 text-center">
          <p className="text-parchment-400 text-sm">
            Select one of your territories to view and construct buildings
          </p>
        </div>
      )}

      {selectedTile && !isOwnedTile && (
        <div className="bg-medieval-800/50 border border-gold-700/20 rounded p-4 text-center">
          <p className="text-parchment-400 text-sm">
            You can only build on territories you own
          </p>
        </div>
      )}

      {/* Building list by category */}
      {isOwnedTile && (
        <div className="space-y-4">
          {Object.entries(buildingsByCategory).map(([category, buildings]) => (
            <PanelSection key={category} title={CATEGORY_LABELS[category]?.label || category}>
              <div className="space-y-2">
                {buildings.map((building) => (
                  <BuildingCard
                    key={building.id}
                    building={building}
                    canAfford={canAffordBuilding(player.resources, building.cost)}
                    onBuild={() => console.log('Build:', building.id)}
                  />
                ))}
              </div>
            </PanelSection>
          ))}
        </div>
      )}

      {/* Current buildings on tile */}
      {isOwnedTile && tile && tile.buildingCount > 0 && (
        <PanelSection title={`Built (${tile.buildingCount})`}>
          <p className="text-xs text-parchment-500">
            Building details would be loaded from server
          </p>
        </PanelSection>
      )}
    </div>
  );
}

interface BuildingCardProps {
  building: typeof BUILDINGS[number];
  canAfford: boolean;
  onBuild: () => void;
}

function BuildingCard({ building, canAfford, onBuild }: BuildingCardProps) {
  return (
    <div className={`card-medieval p-2 ${!canAfford ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 flex items-center justify-center bg-medieval-800 rounded border border-medieval-600">
          {building.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-parchment-100 font-medium text-sm">{building.name}</p>
          <p className="text-xs text-parchment-500">{building.production}</p>
          <div className="flex items-center gap-2 mt-1 text-xs flex-wrap">
            {Object.entries(building.cost).map(([resource, amount]) => (
              <span key={resource} className="text-parchment-400">
                <span className="text-gold-500">{amount}</span> {resource}
              </span>
            ))}
          </div>
        </div>
        <MedievalButton
          onClick={onBuild}
          disabled={!canAfford}
          size="sm"
          variant={canAfford ? 'primary' : 'ghost'}
        >
          Build
        </MedievalButton>
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
