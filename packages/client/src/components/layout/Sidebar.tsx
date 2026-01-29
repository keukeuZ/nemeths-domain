import { useUIStore, type PanelType } from '../../stores';
import { TerritoryPanel } from '../panels/TerritoryPanel';
import { ArmyPanel } from '../panels/ArmyPanel';
import { BuildingsPanel } from '../panels/BuildingsPanel';
import { SpellbookPanel } from '../panels/SpellbookPanel';
import { AlliancePanel } from '../panels/AlliancePanel';
import { LeaderboardPanel } from '../panels/LeaderboardPanel';

const PANEL_TABS: { id: PanelType; label: string; icon: string }[] = [
  { id: 'territory', label: 'Territory', icon: '🗺️' },
  { id: 'army', label: 'Army', icon: '⚔️' },
  { id: 'buildings', label: 'Buildings', icon: '🏰' },
  { id: 'spellbook', label: 'Spells', icon: '📖' },
  { id: 'alliance', label: 'Alliance', icon: '🤝' },
  { id: 'leaderboard', label: 'Ranks', icon: '🏆' },
];

export function Sidebar() {
  const { activePanel, setActivePanel, toggleSidebar } = useUIStore();

  return (
    <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
      {/* Panel tabs */}
      <div className="flex border-b border-gray-700">
        {PANEL_TABS.slice(0, 3).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex-1 py-2 px-2 text-xs flex flex-col items-center gap-0.5 transition-colors ${
              activePanel === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={tab.label}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="flex border-b border-gray-700">
        {PANEL_TABS.slice(3).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePanel(tab.id)}
            className={`flex-1 py-2 px-2 text-xs flex flex-col items-center gap-0.5 transition-colors ${
              activePanel === tab.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
            title={tab.label}
          >
            <span className="text-lg">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {activePanel === 'territory' && <TerritoryPanel />}
        {activePanel === 'army' && <ArmyPanel />}
        {activePanel === 'buildings' && <BuildingsPanel />}
        {activePanel === 'spellbook' && <SpellbookPanel />}
        {activePanel === 'alliance' && <AlliancePanel />}
        {activePanel === 'leaderboard' && <LeaderboardPanel />}
        {activePanel === 'settings' && <SettingsPlaceholder />}
      </div>
    </aside>
  );
}

// Placeholder components
function SettingsPlaceholder() {
  return (
    <div className="p-4 text-gray-400 text-center">
      <p className="text-lg mb-2">⚙️ Settings</p>
      <p className="text-sm">Coming soon...</p>
    </div>
  );
}
