import { useState, useCallback } from 'react';
import { useCombatStore, useGameStore, useUIStore, generateSecret, getD20Modifier, getRollDescription } from '../../stores';
import { useInitiateCombat, useAttackerReveal, useDefenderCommit, useDefenderReveal } from '../../hooks/useContracts';

// Combat initiation modal
export function CombatInitiateModal() {
  const { pendingAttack, setPendingAttack } = useCombatStore();
  const { player } = useGameStore();
  const { closeModal } = useUIStore();
  const { initiate, isPending, isConfirming } = useInitiateCombat();

  const [armyStrength, setArmyStrength] = useState(1000);
  const [secret, setSecret] = useState<bigint | null>(null);

  const handleInitiate = useCallback(() => {
    if (!pendingAttack || !player) return;

    // Generate secret for commit-reveal
    const newSecret = generateSecret();
    setSecret(newSecret);

    // Store secret locally (would save to localStorage in production)
    localStorage.setItem(`combat-secret-${Date.now()}`, newSecret.toString());

    // Initiate combat on-chain
    initiate(pendingAttack.targetTokenId, armyStrength, newSecret);
  }, [pendingAttack, player, armyStrength, initiate]);

  const handleClose = () => {
    setPendingAttack(null);
    closeModal();
  };

  if (!pendingAttack) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-600">
        <h2 className="text-xl font-bold text-white mb-4">
          ⚔️ Initiate Attack
        </h2>

        <div className="space-y-4">
          {/* Target info */}
          <div className="bg-gray-700/50 rounded p-3">
            <p className="text-gray-400 text-sm">Target Territory</p>
            <p className="text-white font-medium">
              ({pendingAttack.targetX}, {pendingAttack.targetY})
            </p>
          </div>

          {/* Army strength selector */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Army Strength
            </label>
            <input
              type="range"
              min={100}
              max={player?.totalArmySize || 10000}
              step={100}
              value={armyStrength}
              onChange={(e) => setArmyStrength(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-500">Min: 100</span>
              <span className="text-white font-medium">{armyStrength.toLocaleString()}</span>
              <span className="text-gray-500">Max: {(player?.totalArmySize || 10000).toLocaleString()}</span>
            </div>
          </div>

          {/* Combat info */}
          <div className="bg-blue-900/30 border border-blue-700 rounded p-3 text-sm">
            <p className="text-blue-400 font-medium mb-1">Commit-Reveal Combat</p>
            <p className="text-gray-300">
              1. Submit your attack (1 hour commit phase)
              <br />
              2. Defender can respond
              <br />
              3. Reveal phase (30 minutes)
              <br />
              4. D20 rolls determine outcome
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiate}
              disabled={isPending || isConfirming}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
            >
              {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Attack!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Combat result modal with D20 animation
export function CombatResultModal() {
  const { animation, setAnimation, currentCombat } = useCombatStore();
  const { closeModal } = useUIStore();

  if (!animation) return null;

  const attackerMod = getD20Modifier(animation.attackerRoll);
  const defenderMod = getD20Modifier(animation.defenderRoll);

  const resultText = {
    attacker_wins: 'Victory! Territory Conquered!',
    defender_wins: 'Defeat! Attack Repelled!',
    draw: 'Draw! Defender Holds!',
    attacker_forfeit: 'Attacker Forfeited',
    defender_forfeit: 'Defender Forfeited - Territory Taken!',
    none: 'Combat Pending...',
  }[animation.result];

  const resultColor = {
    attacker_wins: 'text-green-400',
    defender_wins: 'text-red-400',
    draw: 'text-yellow-400',
    attacker_forfeit: 'text-gray-400',
    defender_forfeit: 'text-green-400',
    none: 'text-gray-400',
  }[animation.result];

  const handleClose = () => {
    setAnimation(null);
    closeModal();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 border border-gray-600">
        <h2 className="text-xl font-bold text-white text-center mb-6">
          ⚔️ Combat Result
        </h2>

        {/* D20 Dice display */}
        <div className="flex justify-center gap-8 mb-6">
          {/* Attacker die */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Attacker</p>
            <D20Die roll={animation.attackerRoll} isAnimating={animation.showRolls} />
            <p className="text-sm text-gray-400 mt-2">
              {getRollDescription(animation.attackerRoll)}
            </p>
            <p className={`text-sm ${attackerMod >= 100 ? 'text-green-400' : 'text-red-400'}`}>
              {attackerMod}% modifier
            </p>
          </div>

          {/* VS */}
          <div className="flex items-center">
            <span className="text-2xl text-gray-500 font-bold">VS</span>
          </div>

          {/* Defender die */}
          <div className="text-center">
            <p className="text-gray-400 text-sm mb-2">Defender</p>
            <D20Die roll={animation.defenderRoll} isAnimating={animation.showRolls} />
            <p className="text-sm text-gray-400 mt-2">
              {getRollDescription(animation.defenderRoll)}
            </p>
            <p className={`text-sm ${defenderMod >= 100 ? 'text-green-400' : 'text-red-400'}`}>
              {defenderMod}% modifier
            </p>
          </div>
        </div>

        {/* Result */}
        {animation.showResult && (
          <div className="text-center mb-6">
            <p className={`text-2xl font-bold ${resultColor}`}>
              {resultText}
            </p>
          </div>
        )}

        {/* Close button */}
        <button
          onClick={handleClose}
          className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// D20 Die component
interface D20DieProps {
  roll: number;
  isAnimating: boolean;
}

function D20Die({ roll, isAnimating }: D20DieProps) {
  const isCritFail = roll === 1;
  const isCritSuccess = roll === 20;

  return (
    <div
      className={`
        w-20 h-20 flex items-center justify-center
        rounded-lg border-4 font-bold text-3xl
        transition-all duration-300
        ${isAnimating ? 'animate-bounce' : ''}
        ${isCritFail ? 'bg-red-900 border-red-600 text-red-300' : ''}
        ${isCritSuccess ? 'bg-green-900 border-green-600 text-green-300' : ''}
        ${!isCritFail && !isCritSuccess ? 'bg-gray-700 border-gray-500 text-white' : ''}
      `}
    >
      {roll}
    </div>
  );
}

// Active combat card (for sidebar/panel)
export function ActiveCombatCard({ combatId }: { combatId: number }) {
  const { activeCombats, updateCombat } = useCombatStore();
  const { reveal: attackerReveal, isPending: isRevealPending } = useAttackerReveal();

  const combat = activeCombats.find((c) => c.id === combatId);
  if (!combat) return null;

  const now = Date.now();
  const isCommitPhase = combat.phase === 'commit' && now < combat.commitDeadline;
  const isRevealPhase = combat.phase === 'reveal' && now < combat.revealDeadline;
  const canReveal = isRevealPhase && combat.isAttacker && !combat.hasRevealed && combat.localSecret;

  const timeLeft = isCommitPhase
    ? combat.commitDeadline - now
    : isRevealPhase
    ? combat.revealDeadline - now
    : 0;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleReveal = () => {
    if (!combat.localSecret) return;
    attackerReveal(combat.id, combat.localSecret);
    updateCombat(combat.id, { hasRevealed: true });
  };

  return (
    <div className="bg-gray-700/50 border border-gray-600 rounded p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">Combat #{combat.id}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          combat.phase === 'commit' ? 'bg-blue-600' :
          combat.phase === 'reveal' ? 'bg-yellow-600' :
          combat.phase === 'resolved' ? 'bg-green-600' :
          'bg-gray-600'
        }`}>
          {combat.phase.toUpperCase()}
        </span>
      </div>

      <div className="text-sm text-gray-400 space-y-1">
        <p>Target: ({combat.plotX}, {combat.plotY})</p>
        <p>Role: {combat.isAttacker ? 'Attacker' : 'Defender'}</p>
        {timeLeft > 0 && (
          <p className="text-yellow-400">Time left: {formatTime(timeLeft)}</p>
        )}
      </div>

      {canReveal && (
        <button
          onClick={handleReveal}
          disabled={isRevealPending}
          className="w-full mt-2 py-1 px-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white text-sm rounded font-medium transition-colors"
        >
          {isRevealPending ? 'Revealing...' : 'Reveal Secret'}
        </button>
      )}
    </div>
  );
}
