import { useState } from 'react';
import { useGameStore } from '../../stores';
import { useTopPlayers, usePlayerWitnessStats } from '../../hooks/useContracts';

interface LeaderboardEntry {
  rank: number;
  walletAddress: string;
  captainName: string;
  race: string;
  score: number;
  territories: number;
  kills: number;
  isCurrentUser: boolean;
}

// Mock current generation leaderboard
const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, walletAddress: '0x1111...1111', captainName: 'Emperor Maximus', race: 'korrath', score: 25000, territories: 45, kills: 120, isCurrentUser: false },
  { rank: 2, walletAddress: '0x2222...2222', captainName: 'Queen Seraphina', race: 'vaelthir', score: 22000, territories: 38, kills: 95, isCurrentUser: false },
  { rank: 3, walletAddress: '0x3333...3333', captainName: 'Lord Ironforge', race: 'ironveld', score: 19500, territories: 35, kills: 80, isCurrentUser: false },
  { rank: 4, walletAddress: '0x4444...4444', captainName: 'Shadow Walker', race: 'sylvaeth', score: 17000, territories: 30, kills: 70, isCurrentUser: false },
  { rank: 5, walletAddress: '0x5555...5555', captainName: 'Flame Keeper', race: 'ashborn', score: 15000, territories: 28, kills: 65, isCurrentUser: true },
  { rank: 6, walletAddress: '0x6666...6666', captainName: 'Storm Rider', race: 'breathborn', score: 12000, territories: 22, kills: 50, isCurrentUser: false },
  { rank: 7, walletAddress: '0x7777...7777', captainName: 'Blood Hunter', race: 'korrath', score: 10000, territories: 18, kills: 45, isCurrentUser: false },
  { rank: 8, walletAddress: '0x8888...8888', captainName: 'Forest Sage', race: 'sylvaeth', score: 8500, territories: 15, kills: 35, isCurrentUser: false },
];

// Mock eternal leaderboard (TitansWitness)
const mockEternalLeaderboard = [
  { rank: 1, walletAddress: '0x1111...1111', captainName: 'Emperor Maximus', wins: 5, totalScore: 150000, highestScore: 35000 },
  { rank: 2, walletAddress: '0x2222...2222', captainName: 'Queen Seraphina', wins: 4, totalScore: 120000, highestScore: 32000 },
  { rank: 3, walletAddress: '0x3333...3333', captainName: 'Lord Ironforge', wins: 3, totalScore: 95000, highestScore: 28000 },
];

export function LeaderboardPanel() {
  const [activeTab, setActiveTab] = useState<'current' | 'eternal'>('current');
  const { player, generation } = useGameStore();

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">🏆 Leaderboard</h3>
        {generation && (
          <span className="text-sm text-gray-400">Gen #{generation.number}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => setActiveTab('current')}
          className={`flex-1 py-2 text-sm transition-colors ${
            activeTab === 'current'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          This Generation
        </button>
        <button
          onClick={() => setActiveTab('eternal')}
          className={`flex-1 py-2 text-sm transition-colors ${
            activeTab === 'eternal'
              ? 'text-white border-b-2 border-yellow-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Titans Witness
        </button>
      </div>

      {/* Current generation leaderboard */}
      {activeTab === 'current' && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {mockLeaderboard.map((entry) => (
            <LeaderboardRow key={entry.rank} entry={entry} />
          ))}
        </div>
      )}

      {/* Eternal leaderboard (TitansWitness) */}
      {activeTab === 'eternal' && (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs text-center">
            Eternal record of generation winners, stored on-chain forever
          </p>
          <div className="space-y-2">
            {mockEternalLeaderboard.map((entry) => (
              <EternalLeaderboardRow key={entry.rank} entry={entry} />
            ))}
          </div>
        </div>
      )}

      {/* Player's current position */}
      {player && activeTab === 'current' && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-sm text-gray-400 mb-2">Your Position</p>
          <div className="bg-blue-900/30 border border-blue-700 rounded p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-yellow-400 font-bold">#5</span>
                <span className="text-white">{player.captainName}</span>
              </div>
              <span className="text-yellow-400 font-bold">{player.score.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Prize pool info */}
      {generation && activeTab === 'current' && (
        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-2">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 text-sm">Prize Pool</span>
            <span className="text-yellow-400 font-bold">
              ${(generation.prizePool / 1000000).toFixed(0)} USDC
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Winner takes 90% at end of generation
          </p>
        </div>
      )}
    </div>
  );
}

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  const rankColors: Record<number, string> = {
    1: 'text-yellow-400',
    2: 'text-gray-300',
    3: 'text-amber-600',
  };

  const raceIcons: Record<string, string> = {
    ironveld: '🛡️',
    vaelthir: '🩸',
    korrath: '⚔️',
    sylvaeth: '🌿',
    ashborn: '🔥',
    breathborn: '💨',
  };

  return (
    <div className={`bg-gray-700/30 border rounded p-2 ${
      entry.isCurrentUser ? 'border-blue-500' : 'border-gray-600'
    }`}>
      <div className="flex items-center gap-2">
        {/* Rank */}
        <span className={`w-6 text-center font-bold ${rankColors[entry.rank] || 'text-gray-400'}`}>
          {entry.rank}
        </span>

        {/* Race icon */}
        <span className="text-lg">{raceIcons[entry.race] || '👤'}</span>

        {/* Name & stats */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="text-white font-medium truncate">{entry.captainName}</span>
            {entry.isCurrentUser && (
              <span className="text-xs text-gray-500">(you)</span>
            )}
          </div>
          <p className="text-xs text-gray-500">
            {entry.territories} plots • {entry.kills} kills
          </p>
        </div>

        {/* Score */}
        <span className="text-yellow-400 font-bold">{entry.score.toLocaleString()}</span>
      </div>
    </div>
  );
}

interface EternalEntry {
  rank: number;
  walletAddress: string;
  captainName: string;
  wins: number;
  totalScore: number;
  highestScore: number;
}

function EternalLeaderboardRow({ entry }: { entry: EternalEntry }) {
  return (
    <div className="bg-gray-700/30 border border-gray-600 rounded p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-xl font-black ${
            entry.rank === 1 ? 'text-yellow-400' :
            entry.rank === 2 ? 'text-gray-300' :
            entry.rank === 3 ? 'text-amber-600' : 'text-gray-500'
          }`}>
            #{entry.rank}
          </span>
          <div>
            <p className="text-white font-medium">{entry.captainName}</p>
            <p className="text-xs text-gray-500 font-mono">{entry.walletAddress}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 font-bold">{entry.wins} 🏆</p>
          <p className="text-xs text-gray-400">wins</p>
        </div>
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-gray-400">Total Score: <span className="text-white">{entry.totalScore.toLocaleString()}</span></span>
        <span className="text-gray-400">Best: <span className="text-green-400">{entry.highestScore.toLocaleString()}</span></span>
      </div>
    </div>
  );
}
