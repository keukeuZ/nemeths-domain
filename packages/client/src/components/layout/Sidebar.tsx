import { useUIStore, type PanelType } from '../../stores';
import { TerritoryPanel } from '../panels/TerritoryPanel';
import { ArmyPanel } from '../panels/ArmyPanel';
import { BuildingsPanel } from '../panels/BuildingsPanel';
import { SpellbookPanel } from '../panels/SpellbookPanel';
import { AlliancePanel } from '../panels/AlliancePanel';
import { LeaderboardPanel } from '../panels/LeaderboardPanel';

// SVG Icons for tabs
const TabIcons = {
  territory: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
    </svg>
  ),
  army: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-2h2v2zm0-4h-2V7h2v5z" />
    </svg>
  ),
  buildings: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5zM8 14h8v2H8v-2z" />
    </svg>
  ),
  spellbook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1zm0 13.5c-1.1-.35-2.3-.5-3.5-.5-1.7 0-4.15.65-5.5 1.5V8c1.35-.85 3.8-1.5 5.5-1.5 1.2 0 2.4.15 3.5.5v11.5z" />
    </svg>
  ),
  alliance: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  ),
  leaderboard: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
};

const PANEL_TABS: { id: PanelType; label: string }[] = [
  { id: 'territory', label: 'Territory' },
  { id: 'army', label: 'Army' },
  { id: 'buildings', label: 'Build' },
  { id: 'spellbook', label: 'Spells' },
  { id: 'alliance', label: 'Alliance' },
  { id: 'leaderboard', label: 'Ranks' },
];

export function Sidebar() {
  const { activePanel, setActivePanel } = useUIStore();

  return (
    <aside className="w-80 bg-gradient-to-b from-medieval-700 to-medieval-800 border-l-2 border-gold-700/30 flex flex-col relative">
      {/* Leather spine accent on left edge */}
      <div className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-r from-medieval-900 to-transparent" />
      <div className="absolute left-1 top-4 bottom-4 w-px bg-bronze-700/30" />

      {/* Panel tabs - ribbon bookmark style */}
      <div className="relative px-2 pt-2 pb-1">
        <div className="grid grid-cols-3 gap-1">
          {PANEL_TABS.slice(0, 3).map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              isActive={activePanel === tab.id}
              onClick={() => setActivePanel(tab.id)}
            />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mt-1">
          {PANEL_TABS.slice(3).map((tab) => (
            <TabButton
              key={tab.id}
              id={tab.id}
              label={tab.label}
              isActive={activePanel === tab.id}
              onClick={() => setActivePanel(tab.id)}
            />
          ))}
        </div>
        {/* Ornate divider */}
        <div className="mt-2 h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
      </div>

      {/* Panel content - parchment background */}
      <div className="flex-1 overflow-y-auto scrollbar-medieval bg-gradient-to-b from-medieval-800/50 to-medieval-900/50">
        <div className="p-3">
          {activePanel === 'territory' && <TerritoryPanel />}
          {activePanel === 'army' && <ArmyPanel />}
          {activePanel === 'buildings' && <BuildingsPanel />}
          {activePanel === 'spellbook' && <SpellbookPanel />}
          {activePanel === 'alliance' && <AlliancePanel />}
          {activePanel === 'leaderboard' && <LeaderboardPanel />}
          {activePanel === 'settings' && <SettingsPlaceholder />}
        </div>
      </div>

      {/* Bottom ornate corner flourishes */}
      <div className="h-1 bg-gradient-to-r from-transparent via-gold-500/20 to-transparent" />
    </aside>
  );
}

// Tab button component
function TabButton({
  id,
  label,
  isActive,
  onClick,
}: {
  id: PanelType;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center gap-0.5 py-2 px-1 rounded-t
        transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-b from-medieval-600 to-medieval-700 text-gold-400 shadow-glow-gold-sm border-t border-x border-gold-500/30'
          : 'bg-medieval-800/50 text-parchment-400 hover:text-parchment-200 hover:bg-medieval-700/50'
        }
      `}
      title={label}
    >
      {/* Active indicator ribbon */}
      {isActive && (
        <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-gold-500 rounded-full" />
      )}

      <span className={isActive ? 'text-gold-400' : ''}>
        {TabIcons[id] || TabIcons.settings}
      </span>
      <span className="text-[10px] font-medieval uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}

// Placeholder components
function SettingsPlaceholder() {
  return (
    <div className="p-4 text-center">
      <div className="w-12 h-12 mx-auto mb-3 text-parchment-500">
        {TabIcons.settings}
      </div>
      <h3 className="font-medieval text-lg text-parchment-300 mb-2">Settings</h3>
      <p className="text-sm text-parchment-500">Coming soon...</p>
    </div>
  );
}
