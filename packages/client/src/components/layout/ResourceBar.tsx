import { useGameStore } from '../../stores';

const RESOURCE_CONFIG = {
  gold: {
    icon: '🪙',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    label: 'Gold',
  },
  stone: {
    icon: '🪨',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    label: 'Stone',
  },
  wood: {
    icon: '🪵',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/20',
    label: 'Wood',
  },
  food: {
    icon: '🌾',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    label: 'Food',
  },
  mana: {
    icon: '✨',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
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
    <div className="absolute bottom-4 left-4 flex items-center gap-2">
      {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
        const value = resources[key as keyof typeof resources];
        return (
          <div
            key={key}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${config.bgColor} backdrop-blur-sm`}
            title={config.label}
          >
            <span className="text-lg">{config.icon}</span>
            <span className={`font-medium ${config.color}`}>
              {formatNumber(value)}
            </span>
          </div>
        );
      })}
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
    <div className="bg-gray-800/95 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-center gap-6">
        {Object.entries(RESOURCE_CONFIG).map(([key, config]) => {
          const value = resources[key as keyof typeof resources];
          const prod = production[key as keyof typeof production];

          return (
            <div
              key={key}
              className="flex items-center gap-2"
              title={`${config.label}: ${value.toLocaleString()} (${prod >= 0 ? '+' : ''}${prod}/tick)`}
            >
              <span className="text-xl">{config.icon}</span>
              <div className="flex flex-col">
                <span className={`font-bold ${config.color}`}>
                  {formatNumber(value)}
                </span>
                <span className={`text-xs ${prod >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {prod >= 0 ? '+' : ''}{prod}/tick
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
