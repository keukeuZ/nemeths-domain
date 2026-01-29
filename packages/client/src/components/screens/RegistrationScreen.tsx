import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useAuthStore, useGameStore } from '../../stores';
import { RACES, CAPTAIN_CLASSES, CAPTAIN_SKILLS } from '@nemeths/shared';

// ==========================================
// RACE DATA
// ==========================================

const RACE_INFO: Record<string, {
  name: string;
  icon: string;
  tagline: string;
  description: string;
  playstyle: string;
  bonuses: string[];
  penalties: string[];
  foodRate: string;
}> = {
  ironveld: {
    name: 'Ironveld',
    icon: '🛡️',
    tagline: '"We were here before you. We\'ll be here after."',
    description: 'Stone-born defenders from the Titan\'s Bones. Masters of fortification and siege resistance.',
    playstyle: 'Turtle/Builder',
    bonuses: [
      '+25% Building HP',
      '+15% Mine output',
      'Siege Resistance (-30% siege damage taken)',
      'Immovable (+10% DEF on walls)',
    ],
    penalties: [
      '-25% Army movement speed',
      'Slowest units in game',
    ],
    foodRate: '50%',
  },
  vaelthir: {
    name: 'Vaelthir',
    icon: '🩸',
    tagline: '"Power is meant to be spent."',
    description: 'Blood mages born from the Titan\'s Blood. Devastating magical power at a cost.',
    playstyle: 'Burst Magic',
    bonuses: [
      '+30% Magic Power',
      'Fast Mana Regeneration',
      'Blood Sacrifice (10% HP → +20% ATK)',
      'Magic ignores 50% physical DEF',
    ],
    penalties: [
      '-20% Physical Defense',
      '+15% Unit Cost',
    ],
    foodRate: '100%',
  },
  korrath: {
    name: 'Korrath',
    icon: '⚔️',
    tagline: '"Blood for the sleeper!"',
    description: 'Savage warriors from the Titan\'s Nightmares. They live only for battle and conquest.',
    playstyle: 'Aggressive Raider',
    bonuses: [
      'Blood Frenzy (+35% ATK for 24h after attack)',
      '+30% Battle Loot',
      '10% Prisoner Capture (vs 5% base)',
      'War Drums (enemy morale penalty)',
    ],
    penalties: [
      'Alliance trust harder to build',
      'Morale decay if idle (must attack!)',
    ],
    foodRate: '100%',
  },
  sylvaeth: {
    name: 'Sylvaeth',
    icon: '🌿',
    tagline: '"Knowledge is the only currency that matters."',
    description: 'Dream-woven beings from the Titan\'s Dreams. Masters of intelligence and manipulation.',
    playstyle: 'Intel/Diplomacy',
    bonuses: [
      '+50% Scout Range',
      'Perfect Intel (always accurate)',
      '+25% Reputation Gain',
      'Illusions (army appears 50% larger)',
    ],
    penalties: [
      '-30% Attack Power',
      'Cannot build Siege Workshop',
    ],
    foodRate: '80%',
  },
  ashborn: {
    name: 'Ashborn',
    icon: '🔥',
    tagline: '"We have already died. You cannot threaten us."',
    description: 'Undead survivors of the Heartbeat. They don\'t eat, and they keep coming back.',
    playstyle: 'Attrition/Undying',
    bonuses: [
      'Reformation (25% revive in battle)',
      'Curse Spread (-5% enemy stats, stacks)',
      '+2 Captain Death Saves',
      'No food consumption!',
    ],
    penalties: [
      '-15% Resource Production',
      'No Healing Effects work',
    ],
    foodRate: '0%',
  },
  breathborn: {
    name: 'Breathborn',
    icon: '💨',
    tagline: '"Plans are whispers. We are the wind."',
    description: 'Wind spirits from the Titan\'s Breath. Disruptive and unpredictable.',
    playstyle: 'Control/Disruption',
    bonuses: [
      '+15% Movement Speed',
      'Windshear (delay enemy reinforcements 1h)',
      '20% Evasion chance',
      'Scatter (AOE -25% enemy SPD)',
    ],
    penalties: [
      'Buildings decay 1% HP/day',
      '-15% DEF when stationary',
    ],
    foodRate: '70%',
  },
};

// ==========================================
// CLASS DATA
// ==========================================

const CLASS_INFO: Record<string, {
  name: string;
  icon: string;
  tagline: string;
  description: string;
  baseAbilities: string[];
  skills: [string, string];
}> = {
  warlord: {
    name: 'Warlord',
    icon: '⚔️',
    tagline: 'Lead from the front',
    description: 'Masters of warfare who inspire troops and dominate battlefields.',
    baseAbilities: [
      '+5% ATK/DEF when leading army',
      '+2 Captain death saves',
    ],
    skills: ['vanguard', 'fortress'],
  },
  archmage: {
    name: 'Archmage',
    icon: '🔮',
    tagline: 'Bend reality itself',
    description: 'Masters of the arcane who devastate enemies with powerful spells.',
    baseAbilities: [
      '+25% Mana Regeneration',
      'Negate one spell per day',
    ],
    skills: ['destruction', 'protection'],
  },
  highpriest: {
    name: 'High Priest',
    icon: '✨',
    tagline: 'Channel divine power',
    description: 'Servants of the Titan who protect allies and foresee the future.',
    baseAbilities: [
      '+10% to all D20 rolls',
      'Remove one debuff per day',
    ],
    skills: ['crusader', 'oracle'],
  },
  shadowmaster: {
    name: 'Shadow Master',
    icon: '🌑',
    tagline: 'Strike from darkness',
    description: 'Masters of subterfuge who eliminate targets and destroy infrastructure.',
    baseAbilities: [
      'Armies undetected until 3 tiles away',
      '+3 Captain death saves',
    ],
    skills: ['assassin', 'saboteur'],
  },
  merchantprince: {
    name: 'Merchant Prince',
    icon: '💰',
    tagline: 'Buy victory',
    description: 'Masters of commerce who outproduce and outbuild everyone.',
    baseAbilities: [
      '+20% Gold income',
      '-10% Army supply costs',
    ],
    skills: ['profiteer', 'artificer'],
  },
  beastlord: {
    name: 'Beast Lord',
    icon: '🐺',
    tagline: 'Command nature\'s fury',
    description: 'Masters of beasts who overwhelm with numbers or elite creatures.',
    baseAbilities: [
      'Animal companion (+5% to one stat)',
      '+10% Army movement',
    ],
    skills: ['packalpha', 'warden'],
  },
};

// ==========================================
// SKILL DATA
// ==========================================

const SKILL_INFO: Record<string, {
  name: string;
  description: string;
  effects: string[];
  counters: string;
  counteredBy: string;
}> = {
  vanguard: {
    name: 'Vanguard',
    description: 'Offensive warfare - break their lines.',
    effects: ['+20% ATK first round', 'Siege +25% damage'],
    counters: 'Defensive turtles',
    counteredBy: 'Oracle, Fortress',
  },
  fortress: {
    name: 'Fortress',
    description: 'Defensive mastery - hold the line.',
    effects: ['+25% DEF in own territory', 'Buildings +20% HP'],
    counters: 'Vanguard, raiders',
    counteredBy: 'Saboteur, Destruction',
  },
  destruction: {
    name: 'Destruction',
    description: 'Offensive magic - burn everything.',
    effects: ['+30% spell damage', 'Crits cause fire DOT'],
    counters: 'Massed armies, Fortress',
    counteredBy: 'Protection, Oracle',
  },
  protection: {
    name: 'Protection',
    description: 'Defensive magic - shields and wards.',
    effects: ['+15% magic resistance', 'Ward buildings (immune to spell)'],
    counters: 'Destruction mages',
    counteredBy: 'Assassin, Saboteur',
  },
  crusader: {
    name: 'Crusader',
    description: 'Holy warrior - smite the corrupted.',
    effects: ['+20% ATK vs Forsaken', 'One attack can\'t miss'],
    counters: 'Forsaken areas, evasion',
    counteredBy: 'Pack Alpha, Saboteur',
  },
  oracle: {
    name: 'Oracle',
    description: 'Seer of the future - knowledge wins wars.',
    effects: ['See attacks 2h early', 'Predict battle outcome'],
    counters: 'Vanguard, Assassin',
    counteredBy: 'Saboteur, Destruction',
  },
  assassin: {
    name: 'Assassin',
    description: 'Targeted elimination - remove their captain.',
    effects: ['15% captain death save on attack', 'Marked targets +25% damage'],
    counters: 'Captain-dependent builds',
    counteredBy: 'Fortress, Warden',
  },
  saboteur: {
    name: 'Saboteur',
    description: 'Destruction expert - break their economy.',
    effects: ['+50% building damage', 'Destroy bridges instantly'],
    counters: 'Fortress, economy builds',
    counteredBy: 'Pack Alpha, rushes',
  },
  profiteer: {
    name: 'Profiteer',
    description: 'War economy - profit from conflict.',
    effects: ['+30% battle loot', '+20% razing rewards'],
    counters: 'Long wars, attrition',
    counteredBy: 'Early aggression, Saboteur',
  },
  artificer: {
    name: 'Artificer',
    description: 'Technology expert - build faster.',
    effects: ['-25% construction time', 'Siege +20% damage'],
    counters: 'Slow builders, turtles',
    counteredBy: 'Rush strategies, Assassin',
  },
  packalpha: {
    name: 'Pack Alpha',
    description: 'Lead the hunt - overwhelm with numbers.',
    effects: ['Summon 20 wolves daily (free!)', '+5% ATK per 100 units'],
    counters: 'Elite armies',
    counteredBy: 'Destruction (AOE)',
  },
  warden: {
    name: 'Warden',
    description: 'Beast tamer - elite creatures.',
    effects: ['Unlock War Beast unit', 'Beasts protect captain'],
    counters: 'Assassin, glass cannons',
    counteredBy: 'Destruction, Saboteur',
  },
};

// ==========================================
// COMPONENT
// ==========================================

export function RegistrationScreen() {
  const { address } = useAccount();
  const { token } = useAuthStore();
  const { setPlayer } = useGameStore();

  const [step, setStep] = useState<'tier' | 'race' | 'class' | 'skill' | 'name' | 'confirm'>('tier');
  const [tier, setTier] = useState<'free' | 'premium'>('free');
  const [race, setRace] = useState<string | null>(null);
  const [captainClass, setCaptainClass] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [captainName, setCaptainName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceed = () => {
    if (step === 'tier') return true;
    if (step === 'race') return race !== null;
    if (step === 'class') return captainClass !== null;
    if (step === 'skill') return skill !== null;
    if (step === 'name') return captainName.length >= 3 && captainName.length <= 20;
    return true;
  };

  const handleNext = () => {
    const steps: typeof step[] = ['tier', 'race', 'class', 'skill', 'name', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };

  const handleBack = () => {
    const steps: typeof step[] = ['tier', 'race', 'class', 'skill', 'name', 'confirm'];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  const handleRegister = useCallback(async () => {
    if (!race || !captainClass || !skill || !captainName || !token) return;

    setIsRegistering(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/player/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          race,
          captainClass,
          captainSkill: skill,
          captainName,
          isPremium: tier === 'premium',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Registration failed');
      }

      // Update game store with player data
      if (data.data?.player) {
        setPlayer(data.data.player);
      }

      // Reload to show game
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsRegistering(false);
    }
  }, [race, captainClass, skill, captainName, tier, token, setPlayer]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Enter the Domain
          </h1>
          <p className="text-gray-400">Create your captain and begin your conquest</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center mb-8 gap-2">
          {['tier', 'race', 'class', 'skill', 'name', 'confirm'].map((s, i) => {
            const current = ['tier', 'race', 'class', 'skill', 'name', 'confirm'].indexOf(step);
            const isComplete = i < current;
            const isCurrent = i === current;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`
                  w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm
                  transition-all duration-300 shadow-lg
                  ${isCurrent ? 'bg-gradient-to-br from-amber-500 to-orange-600 scale-110' :
                    isComplete ? 'bg-green-600' : 'bg-gray-700/50'}
                `}>
                  {isComplete ? '✓' : i + 1}
                </div>
                {i < 5 && <div className={`w-6 h-1 rounded ${isComplete ? 'bg-green-600' : 'bg-gray-700'}`} />}
              </div>
            );
          })}
        </div>

        {/* Content Card */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-gray-700/50">
          {/* Tier Selection */}
          {step === 'tier' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Choose Your Entry</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TierCard
                  title="Free Entry"
                  plots={2}
                  cost={0}
                  resources="1,000 Gold • 400 Stone/Wood • 200 Food"
                  selected={tier === 'free'}
                  onClick={() => setTier('free')}
                />
                <TierCard
                  title="Premium Entry"
                  plots={10}
                  cost={10}
                  resources="5,000 Gold • 2,000 Stone/Wood • 1,000 Food"
                  selected={tier === 'premium'}
                  onClick={() => setTier('premium')}
                  disabled
                  disabledReason="Requires blockchain (coming soon)"
                />
              </div>
            </div>
          )}

          {/* Race Selection */}
          {step === 'race' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Choose Your Race</h2>
              <p className="text-sm text-gray-400 text-center">Each race has unique bonuses, penalties, and food requirements</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(RACE_INFO).map(([id, info]) => (
                  <RaceCard
                    key={id}
                    info={info}
                    selected={race === id}
                    onClick={() => setRace(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Class Selection */}
          {step === 'class' && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Choose Your Captain Class</h2>
              <p className="text-sm text-gray-400 text-center">
                Each class has base abilities + 2 skills to choose from. Locked for the entire generation!
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {Object.entries(CLASS_INFO).map(([id, info]) => (
                  <ClassCard
                    key={id}
                    info={info}
                    selected={captainClass === id}
                    onClick={() => { setCaptainClass(id); setSkill(null); }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skill Selection */}
          {step === 'skill' && captainClass && (
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-center">Choose Your Skill</h2>
              <p className="text-sm text-center">
                <span className="text-amber-400">{CLASS_INFO[captainClass].name}</span>
                {' '}— pick ONE skill for the entire generation
              </p>
              <div className="grid grid-cols-1 gap-4">
                {CAPTAIN_SKILLS[captainClass as keyof typeof CAPTAIN_SKILLS].map((skillId) => (
                  <SkillCard
                    key={skillId}
                    info={SKILL_INFO[skillId]}
                    selected={skill === skillId}
                    onClick={() => setSkill(skillId)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Name Input */}
          {step === 'name' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Name Your Captain</h2>
              <div className="max-w-md mx-auto">
                <input
                  type="text"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Enter captain name..."
                  maxLength={20}
                  className="w-full px-5 py-4 bg-gray-700/50 border-2 border-gray-600 rounded-xl text-white text-lg placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
                <p className="text-sm text-gray-400 mt-2 text-center">3-20 characters</p>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-center">Confirm Your Captain</h2>

              <div className="bg-gray-900/50 rounded-xl p-5 space-y-4 max-w-md mx-auto">
                <ConfirmRow label="Entry" value={tier === 'premium' ? 'Premium ($10)' : 'Free'} />
                <ConfirmRow label="Race" value={`${race && RACE_INFO[race]?.icon} ${race && RACE_INFO[race]?.name}`} />
                <ConfirmRow label="Class" value={`${captainClass && CLASS_INFO[captainClass]?.icon} ${captainClass && CLASS_INFO[captainClass]?.name}`} />
                <ConfirmRow label="Skill" value={skill && SKILL_INFO[skill]?.name} />
                <ConfirmRow label="Name" value={captainName} highlight />
                <ConfirmRow label="Starting Plots" value={tier === 'premium' ? '10' : '2'} highlight />
              </div>

              {error && (
                <p className="text-red-400 text-center text-sm">{error}</p>
              )}

              <button
                onClick={handleRegister}
                disabled={isRegistering}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-green-500/25"
              >
                {isRegistering ? 'Entering...' : '⚔️ Enter the Battle!'}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            {step !== 'tier' ? (
              <button
                onClick={handleBack}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors"
              >
                ← Back
              </button>
            ) : <div />}

            {step !== 'confirm' && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-xl font-medium transition-all"
              >
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function TierCard({ title, plots, cost, resources, selected, onClick, disabled, disabledReason }: {
  title: string;
  plots: number;
  cost: number;
  resources: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-5 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-500/10'
          : disabled
          ? 'border-gray-700 bg-gray-800/30 opacity-50 cursor-not-allowed'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/20 hover:bg-gray-700/30'
      }`}
    >
      <h3 className="font-bold text-xl mb-2">{title}</h3>
      <p className="text-3xl font-black text-green-400 mb-2">{plots} Plots</p>
      <p className="text-sm text-gray-400 mb-2">{cost > 0 ? `$${cost} USDC` : 'Free to play'}</p>
      <p className="text-xs text-gray-500">{resources}</p>
      {disabledReason && <p className="text-xs text-amber-400 mt-2">{disabledReason}</p>}
    </button>
  );
}

function RaceCard({ info, selected, onClick }: {
  info: typeof RACE_INFO[string];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-500/20'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{info.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{info.name}</h3>
          <p className="text-xs text-gray-400 italic truncate">{info.tagline}</p>
        </div>
        {selected && <span className="text-amber-400 text-xl">✓</span>}
      </div>

      {/* Description & Playstyle */}
      <p className="text-sm text-gray-300 mb-2">{info.description}</p>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-blue-400 font-medium">{info.playstyle}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          info.foodRate === '0%' ? 'bg-green-900/70 text-green-300' :
          info.foodRate === '50%' ? 'bg-blue-900/70 text-blue-300' :
          info.foodRate === '70%' ? 'bg-cyan-900/70 text-cyan-300' :
          info.foodRate === '80%' ? 'bg-purple-900/70 text-purple-300' :
          'bg-gray-700 text-gray-300'
        }`}>
          {info.foodRate} food
        </span>
      </div>

      {/* Bonuses - Always visible */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-green-400 mb-1">✓ Bonuses</p>
        <ul className="text-xs text-gray-300 space-y-0.5">
          {info.bonuses.map((bonus, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-green-500 mt-0.5">•</span>
              <span>{bonus}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Penalties - Always visible */}
      <div>
        <p className="text-xs font-semibold text-red-400 mb-1">✗ Penalties</p>
        <ul className="text-xs text-gray-300 space-y-0.5">
          {info.penalties.map((penalty, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-red-500 mt-0.5">•</span>
              <span>{penalty}</span>
            </li>
          ))}
        </ul>
      </div>
    </button>
  );
}

function ClassCard({ info, selected, onClick }: {
  info: typeof CLASS_INFO[string];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-amber-500 bg-amber-900/20 shadow-lg shadow-amber-500/20'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-3xl">{info.icon}</span>
        <div className="flex-1">
          <h3 className="font-bold text-lg">{info.name}</h3>
          <p className="text-xs text-gray-400 italic">{info.tagline}</p>
        </div>
        {selected && <span className="text-amber-400 text-xl">✓</span>}
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-3">{info.description}</p>

      {/* Base Abilities - Always visible */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-blue-400 mb-1">✦ Base Abilities (all {info.name}s get)</p>
        <ul className="text-xs text-gray-300 space-y-0.5">
          {info.baseAbilities.map((ability, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>{ability}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Available Skills - Always visible */}
      <div>
        <p className="text-xs font-semibold text-purple-400 mb-1">⚡ Choose ONE Skill</p>
        <div className="flex flex-wrap gap-2">
          {info.skills.map((skillId) => (
            <span key={skillId} className="text-xs bg-purple-900/50 text-purple-300 px-2 py-1 rounded-lg">
              {SKILL_INFO[skillId]?.name}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}

function SkillCard({ info, selected, onClick }: {
  info: typeof SKILL_INFO[string];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-5 rounded-xl border-2 text-left transition-all ${
        selected
          ? 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/20'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/20'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-bold text-xl">{info.name}</h3>
          <p className="text-sm text-gray-300">{info.description}</p>
        </div>
        {selected && <span className="text-green-400 text-2xl">✓</span>}
      </div>

      {/* Effects */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-green-400 mb-2">✦ Effects</p>
        <div className="flex flex-wrap gap-2">
          {info.effects.map((effect, i) => (
            <span key={i} className="text-sm bg-green-900/50 text-green-300 px-3 py-1.5 rounded-lg">
              {effect}
            </span>
          ))}
        </div>
      </div>

      {/* Counter Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-400 mb-1">⚔️ Strong Against</p>
          <p className="text-sm text-gray-300">{info.counters}</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-xs font-semibold text-red-400 mb-1">🛡️ Weak Against</p>
          <p className="text-sm text-gray-300">{info.counteredBy}</p>
        </div>
      </div>
    </button>
  );
}

function ConfirmRow({ label, value, highlight }: { label: string; value?: string | null; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-gray-400">{label}</span>
      <span className={highlight ? 'text-amber-400 font-bold' : 'text-white font-medium'}>
        {value || '-'}
      </span>
    </div>
  );
}
