import { useMapStore, useGameStore, useCombatStore, useUIStore, tileKey } from '../../stores';
import { ZONE_MULTIPLIERS } from '@nemeths/shared';
import { PanelHeader, PanelSection, StatRow } from '../ui';
import { MedievalButton } from '../ui';

// Terrain icons (SVG for medieval aesthetic)
const TerrainIcons = {
  plains: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-3 0-6 2-6 4 0 1 1 2 2 3-2 0-4 2-4 4s3 4 6 4h4c3 0 6-2 6-4s-2-4-4-4c1-1 2-2 2-3 0-2-3-4-6-4z" fill="#6B8B4A" />
      <rect x="11" y="12" width="2" height="10" fill="#5A4A2A" />
    </svg>
  ),
  forest: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L6 10h3l-3 6h4l-2 6h8l-2-6h4l-3-6h3L12 2z" fill="#2D5A2D" />
      <path d="M12 4L8 10h2l-2 5h3l-1 5h4l-1-5h3l-2-5h2L12 4z" fill="#4A8A4A" />
    </svg>
  ),
  mountain: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M2 20L12 4l10 16H2z" fill="#6A6A6A" />
      <path d="M4 20L12 6l8 14H4z" fill="#8A8A8A" />
      <path d="M12 4l-2 4 2-2 2 2-2-4z" fill="#FFFFFF" />
    </svg>
  ),
  river: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4 8c4-2 8 2 12 0s4-2 4-2v12c0 0 0 2-4 2s-8-2-12 0-4 2-4 2V8z" fill="#3A6A9A" />
      <path d="M4 10c4-2 8 2 12 0s4-2 4-2v8c0 0 0 2-4 2s-8-2-12 0-4 2-4 2V10z" fill="#4A8ABA" />
    </svg>
  ),
  ruins: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="12" width="4" height="10" fill="#5A4A3A" />
      <rect x="10" y="8" width="4" height="14" fill="#6A5A4A" />
      <rect x="16" y="14" width="4" height="8" fill="#5A4A3A" />
      <rect x="4" y="10" width="4" height="2" fill="#7A6A5A" />
      <rect x="10" y="6" width="4" height="2" fill="#7A6A5A" />
    </svg>
  ),
  corruption: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="#3A2A4A" />
      <circle cx="12" cy="12" r="6" fill="#5A4A6A" />
      <circle cx="10" cy="10" r="2" fill="#8A2A8A" />
      <circle cx="14" cy="14" r="1.5" fill="#AA4AAA" />
    </svg>
  ),
};

const TERRAIN_INFO: Record<string, { icon: JSX.Element; bonus: string }> = {
  plains: { icon: TerrainIcons.plains, bonus: '+50% Gold, +25% Food' },
  forest: { icon: TerrainIcons.forest, bonus: '+75% Wood, +25% Food' },
  mountain: { icon: TerrainIcons.mountain, bonus: '+75% Stone, +50% Defense' },
  river: { icon: TerrainIcons.river, bonus: '+50% Food, Requires Bridge' },
  ruins: { icon: TerrainIcons.ruins, bonus: '+100% Mana, -25% Defense' },
  corruption: { icon: TerrainIcons.corruption, bonus: '+200% Mana, Spawns Forsaken' },
};

const ZONE_INFO: Record<string, { badgeClass: string; description: string }> = {
  outer: { badgeClass: 'badge-zone-outer', description: 'Safe starting area (1x resources)' },
  middle: { badgeClass: 'badge-zone-middle', description: 'Contested territory (1.5x resources)' },
  inner: { badgeClass: 'badge-zone-inner', description: 'Valuable land (2x resources)' },
  heart: { badgeClass: 'badge-zone-heart', description: 'The prize - control to win (3x resources)' },
};

export function TerritoryPanel() {
  const selectedTile = useMapStore((state) => state.selectedTile);
  const tiles = useMapStore((state) => state.tiles);
  const player = useGameStore((state) => state.player);
  const { openModal } = useUIStore();
  const { setPendingAttack } = useCombatStore();

  if (!selectedTile) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 text-parchment-500">
          <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
        </div>
        <h3 className="font-medieval text-lg text-parchment-300 mb-2">Territory</h3>
        <p className="text-sm text-parchment-500">Click a tile on the map to view details</p>
      </div>
    );
  }

  const tile = tiles.get(tileKey(selectedTile.x, selectedTile.y));

  if (!tile) {
    return (
      <div>
        <PanelHeader
          title="Unclaimed Land"
          subtitle={`(${selectedTile.x}, ${selectedTile.y})`}
        />
        <div className="bg-medieval-800/50 border border-gold-700/20 rounded p-4 text-center">
          <p className="text-parchment-400">
            This territory has not been claimed yet. Expand your empire to conquer it!
          </p>
        </div>
      </div>
    );
  }

  const isOwned = tile.ownerAddress?.toLowerCase() === player?.walletAddress?.toLowerCase();
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
    <div className="space-y-4">
      {/* Header with coordinates */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-medieval-800 border border-gold-700/30 flex items-center justify-center text-gold-400 font-medieval text-sm">
            {selectedTile.x},{selectedTile.y}
          </div>
          <div>
            <h3 className="font-medieval text-lg text-gold-400 capitalize">{tile.terrain}</h3>
            <span className={`badge-medieval ${zoneInfo.badgeClass}`}>
              {tile.zone} zone
            </span>
          </div>
        </div>
        {isOwned && (
          <span className="px-2 py-1 bg-gold-900/30 border border-gold-500/40 text-gold-400 text-xs font-medieval uppercase rounded">
            Owned
          </span>
        )}
        {tile.isForsaken && (
          <span className="px-2 py-1 bg-red-900/30 border border-red-500/40 text-red-400 text-xs font-medieval uppercase rounded">
            Forsaken
          </span>
        )}
      </div>

      <div className="divider-ornate" />

      {/* Terrain & Zone Info */}
      <PanelSection title="Location">
        <div className="card-medieval">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8">{terrainInfo.icon}</div>
            <div>
              <p className="text-parchment-200 capitalize font-medium">{tile.terrain}</p>
              <p className="text-xs text-parchment-500">{terrainInfo.bonus}</p>
            </div>
          </div>
          <div className="text-xs text-parchment-400 border-t border-medieval-600 pt-2">
            <span className="text-gold-400">{multiplier}x</span> resource multiplier
          </div>
          <p className="text-xs text-parchment-500 mt-1">{zoneInfo.description}</p>
        </div>
      </PanelSection>

      {/* Owner info */}
      {tile.ownerAddress && (
        <PanelSection title="Ownership">
          <StatRow
            label="Owner"
            value={`${tile.ownerAddress.slice(0, 6)}...${tile.ownerAddress.slice(-4)}`}
          />
        </PanelSection>
      )}

      {/* Forsaken info */}
      {tile.isForsaken && (
        <PanelSection title="Forsaken Presence">
          <div className="bg-red-900/20 border border-red-700/40 rounded p-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              <span className="text-red-400 font-medium">Hostile Territory</span>
            </div>
            <StatRow
              label="Garrison Strength"
              value={tile.forsakenStrength.toLocaleString()}
              color="red"
            />
            <p className="text-xs text-parchment-500 mt-2">
              Defeat the Forsaken garrison to claim this territory
            </p>
          </div>
        </PanelSection>
      )}

      {/* Stats (if owned) */}
      {isOwned && (
        <PanelSection title="Territory Stats">
          <StatRow label="Buildings" value={tile.buildingCount} />
          <StatRow label="Army" value={tile.hasArmy ? 'Stationed' : 'None'} />
        </PanelSection>
      )}

      {/* Actions */}
      <div className="space-y-2 pt-2">
        {isOwned ? (
          <>
            <MedievalButton
              variant="primary"
              fullWidth
              onClick={() => openModal('building_construct')}
            >
              Construct Building
            </MedievalButton>
            <MedievalButton
              variant="default"
              fullWidth
              onClick={() => openModal('unit_train')}
            >
              Train Units
            </MedievalButton>
          </>
        ) : tile.ownerAddress ? (
          <MedievalButton
            variant="danger"
            fullWidth
            onClick={handleAttack}
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              </svg>
            }
          >
            Attack Territory
          </MedievalButton>
        ) : tile.isForsaken ? (
          <MedievalButton
            variant="danger"
            fullWidth
            onClick={handleAttack}
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
              </svg>
            }
          >
            Clear Forsaken
          </MedievalButton>
        ) : (
          <MedievalButton
            variant="primary"
            fullWidth
            onClick={() => openModal('confirm')}
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z" />
              </svg>
            }
          >
            Claim Territory
          </MedievalButton>
        )}
      </div>
    </div>
  );
}
