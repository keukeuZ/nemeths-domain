import { useGameStore, useAuthStore, useUIStore } from '../../stores';
import { useAccount, useDisconnect } from 'wagmi';

export function TopBar() {
  const { generation, player, isRegistered } = useGameStore();
  const { isAuthenticated, address } = useAuthStore();
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

  // Truncate address
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="h-12 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
      {/* Left: Logo and generation info */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-white">Nemeths Domain</h1>

        {generation && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-400">Gen #{generation.number}</span>
            <span className="text-gray-500">|</span>
            <span className={`font-medium ${
              generation.status === 'endgame' ? 'text-red-400' :
              generation.status === 'planning' ? 'text-blue-400' :
              'text-green-400'
            }`}>
              {getDayDisplay()}
            </span>
          </div>
        )}
      </div>

      {/* Center: Quick stats (if registered) */}
      {isRegistered && player && (
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Territories:</span>
            <span className="text-white font-medium">{player.totalTerritories}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Army:</span>
            <span className="text-white font-medium">{player.totalArmySize.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Score:</span>
            <span className="text-yellow-400 font-medium">{player.score.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Right: User info and navigation */}
      <div className="flex items-center gap-3">
        {/* Navigation buttons */}
        <button
          onClick={() => setActivePanel('leaderboard')}
          className="text-gray-400 hover:text-white px-2 py-1 text-sm"
        >
          Leaderboard
        </button>

        <button
          onClick={() => setActivePanel('settings')}
          className="text-gray-400 hover:text-white px-2 py-1 text-sm"
        >
          Settings
        </button>

        {/* Wallet info */}
        {address ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300 bg-gray-700 px-2 py-1 rounded">
              {truncateAddress(address)}
            </span>
            <button
              onClick={() => disconnect()}
              className="text-gray-400 hover:text-red-400 text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <span className="text-sm text-gray-400">Not connected</span>
        )}

        {/* Toggle sidebar */}
        <button
          onClick={toggleSidebar}
          className="text-gray-400 hover:text-white p-1"
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
