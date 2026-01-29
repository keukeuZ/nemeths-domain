# Nemeths Domain - Testing & Simulation Framework

## OVERVIEW

Testing for Nemeth's Domain spans three critical areas:
1. **Correctness** - Does the code work as designed?
2. **Balance** - Are races, units, and mechanics fair?
3. **Performance** - Can it handle thousands of players?

**Philosophy:**
- Simulate thousands of generations before launch
- Every D20 table needs statistical verification
- Balance issues found in simulation, not production
- Automated regression for every change

---

## TESTING LAYERS

```
┌─────────────────────────────────────────────────────────────┐
│                    END-TO-END TESTS                         │
│              (Full game flow, real browsers)                │
├─────────────────────────────────────────────────────────────┤
│                   INTEGRATION TESTS                         │
│         (Server + DB + Redis + Blockchain mock)             │
├─────────────────────────────────────────────────────────────┤
│                      UNIT TESTS                             │
│    (Combat engine, timers, visibility, calculations)        │
├─────────────────────────────────────────────────────────────┤
│                  SIMULATION FRAMEWORK                       │
│       (Balance testing, Monte Carlo, AI players)            │
├─────────────────────────────────────────────────────────────┤
│                 SMART CONTRACT TESTS                        │
│            (Foundry/Hardhat, fork testing)                  │
└─────────────────────────────────────────────────────────────┘
```

---

## UNIT TESTING

### Technology

| Component | Framework | Coverage Target |
|-----------|-----------|-----------------|
| Game Server | Jest + TypeScript | 90% |
| Combat Engine | Jest | 100% |
| Smart Contracts | Foundry | 100% |
| Frontend | Vitest + React Testing Library | 80% |

### Combat Engine Tests

```typescript
// tests/combat/combat-engine.test.ts

describe('CombatEngine', () => {

  describe('D20 Weighted Rolls', () => {

    it('should produce weighted distribution for attack rolls', () => {
      const rolls = Array(100000).fill(0).map(() => engine.rollAttack());
      const distribution = analyzeDistribution(rolls);

      // Verify weighted probabilities
      expect(distribution.criticalFail).toBeCloseTo(0.05, 1); // 5%
      expect(distribution.poor).toBeCloseTo(0.15, 1);         // 15%
      expect(distribution.belowAvg).toBeCloseTo(0.20, 1);     // 20%
      expect(distribution.median).toBeCloseTo(0.20, 1);       // 20%
      expect(distribution.aboveAvg).toBeCloseTo(0.20, 1);     // 20%
      expect(distribution.strong).toBeCloseTo(0.15, 1);       // 15%
      expect(distribution.critical).toBeCloseTo(0.05, 1);     // 5%
    });

    it('should have expected value of 1.0x for attack modifier', () => {
      const rolls = Array(100000).fill(0).map(() => engine.getAttackModifier());
      const average = rolls.reduce((a, b) => a + b) / rolls.length;

      expect(average).toBeCloseTo(1.0, 2);
    });
  });

  describe('Damage Calculation', () => {

    it('should calculate net damage correctly', () => {
      const attacker = createArmy({ totalATK: 1000 });
      const defender = createArmy({ totalDEF: 800 });

      // With 1.0x modifiers
      const damage = engine.calculateDamage(attacker, defender, 1.0, 1.0);
      expect(damage).toBe(200); // 1000 - 800
    });

    it('should apply terrain modifiers', () => {
      const attacker = createArmy({ totalATK: 1000 });
      const defender = createArmy({ totalDEF: 800 });
      const terrain = { defenseModifier: 1.2 }; // Hills

      const damage = engine.calculateDamage(attacker, defender, 1.0, 1.0, terrain);
      expect(damage).toBe(40); // 1000 - (800 * 1.2) = 1000 - 960
    });

    it('should never produce negative damage', () => {
      const attacker = createArmy({ totalATK: 100 });
      const defender = createArmy({ totalDEF: 1000 });

      const damage = engine.calculateDamage(attacker, defender, 1.0, 1.0);
      expect(damage).toBe(0);
    });
  });

  describe('Casualty Distribution', () => {

    it('should distribute casualties by position', () => {
      const army = createArmy({
        units: [
          { type: 'footman', count: 100, position: 'frontline', hp: 15 },
          { type: 'archer', count: 50, position: 'midline', hp: 10 },
          { type: 'catapult', count: 10, position: 'backline', hp: 30 }
        ]
      });

      const casualties = engine.distributeCasualties(army, 500);

      // Frontline takes 50% = 250 damage = 16 footmen
      expect(casualties.footman).toBeCloseTo(16, 0);
      // Midline takes 35% = 175 damage = 17 archers
      expect(casualties.archer).toBeCloseTo(17, 0);
      // Backline takes 15% = 75 damage = 2 catapults
      expect(casualties.catapult).toBeCloseTo(2, 0);
    });
  });

  describe('Race Abilities', () => {

    describe('Ashborn Reformation', () => {

      it('should return 10-20% of dead with median 15%', () => {
        const results = Array(10000).fill(0).map(() => {
          return engine.rollReformation(100, { race: 'ashborn' });
        });

        const average = results.reduce((a, b) => a + b) / results.length;
        expect(average).toBeCloseTo(15, 1); // Median ~15%

        const min = Math.min(...results);
        const max = Math.max(...results);
        expect(min).toBeGreaterThanOrEqual(10);
        expect(max).toBeLessThanOrEqual(20);
      });

      it('should apply +2 Ashborn bonus to roll', () => {
        // Mock roll of 8 (normally 15%), with +2 = 10 (still 15%)
        // Mock roll of 14 (normally 17%), with +2 = 16 (17%)
        // Mock roll of 18 (normally 20%), with +2 = 20 (capped at 20%)

        jest.spyOn(engine, 'rollD20').mockReturnValue(18);
        const result = engine.rollReformation(100, { race: 'ashborn' });
        expect(result).toBe(20); // 18 + 2 = 20, returns 20%
      });
    });

    describe('Korrath Enslaver', () => {

      it('should enslave 5-15% of killed enemies at 80% strength', () => {
        const results = Array(10000).fill(0).map(() => {
          return engine.rollEnslaver(100);
        });

        const average = results.reduce((a, b) => a + b) / results.length;
        expect(average).toBeCloseTo(10, 1); // Median ~10%
      });

      it('should mark slaves with 80% effectiveness', () => {
        const slaves = engine.createSlaves(10, 'footman');

        expect(slaves.count).toBe(10);
        expect(slaves.effectiveness).toBe(0.8);
        expect(slaves.effectiveATK).toBe(Math.floor(8 * 0.8)); // Footman ATK 8
      });
    });
  });

  describe('Morale System', () => {

    it('should reduce ATK/DEF at low morale', () => {
      const army = createArmy({ morale: 40 }); // 25-49% bracket

      const modifier = engine.getMoraleModifier(army);
      expect(modifier).toBe(0.75); // -25%
    });

    it('should trigger desertion below 25% morale', () => {
      const army = createArmy({ morale: 20, units: 100 });

      const deserters = engine.checkDesertion(army);
      expect(deserters).toBeGreaterThan(0);
      expect(deserters).toBeLessThanOrEqual(15); // Max 15% per round
    });
  });

  describe('Critical Hits', () => {

    it('should trigger bonus effect on natural 20', () => {
      jest.spyOn(engine, 'rollD20').mockReturnValue(20);

      const result = engine.resolveAttackRoll();

      expect(result.modifier).toBe(1.5);
      expect(result.critical).toBe(true);
      expect(result.bonusEffect).toBeDefined();
    });

    it('should trigger penalty effect on natural 1', () => {
      jest.spyOn(engine, 'rollD20').mockReturnValue(1);

      const result = engine.resolveAttackRoll();

      expect(result.modifier).toBe(0.5);
      expect(result.criticalFail).toBe(true);
      expect(result.penaltyEffect).toBeDefined();
    });
  });
});
```

### Economy Tests

```typescript
// tests/economy/resource-generation.test.ts

describe('Resource Generation', () => {

  describe('Daily Production', () => {

    it('should calculate farm output correctly', () => {
      const farm = createBuilding({ type: 'farm', level: 1 });
      const output = economy.calculateDailyOutput(farm);

      expect(output.food).toBe(50);
    });

    it('should apply zone multipliers', () => {
      const farm = createBuilding({ type: 'farm', level: 1 });
      const territory = createTerritory({ zone: 'inner' }); // 2x

      const output = economy.calculateDailyOutput(farm, territory);

      expect(output.food).toBe(100); // 50 * 2
    });

    it('should apply race modifiers', () => {
      const farm = createBuilding({ type: 'farm', level: 1 });
      const player = createPlayer({ race: 'ashborn' }); // -15%

      const output = economy.calculateDailyOutput(farm, null, player);

      expect(output.food).toBe(42.5); // 50 * 0.85
    });
  });

  describe('Food Consumption', () => {

    it('should calculate army food cost', () => {
      const army = createArmy({
        units: [
          { type: 'footman', count: 100 }, // 2 food each
          { type: 'knight', count: 50 }     // 6 food each
        ]
      });

      const cost = economy.calculateFoodCost(army);
      expect(cost).toBe(500); // (100 * 2) + (50 * 6)
    });

    it('should exempt food-free races', () => {
      const army = createArmy({
        owner: { race: 'ironveld' },
        units: [{ type: 'footman', count: 100 }]
      });

      const cost = economy.calculateFoodCost(army);
      expect(cost).toBe(0);
    });
  });

  describe('Alliance Hosting', () => {

    it('should calculate lodging cost', () => {
      const visitingArmy = createArmy({ units: 200 });

      const cost = economy.calculateLodgingCost(visitingArmy);
      expect(cost.gold).toBe(175); // 151-300 bracket
    });

    it('should double lodging for food-free host with food-requiring guest', () => {
      const host = createPlayer({ race: 'ironveld' });
      const guest = createArmy({
        owner: { race: 'korrath' },
        units: 200
      });

      const cost = economy.calculateHostingCost(host, guest);
      expect(cost.gold).toBe(350); // 175 * 2
      expect(cost.food).toBe(0);   // No food from food-free host
    });
  });
});
```

### Visibility Tests

```typescript
// tests/visibility/fog-of-war.test.ts

describe('Visibility Engine', () => {

  describe('Ownership Visibility', () => {

    it('should show full info for owned territories', () => {
      const player = createPlayer({ address: '0x123' });
      const territory = createTerritory({ owner: '0x123' });

      const visible = visibility.getVisibleState(territory, player);

      expect(visible.level).toBe('full');
      expect(visible.units).toBeDefined();
      expect(visible.buildings).toBeDefined();
      expect(visible.resources).toBeDefined();
    });

    it('should show fogged info for adjacent enemy territories', () => {
      const player = createPlayer({ address: '0x123' });
      const ownTerritory = createTerritory({ owner: '0x123', x: 10, y: 10 });
      const enemyTerritory = createTerritory({ owner: '0x456', x: 11, y: 10 });

      const visible = visibility.getVisibleState(enemyTerritory, player, [ownTerritory]);

      expect(visible.level).toBe('fogged');
      expect(visible.hasArmy).toBeDefined();      // Boolean only
      expect(visible.armySize).toBe('unknown');   // Or category
      expect(visible.exactUnits).toBeUndefined(); // Hidden
    });
  });

  describe('Scouting Accuracy', () => {

    it('should apply intel accuracy to scouted territories', () => {
      const territory = createTerritory({
        garrison: createArmy({ totalUnits: 500 })
      });

      // Sylvaeth roll of 10 = 90% accuracy
      jest.spyOn(visibility, 'getIntelAccuracy').mockReturnValue(0.9);

      const visible = visibility.getScoutedState(territory);

      // Reported units should be within 10% of actual
      expect(visible.estimatedUnits).toBeGreaterThan(450);
      expect(visible.estimatedUnits).toBeLessThan(550);
    });

    it('should report wrong info on intel roll of 1', () => {
      const territory = createTerritory({
        garrison: createArmy({ totalUnits: 500 })
      });

      jest.spyOn(visibility, 'rollD20').mockReturnValue(1);

      const visible = visibility.getScoutedState(territory);

      expect(visible.falseIntel).toBe(true);
      // Could report wildly different numbers
    });
  });
});
```

---

## SMART CONTRACT TESTS

### Foundry Test Suite

```solidity
// test/GenerationManager.t.sol

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/GenerationManager.sol";

contract GenerationManagerTest is Test {
    GenerationManager manager;
    address player1 = address(0x1);
    address player2 = address(0x2);

    function setUp() public {
        manager = new GenerationManager();
        manager.startGeneration();

        // Fund test accounts
        vm.deal(player1, 1 ether);
        vm.deal(player2, 1 ether);
    }

    function testRegister() public {
        vm.prank(player1);
        manager.register{value: 0.005 ether}(
            1,              // race: Ironveld
            5,              // plots
            keccak256("captain")
        );

        (address wallet, uint8 race, uint8 plots, , bool registered, ) =
            manager.players(1, player1);

        assertEq(wallet, player1);
        assertEq(race, 1);
        assertEq(plots, 5);
        assertTrue(registered);
    }

    function testCannotRegisterTwice() public {
        vm.startPrank(player1);

        manager.register{value: 0.005 ether}(1, 5, keccak256("captain"));

        vm.expectRevert("Already registered");
        manager.register{value: 0.005 ether}(1, 5, keccak256("captain2"));

        vm.stopPrank();
    }

    function testIncorrectFee() public {
        vm.prank(player1);

        vm.expectRevert("Incorrect fee");
        manager.register{value: 0.001 ether}(1, 5, keccak256("captain"));
    }

    function testInvalidRace() public {
        vm.prank(player1);

        vm.expectRevert("Invalid race");
        manager.register{value: 0.005 ether}(7, 5, keccak256("captain")); // Race 7 doesn't exist
    }

    function testMaxPlots() public {
        vm.prank(player1);

        vm.expectRevert("Invalid plot count");
        manager.register{value: 0.011 ether}(1, 11, keccak256("captain")); // Max 10
    }

    function testRegistrationPeriod() public {
        // Fast forward past registration
        vm.warp(block.timestamp + 8 days);

        vm.prank(player1);
        vm.expectRevert("Registration closed");
        manager.register{value: 0.005 ether}(1, 5, keccak256("captain"));
    }
}
```

```solidity
// test/CombatSystem.t.sol

contract CombatSystemTest is Test {
    CombatSystem combat;
    address attacker = address(0x1);
    address defender = address(0x2);

    function setUp() public {
        combat = new CombatSystem();
    }

    function testCommitAttack() public {
        bytes32 commitHash = keccak256(abi.encodePacked(
            uint8(50), uint8(50),  // target coords
            keccak256("army"),     // army hash
            bytes32("salt123")     // salt
        ));

        vm.prank(attacker);
        uint256 attackId = combat.commitAttack(1, commitHash, 4 hours);

        (bytes32 hash, , , bool revealed, bool resolved) =
            combat.commitments(1, attacker, attackId);

        assertEq(hash, commitHash);
        assertFalse(revealed);
        assertFalse(resolved);
    }

    function testRevealAttack() public {
        // Commit
        bytes32 armyHash = keccak256("army");
        bytes32 salt = bytes32("salt123");
        bytes32 commitHash = keccak256(abi.encodePacked(
            uint8(50), uint8(50), armyHash, salt
        ));

        vm.prank(attacker);
        uint256 attackId = combat.commitAttack(1, commitHash, 4 hours);

        // Fast forward to reveal window
        vm.warp(block.timestamp + 2 hours);

        // Reveal
        vm.prank(attacker);
        combat.revealAttack(1, attackId, 50, 50, armyHash, salt);

        (, , , bool revealed, ) = combat.commitments(1, attacker, attackId);
        assertTrue(revealed);
    }

    function testInvalidReveal() public {
        bytes32 commitHash = keccak256(abi.encodePacked(
            uint8(50), uint8(50),
            keccak256("army"),
            bytes32("salt123")
        ));

        vm.prank(attacker);
        uint256 attackId = combat.commitAttack(1, commitHash, 4 hours);

        vm.warp(block.timestamp + 2 hours);

        // Try to reveal with wrong data
        vm.prank(attacker);
        vm.expectRevert("Invalid reveal");
        combat.revealAttack(1, attackId, 50, 50, keccak256("wrong"), bytes32("salt123"));
    }

    function testRevealWindowExpired() public {
        bytes32 commitHash = keccak256(abi.encodePacked(
            uint8(50), uint8(50),
            keccak256("army"),
            bytes32("salt123")
        ));

        vm.prank(attacker);
        uint256 attackId = combat.commitAttack(1, commitHash, 4 hours);

        // Fast forward past reveal deadline
        vm.warp(block.timestamp + 10 hours);

        vm.prank(attacker);
        vm.expectRevert("Reveal window closed");
        combat.revealAttack(1, attackId, 50, 50, keccak256("army"), bytes32("salt123"));
    }
}
```

```solidity
// test/TitansWitness.t.sol

contract TitansWitnessTest is Test {
    TitansWitness witness;
    address gameServer = address(0x999);

    function setUp() public {
        witness = new TitansWitness();
        witness.grantRole(witness.GAME_SERVER_ROLE(), gameServer);
    }

    function testEtchWitness() public {
        address[] memory players = new address[](3);
        players[0] = address(0x1);
        players[1] = address(0x2);
        players[2] = address(0x3);

        uint256[] memory ranks = new uint256[](3);
        ranks[0] = 1;
        ranks[1] = 2;
        ranks[2] = 3;

        uint256[] memory points = new uint256[](3);
        points[0] = 50000;
        points[1] = 45000;
        points[2] = 40000;

        uint8[] memory races = new uint8[](3);
        races[0] = 1;
        races[1] = 2;
        races[2] = 3;

        bytes32[] memory names = new bytes32[](3);
        names[0] = bytes32("Champion");
        names[1] = bytes32("Runner");
        names[2] = bytes32("Third");

        vm.prank(gameServer);
        witness.etchWitness(1, players, ranks, points, races, names);

        // Verify champion
        TitansWitness.WitnessEntry memory champion = witness.getChampion(1);
        assertEq(champion.player, address(0x1));
        assertEq(champion.rank, 1);
        assertEq(champion.domainPoints, 50000);
    }

    function testPlayerStats() public {
        // Etch player across multiple generations
        address player = address(0x1);

        // Gen 1: Rank 1
        _etchSinglePlayer(1, player, 1, 50000);
        // Gen 2: Rank 5
        _etchSinglePlayer(2, player, 5, 30000);
        // Gen 3: Rank 2
        _etchSinglePlayer(3, player, 2, 45000);

        TitansWitness.PlayerStats memory stats = witness.playerStats(player);

        assertEq(stats.totalGenerations, 3);
        assertEq(stats.totalWins, 1);
        assertEq(stats.topThree, 2);
        assertEq(stats.topTen, 3);
        assertEq(stats.bestRank, 1);
        assertEq(stats.totalDomainPoints, 125000);
    }

    function _etchSinglePlayer(
        uint256 gen,
        address player,
        uint256 rank,
        uint256 points
    ) internal {
        address[] memory players = new address[](1);
        players[0] = player;
        uint256[] memory ranks = new uint256[](1);
        ranks[0] = rank;
        uint256[] memory pts = new uint256[](1);
        pts[0] = points;
        uint8[] memory races = new uint8[](1);
        races[0] = 1;
        bytes32[] memory names = new bytes32[](1);
        names[0] = bytes32("Test");

        vm.prank(gameServer);
        witness.etchWitness(gen, players, ranks, pts, races, names);
    }
}
```

---

## SIMULATION FRAMEWORK

### Purpose

Run thousands of simulated generations to verify:
- Race balance (win rates should be 14-18% each for 6 races)
- Economic balance (no dominant strategy)
- Mechanic fairness (no exploits)
- Progression curves (early/mid/late game pacing)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SIMULATION RUNNER                        │
│         (Orchestrates simulations, collects data)           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ AI Player 1 │  │ AI Player 2 │  │ AI Player N │        │
│  │ (Ironveld)  │  │ (Korrath)   │  │ (Random)    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    GAME ENGINE                              │
│     (Simplified server - no network, no persistence)        │
├─────────────────────────────────────────────────────────────┤
│                    DATA COLLECTOR                           │
│        (Metrics, statistics, balance reports)               │
└─────────────────────────────────────────────────────────────┘
```

### AI Player Strategies

```typescript
// simulation/ai/strategies.ts

interface AIStrategy {
  name: string;
  race: Race | 'random';
  makeDecision(state: GameState, player: PlayerState): Action[];
}

// Aggressive - prioritizes attacking
const AggressiveAI: AIStrategy = {
  name: 'aggressive',
  race: 'korrath',

  makeDecision(state, player) {
    const actions: Action[] = [];

    // Always attack if possible
    const enemies = findNearbyEnemies(state, player);
    if (enemies.length > 0 && player.armies.length > 0) {
      const weakest = findWeakestEnemy(enemies);
      actions.push({ type: 'attack', target: weakest, army: player.armies[0] });
    }

    // Build military
    actions.push(...buildMilitary(state, player));

    // Minimal economy
    if (player.resources.gold < 500) {
      actions.push(...buildEconomy(state, player, 'minimal'));
    }

    return actions;
  }
};

// Turtle - prioritizes defense
const TurtleAI: AIStrategy = {
  name: 'turtle',
  race: 'ironveld',

  makeDecision(state, player) {
    const actions: Action[] = [];

    // Build walls everywhere
    for (const territory of player.territories) {
      if (!hasWall(territory)) {
        actions.push({ type: 'build', building: 'wall', territory });
      }
    }

    // Strong economy
    actions.push(...buildEconomy(state, player, 'full'));

    // Only attack Forsaken
    const forsaken = findNearbyForsaken(state, player);
    if (forsaken.length > 0 && player.armies.length > 0) {
      actions.push({ type: 'attack', target: forsaken[0], army: player.armies[0] });
    }

    return actions;
  }
};

// Balanced - adapts to situation
const BalancedAI: AIStrategy = {
  name: 'balanced',
  race: 'random',

  makeDecision(state, player) {
    const phase = getGamePhase(state); // early, mid, late
    const threats = assessThreats(state, player);
    const opportunities = findOpportunities(state, player);

    if (phase === 'early') {
      return earlyGameStrategy(state, player);
    } else if (threats.length > 0) {
      return defensiveStrategy(state, player, threats);
    } else if (opportunities.length > 0) {
      return opportunisticStrategy(state, player, opportunities);
    } else {
      return economicStrategy(state, player);
    }
  }
};

// Magic-focused
const MageAI: AIStrategy = {
  name: 'mage',
  race: 'vaelthir',

  makeDecision(state, player) {
    const actions: Action[] = [];

    // Prioritize mana buildings
    actions.push(...buildMagicInfrastructure(state, player));

    // Cast spells aggressively
    if (player.resources.mana >= 40) {
      const target = findBestSpellTarget(state, player);
      if (target) {
        actions.push({ type: 'cast', spell: 'fireball', target });
      }
    }

    // Use blood sacrifice when available
    if (player.race === 'vaelthir' && player.armies[0]?.units > 50) {
      actions.push({ type: 'sacrifice', count: 10 });
    }

    return actions;
  }
};

// Intel-focused
const SpymasterAI: AIStrategy = {
  name: 'spymaster',
  race: 'sylvaeth',

  makeDecision(state, player) {
    const actions: Action[] = [];

    // Scout everything
    const unscouted = findUnscoutedTerritories(state, player);
    for (const territory of unscouted.slice(0, 3)) {
      actions.push({ type: 'scout', target: territory });
    }

    // Sell intel to allies
    if (player.alliance && player.intel.length > 0) {
      actions.push({ type: 'shareIntel', alliance: player.alliance });
    }

    // Create illusions
    actions.push(...createIllusions(state, player));

    // Never attack directly
    // Let allies do the fighting

    return actions;
  }
};
```

### Simulation Runner

```typescript
// simulation/runner.ts

interface SimulationConfig {
  generations: number;
  playersPerGeneration: number;
  aiDistribution: { strategy: string; count: number }[];
  seed?: number;
  fastMode: boolean;  // Skip animations, minimal logging
}

interface SimulationResults {
  totalGenerations: number;
  raceWinRates: Record<Race, number>;
  raceAverageRank: Record<Race, number>;
  strategyWinRates: Record<string, number>;
  economyMetrics: EconomyMetrics;
  combatMetrics: CombatMetrics;
  balanceIssues: BalanceIssue[];
}

class SimulationRunner {
  private config: SimulationConfig;
  private engine: GameEngine;
  private dataCollector: DataCollector;

  async runSimulation(): Promise<SimulationResults> {
    console.log(`Starting simulation: ${this.config.generations} generations`);

    for (let gen = 0; gen < this.config.generations; gen++) {
      await this.runGeneration(gen);

      if (gen % 100 === 0) {
        console.log(`Completed ${gen} generations...`);
        this.dataCollector.printInterimReport();
      }
    }

    return this.dataCollector.generateFinalReport();
  }

  private async runGeneration(genId: number): Promise<void> {
    // Setup
    const players = this.createAIPlayers();
    this.engine.initializeGeneration(genId, players);

    // Simulate 90 days
    for (let day = 1; day <= 90; day++) {
      // Each player takes actions
      for (const player of players) {
        const actions = player.strategy.makeDecision(
          this.engine.getState(),
          this.engine.getPlayerState(player.id)
        );

        for (const action of actions) {
          await this.engine.executeAction(player.id, action);
        }
      }

      // Process timers, combat, etc.
      await this.engine.processDayEnd();

      // Collect daily metrics
      this.dataCollector.recordDayMetrics(genId, day, this.engine.getState());
    }

    // Record final results
    const results = this.engine.finalizeGeneration();
    this.dataCollector.recordGenerationResults(genId, results);
  }
}
```

### Data Collector

```typescript
// simulation/data-collector.ts

interface BalanceIssue {
  type: 'race_imbalance' | 'economy_exploit' | 'mechanic_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: any;
}

class DataCollector {
  private raceWins: Record<Race, number> = {};
  private raceRanks: Record<Race, number[]> = {};
  private strategyWins: Record<string, number> = {};
  private economyData: EconomyDataPoint[] = [];
  private combatData: CombatDataPoint[] = [];

  generateFinalReport(): SimulationResults {
    const totalGens = Object.values(this.raceWins).reduce((a, b) => a + b, 0);

    return {
      totalGenerations: totalGens,

      raceWinRates: {
        ironveld: this.raceWins.ironveld / totalGens,
        vaelthir: this.raceWins.vaelthir / totalGens,
        korrath: this.raceWins.korrath / totalGens,
        sylvaeth: this.raceWins.sylvaeth / totalGens,
        ashborn: this.raceWins.ashborn / totalGens,
        breathborn: this.raceWins.breathborn / totalGens,
      },

      raceAverageRank: this.calculateAverageRanks(),

      strategyWinRates: this.calculateStrategyWinRates(),

      economyMetrics: this.analyzeEconomy(),

      combatMetrics: this.analyzeCombat(),

      balanceIssues: this.detectBalanceIssues()
    };
  }

  detectBalanceIssues(): BalanceIssue[] {
    const issues: BalanceIssue[] = [];

    // Check race win rates
    const expectedWinRate = 1 / 6; // ~16.67%
    for (const [race, winRate] of Object.entries(this.raceWinRates)) {
      if (winRate > expectedWinRate * 1.3) { // >30% above expected
        issues.push({
          type: 'race_imbalance',
          severity: winRate > expectedWinRate * 1.5 ? 'critical' : 'high',
          description: `${race} win rate too high: ${(winRate * 100).toFixed(1)}%`,
          evidence: { race, winRate, expected: expectedWinRate }
        });
      }
      if (winRate < expectedWinRate * 0.7) { // >30% below expected
        issues.push({
          type: 'race_imbalance',
          severity: winRate < expectedWinRate * 0.5 ? 'critical' : 'high',
          description: `${race} win rate too low: ${(winRate * 100).toFixed(1)}%`,
          evidence: { race, winRate, expected: expectedWinRate }
        });
      }
    }

    // Check for economy exploits
    const economyOutliers = this.findEconomyOutliers();
    for (const outlier of economyOutliers) {
      issues.push({
        type: 'economy_exploit',
        severity: 'medium',
        description: `Unusual economy pattern: ${outlier.description}`,
        evidence: outlier
      });
    }

    // Check for mechanic abuse
    const mechanicAbuse = this.findMechanicAbuse();
    issues.push(...mechanicAbuse);

    return issues;
  }
}
```

### Running Simulations

```bash
# Run 1000 generations with default settings
npm run simulate -- --generations 1000

# Run with specific race distribution
npm run simulate -- --generations 500 --equal-races

# Run stress test (many players)
npm run simulate -- --generations 100 --players 500

# Run with specific seed (reproducible)
npm run simulate -- --generations 1000 --seed 12345

# Generate detailed report
npm run simulate -- --generations 1000 --report detailed --output balance-report.json
```

### Example Output

```
=== SIMULATION COMPLETE ===
Generations: 1,000
Total Games: 1,000

RACE WIN RATES (Expected: 16.67%):
  Ironveld:   17.2% (+0.5%)  ✓
  Vaelthir:   15.8% (-0.9%)  ✓
  Korrath:    18.1% (+1.4%)  ⚠️ Slightly high
  Sylvaeth:   14.9% (-1.8%)  ⚠️ Slightly low
  Ashborn:    16.5% (-0.2%)  ✓
  Breath-Born: 17.5% (+0.8%)  ✓

AVERAGE RANK BY RACE:
  Ironveld:   4.2
  Vaelthir:   4.8
  Korrath:    3.9  ⚠️ Best average
  Sylvaeth:   5.1  ⚠️ Worst average
  Ashborn:    4.5
  Breath-Born: 4.3

STRATEGY WIN RATES:
  Aggressive: 19.2%
  Turtle:     15.1%
  Balanced:   17.8%
  Mage:       14.2%
  Spymaster:  11.4%  ⚠️ Underperforming

BALANCE ISSUES DETECTED: 2
  [MEDIUM] Korrath win rate slightly high (18.1%)
           Recommendation: Consider increasing Blood Thirst penalty
  [MEDIUM] Sylvaeth underperforming in direct competition
           Recommendation: Review intel value mechanics

ECONOMY METRICS:
  Average game length: 87 days (3 ended early)
  Average winner territories: 52
  Average winner domain points: 48,234

COMBAT METRICS:
  Total battles: 45,230
  Attacker win rate: 47.2%
  Defender win rate: 52.8%  ✓ Defender advantage working
  Average battle rounds: 2.4
  Critical hit rate: 4.9%  ✓ Close to 5%
```

---

## LOAD TESTING

### Tools

| Tool | Purpose |
|------|---------|
| k6 | HTTP/WebSocket load testing |
| Artillery | Scenario-based testing |
| Grafana | Real-time monitoring |

### Load Test Scenarios

```javascript
// load-tests/scenarios.js

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    // Ramp up to 1000 concurrent players
    steady_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 500 },
        { duration: '10m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
    ws_connecting: ['p(95)<1000'],     // WebSocket connect under 1s
  },
};

export default function () {
  // Authenticate
  const authRes = http.post(`${BASE_URL}/auth/challenge`, {
    address: generateWallet(),
  });
  check(authRes, { 'auth success': (r) => r.status === 200 });

  // Connect WebSocket
  const wsUrl = `${WS_URL}?token=${authRes.json().token}`;
  const res = ws.connect(wsUrl, {}, function (socket) {
    socket.on('open', () => {
      // Subscribe to updates
      socket.send(JSON.stringify({ type: 'subscribe', channels: ['player', 'map'] }));
    });

    socket.on('message', (msg) => {
      // Process updates
    });

    // Simulate player actions
    socket.setInterval(() => {
      // Move army
      socket.send(JSON.stringify({
        type: 'action',
        action: { type: 'move_army', armyId: '1', destination: randomCoord() }
      }));
    }, 5000);

    socket.setTimeout(() => {
      socket.close();
    }, 60000);
  });

  sleep(1);
}
```

### Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API Response (p95) | < 200ms | < 500ms |
| WebSocket Connect | < 500ms | < 1000ms |
| State Update Latency | < 100ms | < 250ms |
| Concurrent Players | 5,000 | 10,000 |
| Actions per Second | 1,000 | 500 |
| Database Queries/s | 10,000 | 5,000 |

---

## INTEGRATION TESTING

### Test Environment

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: nemeth_test
      POSTGRES_PASSWORD: test

  redis:
    image: redis:7

  game-server:
    build: .
    environment:
      DATABASE_URL: postgres://postgres:test@postgres/nemeth_test
      REDIS_URL: redis://redis:6379
      NODE_ENV: test
    depends_on:
      - postgres
      - redis

  anvil:
    image: ghcr.io/foundry-rs/foundry:latest
    command: anvil --host 0.0.0.0
    ports:
      - "8545:8545"
```

### Integration Test Example

```typescript
// tests/integration/full-game-flow.test.ts

describe('Full Game Flow', () => {
  let server: TestServer;
  let player1: TestClient;
  let player2: TestClient;

  beforeAll(async () => {
    server = await TestServer.start();
    player1 = await TestClient.connect(server, { race: 'ironveld', plots: 5 });
    player2 = await TestClient.connect(server, { race: 'korrath', plots: 5 });
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should complete a full generation cycle', async () => {
    // Day 1: Players register and get territories
    expect(player1.territories.length).toBe(5);
    expect(player2.territories.length).toBe(5);

    // Day 2-7: Build and expand
    await player1.build('farm', player1.territories[0]);
    await player1.build('barracks', player1.territories[1]);

    await server.advanceDays(7);

    // Buildings should complete
    expect(player1.getBuilding(player1.territories[0]).type).toBe('farm');

    // Day 8: Attack Forsaken
    const forsaken = server.findNearestForsaken(player1.territories[0]);
    await player1.createArmy(player1.territories[0], { footman: 50 });
    await player1.attack(forsaken);

    await server.advanceToNextCombat();

    // Should win against weak Forsaken
    expect(player1.territories.length).toBe(6);

    // Day 30: Player conflict
    await server.advanceDays(22);

    // Player 2 attacks Player 1
    const targetTerritory = player1.territories[0];
    await player2.createArmy(player2.territories[0], { footman: 100 });
    await player2.attack(targetTerritory);

    await server.advanceToNextCombat();

    // Combat should resolve
    const combatResult = server.getLastCombatResult();
    expect(combatResult).toBeDefined();
    expect(['player1', 'player2']).toContain(combatResult.winner);

    // Day 90: Generation ends
    await server.advanceDays(60);

    const results = server.finalizeGeneration();
    expect(results.rankings.length).toBe(2);
    expect(results.titanWitness.length).toBe(2);
  });
});
```

---

## CI/CD PIPELINE

```yaml
# .github/workflows/test.yml

name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1

      - name: Run contract tests
        run: forge test -vvv

      - name: Check coverage
        run: forge coverage --report lcov

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:test@localhost/test
          REDIS_URL: redis://localhost:6379

  simulation:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3

      - name: Install dependencies
        run: npm ci

      - name: Run balance simulation
        run: npm run simulate -- --generations 100 --report json --output results.json

      - name: Check for balance issues
        run: npm run check-balance -- --input results.json --fail-on critical

      - name: Upload simulation results
        uses: actions/upload-artifact@v3
        with:
          name: simulation-results
          path: results.json
```

---

## SUMMARY

| Test Type | Framework | Coverage Target |
|-----------|-----------|-----------------|
| Unit Tests | Jest | 90% |
| Contract Tests | Foundry | 100% |
| Integration | Jest + Docker | Critical paths |
| Simulation | Custom | 1000+ generations |
| Load Tests | k6 | 5000 concurrent |
| E2E | Playwright | Happy paths |

**Key Metrics to Track:**
- Race win rates (should be ~16.67% each)
- Defender advantage (should be ~52-55%)
- Critical hit rate (should be ~5%)
- Economic balance (no dominant strategy)
- Performance under load

---

*Document Status: Testing framework complete*
*Next: Final review, implementation planning*
