import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==========================================
// ENUMS
// ==========================================

export const raceEnum = pgEnum('race', [
  'ironveld',
  'vaelthir',
  'korrath',
  'sylvaeth',
  'ashborn',
  'breathborn',
]);

export const captainClassEnum = pgEnum('captain_class', [
  'warlord',
  'archmage',
  'highpriest',
  'shadowmaster',
  'merchantprince',
  'beastlord',
]);

export const captainSkillEnum = pgEnum('captain_skill', [
  'vanguard',
  'fortress',
  'destruction',
  'protection',
  'crusader',
  'oracle',
  'assassin',
  'saboteur',
  'profiteer',
  'artificer',
  'packalpha',
  'warden',
]);

export const zoneEnum = pgEnum('zone', ['outer', 'middle', 'inner', 'heart']);

export const terrainEnum = pgEnum('terrain', [
  'plains',
  'forest',
  'mountain',
  'river',
  'ruins',
  'corruption',
]);

export const generationStatusEnum = pgEnum('generation_status', [
  'planning',
  'active',
  'endgame',
  'ended',
]);

export const combatStatusEnum = pgEnum('combat_status', [
  'pending',
  'inprogress',
  'completed',
  'cancelled',
]);

export const combatResultEnum = pgEnum('combat_result', [
  'attacker_victory',
  'defender_victory',
  'draw',
  'retreat',
]);

export const buildingTypeEnum = pgEnum('building_type', [
  'farm',
  'mine',
  'lumbermill',
  'market',
  'barracks',
  'warhall',
  'siegeworkshop',
  'armory',
  'wall',
  'watchtower',
  'gate',
  'magetower',
  'shrine',
  'warehouse',
]);

// ==========================================
// GENERATIONS TABLE
// ==========================================

export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  number: integer('number').notNull().unique(),
  status: generationStatusEnum('status').notNull().default('planning'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  heartbeatDay: integer('heartbeat_day').notNull().default(0),
  totalPlayers: integer('total_players').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ==========================================
// PLAYERS TABLE
// ==========================================

export const players = pgTable(
  'players',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id),

    // Character
    race: raceEnum('race').notNull(),
    captainName: varchar('captain_name', { length: 50 }).notNull(),
    captainClass: captainClassEnum('captain_class').notNull(),
    captainSkill: captainSkillEnum('captain_skill').notNull(),

    // Status
    captainAlive: boolean('captain_alive').notNull().default(true),
    captainWoundedUntil: timestamp('captain_wounded_until', { withTimezone: true }),
    isPremium: boolean('is_premium').notNull().default(false),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    protectedUntil: timestamp('protected_until', { withTimezone: true }),

    // Resources (stored as JSON for flexibility)
    resources: jsonb('resources')
      .notNull()
      .$type<{ gold: number; stone: number; wood: number; food: number; mana: number }>()
      .default({ gold: 0, stone: 0, wood: 0, food: 0, mana: 0 }),

    // Statistics
    totalKills: integer('total_kills').notNull().default(0),
    totalDeaths: integer('total_deaths').notNull().default(0),
    battlesWon: integer('battles_won').notNull().default(0),
    battlesLost: integer('battles_lost').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    walletGenerationIdx: uniqueIndex('players_wallet_generation_idx').on(
      table.walletAddress,
      table.generationId
    ),
    generationIdx: index('players_generation_idx').on(table.generationId),
  })
);

// ==========================================
// TERRITORIES TABLE
// ==========================================

export const territories = pgTable(
  'territories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id),

    // Position
    x: integer('x').notNull(),
    y: integer('y').notNull(),

    // Characteristics
    zone: zoneEnum('zone').notNull(),
    terrain: terrainEnum('terrain').notNull(),

    // Ownership
    ownerId: uuid('owner_id').references(() => players.id),
    ownerSince: timestamp('owner_since', { withTimezone: true }),

    // Status
    isForsaken: boolean('is_forsaken').notNull().default(false),
    forsakenStrength: integer('forsaken_strength').notNull().default(0),

    // Infrastructure
    hasBridge: boolean('has_bridge').notNull().default(false),
    bridgeDestroyed: boolean('bridge_destroyed').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    coordsGenerationIdx: uniqueIndex('territories_coords_generation_idx').on(
      table.x,
      table.y,
      table.generationId
    ),
    ownerIdx: index('territories_owner_idx').on(table.ownerId),
    generationIdx: index('territories_generation_idx').on(table.generationId),
    zoneIdx: index('territories_zone_idx').on(table.zone),
  })
);

// ==========================================
// BUILDINGS TABLE
// ==========================================

export const buildings = pgTable(
  'buildings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    territoryId: uuid('territory_id')
      .notNull()
      .references(() => territories.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),

    type: buildingTypeEnum('type').notNull(),
    hp: integer('hp').notNull(),
    maxHp: integer('max_hp').notNull(),

    constructionStarted: timestamp('construction_started', { withTimezone: true })
      .notNull()
      .defaultNow(),
    constructionComplete: timestamp('construction_complete', { withTimezone: true }),
    isUnderConstruction: boolean('is_under_construction').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    territoryIdx: index('buildings_territory_idx').on(table.territoryId),
    playerIdx: index('buildings_player_idx').on(table.playerId),
  })
);

// ==========================================
// ARMIES TABLE
// ==========================================

export const armies = pgTable(
  'armies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    territoryId: uuid('territory_id')
      .notNull()
      .references(() => territories.id),

    // Units stored as JSON array
    units: jsonb('units')
      .notNull()
      .$type<
        Array<{
          unitType: string;
          quantity: number;
          currentHp: number;
          isPrisoner: boolean;
          originalRace?: string;
        }>
      >()
      .default([]),

    totalStrength: integer('total_strength').notNull().default(0),
    totalFoodConsumption: integer('total_food_consumption').notNull().default(0),
    isGarrison: boolean('is_garrison').notNull().default(false),
    leadedByCaptain: boolean('leaded_by_captain').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    playerIdx: index('armies_player_idx').on(table.playerId),
    territoryIdx: index('armies_territory_idx').on(table.territoryId),
  })
);

// ==========================================
// COMBATS TABLE
// ==========================================

export const combats = pgTable(
  'combats',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id),
    territoryId: uuid('territory_id')
      .notNull()
      .references(() => territories.id),

    attackerId: uuid('attacker_id')
      .notNull()
      .references(() => players.id),
    defenderId: uuid('defender_id')
      .notNull()
      .references(() => players.id),

    status: combatStatusEnum('status').notNull().default('pending'),
    result: combatResultEnum('result'),

    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),

    // Snapshot of armies at combat start
    attackerArmy: jsonb('attacker_army').notNull(),
    defenderArmy: jsonb('defender_army').notNull(),

    // Results
    attackerCasualties: integer('attacker_casualties').notNull().default(0),
    defenderCasualties: integer('defender_casualties').notNull().default(0),
    attackerCaptainDied: boolean('attacker_captain_died').notNull().default(false),
    defenderCaptainDied: boolean('defender_captain_died').notNull().default(false),

    // Loot
    lootGold: integer('loot_gold').notNull().default(0),
    lootStone: integer('loot_stone').notNull().default(0),
    lootWood: integer('loot_wood').notNull().default(0),
    lootFood: integer('loot_food').notNull().default(0),
    prisonersCaptured: integer('prisoners_captured').notNull().default(0),

    // Combat log
    rounds: jsonb('rounds').notNull().$type<unknown[]>().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    generationIdx: index('combats_generation_idx').on(table.generationId),
    attackerIdx: index('combats_attacker_idx').on(table.attackerId),
    defenderIdx: index('combats_defender_idx').on(table.defenderId),
    statusIdx: index('combats_status_idx').on(table.status),
  })
);

// ==========================================
// ALLIANCES TABLE
// ==========================================

export const alliances = pgTable(
  'alliances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id),

    name: varchar('name', { length: 50 }).notNull(),
    tag: varchar('tag', { length: 5 }).notNull(),
    leaderId: uuid('leader_id')
      .notNull()
      .references(() => players.id),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    generationIdx: index('alliances_generation_idx').on(table.generationId),
    tagGenerationIdx: uniqueIndex('alliances_tag_generation_idx').on(
      table.tag,
      table.generationId
    ),
  })
);

export const allianceMembers = pgTable(
  'alliance_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    allianceId: uuid('alliance_id')
      .notNull()
      .references(() => alliances.id),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),

    role: varchar('role', { length: 20 }).notNull().default('member'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    allianceIdx: index('alliance_members_alliance_idx').on(table.allianceId),
    playerIdx: uniqueIndex('alliance_members_player_idx').on(table.playerId),
  })
);

// ==========================================
// SPELL COOLDOWNS TABLE
// ==========================================

export const spellCooldowns = pgTable(
  'spell_cooldowns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playerId: uuid('player_id')
      .notNull()
      .references(() => players.id),
    spellId: varchar('spell_id', { length: 50 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    playerIdx: index('spell_cooldowns_player_idx').on(table.playerId),
    playerSpellIdx: uniqueIndex('spell_cooldowns_player_spell_idx').on(
      table.playerId,
      table.spellId
    ),
  })
);

// ==========================================
// ACTIVE SPELL EFFECTS TABLE
// ==========================================

export const activeSpellEffects = pgTable(
  'active_spell_effects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spellId: varchar('spell_id', { length: 50 }).notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(), // army, territory, building, player
    targetId: uuid('target_id').notNull(),
    casterId: uuid('caster_id')
      .notNull()
      .references(() => players.id),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    effectData: jsonb('effect_data')
      .notNull()
      .$type<{
        attackModifier?: number;
        defenseModifier?: number;
        speedModifier?: number;
        magicResistance?: number;
        dotDamagePerRound?: number;
        isImmune?: boolean;
        isWarded?: boolean;
        isCursed?: boolean;
        moraleModifier?: number;
      }>()
      .default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    targetIdx: index('active_spell_effects_target_idx').on(table.targetId),
    casterIdx: index('active_spell_effects_caster_idx').on(table.casterId),
    expiresIdx: index('active_spell_effects_expires_idx').on(table.expiresAt),
  })
);

// ==========================================
// AUTH NONCES TABLE
// ==========================================

export const authNonces = pgTable(
  'auth_nonces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    walletAddress: varchar('wallet_address', { length: 42 }).notNull(),
    nonce: varchar('nonce', { length: 64 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: boolean('used').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    walletIdx: index('auth_nonces_wallet_idx').on(table.walletAddress),
    nonceIdx: uniqueIndex('auth_nonces_nonce_idx').on(table.nonce),
  })
);

// ==========================================
// RELATIONS
// ==========================================

export const generationsRelations = relations(generations, ({ many }) => ({
  players: many(players),
  territories: many(territories),
  combats: many(combats),
  alliances: many(alliances),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  generation: one(generations, {
    fields: [players.generationId],
    references: [generations.id],
  }),
  territories: many(territories),
  buildings: many(buildings),
  armies: many(armies),
  attackedCombats: many(combats, { relationName: 'attacker' }),
  defendedCombats: many(combats, { relationName: 'defender' }),
  allianceMembership: many(allianceMembers),
}));

export const territoriesRelations = relations(territories, ({ one, many }) => ({
  generation: one(generations, {
    fields: [territories.generationId],
    references: [generations.id],
  }),
  owner: one(players, {
    fields: [territories.ownerId],
    references: [players.id],
  }),
  buildings: many(buildings),
  armies: many(armies),
}));

export const buildingsRelations = relations(buildings, ({ one }) => ({
  territory: one(territories, {
    fields: [buildings.territoryId],
    references: [territories.id],
  }),
  player: one(players, {
    fields: [buildings.playerId],
    references: [players.id],
  }),
}));

export const armiesRelations = relations(armies, ({ one }) => ({
  player: one(players, {
    fields: [armies.playerId],
    references: [players.id],
  }),
  territory: one(territories, {
    fields: [armies.territoryId],
    references: [territories.id],
  }),
}));

export const combatsRelations = relations(combats, ({ one }) => ({
  generation: one(generations, {
    fields: [combats.generationId],
    references: [generations.id],
  }),
  territory: one(territories, {
    fields: [combats.territoryId],
    references: [territories.id],
  }),
  attacker: one(players, {
    fields: [combats.attackerId],
    references: [players.id],
    relationName: 'attacker',
  }),
  defender: one(players, {
    fields: [combats.defenderId],
    references: [players.id],
    relationName: 'defender',
  }),
}));

export const alliancesRelations = relations(alliances, ({ one, many }) => ({
  generation: one(generations, {
    fields: [alliances.generationId],
    references: [generations.id],
  }),
  leader: one(players, {
    fields: [alliances.leaderId],
    references: [players.id],
  }),
  members: many(allianceMembers),
}));

export const allianceMembersRelations = relations(allianceMembers, ({ one }) => ({
  alliance: one(alliances, {
    fields: [allianceMembers.allianceId],
    references: [alliances.id],
  }),
  player: one(players, {
    fields: [allianceMembers.playerId],
    references: [players.id],
  }),
}));
