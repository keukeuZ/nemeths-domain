import { useGameStore, useAuthStore, useUIStore } from '../../stores';
import { useDisconnect } from 'wagmi';

export function TopBar() {
  const { generation, player, isRegistered } = useGameStore();
  const { address } = useAuthStore();
  const { toggleSidebar, setActivePanel } = useUIStore();
  const { disconnect } = useDisconnect();

  // Format day/phase display
  const getDayDisplay = () => {
    if (!generation) return 'No Active Generation';

    const day = generation.currentDay;
    if (generation.status === 'planning') return `Planning Phase - Day ${day}/5`;
    if (generation.status === 'active') return `Day ${day}/50`;
    if (generation.status === 'endgame') return `Endgame - Day ${day}/50`;
    return 'Generation Ended';
  };

  // Get status color
  const getStatusColor = () => {
    if (!generation) return 'text-parchment-400';
    if (generation.status === 'endgame') return 'text-red-400';
    if (generation.status === 'planning') return 'text-blue-400';
    return 'text-green-400';
  };

  // Truncate address
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="relative h-14 bg-gradient-to-b from-medieval-700 to-medieval-800 border-b-2 border-gold-700/50 flex items-center justify-between px-4">
      {/* Ornate top border */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />

      {/* Decorative bottom curve (banner shape) */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-32 h-2 bg-medieval-800 rounded-b-full border-b border-x border-gold-700/30" />

      {/* Left: Logo and generation info */}
      <div className="flex items-center gap-6">
        {/* Logo with ornate styling */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gold-500" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="font-medieval text-lg font-semibold text-gold-400 tracking-wide">
            Nemeths Domain
          </h1>
        </div>

        {/* Generation info badge */}
        {generation && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-medieval-900/50 border border-gold-700/30">
              <span className="text-xs text-parchment-400 font-medieval uppercase tracking-wider">
                Gen
              </span>
              <span className="text-sm text-gold-400 font-semibold">
                #{generation.number}
              </span>
            </div>
            <div className="h-4 w-px bg-gold-700/30" />
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getDayDisplay()}
            </span>
          </div>
        )}
      </div>

      {/* Center: Quick stats (if registered) */}
      {isRegistered && player && (
        <div className="flex items-center gap-6">
          <StatBadge
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 3h18v18H3V3zm2 2v14h14V5H5z" />
              </svg>
            }
            label="Territories"
            value={player.totalTerritories}
          />
          <StatBadge
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L4 6v12l8 4 8-4V6l-8-4z" />
              </svg>
            }
            label="Army"
            value={player.totalArmySize}
          />
          <StatBadge
            icon={
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            }
            label="Score"
            value={player.score}
            highlight
          />
        </div>
      )}

      {/* Right: User info and navigation */}
      <div className="flex items-center gap-2">
        {/* Navigation buttons */}
        <NavButton
          onClick={() => setActivePanel('leaderboard')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          label="Ranks"
        />

        <div className="h-4 w-px bg-medieval-600" />

        {/* Wallet info */}
        {address ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 rounded bg-medieval-900/70 border border-bronze-400/30">
              <span className="text-xs font-mono text-bronze-300">
                {truncateAddress(address)}
              </span>
            </div>
            <button
              onClick={() => disconnect()}
              className="text-parchment-500 hover:text-red-400 transition-colors p-1"
              title="Disconnect"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        ) : (
          <span className="text-sm text-parchment-500">Not connected</span>
        )}

        <div className="h-4 w-px bg-medieval-600" />

        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          className="p-2 text-parchment-400 hover:text-gold-400 transition-colors"
          title="Toggle Sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
    </header>
  );
}

// Stat badge component
function StatBadge({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={highlight ? 'text-gold-500' : 'text-parchment-500'}>
        {icon}
      </span>
      <div className="flex flex-col">
        <span className="text-[10px] text-parchment-500 uppercase tracking-wider leading-none">
          {label}
        </span>
        <span className={`text-sm font-semibold leading-tight ${highlight ? 'text-gold-400' : 'text-parchment-100'}`}>
          {value.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

// Nav button component
function NavButton({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-2 py-1 text-parchment-400 hover:text-gold-400 hover:bg-medieval-700/50 rounded transition-colors"
    >
      {icon}
      <span className="text-xs font-medieval uppercase tracking-wider">{label}</span>
    </button>
  );
}
