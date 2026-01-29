import { useState } from 'react';
import { useGameStore, useUIStore } from '../../stores';

interface AllianceMember {
  id: string;
  walletAddress: string;
  captainName: string;
  race: string;
  score: number;
  territories: number;
  role: 'leader' | 'officer' | 'member';
  joinedAt: Date;
}

interface Alliance {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  memberCount: number;
  totalTerritories: number;
  totalScore: number;
  createdAt: Date;
}

// Mock data
const mockAlliance: Alliance = {
  id: '1',
  name: 'Knights of Nemeth',
  tag: 'KoN',
  leaderId: '1',
  memberCount: 5,
  totalTerritories: 42,
  totalScore: 15000,
  createdAt: new Date(),
};

const mockMembers: AllianceMember[] = [
  { id: '1', walletAddress: '0x1234...5678', captainName: 'Lord Valor', race: 'ironveld', score: 5000, territories: 15, role: 'leader', joinedAt: new Date() },
  { id: '2', walletAddress: '0x2345...6789', captainName: 'Shadow Queen', race: 'vaelthir', score: 4000, territories: 12, role: 'officer', joinedAt: new Date() },
  { id: '3', walletAddress: '0x3456...7890', captainName: 'Stormborn', race: 'breathborn', score: 3000, territories: 8, role: 'member', joinedAt: new Date() },
  { id: '4', walletAddress: '0x4567...8901', captainName: 'Ironheart', race: 'korrath', score: 2000, territories: 5, role: 'member', joinedAt: new Date() },
  { id: '5', walletAddress: '0x5678...9012', captainName: 'Leafwhisper', race: 'sylvaeth', score: 1000, territories: 2, role: 'member', joinedAt: new Date() },
];

export function AlliancePanel() {
  const { player } = useGameStore();
  const { openModal } = useUIStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'invites'>('overview');

  // Mock: player has alliance
  const hasAlliance = true;
  const alliance = hasAlliance ? mockAlliance : null;
  const members = hasAlliance ? mockMembers : [];
  const isLeader = hasAlliance && player?.id === alliance?.leaderId;
  const isOfficer = members.find((m) => m.id === player?.id)?.role === 'officer';

  if (!player) {
    return (
      <div className="p-4 text-gray-400 text-center">
        <p className="text-lg mb-2">🤝 Alliance</p>
        <p className="text-sm">Register to join or create an alliance</p>
      </div>
    );
  }

  if (!hasAlliance) {
    return <NoAllianceView />;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Alliance header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">
            [{alliance!.tag}] {alliance!.name}
          </h3>
          <p className="text-sm text-gray-400">
            {alliance!.memberCount} members • {alliance!.totalTerritories} territories
          </p>
        </div>
        {isLeader && (
          <button
            onClick={() => openModal('confirm')}
            className="text-xs text-gray-400 hover:text-red-400"
          >
            Disband
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        {(['overview', 'members', 'invites'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-white border-b-2 border-blue-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatBox label="Total Score" value={alliance!.totalScore.toLocaleString()} />
            <StatBox label="Territories" value={alliance!.totalTerritories.toString()} />
            <StatBox label="Members" value={alliance!.memberCount.toString()} />
            <StatBox label="Rank" value="#3" highlight />
          </div>

          {/* Shared vision info */}
          <div className="bg-blue-900/30 border border-blue-700 rounded p-2">
            <p className="text-blue-400 text-sm font-medium">Shared Vision Active</p>
            <p className="text-gray-400 text-xs">
              All alliance territories are visible to members
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            {(isLeader || isOfficer) && (
              <button
                onClick={() => openModal('alliance_invite')}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                Invite Player
              </button>
            )}
            <button
              onClick={() => openModal('confirm')}
              className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
            >
              Leave Alliance
            </button>
          </div>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {members.map((member) => (
            <MemberCard
              key={member.id}
              member={member}
              isCurrentUser={member.id === player.id}
              canManage={isLeader || (isOfficer && member.role === 'member')}
            />
          ))}
        </div>
      )}

      {activeTab === 'invites' && (
        <div className="text-center text-gray-400 py-4">
          <p className="text-sm">No pending invites</p>
        </div>
      )}
    </div>
  );
}

function NoAllianceView() {
  const { openModal } = useUIStore();

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-lg font-bold text-white text-center">🤝 No Alliance</h3>
      <p className="text-gray-400 text-sm text-center">
        Join or create an alliance to share vision, coordinate attacks, and dominate the realm!
      </p>

      <div className="space-y-2">
        <button
          onClick={() => openModal('alliance_create')}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Create Alliance
        </button>
        <button
          className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium transition-colors"
        >
          Browse Alliances
        </button>
      </div>

      {/* Alliance benefits */}
      <div className="bg-gray-700/30 border border-gray-600 rounded p-3 space-y-2">
        <p className="text-white text-sm font-medium">Alliance Benefits:</p>
        <ul className="text-gray-400 text-xs space-y-1">
          <li>• Shared vision of all alliance territories</li>
          <li>• Coordinated attack planning</li>
          <li>• Embassy building bonuses</li>
          <li>• Alliance chat and coordination</li>
        </ul>
      </div>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-gray-700/50 rounded p-2 text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

interface MemberCardProps {
  member: AllianceMember;
  isCurrentUser: boolean;
  canManage: boolean;
}

function MemberCard({ member, isCurrentUser, canManage }: MemberCardProps) {
  const roleColors = {
    leader: 'text-yellow-400',
    officer: 'text-blue-400',
    member: 'text-gray-400',
  };

  const roleIcons = {
    leader: '👑',
    officer: '⭐',
    member: '',
  };

  return (
    <div className={`bg-gray-700/30 border rounded p-2 ${
      isCurrentUser ? 'border-blue-500' : 'border-gray-600'
    }`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1">
            {roleIcons[member.role] && (
              <span className="text-sm">{roleIcons[member.role]}</span>
            )}
            <span className="text-white font-medium">{member.captainName}</span>
            {isCurrentUser && (
              <span className="text-xs text-gray-500">(you)</span>
            )}
          </div>
          <p className={`text-xs ${roleColors[member.role]} capitalize`}>
            {member.role} • {member.race}
          </p>
        </div>
        <div className="text-right">
          <p className="text-yellow-400 text-sm font-medium">{member.score}</p>
          <p className="text-gray-500 text-xs">{member.territories} plots</p>
        </div>
      </div>
      {canManage && !isCurrentUser && (
        <div className="flex gap-1 mt-2">
          <button className="flex-1 py-1 px-2 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded">
            Promote
          </button>
          <button className="flex-1 py-1 px-2 bg-red-600/50 hover:bg-red-600 text-white text-xs rounded">
            Kick
          </button>
        </div>
      )}
    </div>
  );
}
