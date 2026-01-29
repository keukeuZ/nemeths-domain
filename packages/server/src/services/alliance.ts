import { eq, and } from 'drizzle-orm';
import { db } from '../db/connection.js';
import { alliances, allianceMembers, territories } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { getPlayerById } from './player.js';

// ==========================================
// ALLIANCE SERVICE
// ==========================================

export interface AllianceInfo {
  id: string;
  name: string;
  tag: string;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  createdAt: Date;
}

export interface AllianceMemberInfo {
  playerId: string;
  playerName: string;
  race: string;
  role: string;
  joinedAt: Date;
  territoryCount: number;
}

/**
 * Create a new alliance
 */
export async function createAlliance(
  leaderId: string,
  name: string,
  tag: string
): Promise<AllianceInfo> {
  const leader = await getPlayerById(leaderId);
  if (!leader) {
    throw new Error('Player not found');
  }

  // Check if player is already in an alliance
  const existingMembership = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, leaderId))
    .limit(1);

  if (existingMembership.length > 0) {
    throw new Error('You are already in an alliance');
  }

  // Validate tag (3-5 uppercase letters)
  if (!/^[A-Z]{3,5}$/.test(tag)) {
    throw new Error('Alliance tag must be 3-5 uppercase letters');
  }

  // Check if tag is unique for this generation
  const existingTag = await db
    .select()
    .from(alliances)
    .where(and(eq(alliances.tag, tag), eq(alliances.generationId, leader.generationId)))
    .limit(1);

  if (existingTag.length > 0) {
    throw new Error('Alliance tag already in use');
  }

  // Create alliance
  const [alliance] = await db
    .insert(alliances)
    .values({
      generationId: leader.generationId,
      name,
      tag,
      leaderId,
    })
    .returning();

  // Add leader as first member with 'leader' role
  await db.insert(allianceMembers).values({
    allianceId: alliance.id,
    playerId: leaderId,
    role: 'leader',
  });

  logger.info({ allianceId: alliance.id, leaderId, name, tag }, 'Alliance created');

  return {
    id: alliance.id,
    name: alliance.name,
    tag: alliance.tag,
    leaderId: alliance.leaderId,
    leaderName: leader.captainName,
    memberCount: 1,
    createdAt: alliance.createdAt,
  };
}

/**
 * Get alliance by ID
 */
export async function getAllianceById(allianceId: string): Promise<AllianceInfo | null> {
  const [alliance] = await db
    .select()
    .from(alliances)
    .where(eq(alliances.id, allianceId))
    .limit(1);

  if (!alliance) return null;

  const leader = await getPlayerById(alliance.leaderId);
  const members = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));

  return {
    id: alliance.id,
    name: alliance.name,
    tag: alliance.tag,
    leaderId: alliance.leaderId,
    leaderName: leader?.captainName || 'Unknown',
    memberCount: members.length,
    createdAt: alliance.createdAt,
  };
}

/**
 * Get player's alliance
 */
export async function getPlayerAlliance(playerId: string): Promise<AllianceInfo | null> {
  const [membership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (!membership) return null;

  return getAllianceById(membership.allianceId);
}

/**
 * Get alliance members
 */
export async function getAllianceMembers(allianceId: string): Promise<AllianceMemberInfo[]> {
  const members = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));

  const memberInfos: AllianceMemberInfo[] = [];

  for (const member of members) {
    const player = await getPlayerById(member.playerId);
    if (!player) continue;

    const playerTerritories = await db
      .select()
      .from(territories)
      .where(eq(territories.ownerId, member.playerId));

    memberInfos.push({
      playerId: member.playerId,
      playerName: player.captainName,
      race: player.race,
      role: member.role,
      joinedAt: member.joinedAt,
      territoryCount: playerTerritories.length,
    });
  }

  return memberInfos;
}

/**
 * Invite player to alliance (returns invitation token)
 */
export async function inviteToAlliance(
  inviterId: string,
  allianceId: string,
  inviteePlayerId: string
): Promise<{ invited: boolean; message: string }> {
  // Verify inviter is leader or officer
  const [inviterMembership] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(eq(allianceMembers.allianceId, allianceId), eq(allianceMembers.playerId, inviterId))
    )
    .limit(1);

  if (!inviterMembership || !['leader', 'officer'].includes(inviterMembership.role)) {
    throw new Error('Only leaders and officers can invite');
  }

  // Check if invitee exists
  const invitee = await getPlayerById(inviteePlayerId);
  if (!invitee) {
    throw new Error('Player not found');
  }

  // Check if invitee is already in an alliance
  const existingMembership = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, inviteePlayerId))
    .limit(1);

  if (existingMembership.length > 0) {
    throw new Error('Player is already in an alliance');
  }

  // In a real implementation, we'd store the invitation
  // For now, we'll just add them directly (simplified)
  await db.insert(allianceMembers).values({
    allianceId,
    playerId: inviteePlayerId,
    role: 'member',
  });

  logger.info({ allianceId, inviterId, inviteePlayerId }, 'Player invited to alliance');

  return {
    invited: true,
    message: `${invitee.captainName} has been added to the alliance`,
  };
}

/**
 * Leave alliance
 */
export async function leaveAlliance(playerId: string): Promise<void> {
  const [membership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId))
    .limit(1);

  if (!membership) {
    throw new Error('Not in an alliance');
  }

  const alliance = await getAllianceById(membership.allianceId);
  if (!alliance) {
    throw new Error('Alliance not found');
  }

  // If leader, must transfer or disband
  if (membership.role === 'leader') {
    throw new Error('Leader must transfer leadership or disband the alliance');
  }

  await db.delete(allianceMembers).where(eq(allianceMembers.playerId, playerId));

  logger.info({ playerId, allianceId: membership.allianceId }, 'Player left alliance');
}

/**
 * Remove player from alliance (kick)
 */
export async function kickFromAlliance(
  kickerId: string,
  targetPlayerId: string
): Promise<void> {
  const [kickerMembership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, kickerId))
    .limit(1);

  if (!kickerMembership) {
    throw new Error('You are not in an alliance');
  }

  if (!['leader', 'officer'].includes(kickerMembership.role)) {
    throw new Error('Only leaders and officers can kick members');
  }

  const [targetMembership] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, kickerMembership.allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error('Player is not in your alliance');
  }

  // Officers can't kick other officers or leader
  if (kickerMembership.role === 'officer' && targetMembership.role !== 'member') {
    throw new Error('Officers can only kick members');
  }

  // Leader can't be kicked
  if (targetMembership.role === 'leader') {
    throw new Error('Cannot kick the leader');
  }

  await db.delete(allianceMembers).where(eq(allianceMembers.playerId, targetPlayerId));

  logger.info(
    { kickerId, targetPlayerId, allianceId: kickerMembership.allianceId },
    'Player kicked from alliance'
  );
}

/**
 * Transfer leadership
 */
export async function transferLeadership(
  currentLeaderId: string,
  newLeaderId: string
): Promise<void> {
  const [leaderMembership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, currentLeaderId))
    .limit(1);

  if (!leaderMembership || leaderMembership.role !== 'leader') {
    throw new Error('Only the leader can transfer leadership');
  }

  const [newLeaderMembership] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, leaderMembership.allianceId),
        eq(allianceMembers.playerId, newLeaderId)
      )
    )
    .limit(1);

  if (!newLeaderMembership) {
    throw new Error('New leader must be in the alliance');
  }

  // Update roles
  await db
    .update(allianceMembers)
    .set({ role: 'member' })
    .where(eq(allianceMembers.playerId, currentLeaderId));

  await db
    .update(allianceMembers)
    .set({ role: 'leader' })
    .where(eq(allianceMembers.playerId, newLeaderId));

  // Update alliance leader reference
  await db
    .update(alliances)
    .set({ leaderId: newLeaderId, updatedAt: new Date() })
    .where(eq(alliances.id, leaderMembership.allianceId));

  logger.info(
    { currentLeaderId, newLeaderId, allianceId: leaderMembership.allianceId },
    'Leadership transferred'
  );
}

/**
 * Promote member to officer
 */
export async function promoteMember(promoterId: string, targetPlayerId: string): Promise<void> {
  const [promoterMembership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, promoterId))
    .limit(1);

  if (!promoterMembership || promoterMembership.role !== 'leader') {
    throw new Error('Only the leader can promote members');
  }

  const [targetMembership] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, promoterMembership.allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error('Player is not in your alliance');
  }

  if (targetMembership.role !== 'member') {
    throw new Error('Player is already an officer or leader');
  }

  await db
    .update(allianceMembers)
    .set({ role: 'officer' })
    .where(eq(allianceMembers.playerId, targetPlayerId));

  logger.info(
    { promoterId, targetPlayerId, allianceId: promoterMembership.allianceId },
    'Member promoted to officer'
  );
}

/**
 * Demote officer to member
 */
export async function demoteMember(demoterId: string, targetPlayerId: string): Promise<void> {
  const [demoterMembership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, demoterId))
    .limit(1);

  if (!demoterMembership || demoterMembership.role !== 'leader') {
    throw new Error('Only the leader can demote officers');
  }

  const [targetMembership] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, demoterMembership.allianceId),
        eq(allianceMembers.playerId, targetPlayerId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    throw new Error('Player is not in your alliance');
  }

  if (targetMembership.role !== 'officer') {
    throw new Error('Player is not an officer');
  }

  await db
    .update(allianceMembers)
    .set({ role: 'member' })
    .where(eq(allianceMembers.playerId, targetPlayerId));

  logger.info(
    { demoterId, targetPlayerId, allianceId: demoterMembership.allianceId },
    'Officer demoted to member'
  );
}

/**
 * Disband alliance
 */
export async function disbandAlliance(leaderId: string): Promise<void> {
  const [leaderMembership] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, leaderId))
    .limit(1);

  if (!leaderMembership || leaderMembership.role !== 'leader') {
    throw new Error('Only the leader can disband the alliance');
  }

  const allianceId = leaderMembership.allianceId;

  // Remove all members
  await db.delete(allianceMembers).where(eq(allianceMembers.allianceId, allianceId));

  // Delete alliance
  await db.delete(alliances).where(eq(alliances.id, allianceId));

  logger.info({ leaderId, allianceId }, 'Alliance disbanded');
}

/**
 * Get all alliances in a generation
 */
export async function getGenerationAlliances(generationId: string): Promise<AllianceInfo[]> {
  const allianceList = await db
    .select()
    .from(alliances)
    .where(eq(alliances.generationId, generationId));

  const allianceInfos: AllianceInfo[] = [];

  for (const alliance of allianceList) {
    const leader = await getPlayerById(alliance.leaderId);
    const members = await db
      .select()
      .from(allianceMembers)
      .where(eq(allianceMembers.allianceId, alliance.id));

    allianceInfos.push({
      id: alliance.id,
      name: alliance.name,
      tag: alliance.tag,
      leaderId: alliance.leaderId,
      leaderName: leader?.captainName || 'Unknown',
      memberCount: members.length,
      createdAt: alliance.createdAt,
    });
  }

  return allianceInfos;
}

/**
 * Check if two players are in the same alliance
 */
export async function areAllies(playerId1: string, playerId2: string): Promise<boolean> {
  const [member1] = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.playerId, playerId1))
    .limit(1);

  if (!member1) return false;

  const [member2] = await db
    .select()
    .from(allianceMembers)
    .where(
      and(
        eq(allianceMembers.allianceId, member1.allianceId),
        eq(allianceMembers.playerId, playerId2)
      )
    )
    .limit(1);

  return !!member2;
}

/**
 * Get alliance territories (all territories owned by alliance members)
 */
export async function getAllianceTerritories(allianceId: string): Promise<string[]> {
  const members = await db
    .select()
    .from(allianceMembers)
    .where(eq(allianceMembers.allianceId, allianceId));

  const memberIds = members.map((m) => m.playerId);
  const territoryIds: string[] = [];

  for (const memberId of memberIds) {
    const memberTerritories = await db
      .select()
      .from(territories)
      .where(eq(territories.ownerId, memberId));

    territoryIds.push(...memberTerritories.map((t) => t.id));
  }

  return territoryIds;
}
