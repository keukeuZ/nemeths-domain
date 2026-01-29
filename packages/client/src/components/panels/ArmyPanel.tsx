import { useGameStore } from '../../stores';
import { RACES } from '@nemeths/shared';

// Unit info by race
const RACE_UNITS: Record<string, { tier1: string; tier2: string; tier3: string }> = {
  ironveld: { tier1: 'Shield Guard', tier2: 'Siege Engineer', tier3: 'Iron Golem' },
  vaelthir: { tier1: 'Blood Acolyte', tier2: 'Sanguine Knight', tier3: 'Crimson Behemoth' },
  korrath: { tier1: 'Berserker', tier2: 'Bloodreaver', tier3: 'War Mammoth' },
  sylvaeth: { tier1: 'Thornweaver', tier2: 'Treant', tier3: 'Ancient Grove' },
  ashborn: { tier1: 'Ember Wraith', tier2: 'Phoenix Guard', tier3: 'Inferno Titan' },
  breathborn: { tier1: 'Storm Caller', tier2: 'Sky Warden', tier3: 'Cloud Serpent' },
};

// Mock army data
interface ArmyUnit {
  type: string;
  count: number;
  power: number;
  upkeep: number;
}

export function ArmyPanel() {
  const player = useGameStore((state) => state.player);

  if (!player) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="text-lg mb-2">⚔️ Army</p>
        <p className="text-sm">Register to view your army</p>
      </div>
    );
  }

  const raceUnits = RACE_UNITS[player.race] || RACE_UNITS.ironveld;

  // Mock army composition - would come from server
  const army: ArmyUnit[] = [
    { type: raceUnits.tier1, count: 50, power: 100, upkeep: 25 },
    { type: raceUnits.tier2, count: 20, power: 200, upkeep: 40 },
    { type: raceUnits.tier3, count: 5, power: 500, upkeep: 100 },
    { type: 'Siege Ram', count: 3, power: 300, upkeep: 60 },
  ];

  const totalPower = army.reduce((sum, u) => sum + u.count * u.power, 0);
  const totalUnits = army.reduce((sum, u) => sum + u.count, 0);
  const totalUpkeep = army.reduce((sum, u) => sum + u.count * u.upkeep, 0);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">⚔️ Army</h3>
        <span className="text-gray-400 text-sm">
          {player.race.charAt(0).toUpperCase() + player.race.slice(1)}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-700/50 rounded p-2 text-center">
          <p className="text-xs text-gray-400">Units</p>
          <p className="text-lg font-bold text-white">{totalUnits}</p>
        </div>
        <div className="bg-gray-700/50 rounded p-2 text-center">
          <p className="text-xs text-gray-400">Power</p>
          <p className="text-lg font-bold text-red-400">{(totalPower / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-gray-700/50 rounded p-2 text-center">
          <p className="text-xs text-gray-400">Upkeep</p>
          <p className="text-lg font-bold text-yellow-400">{totalUpkeep}</p>
        </div>
      </div>

      {/* Unit list */}
      <div className="space-y-2">
        {army.map((unit, i) => (
          <div
            key={i}
            className="bg-gray-700/30 border border-gray-600 rounded p-2 flex items-center justify-between"
          >
            <div>
              <p className="text-white font-medium">{unit.type}</p>
              <p className="text-xs text-gray-400">
                Power: {unit.power} | Upkeep: {unit.upkeep} food
              </p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-white">{unit.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="border-t border-gray-700 pt-3 space-y-2">
        <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors">
          Train Units
        </button>
        <button className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors">
          Move Army
        </button>
      </div>

      {/* Race bonus info */}
      <div className="bg-gray-700/30 border border-gray-600 rounded p-2">
        <p className="text-xs text-gray-400">Race Bonus:</p>
        <p className="text-sm text-white">
          {getRaceBonus(player.race)}
        </p>
      </div>
    </div>
  );
}

function getRaceBonus(race: string): string {
  const bonuses: Record<string, string> = {
    ironveld: '+25% Building defense, +25% Stone production',
    vaelthir: 'Blood Sacrifice: Convert units to mana',
    korrath: '+10% Prisoner capture, Blood Frenzy in combat',
    sylvaeth: '+50% Scout range, +25% Wood production',
    ashborn: 'No food upkeep, +25% Fire spell damage',
    breathborn: '+30% Movement speed, Wind Shield ability',
  };
  return bonuses[race] || 'Unknown race';
}
