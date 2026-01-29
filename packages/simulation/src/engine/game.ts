/**
 * Game Engine
 *
 * Main simulation engine that runs complete generations.
 */

import {
  RACES,
  CAPTAIN_CLASSES,
  CAPTAIN_SKILLS,
  ENTRY_TIERS,
  BUILDING_DEFINITIONS,
  UNIT_DEFINITIONS,
  getUnitsForRace,
  type Race,
  type CaptainClass,
  type CaptainSkill,
  type BuildingType,
  type UnitType,
} from '@nemeths/shared';

import type {
  SimulationConfig,
  SimulationState,
  SimPlayer,
  SimTerritory,
  SimArmy,
  SimUnit,
  SimBuilding,
  SimCombat,
  SimEvent,
  AgentType,
  AgentDistribution,
  AgentAction,
} from '../types.js';

import { SeededRandom } from '../utils/random.js';
import { MapEngine } from './map.js';
import { CombatEngine } from './combat.js';
import { EconomyEngine } from './economy.js';
import { createAgent, type BaseAgent } from '../agents/index.js';
import type { AgentContext } from '../agents/base.js';

export interface GenerationResult {
  generationId: number;
  winner: SimPlayer | null;
  finalDay: number;
  players: SimPlayer[];
  combats: SimCombat[];
  events: SimEvent[];
}

export class GameEngine {
  private random: SeededRandom;
  private mapEngine: MapEngine;
  private combatEngine: CombatEngine;
  private economyEngine: EconomyEngine;
  private config: SimulationConfig;
  private agents: Map<string, BaseAgent> = new Map();
  private verbose: boolean;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.random = new SeededRandom(config.seed);
    this.mapEngine = new MapEngine(this.random);
    this.combatEngine = new CombatEngine(this.random);
    this.economyEngine = new EconomyEngine();
    this.verbose = config.verbose;
  }

  /**
   * Run a single generation simulation
   */
  runGeneration(generationId: number): GenerationResult {
    if (this.verbose) {
      console.log(`\n=== Generation ${generationId} ===`);
    }

    // Initialize state
    const state = this.initializeState(generationId);

    // Run day by day
    for (let day = 1; day <= this.config.daysPerGeneration; day++) {
      state.day = day;
      state.phase = this.getPhase(day);

      // Process daily tick
      this.processDailyTick(state);

      // Heartbeat every 7 days
      if (day % 7 === 0) {
        this.processHeartbeat(state);
      }

      // Check for early termination
      const activePlayers = Array.from(state.players.values()).filter(
        (p) => !p.isEliminated
      );
      if (activePlayers.length <= 1) {
        if (this.verbose) {
          console.log(`  Generation ended early on day ${day}`);
        }
        break;
      }
    }

    // Determine winner
    const players = Array.from(state.players.values());
    const winner = this.determineWinner(players, state);

    if (this.verbose && winner) {
      console.log(`  Winner: ${winner.race} ${winner.captainClass} (${winner.captainSkill})`);
      console.log(`  Score: ${winner.score}, Territories: ${winner.territories.size}`);
    }

    return {
      generationId,
      winner,
      finalDay: state.day,
      players,
      combats: state.combatLog,
      events: state.events,
    };
  }

  /**
   * Initialize game state for a new generation
   */
  private initializeState(generationId: number): SimulationState {
    const state: SimulationState = {
      generationId,
      day: 0,
      phase: 'planning',
      players: new Map(),
      territories: new Map(),
      combatLog: [],
      events: [],
    };

    // Generate map
    const territories = this.mapEngine.generateMap();
    state.territories = territories;

    // Spawn initial Forsaken
    this.mapEngine.spawnForsaken(0.3);

    // Create players
    this.createPlayers(state);

    // Assign starting territories
    this.assignStartingTerritories(state);

    return state;
  }

  /**
   * Create players with random or distributed attributes
   */
  private createPlayers(state: SimulationState): void {
    const { playersPerGeneration, agentDistribution } = this.config;

    for (let i = 0; i < playersPerGeneration; i++) {
      const id = `player-${i}`;
      const agentType = this.pickAgentType(agentDistribution);
      const race = this.random.pick(RACES);
      const captainClass = this.random.pick(CAPTAIN_CLASSES);
      const skills = CAPTAIN_SKILLS[captainClass];
      const captainSkill = this.random.pick(skills);
      const isPremium = this.random.chance(0.3); // 30% premium players

      const tier = isPremium ? ENTRY_TIERS.premium : ENTRY_TIERS.free;

      const player: SimPlayer = {
        id,
        race,
        captainClass,
        captainSkill,
        captainAlive: true,
        resources: { ...tier.resources },
        territories: new Set(),
        armies: [],
        buildings: [],
        score: 0,
        agentType,
        isEliminated: false,
        joinedDay: 1,
        isPremium,
        morale: 100,
        battlesWon: 0,
        battlesLost: 0,
        totalKills: 0,
        totalDeaths: 0,
      };

      state.players.set(id, player);

      // Create agent
      const agent = createAgent(agentType, this.random);
      this.agents.set(id, agent);

      state.events.push({
        day: 0,
        type: 'player_joined',
        playerId: id,
        data: { race, captainClass, captainSkill, agentType },
      });
    }
  }

  /**
   * Pick agent type based on distribution
   */
  private pickAgentType(distribution: AgentDistribution): AgentType {
    const types: AgentType[] = ['random', 'aggressive', 'defensive', 'economic', 'balanced'];
    const weights = [
      distribution.random,
      distribution.aggressive,
      distribution.defensive,
      distribution.economic,
      distribution.balanced,
    ];
    return this.random.weightedPick(types, weights);
  }

  /**
   * Assign starting territories to players
   */
  private assignStartingTerritories(state: SimulationState): void {
    const players = Array.from(state.players.values());
    const plotsPerPlayer = 2; // Base plots (premium gets more later)

    const startingPositions = this.mapEngine.findStartingPositions(
      players.length,
      plotsPerPlayer
    );

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const positions = startingPositions[i].positions;

      // Assign territories
      for (const [x, y] of positions) {
        const territory = this.mapEngine.getTerritory(x, y);
        if (territory) {
          this.mapEngine.claimTerritory(territory, player.id);
          player.territories.add(territory.id);
        }
      }

      // Premium players get more plots
      if (player.isPremium) {
        const extraPlots = 8; // 10 total - 2 base
        const adjacent = this.getExpandablePositions(player, state, extraPlots);
        for (const territory of adjacent) {
          this.mapEngine.claimTerritory(territory, player.id);
          player.territories.add(territory.id);
        }
      }

      // Create starting army
      const startingUnits = getUnitsForRace(player.race);
      const defenderType = startingUnits.find(
        (u) => UNIT_DEFINITIONS[u]?.role === 'defender'
      );
      if (defenderType) {
        const army: SimArmy = {
          id: `army-${player.id}-0`,
          ownerId: player.id,
          territoryId: Array.from(player.territories)[0],
          units: [
            {
              type: defenderType,
              quantity: 10,
              currentHp: UNIT_DEFINITIONS[defenderType].hp * 10,
            },
          ],
          totalStrength: UNIT_DEFINITIONS[defenderType].atk * 10,
          totalFoodConsumption: UNIT_DEFINITIONS[defenderType].food * 10,
          hasCaptain: true,
        };
        player.armies.push(army);
      }
    }
  }

  /**
   * Get expandable positions for a player
   */
  private getExpandablePositions(
    player: SimPlayer,
    state: SimulationState,
    count: number
  ): SimTerritory[] {
    const result: SimTerritory[] = [];
    const checked = new Set<string>();

    for (const territoryId of player.territories) {
      const territory = state.territories.get(territoryId);
      if (!territory) continue;

      const adjacent = this.mapEngine.getAdjacentTerritories(territory.x, territory.y);
      for (const adj of adjacent) {
        if (checked.has(adj.id)) continue;
        checked.add(adj.id);

        if (!adj.ownerId && !adj.isForsaken) {
          result.push(adj);
          if (result.length >= count) return result;
        }
      }
    }

    return result;
  }

  /**
   * Get current game phase
   */
  private getPhase(day: number): 'planning' | 'active' | 'endgame' {
    if (day <= 5) return 'planning';
    if (day <= 45) return 'active';
    return 'endgame';
  }

  /**
   * Process daily game tick
   */
  private processDailyTick(state: SimulationState): void {
    const players = Array.from(state.players.values()).filter((p) => !p.isEliminated);

    // Process each player
    for (const player of players) {
      const territories = this.getPlayerTerritories(player, state);

      // Resource production/consumption
      this.economyEngine.processDailyTick(player, territories, player.armies);

      // Check for starvation
      if (player.resources.food < 0) {
        this.processStarvation(player, state);
      }

      // Complete buildings
      this.processBuildings(player, territories, state);

      // Agent decision making
      this.processAgentTurn(player, territories, state);

      // Update score
      player.score = this.economyEngine.calculateScore(player, territories, state.day);
    }

    // Check for eliminations
    this.checkEliminations(state);
  }

  /**
   * Get territories owned by a player
   */
  private getPlayerTerritories(player: SimPlayer, state: SimulationState): SimTerritory[] {
    return Array.from(player.territories)
      .map((id) => state.territories.get(id))
      .filter((t): t is SimTerritory => t !== undefined);
  }

  /**
   * Process starvation effects
   */
  private processStarvation(player: SimPlayer, state: SimulationState): void {
    // Lose morale
    player.morale = Math.max(0, player.morale - 10);

    // Armies desert (lose 10% of units)
    for (const army of player.armies) {
      for (const unit of army.units) {
        const lost = Math.ceil(unit.quantity * 0.1);
        unit.quantity = Math.max(0, unit.quantity - lost);
        player.totalDeaths += lost;
      }
      // Remove empty units
      army.units = army.units.filter((u) => u.quantity > 0);
    }

    // Reset food to 0
    player.resources.food = 0;
  }

  /**
   * Process building completion
   */
  private processBuildings(
    player: SimPlayer,
    territories: SimTerritory[],
    state: SimulationState
  ): void {
    for (const territory of territories) {
      for (const building of territory.buildings) {
        if (!building.completed && building.completionDay <= state.day) {
          building.completed = true;
          state.events.push({
            day: state.day,
            type: 'building_completed',
            playerId: player.id,
            data: { buildingType: building.type, territoryId: territory.id },
          });
        }
      }
    }
  }

  /**
   * Process agent's turn
   */
  private processAgentTurn(
    player: SimPlayer,
    territories: SimTerritory[],
    state: SimulationState
  ): void {
    const agent = this.agents.get(player.id);
    if (!agent) return;

    const context: AgentContext = {
      player,
      territories,
      day: state.day,
      phase: state.phase,
      allPlayers: state.players,
      mapEngine: this.mapEngine,
      economyEngine: this.economyEngine,
      random: this.random,
    };

    const actions = agent.decideActions(context);

    // Execute highest priority action
    for (const action of actions.slice(0, 3)) {
      // Max 3 actions per turn
      this.executeAction(player, action, state);
    }
  }

  /**
   * Execute an agent action
   */
  private executeAction(
    player: SimPlayer,
    action: AgentAction,
    state: SimulationState
  ): void {
    switch (action.type) {
      case 'build':
        this.executeBuild(player, action.data as { buildingType: BuildingType; territoryId: string }, state);
        break;
      case 'train':
        this.executeTrain(player, action.data as { unitType: UnitType; quantity: number }, state);
        break;
      case 'attack':
        this.executeAttack(player, action.data as { targetId: string }, state);
        break;
      case 'wait':
        // Do nothing
        break;
    }
  }

  /**
   * Execute build action
   */
  private executeBuild(
    player: SimPlayer,
    data: { buildingType: BuildingType; territoryId: string },
    state: SimulationState
  ): void {
    const territory = state.territories.get(data.territoryId);
    if (!territory || territory.ownerId !== player.id) return;

    const result = this.economyEngine.canBuildInTerritory(player, territory, data.buildingType);
    if (!result.canBuild) return;

    const cost = this.economyEngine.getBuildingCost(player, data.buildingType);
    this.economyEngine.deductResources(player.resources, cost);

    const def = BUILDING_DEFINITIONS[data.buildingType];
    const completionDay = state.day + Math.ceil(def.buildTimeHours / 24);

    // Artificer skill reduces build time
    if (player.captainSkill === 'artificer') {
      const reducedTime = Math.ceil((def.buildTimeHours * 0.75) / 24);
    }

    const building: SimBuilding = {
      type: data.buildingType,
      territoryId: territory.id,
      completed: false,
      completionDay,
    };

    territory.buildings.push(building);
  }

  /**
   * Execute train action
   */
  private executeTrain(
    player: SimPlayer,
    data: { unitType: UnitType; quantity: number },
    state: SimulationState
  ): void {
    if (!this.economyEngine.canAffordUnit(player, data.unitType, data.quantity)) return;

    const cost = this.economyEngine.getUnitCost(data.unitType, data.quantity);
    this.economyEngine.deductResources(player.resources, cost);

    const def = UNIT_DEFINITIONS[data.unitType];

    // Add to existing army or create new one
    if (player.armies.length > 0) {
      const army = player.armies[0];
      const existingUnit = army.units.find((u) => u.type === data.unitType);

      if (existingUnit) {
        existingUnit.quantity += data.quantity;
        existingUnit.currentHp += def.hp * data.quantity;
      } else {
        army.units.push({
          type: data.unitType,
          quantity: data.quantity,
          currentHp: def.hp * data.quantity,
        });
      }

      army.totalStrength += def.atk * data.quantity;
      army.totalFoodConsumption += def.food * data.quantity;
    }
  }

  /**
   * Execute attack action
   */
  private executeAttack(
    player: SimPlayer,
    data: { targetId: string },
    state: SimulationState
  ): void {
    if (state.phase === 'planning') return;
    if (player.armies.length === 0) return;

    const target = state.territories.get(data.targetId);
    if (!target) return;

    // Check adjacency
    const playerTerritories = this.getPlayerTerritories(player, state);
    const isAdjacent = playerTerritories.some((t) => {
      const adjacent = this.mapEngine.getAdjacentTerritories(t.x, t.y);
      return adjacent.some((a) => a.id === target.id);
    });

    if (!isAdjacent) return;

    const fullArmy = player.armies[0];

    // Attacker must leave forces to defend their own territories
    // Can't attack with 100% of army - need to keep some home
    // Attack ratio depends on agent type and number of territories to defend
    const numTerritories = Math.max(1, player.territories.size);
    let attackRatio: number;

    switch (player.agentType) {
      case 'aggressive':
        // Aggressive: commits 60-70% to attack, leaves 30-40% defending
        attackRatio = Math.max(0.5, 0.7 - numTerritories * 0.02);
        break;
      case 'defensive':
        // Defensive: only commits 30-40% to attack, keeps 60-70% defending
        attackRatio = Math.max(0.25, 0.4 - numTerritories * 0.02);
        break;
      case 'balanced':
        // Balanced: 50-50 split
        attackRatio = Math.max(0.4, 0.55 - numTerritories * 0.015);
        break;
      default:
        // Random/Economic: variable 40-60%
        attackRatio = Math.max(0.35, 0.5 - numTerritories * 0.015);
    }

    // Create attacking force (portion of main army)
    const army = this.createAttackForce(fullArmy, attackRatio);
    let result;

    if (target.isForsaken) {
      result = this.combatEngine.resolveForsakenCombat(player, army, target, state.day);
    } else if (target.ownerId) {
      const defender = state.players.get(target.ownerId);
      if (!defender || defender.isEliminated) return;

      // Combine garrison with any stationed army
      // Garrison represents local militia that always defends
      const garrison = this.createGarrisonArmy(defender, target);
      const mainArmy = defender.armies[0];
      const hasMainArmy = mainArmy && mainArmy.units.length > 0 && mainArmy.units.some((u) => u.quantity > 0);

      // Calculate how many territories defender has - larger empires have thinner defense
      const numTerritories = Math.max(1, defender.territories.size);
      // Defenders with fewer territories can concentrate more forces (40-60%)
      // Large empires have forces spread thin (10-20%)
      const defenseRatio = Math.max(0.15, Math.min(0.6, 1.0 / Math.sqrt(numTerritories)));

      // Combine garrison and main army
      const defenderArmy = hasMainArmy
        ? this.combineArmies(garrison, mainArmy, defenseRatio)
        : garrison;
      result = this.combatEngine.resolveCombat({
        attacker: player,
        defender,
        attackerArmy: army,
        defenderArmy,
        territory: target,
        day: state.day,
      });

      // Update defender
      if (result.combat.defenderCaptainDied) {
        defender.captainAlive = false;
        state.events.push({
          day: state.day,
          type: 'captain_died',
          playerId: defender.id,
          data: {},
        });
      }

      if (result.combat.result === 'attacker_victory') {
        defender.territories.delete(target.id);
        defender.battlesLost++;
      } else {
        defender.battlesWon++;
      }
    }

    if (!result) return;

    // Update attacker
    if (result.combat.attackerCaptainDied) {
      player.captainAlive = false;
      state.events.push({
        day: state.day,
        type: 'captain_died',
        playerId: player.id,
        data: {},
      });
    }

    // Apply casualties
    this.applyCasualties(army, result.combat.attackerCasualties);
    player.totalKills += result.combat.defenderCasualties;
    player.totalDeaths += result.combat.attackerCasualties;

    // Handle victory
    if (result.territoryChangedOwner) {
      this.mapEngine.claimTerritory(target, player.id);
      player.territories.add(target.id);
      player.battlesWon++;
      state.events.push({
        day: state.day,
        type: 'territory_claimed',
        playerId: player.id,
        data: { territoryId: target.id },
      });
    } else {
      player.battlesLost++;
    }

    state.combatLog.push(result.combat);
    state.events.push({
      day: state.day,
      type: 'combat',
      playerId: player.id,
      data: { combatId: result.combat.id, result: result.combat.result },
    });
  }

  /**
   * Apply casualties to an army
   */
  private applyCasualties(army: SimArmy, casualties: number): void {
    let remaining = casualties;

    for (const unit of army.units) {
      if (remaining <= 0) break;

      const toRemove = Math.min(unit.quantity, remaining);
      unit.quantity -= toRemove;
      remaining -= toRemove;
    }

    // Remove empty units
    army.units = army.units.filter((u) => u.quantity > 0);
  }

  /**
   * Create an attack force from a portion of the main army
   * Attacker can't commit 100% - must leave defenders at home
   */
  private createAttackForce(fullArmy: SimArmy, ratio: number): SimArmy {
    const attackForce: SimArmy = {
      id: `attack-${fullArmy.id}`,
      ownerId: fullArmy.ownerId,
      territoryId: fullArmy.territoryId,
      units: [],
      totalStrength: 0,
      totalFoodConsumption: 0,
      hasCaptain: fullArmy.hasCaptain, // Captain leads the attack
    };

    for (const unit of fullArmy.units) {
      const attackQuantity = Math.floor(unit.quantity * ratio);
      if (attackQuantity <= 0) continue;

      attackForce.units.push({
        type: unit.type,
        quantity: attackQuantity,
        currentHp: Math.floor(unit.currentHp * ratio),
      });

      const def = UNIT_DEFINITIONS[unit.type];
      if (def) {
        attackForce.totalStrength += def.atk * attackQuantity;
        attackForce.totalFoodConsumption += def.food * attackQuantity;
      }
    }

    return attackForce;
  }

  /**
   * Combine two armies (garrison + fraction of main army)
   */
  private combineArmies(garrison: SimArmy, mainArmy: SimArmy, fraction: number): SimArmy {
    const combined: SimArmy = {
      id: `army-combined`,
      ownerId: garrison.ownerId,
      territoryId: garrison.territoryId,
      units: [...garrison.units],
      totalStrength: garrison.totalStrength,
      totalFoodConsumption: 0,
      hasCaptain: mainArmy.hasCaptain, // Captain might be with main army
    };

    // Add fraction of main army units
    for (const unit of mainArmy.units) {
      const addedQuantity = Math.floor(unit.quantity * fraction);
      if (addedQuantity <= 0) continue;

      const existingUnit = combined.units.find((u) => u.type === unit.type);
      if (existingUnit) {
        existingUnit.quantity += addedQuantity;
        existingUnit.currentHp += Math.floor(unit.currentHp * fraction);
      } else {
        combined.units.push({
          type: unit.type,
          quantity: addedQuantity,
          currentHp: Math.floor(unit.currentHp * fraction),
        });
      }

      const def = UNIT_DEFINITIONS[unit.type];
      if (def) {
        combined.totalStrength += def.atk * addedQuantity;
      }
    }

    return combined;
  }

  /**
   * Create garrison army for defender without one
   * Every territory has local militia that defends it
   * Garrisons are STRONG - they represent fortified positions
   */
  private createGarrisonArmy(player: SimPlayer, territory: SimTerritory): SimArmy {
    // Base garrison - significantly stronger to make defense meaningful
    // This simulates trained local militia + fortifications
    let garrisonSize = 25; // Start with 25 baseline
    switch (territory.zone) {
      case 'heart':
        garrisonSize = 80; // Heart is heavily defended
        break;
      case 'inner':
        garrisonSize = 60;
        break;
      case 'middle':
        garrisonSize = 40;
        break;
      case 'outer':
        garrisonSize = 25;
        break;
    }

    // Buildings SIGNIFICANTLY increase garrison
    const hasBarracks = territory.buildings.some((b) => b.type === 'barracks' && b.completed);
    const hasWall = territory.buildings.some((b) => b.type === 'wall' && b.completed);
    const hasWatchtower = territory.buildings.some((b) => b.type === 'watchtower' && b.completed);
    const hasArmory = territory.buildings.some((b) => b.type === 'armory' && b.completed);
    const hasWarhall = territory.buildings.some((b) => b.type === 'warhall' && b.completed);

    if (hasBarracks) garrisonSize += 40; // Barracks = trained soldiers
    if (hasWall) garrisonSize += 30; // Walls = major defense boost
    if (hasWatchtower) garrisonSize += 15;
    if (hasArmory) garrisonSize += 20;
    if (hasWarhall) garrisonSize += 25;

    // Race bonuses
    if (player.race === 'ironveld') garrisonSize = Math.floor(garrisonSize * 1.3); // +30% defensive race
    if (player.race === 'ashborn') garrisonSize = Math.floor(garrisonSize * 1.15); // +15% undying militia

    // Get defender unit type for this race
    const raceUnits = getUnitsForRace(player.race);
    const defenderType = raceUnits.find(
      (u) => UNIT_DEFINITIONS[u]?.role === 'defender'
    ) || raceUnits[0];

    const unitDef = UNIT_DEFINITIONS[defenderType];
    if (!unitDef) {
      return {
        id: `army-${player.id}-garrison`,
        ownerId: player.id,
        territoryId: territory.id,
        units: [],
        totalStrength: garrisonSize * 5, // Fallback strength
        totalFoodConsumption: 0,
        hasCaptain: false,
      };
    }

    return {
      id: `army-${player.id}-garrison`,
      ownerId: player.id,
      territoryId: territory.id,
      units: [
        {
          type: defenderType,
          quantity: garrisonSize,
          currentHp: unitDef.hp * garrisonSize,
        },
      ],
      totalStrength: unitDef.atk * garrisonSize,
      totalFoodConsumption: 0, // Garrison is free
      hasCaptain: false,
    };
  }

  /**
   * Check for player eliminations
   */
  private checkEliminations(state: SimulationState): void {
    for (const player of state.players.values()) {
      if (player.isEliminated) continue;

      // Eliminated if no territories
      if (player.territories.size === 0) {
        player.isEliminated = true;
        state.events.push({
          day: state.day,
          type: 'player_eliminated',
          playerId: player.id,
          data: { reason: 'no_territories' },
        });
      }
    }
  }

  /**
   * Process heartbeat (every 7 days)
   */
  private processHeartbeat(state: SimulationState): void {
    this.mapEngine.heartbeat();

    state.events.push({
      day: state.day,
      type: 'forsaken_spawned',
      data: {},
    });
  }

  /**
   * Determine winner of the generation
   */
  private determineWinner(players: SimPlayer[], state: SimulationState): SimPlayer | null {
    const active = players.filter((p) => !p.isEliminated);

    if (active.length === 0) return null;
    if (active.length === 1) return active[0];

    // Sort by score
    active.sort((a, b) => b.score - a.score);
    return active[0];
  }
}
