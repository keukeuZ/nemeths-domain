import { useState, useEffect, useCallback } from 'react';
import { getD20Modifier, getRollDescription } from '../../stores';

interface D20AnimationProps {
  attackerRoll: number;
  defenderRoll: number;
  attackerStrength: number;
  defenderStrength: number;
  onComplete: () => void;
}

type AnimationPhase = 'rolling' | 'showing_attacker' | 'showing_defender' | 'calculating' | 'result';

export function D20Animation({
  attackerRoll,
  defenderRoll,
  attackerStrength,
  defenderStrength,
  onComplete,
}: D20AnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('rolling');
  const [displayedAttackerRoll, setDisplayedAttackerRoll] = useState(0);
  const [displayedDefenderRoll, setDisplayedDefenderRoll] = useState(0);

  // Animate dice rolling
  useEffect(() => {
    if (phase === 'rolling') {
      let frame = 0;
      const maxFrames = 20;

      const interval = setInterval(() => {
        frame++;
        setDisplayedAttackerRoll(Math.floor(Math.random() * 20) + 1);
        setDisplayedDefenderRoll(Math.floor(Math.random() * 20) + 1);

        if (frame >= maxFrames) {
          clearInterval(interval);
          setPhase('showing_attacker');
        }
      }, 100);

      return () => clearInterval(interval);
    }
  }, [phase]);

  // Sequence through phases
  useEffect(() => {
    if (phase === 'showing_attacker') {
      setDisplayedAttackerRoll(attackerRoll);
      const timer = setTimeout(() => setPhase('showing_defender'), 1000);
      return () => clearTimeout(timer);
    }

    if (phase === 'showing_defender') {
      setDisplayedDefenderRoll(defenderRoll);
      const timer = setTimeout(() => setPhase('calculating'), 1000);
      return () => clearTimeout(timer);
    }

    if (phase === 'calculating') {
      const timer = setTimeout(() => setPhase('result'), 1500);
      return () => clearTimeout(timer);
    }

    if (phase === 'result') {
      const timer = setTimeout(onComplete, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, attackerRoll, defenderRoll, onComplete]);

  const attackerMod = getD20Modifier(attackerRoll);
  const defenderMod = getD20Modifier(defenderRoll);
  const attackerEffective = Math.floor(attackerStrength * attackerMod / 100);
  const defenderEffective = Math.floor(defenderStrength * defenderMod / 100);

  const winner = attackerEffective > defenderEffective ? 'attacker' :
                 defenderEffective > attackerEffective ? 'defender' : 'draw';

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="text-center">
        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-8 animate-pulse">
          {phase === 'rolling' && '⚔️ Rolling the Dice... ⚔️'}
          {phase === 'showing_attacker' && '🎲 Attacker Rolls!'}
          {phase === 'showing_defender' && '🎲 Defender Rolls!'}
          {phase === 'calculating' && '📊 Calculating Result...'}
          {phase === 'result' && (winner === 'attacker' ? '🏆 VICTORY!' : winner === 'defender' ? '💀 DEFEAT!' : '🤝 DRAW!')}
        </h2>

        {/* Dice container */}
        <div className="flex justify-center gap-16 mb-8">
          {/* Attacker */}
          <div className="text-center">
            <p className="text-red-400 text-lg font-bold mb-3">ATTACKER</p>
            <AnimatedD20
              value={displayedAttackerRoll}
              finalValue={attackerRoll}
              isRevealed={phase !== 'rolling'}
              highlight={phase === 'showing_attacker'}
            />
            {phase !== 'rolling' && (
              <div className="mt-3 space-y-1">
                <p className="text-white text-lg">{getRollDescription(attackerRoll)}</p>
                <p className={`text-sm ${attackerMod >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {attackerMod}% modifier
                </p>
              </div>
            )}
          </div>

          {/* VS */}
          <div className="flex items-center">
            <span className="text-5xl text-gray-500 font-black">VS</span>
          </div>

          {/* Defender */}
          <div className="text-center">
            <p className="text-blue-400 text-lg font-bold mb-3">DEFENDER</p>
            <AnimatedD20
              value={displayedDefenderRoll}
              finalValue={defenderRoll}
              isRevealed={phase !== 'rolling' && phase !== 'showing_attacker'}
              highlight={phase === 'showing_defender'}
            />
            {(phase === 'showing_defender' || phase === 'calculating' || phase === 'result') && (
              <div className="mt-3 space-y-1">
                <p className="text-white text-lg">{getRollDescription(defenderRoll)}</p>
                <p className={`text-sm ${defenderMod >= 100 ? 'text-green-400' : 'text-red-400'}`}>
                  {defenderMod}% modifier
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Calculation display */}
        {(phase === 'calculating' || phase === 'result') && (
          <div className="flex justify-center gap-16 text-lg">
            <div className="text-red-400">
              <p>{attackerStrength.toLocaleString()} × {attackerMod}%</p>
              <p className="font-bold text-2xl">{attackerEffective.toLocaleString()}</p>
            </div>
            <div className="text-gray-500 self-center">vs</div>
            <div className="text-blue-400">
              <p>{defenderStrength.toLocaleString()} × {defenderMod}%</p>
              <p className="font-bold text-2xl">{defenderEffective.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Result */}
        {phase === 'result' && (
          <div className={`mt-8 text-4xl font-black ${
            winner === 'attacker' ? 'text-green-400' :
            winner === 'defender' ? 'text-red-400' :
            'text-yellow-400'
          }`}>
            {winner === 'attacker' && 'TERRITORY CONQUERED!'}
            {winner === 'defender' && 'ATTACK REPELLED!'}
            {winner === 'draw' && 'STALEMATE - DEFENDER HOLDS!'}
          </div>
        )}
      </div>
    </div>
  );
}

// Single D20 die with animation
interface AnimatedD20Props {
  value: number;
  finalValue: number;
  isRevealed: boolean;
  highlight: boolean;
}

function AnimatedD20({ value, finalValue, isRevealed, highlight }: AnimatedD20Props) {
  const isCritFail = isRevealed && finalValue === 1;
  const isCritSuccess = isRevealed && finalValue === 20;

  return (
    <div
      className={`
        relative w-32 h-32 flex items-center justify-center
        transition-all duration-300 transform
        ${!isRevealed ? 'animate-spin' : ''}
        ${highlight ? 'scale-125' : ''}
      `}
    >
      {/* D20 shape (icosahedron approximation) */}
      <div
        className={`
          w-full h-full flex items-center justify-center
          text-5xl font-black
          clip-hexagon
          transition-all duration-300
          ${isCritFail ? 'bg-red-700 text-red-200 animate-shake' : ''}
          ${isCritSuccess ? 'bg-green-700 text-green-200 animate-pulse' : ''}
          ${!isCritFail && !isCritSuccess ? 'bg-gray-700 text-white' : ''}
          ${highlight ? 'ring-4 ring-yellow-400' : ''}
        `}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      >
        {value}
      </div>

      {/* Critical effects */}
      {isCritSuccess && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl animate-ping">✨</span>
        </div>
      )}
      {isCritFail && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-6xl animate-bounce">💀</span>
        </div>
      )}
    </div>
  );
}

// Compact D20 roll display for history/logs
interface D20RollDisplayProps {
  attackerRoll: number;
  defenderRoll: number;
  result: 'attacker_wins' | 'defender_wins' | 'draw';
  compact?: boolean;
}

export function D20RollDisplay({ attackerRoll, defenderRoll, result, compact = false }: D20RollDisplayProps) {
  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-sm">
        <span className="text-red-400">{attackerRoll}</span>
        <span className="text-gray-500">vs</span>
        <span className="text-blue-400">{defenderRoll}</span>
        <span className={`ml-1 ${
          result === 'attacker_wins' ? 'text-green-400' :
          result === 'defender_wins' ? 'text-red-400' :
          'text-yellow-400'
        }`}>
          ({result === 'attacker_wins' ? 'W' : result === 'defender_wins' ? 'L' : 'D'})
        </span>
      </span>
    );
  }

  return (
    <div className="flex items-center gap-4 p-2 bg-gray-800 rounded">
      <div className="flex items-center gap-2">
        <MiniD20 value={attackerRoll} color="red" />
        <span className="text-gray-400">vs</span>
        <MiniD20 value={defenderRoll} color="blue" />
      </div>
      <span className={`font-medium ${
        result === 'attacker_wins' ? 'text-green-400' :
        result === 'defender_wins' ? 'text-red-400' :
        'text-yellow-400'
      }`}>
        {result === 'attacker_wins' ? 'Victory' : result === 'defender_wins' ? 'Defeat' : 'Draw'}
      </span>
    </div>
  );
}

function MiniD20({ value, color }: { value: number; color: 'red' | 'blue' }) {
  const isCrit = value === 1 || value === 20;

  return (
    <div className={`
      w-8 h-8 flex items-center justify-center
      rounded font-bold text-sm
      ${color === 'red' ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300'}
      ${isCrit ? 'ring-2 ring-yellow-400' : ''}
    `}>
      {value}
    </div>
  );
}
