import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useRegisterFree, useRegisterPremium, useUSDCBalance, useApproveUSDC, useUSDCAllowance, useContractAddresses } from '../../hooks/useContracts';
import { useGameStore, toast } from '../../stores';
import { RACES, CAPTAIN_CLASSES, CAPTAIN_SKILLS } from '@nemeths/shared';

// Race info
const RACE_INFO: Record<string, { name: string; icon: string; description: string; bonus: string }> = {
  ironveld: { name: 'Ironveld', icon: '🛡️', description: 'Stalwart defenders with unbreakable fortresses', bonus: '+25% Building defense, +25% Stone' },
  vaelthir: { name: 'Vaelthir', icon: '🩸', description: 'Blood mages who sacrifice for power', bonus: 'Blood Sacrifice ability, Enhanced blood magic' },
  korrath: { name: 'Korrath', icon: '⚔️', description: 'Savage warriors living for battle', bonus: '+10% Prisoner capture, Blood Frenzy' },
  sylvaeth: { name: 'Sylvaeth', icon: '🌿', description: 'Forest guardians with keen senses', bonus: '+50% Scout range, +25% Wood' },
  ashborn: { name: 'Ashborn', icon: '🔥', description: 'Elemental beings of pure flame', bonus: 'No food upkeep, +25% Fire damage' },
  breathborn: { name: 'Breathborn', icon: '💨', description: 'Wind riders swift as storms', bonus: '+30% Movement, Wind Shield' },
};

// Captain class info
const CLASS_INFO: Record<string, { name: string; icon: string; description: string }> = {
  warlord: { name: 'Warlord', icon: '⚔️', description: 'Master of warfare and tactics' },
  archmage: { name: 'Archmage', icon: '🔮', description: 'Wielder of devastating magic' },
  highpriest: { name: 'High Priest', icon: '✨', description: 'Divine protector and healer' },
  shadowmaster: { name: 'Shadow Master', icon: '🌑', description: 'Master of stealth and assassination' },
  merchantprince: { name: 'Merchant Prince', icon: '💰', description: 'Economic genius and trader' },
  beastlord: { name: 'Beast Lord', icon: '🐺', description: 'Commander of wild creatures' },
};

// Skill info
const SKILL_INFO: Record<string, { name: string; description: string }> = {
  vanguard: { name: 'Vanguard', description: '+20% damage in first combat round' },
  fortress: { name: 'Fortress', description: '+25% defense when defending territory' },
  destruction: { name: 'Destruction', description: '+30% offensive spell damage' },
  protection: { name: 'Protection', description: '+30% defensive spell effectiveness' },
  crusader: { name: 'Crusader', description: '+20% damage vs Forsaken' },
  oracle: { name: 'Oracle', description: 'See incoming attacks 1 hour early' },
  assassin: { name: 'Assassin', description: '+50% captain assassination chance' },
  saboteur: { name: 'Saboteur', description: '+50% building sabotage success' },
  profiteer: { name: 'Profiteer', description: '+25% gold from all sources' },
  artificer: { name: 'Artificer', description: '-25% building construction time' },
  packalpha: { name: 'Pack Alpha', description: 'Summon wolf pack daily' },
  warden: { name: 'Warden', description: '+50% beast unit effectiveness' },
};

export function RegistrationScreen() {
  const { address } = useAccount();
  const addresses = useContractAddresses();
  const { data: usdcBalance } = useUSDCBalance(address);
  const { data: allowance } = useUSDCAllowance(address, addresses?.nemethsGeneration);
  const { approve, isPending: isApproving } = useApproveUSDC();
  const { register: registerFree, isPending: isRegisteringFree, isConfirming: isConfirmingFree, isSuccess: isSuccessFree } = useRegisterFree();
  const { register: registerPremium, isPending: isRegisteringPremium, isConfirming: isConfirmingPremium, isSuccess: isSuccessPremium } = useRegisterPremium();

  const [step, setStep] = useState<'tier' | 'race' | 'class' | 'skill' | 'name' | 'confirm'>('tier');
  const [tier, setTier] = useState<'free' | 'premium' | null>(null);
  const [race, setRace] = useState<string | null>(null);
  const [captainClass, setCaptainClass] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [captainName, setCaptainName] = useState('');

  // Premium cost
  const PREMIUM_COST = 10_000_000n; // 10 USDC (6 decimals)
  const hasEnoughUSDC = usdcBalance !== undefined && usdcBalance >= PREMIUM_COST;
  const hasAllowance = allowance !== undefined && allowance >= PREMIUM_COST;

  const handleApprove = useCallback(() => {
    if (!addresses?.nemethsGeneration) return;
    approve(addresses.nemethsGeneration, PREMIUM_COST);
  }, [addresses, approve]);

  const handleRegister = useCallback(() => {
    if (!race || !captainClass || !skill || !captainName) return;

    const raceIndex = RACES.indexOf(race as any);
    const classIndex = CAPTAIN_CLASSES.indexOf(captainClass as any);

    // Get skill index within the class
    const classSkills = CAPTAIN_SKILLS[captainClass as keyof typeof CAPTAIN_SKILLS];
    const skillIndex = classSkills.indexOf(skill as any);

    if (tier === 'free') {
      registerFree(raceIndex, classIndex, skillIndex, captainName);
    } else {
      registerPremium(raceIndex, classIndex, skillIndex, captainName);
    }
  }, [tier, race, captainClass, skill, captainName, registerFree, registerPremium]);

  const canProceed = () => {
    if (step === 'tier') return tier !== null;
    if (step === 'race') return race !== null;
    if (step === 'class') return captainClass !== null;
    if (step === 'skill') return skill !== null;
    if (step === 'name') return captainName.length >= 3 && captainName.length <= 20;
    return true;
  };

  const handleNext = () => {
    const steps: typeof step[] = ['tier', 'race', 'class', 'skill', 'name', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: typeof step[] = ['tier', 'race', 'class', 'skill', 'name', 'confirm'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Join the Battle</h1>
          <p className="text-gray-400">Create your captain and begin your conquest</p>
        </div>

        {/* Progress */}
        <div className="flex justify-center mb-8">
          {['tier', 'race', 'class', 'skill', 'name', 'confirm'].map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === s ? 'bg-blue-600' :
                ['tier', 'race', 'class', 'skill', 'name', 'confirm'].indexOf(step) > i ? 'bg-green-600' :
                'bg-gray-700'
              }`}>
                {i + 1}
              </div>
              {i < 5 && <div className="w-8 h-1 bg-gray-700" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-gray-800 rounded-lg p-6">
          {/* Tier selection */}
          {step === 'tier' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Choose Your Entry</h2>
              <div className="grid grid-cols-2 gap-4">
                <TierCard
                  title="Free Entry"
                  plots={2}
                  cost={0}
                  resources="1,000 Gold, 400 Stone/Wood, 200 Food"
                  selected={tier === 'free'}
                  onClick={() => setTier('free')}
                />
                <TierCard
                  title="Premium Entry"
                  plots={10}
                  cost={10}
                  resources="5,000 Gold, 2,000 Stone/Wood, 1,000 Food"
                  selected={tier === 'premium'}
                  onClick={() => setTier('premium')}
                  disabled={!hasEnoughUSDC}
                />
              </div>
              {tier === 'premium' && !hasEnoughUSDC && (
                <p className="text-red-400 text-sm text-center">
                  Insufficient USDC balance (need 10 USDC)
                </p>
              )}
            </div>
          )}

          {/* Race selection */}
          {step === 'race' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Choose Your Race</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(RACE_INFO).map(([id, info]) => (
                  <SelectionCard
                    key={id}
                    icon={info.icon}
                    title={info.name}
                    description={info.description}
                    bonus={info.bonus}
                    selected={race === id}
                    onClick={() => setRace(id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Class selection */}
          {step === 'class' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Choose Your Captain Class</h2>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(CLASS_INFO).map(([id, info]) => (
                  <SelectionCard
                    key={id}
                    icon={info.icon}
                    title={info.name}
                    description={info.description}
                    selected={captainClass === id}
                    onClick={() => {
                      setCaptainClass(id);
                      setSkill(null); // Reset skill when class changes
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Skill selection */}
          {step === 'skill' && captainClass && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Choose Your Captain Skill</h2>
              <div className="grid grid-cols-2 gap-3">
                {CAPTAIN_SKILLS[captainClass as keyof typeof CAPTAIN_SKILLS].map((skillId) => {
                  const info = SKILL_INFO[skillId];
                  return (
                    <SelectionCard
                      key={skillId}
                      icon={CLASS_INFO[captainClass].icon}
                      title={info.name}
                      description={info.description}
                      selected={skill === skillId}
                      onClick={() => setSkill(skillId)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Name input */}
          {step === 'name' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Name Your Captain</h2>
              <div className="max-w-md mx-auto">
                <input
                  type="text"
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="Enter captain name..."
                  maxLength={20}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
                <p className="text-sm text-gray-400 mt-2 text-center">
                  3-20 characters
                </p>
              </div>
            </div>
          )}

          {/* Confirmation */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center mb-4">Confirm Your Captain</h2>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Entry:</span>
                  <span className="text-white font-medium">
                    {tier === 'premium' ? 'Premium ($10 USDC)' : 'Free'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Race:</span>
                  <span className="text-white font-medium">
                    {race && RACE_INFO[race]?.icon} {race && RACE_INFO[race]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Class:</span>
                  <span className="text-white font-medium">
                    {captainClass && CLASS_INFO[captainClass]?.icon} {captainClass && CLASS_INFO[captainClass]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Skill:</span>
                  <span className="text-white font-medium">
                    {skill && SKILL_INFO[skill]?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Name:</span>
                  <span className="text-white font-bold">{captainName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Starting Plots:</span>
                  <span className="text-green-400 font-medium">
                    {tier === 'premium' ? '10' : '2'}
                  </span>
                </div>
              </div>

              {/* Premium approval */}
              {tier === 'premium' && !hasAllowance && (
                <button
                  onClick={handleApprove}
                  disabled={isApproving}
                  className="w-full py-3 px-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  {isApproving ? 'Approving USDC...' : 'Approve USDC'}
                </button>
              )}

              {/* Register button */}
              <button
                onClick={handleRegister}
                disabled={
                  (tier === 'premium' && !hasAllowance) ||
                  isRegisteringFree || isConfirmingFree ||
                  isRegisteringPremium || isConfirmingPremium
                }
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                {isRegisteringFree || isRegisteringPremium ? 'Confirming...' :
                 isConfirmingFree || isConfirmingPremium ? 'Processing...' :
                 'Enter the Battle!'}
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            {step !== 'tier' ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
              >
                Back
              </button>
            ) : <div />}

            {step !== 'confirm' && (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TierCardProps {
  title: string;
  plots: number;
  cost: number;
  resources: string;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function TierCard({ title, plots, cost, resources, selected, onClick, disabled }: TierCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-4 rounded-lg border-2 text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-900/30'
          : disabled
          ? 'border-gray-700 bg-gray-800/50 opacity-50 cursor-not-allowed'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
      }`}
    >
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-2xl font-black text-green-400 mb-2">{plots} Plots</p>
      <p className="text-sm text-gray-400 mb-2">
        {cost > 0 ? `$${cost} USDC` : 'Free to play'}
      </p>
      <p className="text-xs text-gray-500">{resources}</p>
    </button>
  );
}

interface SelectionCardProps {
  icon: string;
  title: string;
  description: string;
  bonus?: string;
  selected: boolean;
  onClick: () => void;
}

function SelectionCard({ icon, title, description, bonus, selected, onClick }: SelectionCardProps) {
  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border-2 text-left transition-colors ${
        selected
          ? 'border-blue-500 bg-blue-900/30'
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="font-bold">{title}</span>
      </div>
      <p className="text-xs text-gray-400">{description}</p>
      {bonus && (
        <p className="text-xs text-green-400 mt-1">{bonus}</p>
      )}
    </button>
  );
}
