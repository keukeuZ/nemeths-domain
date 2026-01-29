import { useGameStore } from '../../stores';

// Medieval-styled SVG icons for resources
const ResourceIcons = {
  gold: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="#D4AF37" />
      <circle cx="12" cy="12" r="7" fill="#F5CE47" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fill="#8C6F16" fontWeight="bold">G</text>
    </svg>
  ),
  stone: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" fill="#6a6a6a" />
      <polygon points="12,4 20,9 20,15 12,20 4,15 4,9" fill="#8a8a8a" />
    </svg>
  ),
  wood: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <rect x="4" y="8" width="16" height="12" rx="1" fill="#5a3a2a" />
      <rect x="5" y="9" width="14" height="10" rx="0.5" fill="#8b5a3a" />
      <line x1="7" y1="9" x2="7" y2="19" stroke="#5a3a2a" strokeWidth="0.5" />
      <line x1="12" y1="9" x2="12" y2="19" stroke="#5a3a2a" strokeWidth="0.5" />
      <line x1="17" y1="9" x2="17" y2="19" stroke="#5a3a2a" strokeWidth="0.5" />
    </svg>
  ),
  food: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C10 2 8 4 8 6c0 2 2 3 4 4 2-1 4-2 4-4 0-2-2-4-4-4z" fill="#6B8B4A" />
      <path d="M12 10c-3 1-6 4-6 8 0 2 3 4 6 4s6-2 6-4c0-4-3-7-6-8z" fill="#4A6A2A" />
      <line x1="12" y1="6" x2="12" y2="22" stroke="#3A5A1A" strokeWidth="1.5" />
    </svg>
  ),
  mana: (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L8 10h8l-4 8 8-10h-8l4-6z" fill="#6B5BBA" />
      <path d="M12 4L9 10h6l-3 6 6-8h-6l3-4z" fill="#9B8BEA" />
    </svg>
  ),
};

const RESOURCE_CONFIG = {
  gold: {
    icon: ResourceIcons.gold,
    color: 'text-gold-400',
    bgColor: 'bg-gold-900/30',
    borderColor: 'border-gold-700/40',
    label: 'Gold',
  },
  stone: {
    icon: ResourceIcons.stone,
    color: 'text-parchment-300',
    bgColor: 'bg-medieval-800/50',
    borderColor: 'border-parchment-700/30',
    label: 'Stone',
  },
  wood: {
    icon: ResourceIcons.wood,
    color: 'text-bronze-300',
    bgColor: 'bg-bronze-900/30',
    borderColor: 'border-bronze-700/40',
    label: 'Wood',
  },
  food: {
    icon: ResourceIcons.food,
    color: 'text-green-400',
    bgColor: 'bg-green-900/30',
    borderColor: 'border-green-700/40',
    label: 'Food',
  },
  mana: {
    icon: ResourceIcons.mana,
    color: 'text-purple-400',
    bgColor: 'bg-purple-900/30',
    borderColor: 'border-purple-700/40',
    label: 'Mana',
  },
} as const;

export function ResourceBar() {
  const player = useGameStore((state) => state.player);

  if (!player) {
    return null;
  }

  const resources = player.resources;

  return (
    <div className="absolute bottom-4 left-4 flex items-center">
      {/* Ornate tray container */}
      <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-b from-medieval-700/95 to-medieval-800/95 border border-gold-700/30 shadow-medieval backdrop-blur-sm">
        {/* Left ornate cap */}
        <div className="w-1 h-8 bg-gradient-to-b from-gold-600/30 via-gold-500/50 to-gold-600/30 rounded-full mr-1" />

        {Object.entries(RESOURCE_CONFIG).map(([key, config], index) => {
          const value = resources[key as keyof typeof resources];
          return (
            <div key={key} className="flex items-center">
              {index > 0 && (
                <div className="w-px h-6 mx-2 bg-gradient-to-b from-transparent via-gold-500/30 to-transparent" />
              )}
              <div
                className={`flex items-center gap-2 px-2 py-1 rounded ${config.bgColor} border ${config.borderColor}`}
                title={`${config.label}: ${value.toLocaleString()}`}
              >
                <span className="flex-shrink-0">{config.icon}</span>
                <span className={`font-semibold text-sm ${config.color}`}>
                  {formatNumber(value)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Right ornate cap */}
        <div className="w-1 h-8 bg-gradient-to-b from-gold-600/30 via-gold-500/50 to-gold-600/30 rounded-full ml-1" />
      </div>
    </div>
  );
}

// Format large numbers
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

// Extended resource bar with production info
export function ResourceBarExtended() {
  const player = useGameStore((state) => state.player);

  if (!player) {
    return null;
  }

  const resources = player.resources;

  // Mock production rates - would come from server
  const production = {
    gold: 150,
    stone: 80,
    wood: 100,
    food: -50, // Consumption
    mana: 10,
  };

  return (
    <div className="bg-gradient-to-b from-medieval-700/95 to-medieval-800/95 border-b border-gold-700/30 px-4 py-2">
      <div className="flex items-center justify-center gap-4">
        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
          const value = resources[key as keyof typeof resources];
          const prod = production[key as keyof typeof production];

          return (
            <div
              key={key}
              className={`flex items-center gap-2 px-3 py-1.5 rounded ${config.bgColor} border ${config.borderColor}`}
              title={`${config.label}: ${value.toLocaleString()} (${prod >= 0 ? '+' : ''}${prod}/day)`}
            >
              <span className="flex-shrink-0">{config.icon}</span>
              <div className="flex flex-col">
                <span className={`font-bold text-sm ${config.color}`}>
                  {formatNumber(value)}
                </span>
                <span className={`text-xs ${prod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {prod >= 0 ? '+' : ''}{prod}/day
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
