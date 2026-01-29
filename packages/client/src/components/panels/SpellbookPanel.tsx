import { useState } from 'react';
import { useGameStore } from '../../stores';

// Spell schools
const SPELL_SCHOOLS = [
  { id: 'fire', name: 'Fire', icon: '🔥', color: 'text-orange-400', bgColor: 'bg-orange-900/30' },
  { id: 'ice', name: 'Ice', icon: '❄️', color: 'text-cyan-400', bgColor: 'bg-cyan-900/30' },
  { id: 'earth', name: 'Earth', icon: '🪨', color: 'text-amber-400', bgColor: 'bg-amber-900/30' },
  { id: 'shadow', name: 'Shadow', icon: '🌑', color: 'text-purple-400', bgColor: 'bg-purple-900/30' },
  { id: 'holy', name: 'Holy', icon: '✨', color: 'text-yellow-400', bgColor: 'bg-yellow-900/30' },
  { id: 'blood', name: 'Blood', icon: '🩸', color: 'text-red-400', bgColor: 'bg-red-900/30' },
] as const;

// Spell definitions (sample)
const SPELLS: Record<string, SpellData[]> = {
  fire: [
    { id: 'fireball', name: 'Fireball', manaCost: 20, cooldown: 0, description: 'Deal 100 damage to target army', d20Effect: 'Crit: Double damage' },
    { id: 'inferno', name: 'Inferno', manaCost: 50, cooldown: 24, description: 'Deal 50 damage to all armies in zone', d20Effect: 'Crit: Leaves burning for 3 ticks' },
    { id: 'flame_shield', name: 'Flame Shield', manaCost: 30, cooldown: 12, description: '+25% defense for 6 hours', d20Effect: 'Crit: Also reflects 10% damage' },
  ],
  ice: [
    { id: 'frost_bolt', name: 'Frost Bolt', manaCost: 15, cooldown: 0, description: 'Deal 75 damage + slow enemy', d20Effect: 'Crit: Freeze for 1 hour' },
    { id: 'blizzard', name: 'Blizzard', manaCost: 60, cooldown: 48, description: 'Slow all enemies in zone by 50%', d20Effect: 'Crit: 75% slow' },
    { id: 'ice_wall', name: 'Ice Wall', manaCost: 40, cooldown: 24, description: 'Block territory for 12 hours', d20Effect: 'Crit: 24 hours' },
  ],
  earth: [
    { id: 'stone_skin', name: 'Stone Skin', manaCost: 25, cooldown: 6, description: '+50% defense for 3 hours', d20Effect: 'Crit: +75% defense' },
    { id: 'earthquake', name: 'Earthquake', manaCost: 70, cooldown: 72, description: 'Damage all buildings in zone', d20Effect: 'Crit: Buildings disabled 6 hours' },
    { id: 'golem', name: 'Summon Golem', manaCost: 100, cooldown: 168, description: 'Summon Iron Golem unit', d20Effect: 'Crit: Elite Golem' },
  ],
  shadow: [
    { id: 'cloak', name: 'Shadow Cloak', manaCost: 20, cooldown: 6, description: 'Hide army from detection', d20Effect: 'Crit: +50% ambush damage' },
    { id: 'assassinate', name: 'Assassinate', manaCost: 80, cooldown: 72, description: 'Attempt to kill enemy captain', d20Effect: 'Crit: Guaranteed kill' },
    { id: 'sabotage', name: 'Sabotage', manaCost: 35, cooldown: 24, description: 'Disable enemy building', d20Effect: 'Crit: Destroy building' },
  ],
  holy: [
    { id: 'heal', name: 'Mass Heal', manaCost: 30, cooldown: 6, description: 'Restore 200 army strength', d20Effect: 'Crit: Full heal' },
    { id: 'bless', name: 'Divine Blessing', manaCost: 40, cooldown: 24, description: '+20% all stats for 12 hours', d20Effect: 'Crit: +30% stats' },
    { id: 'resurrect', name: 'Resurrect', manaCost: 150, cooldown: 168, description: 'Revive fallen captain', d20Effect: 'Crit: Full health' },
  ],
  blood: [
    { id: 'sacrifice', name: 'Blood Sacrifice', manaCost: 0, cooldown: 6, description: 'Convert 100 units to 50 mana', d20Effect: 'Crit: 75 mana' },
    { id: 'drain', name: 'Life Drain', manaCost: 25, cooldown: 0, description: 'Steal 50 strength from enemy', d20Effect: 'Crit: Steal 100' },
    { id: 'frenzy', name: 'Blood Frenzy', manaCost: 60, cooldown: 48, description: '+50% attack, -25% defense', d20Effect: 'Crit: +75% attack' },
  ],
};

interface SpellData {
  id: string;
  name: string;
  manaCost: number;
  cooldown: number; // hours
  description: string;
  d20Effect: string;
}

export function SpellbookPanel() {
  const [activeSchool, setActiveSchool] = useState<string>('fire');
  const player = useGameStore((state) => state.player);

  if (!player) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="text-lg mb-2">📖 Spellbook</p>
        <p className="text-sm">Register to view spells</p>
      </div>
    );
  }

  const currentMana = player.resources.mana;
  const schoolSpells = SPELLS[activeSchool] || [];
  const activeSchoolData = SPELL_SCHOOLS.find((s) => s.id === activeSchool)!;

  return (
    <div className="p-4 space-y-4">
      {/* Header with mana */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">📖 Spellbook</h3>
        <div className="flex items-center gap-1">
          <span className="text-purple-400">✨</span>
          <span className="text-purple-400 font-bold">{currentMana}</span>
          <span className="text-gray-500 text-sm">mana</span>
        </div>
      </div>

      {/* School tabs */}
      <div className="grid grid-cols-6 gap-1">
        {SPELL_SCHOOLS.map((school) => (
          <button
            key={school.id}
            onClick={() => setActiveSchool(school.id)}
            className={`p-2 rounded text-center transition-colors ${
              activeSchool === school.id
                ? `${school.bgColor} ${school.color} ring-1 ring-current`
                : 'bg-gray-700/50 text-gray-400 hover:text-white'
            }`}
            title={school.name}
          >
            <span className="text-xl">{school.icon}</span>
          </button>
        ))}
      </div>

      {/* School name */}
      <div className={`text-center ${activeSchoolData.color}`}>
        <span className="text-lg font-medium">{activeSchoolData.name} Magic</span>
      </div>

      {/* Spell list */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {schoolSpells.map((spell) => (
          <SpellCard
            key={spell.id}
            spell={spell}
            canCast={currentMana >= spell.manaCost}
            onCast={() => console.log('Cast:', spell.id)}
          />
        ))}
      </div>

      {/* D20 info */}
      <div className="bg-gray-700/30 border border-gray-600 rounded p-2 text-xs">
        <p className="text-gray-400">
          <span className="text-yellow-400">🎲 D20 Spell Rolls:</span> Roll 1 = Fizzle, Roll 20 = Critical Effect
        </p>
      </div>
    </div>
  );
}

interface SpellCardProps {
  spell: SpellData;
  canCast: boolean;
  onCast: () => void;
}

function SpellCard({ spell, canCast, onCast }: SpellCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-gray-700/30 border rounded transition-colors ${
      canCast ? 'border-gray-600 hover:border-gray-500' : 'border-gray-700 opacity-60'
    }`}>
      <div
        className="p-2 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <span className="text-white font-medium">{spell.name}</span>
          <div className="flex items-center gap-2">
            <span className="text-purple-400 text-sm">
              {spell.manaCost} ✨
            </span>
            {spell.cooldown > 0 && (
              <span className="text-gray-500 text-xs">
                {spell.cooldown}h CD
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2 space-y-2">
          <p className="text-sm text-gray-300">{spell.description}</p>
          <p className="text-xs text-yellow-400/80">{spell.d20Effect}</p>
          <button
            onClick={onCast}
            disabled={!canCast}
            className={`w-full py-1 px-3 rounded text-sm font-medium transition-colors ${
              canCast
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            Cast Spell
          </button>
        </div>
      )}
    </div>
  );
}
