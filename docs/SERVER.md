# Nemeths Domain - Game Server Architecture

## OVERVIEW

The game server is the **real-time brain** of Nemeth's Domain. It handles everything that's too fast, complex, or frequent for blockchain transactions while maintaining trustless integration with on-chain contracts.

**Philosophy:**
- Blockchain = source of truth for ownership and money
- Server = source of truth for game state and calculations
- Hybrid = commit on-chain, calculate off-chain, verify on-chain

---

## ARCHITECTURE DIAGRAM

```
                                    ┌─────────────────┐
                                    │   Frontend      │
                                    │   (React/Web)   │
                                    └────────┬────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   API Gateway   │
                                    │   (REST + WS)   │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
    ┌─────────▼─────────┐        ┌──────────▼──────────┐        ┌─────────▼─────────┐
    │   Game Server     │        │   Game Server       │        │   Game Server     │
    │   Instance 1      │        │   Instance 2        │        │   Instance N      │
    │   (Region A)      │        │   (Region B)        │        │   (Region N)      │
    └─────────┬─────────┘        └──────────┬──────────┘        └─────────┬─────────┘
              │                              │                              │
              └──────────────────────────────┼──────────────────────────────┘
                                             │
                                    ┌────────▼────────┐
                                    │   Redis Cluster │
                                    │   (State Sync)  │
                                    └────────┬────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────────┐
              │                              │                              │
    ┌─────────▼─────────┐        ┌──────────▼──────────┐        ┌─────────▼─────────┐
    │   PostgreSQL      │        │   TimescaleDB       │        │   Blockchain      │
    │   (Game State)    │        │   (Events/History)  │        │   (Base L2)       │
    └───────────────────┘        └─────────────────────┘        └───────────────────┘
```

---

## CORE COMPONENTS

### 1. API Gateway

**Purpose:** Single entry point for all client connections.

**Technology:** Node.js + Express + Socket.io

```typescript
// Gateway routes
interface APIRoutes {
  // REST endpoints
  'POST /auth/connect-wallet': WalletAuth;
  'GET /game/state': GameState;
  'GET /player/:address': PlayerData;
  'POST /action/*': GameAction;

  // WebSocket events
  'ws:subscribe': SubscribeToUpdates;
  'ws:action': RealtimeAction;
  'ws:chat': AllianceChat;
}
```

**Responsibilities:**
- Authentication (wallet signature verification)
- Rate limiting
- Request routing
- WebSocket connection management
- Load balancing across game servers

---

### 2. Game Server Instances

**Purpose:** Process game logic, manage state, calculate combat.

**Technology:** Node.js/TypeScript or Rust (for performance-critical paths)

```typescript
class GameServer {
  // Core systems
  private stateManager: StateManager;
  private combatEngine: CombatEngine;
  private timerService: TimerService;
  private visibilityEngine: VisibilityEngine;
  private blockchainBridge: BlockchainBridge;

  // Event processing
  async processAction(action: GameAction): Promise<ActionResult> {
    // 1. Validate action
    // 2. Check permissions
    // 3. Calculate effects
    // 4. Update state
    // 5. Broadcast changes
    // 6. Queue blockchain commits if needed
  }
}
```

**Server Responsibilities:**

| System | Function |
|--------|----------|
| State Manager | Current game state for all entities |
| Combat Engine | Battle calculations, D20 rolls |
| Timer Service | Build times, travel, cooldowns |
| Visibility Engine | Fog of war, scouting |
| Blockchain Bridge | Commit/reveal, result submission |
| Event Processor | Action queue, resolution |

---

### 3. State Manager

**Purpose:** Maintain authoritative game state.

```typescript
interface GameState {
  generation: GenerationState;
  players: Map<Address, PlayerState>;
  territories: Map<CoordKey, TerritoryState>;
  armies: Map<ArmyId, ArmyState>;
  buildings: Map<BuildingId, BuildingState>;
  combats: Map<CombatId, CombatState>;
  alliances: Map<AllianceId, AllianceState>;
}

interface TerritoryState {
  coord: { x: number; y: number };
  owner: Address | null;
  terrain: TerrainType;
  zone: ZoneType;
  buildings: BuildingId[];
  garrison: ArmyId | null;
  resources: ResourceStore;
  trust: number;  // 0-100
  lastActivity: Timestamp;
}

interface ArmyState {
  id: ArmyId;
  owner: Address;
  location: Coord;
  destination: Coord | null;
  units: UnitComposition;
  morale: number;
  foreignSoilDays: number;
  status: 'idle' | 'moving' | 'combat' | 'sieging';
  arrivalTime: Timestamp | null;
}
```

**State Persistence:**
- Hot state in Redis (fast access)
- Cold state in PostgreSQL (durability)
- Snapshot every 5 minutes
- Full backup every hour

---

### 4. Combat Engine

**Purpose:** Calculate all combat outcomes using D20 weighted rolls.

```typescript
class CombatEngine {

  async resolveBattle(combat: CombatState): Promise<BattleResult> {
    const rounds: RoundResult[] = [];

    // Pre-battle setup
    const attacker = this.prepareArmy(combat.attacker);
    const defender = this.prepareArmy(combat.defender);

    // Apply pre-battle effects (spells, terrain, etc.)
    this.applyPreBattleModifiers(attacker, defender, combat);

    // Fight up to 3 rounds
    for (let round = 1; round <= 3; round++) {
      if (attacker.totalHP <= 0 || defender.totalHP <= 0) break;

      const roundResult = this.resolveRound(attacker, defender, round);
      rounds.push(roundResult);

      this.applyCasualties(attacker, roundResult.attackerDamage);
      this.applyCasualties(defender, roundResult.defenderDamage);
      this.updateMorale(attacker, defender, roundResult);
    }

    // Post-battle processing
    const winner = this.determineWinner(attacker, defender);
    const loot = this.calculateLoot(winner, combat);

    // Race abilities
    await this.applyRaceAbilities(combat, rounds);

    return {
      winner,
      rounds,
      attackerSurvivors: attacker.units,
      defenderSurvivors: defender.units,
      loot,
      territoryChange: winner === 'attacker'
    };
  }

  private rollD20Weighted(table: WeightedTable): number {
    // Cryptographically secure random
    const roll = this.rng.nextInt(1, 20);
    return table.getModifier(roll);
  }
}
```

**Combat Features:**
- Weighted D20 rolls for attack/defense
- Critical hits and failures
- Morale tracking per round
- Race ability processing (Reformation, Enslaver, etc.)
- Terrain and building modifiers
- Advantage/Disadvantage system

---

### 5. Timer Service

**Purpose:** Manage all time-based events efficiently.

```typescript
class TimerService {
  private timers: PriorityQueue<GameTimer>;

  interface GameTimer {
    id: string;
    type: TimerType;
    triggerTime: Timestamp;
    payload: any;
  }

  enum TimerType {
    BUILDING_COMPLETE = 'building_complete',
    ARMY_ARRIVAL = 'army_arrival',
    SPELL_COOLDOWN = 'spell_cooldown',
    TRUST_DECAY = 'trust_decay',
    FOREIGN_SOIL_TICK = 'foreign_soil_tick',
    RESOURCE_TICK = 'resource_tick',
    STRUCTURE_DECAY = 'structure_decay',
    BLOOD_THIRST_CHECK = 'blood_thirst_check',
  }

  // Called every second
  async tick(): Promise<void> {
    const now = Date.now();
    while (this.timers.peek()?.triggerTime <= now) {
      const timer = this.timers.pop();
      await this.processTimer(timer);
    }
  }
}
```

**Timer Categories:**

| Category | Interval | Examples |
|----------|----------|----------|
| Instant | Event-driven | Combat resolution, spell cast |
| Short | Minutes | Unit training, spell cooldowns |
| Medium | Hours | Building construction, army travel |
| Long | Days | Trust decay, foreign soil penalty |
| Daily | 24h | Resource generation, mana regen |

---

### 6. Visibility Engine

**Purpose:** Implement fog of war and scouting mechanics.

```typescript
class VisibilityEngine {

  // What can a player see?
  getVisibleState(player: Address): VisibleGameState {
    const playerTerritories = this.getPlayerTerritories(player);
    const allyTerritories = this.getAllyTerritories(player);
    const scoutedAreas = this.getScoutedAreas(player);

    const visibleState: VisibleGameState = {
      territories: new Map(),
      armies: new Map(),
      players: new Map()
    };

    for (const [coord, territory] of this.state.territories) {
      if (this.isOwned(coord, player)) {
        // Full visibility for own territory
        visibleState.territories.set(coord, territory);
      } else if (this.isAllied(coord, player)) {
        // Allied visibility (if sharing enabled)
        visibleState.territories.set(coord, this.filterAlliedView(territory));
      } else if (this.isScouted(coord, player)) {
        // Scouted - accuracy based on intel quality
        visibleState.territories.set(coord, this.applyScoutAccuracy(territory, player));
      } else if (this.isAdjacent(coord, playerTerritories)) {
        // Adjacent - see "something" but not details
        visibleState.territories.set(coord, this.getFoggedView(territory));
      } else {
        // Far away - terrain only
        visibleState.territories.set(coord, this.getTerrainOnly(territory));
      }
    }

    return visibleState;
  }

  // Fogged view shows presence but not details
  private getFoggedView(territory: TerritoryState): FoggedTerritory {
    return {
      coord: territory.coord,
      terrain: territory.terrain,
      hasOwner: territory.owner !== null,
      hasArmy: territory.garrison !== null,
      armySize: 'unknown', // Could be: 'none', 'small', 'medium', 'large', 'unknown'
      hasBuildings: territory.buildings.length > 0
    };
  }
}
```

**Visibility Levels:**

| Level | What You See |
|-------|--------------|
| **Owned** | Everything (units, buildings, resources, exact numbers) |
| **Allied** | Most things (depends on alliance settings) |
| **Scouted** | Intel with accuracy roll (75-100%) |
| **Adjacent** | "Something is there" (army size category, building presence) |
| **Distant** | Terrain only |

---

### 7. Blockchain Bridge

**Purpose:** Sync with on-chain contracts.

```typescript
class BlockchainBridge {
  private provider: ethers.Provider;
  private contracts: ContractSet;
  private pendingCommits: Queue<BlockchainCommit>;

  // Listen for on-chain events
  async startListening(): Promise<void> {
    this.contracts.generationManager.on('PlayerRegistered', this.onPlayerRegistered);
    this.contracts.combatSystem.on('AttackCommitted', this.onAttackCommitted);
    this.contracts.combatSystem.on('AttackRevealed', this.onAttackRevealed);
    this.contracts.alliances.on('AllianceCreated', this.onAllianceCreated);
  }

  // Submit results to chain
  async submitBattleResult(combat: CombatState, result: BattleResult): Promise<void> {
    const resultHash = this.hashResult(result);

    await this.contracts.combatSystem.resolveAttack(
      combat.generationId,
      combat.attacker.address,
      combat.attackId,
      result.winner,
      resultHash
    );
  }

  // End of generation - submit all results
  async finalizeGeneration(genId: number): Promise<void> {
    const scores = this.calculateFinalScores();
    const merkleRoot = this.buildMerkleTree(scores);

    await this.contracts.generationManager.finalizeGeneration(merkleRoot);

    // Submit top 100 to Titan's Witness
    const top100 = scores.slice(0, 100);
    await this.contracts.titansWitness.etchWitness(
      genId,
      top100.map(s => s.player),
      top100.map(s => s.rank),
      top100.map(s => s.points),
      top100.map(s => s.race),
      top100.map(s => s.captainName)
    );
  }
}
```

**Blockchain Sync Events:**

| Direction | Event | Action |
|-----------|-------|--------|
| Chain → Server | PlayerRegistered | Create player state, assign plots |
| Chain → Server | AttackCommitted | Start tracking attack timer |
| Chain → Server | AttackRevealed | Process attack, resolve combat |
| Server → Chain | Battle resolved | Submit result hash |
| Server → Chain | Territory changed | Update ownership |
| Server → Chain | Generation end | Submit final scores |

---

## DATA FLOW

### Action Processing Pipeline

```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ Client  │──▶│Validate │──▶│ Check   │──▶│Execute  │──▶│Broadcast│
│ Request │   │ Input   │   │ Perms   │   │ Action  │   │ Updates │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │ If needed:  │
                                        │ Blockchain  │
                                        │ Commit      │
                                        └─────────────┘
```

### Example: Move Army

```typescript
async function moveArmy(
  player: Address,
  armyId: ArmyId,
  destination: Coord
): Promise<MoveResult> {

  // 1. Validate
  const army = this.state.armies.get(armyId);
  if (!army) throw new Error('Army not found');
  if (army.owner !== player) throw new Error('Not your army');
  if (army.status !== 'idle') throw new Error('Army busy');

  // 2. Calculate path and time
  const path = this.pathfinder.findPath(army.location, destination);
  if (!path) throw new Error('No valid path');

  const travelTime = this.calculateTravelTime(army, path);
  const arrivalTime = Date.now() + travelTime;

  // 3. Check if moving through enemy territory
  const hostileTerritories = path.filter(c => this.isHostile(c, player));
  if (hostileTerritories.length > 0) {
    // Apply path debuffs
    this.applyPathPenalties(army, hostileTerritories);
  }

  // 4. Update state
  army.status = 'moving';
  army.destination = destination;
  army.arrivalTime = arrivalTime;
  army.path = path;

  // 5. Schedule arrival timer
  this.timerService.schedule({
    type: TimerType.ARMY_ARRIVAL,
    triggerTime: arrivalTime,
    payload: { armyId, destination }
  });

  // 6. Broadcast to relevant players
  this.broadcastToVisible(army.location, {
    type: 'army_departed',
    armyId,
    from: army.location,
    direction: this.getDirection(army.location, path[1])
  });

  return {
    success: true,
    arrivalTime,
    path: this.getVisiblePath(path, player)
  };
}
```

---

## DATABASE SCHEMA

### PostgreSQL (Primary State)

```sql
-- Players
CREATE TABLE players (
  address VARCHAR(42) PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  race SMALLINT NOT NULL,
  captain_name VARCHAR(64),
  captain_hash BYTEA,
  registered_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  UNIQUE(address, generation_id)
);

-- Territories
CREATE TABLE territories (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  x SMALLINT NOT NULL,
  y SMALLINT NOT NULL,
  terrain SMALLINT NOT NULL,
  zone SMALLINT NOT NULL,
  owner VARCHAR(42),
  trust SMALLINT DEFAULT 100,
  last_activity TIMESTAMP DEFAULT NOW(),
  UNIQUE(generation_id, x, y)
);

-- Buildings
CREATE TABLE buildings (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  territory_id INTEGER REFERENCES territories(id),
  building_type SMALLINT NOT NULL,
  level SMALLINT DEFAULT 1,
  hp INTEGER NOT NULL,
  construction_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Armies
CREATE TABLE armies (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  owner VARCHAR(42) NOT NULL,
  territory_id INTEGER REFERENCES territories(id),
  status VARCHAR(16) DEFAULT 'idle',
  morale SMALLINT DEFAULT 100,
  foreign_soil_days SMALLINT DEFAULT 0,
  destination_x SMALLINT,
  destination_y SMALLINT,
  arrival_time TIMESTAMP
);

-- Army Units (composition)
CREATE TABLE army_units (
  army_id INTEGER REFERENCES armies(id),
  unit_type SMALLINT NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY(army_id, unit_type)
);

-- Combat Log
CREATE TABLE combats (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  attacker VARCHAR(42) NOT NULL,
  defender VARCHAR(42),
  territory_id INTEGER REFERENCES territories(id),
  attack_commit_hash BYTEA,
  attack_reveal_time TIMESTAMP,
  result_hash BYTEA,
  winner VARCHAR(42),
  resolved_at TIMESTAMP
);

-- Resources
CREATE TABLE resources (
  territory_id INTEGER REFERENCES territories(id),
  gold INTEGER DEFAULT 0,
  stone INTEGER DEFAULT 0,
  wood INTEGER DEFAULT 0,
  food INTEGER DEFAULT 0,
  mana INTEGER DEFAULT 0,
  PRIMARY KEY(territory_id)
);

-- Alliances
CREATE TABLE alliances (
  id SERIAL PRIMARY KEY,
  generation_id INTEGER NOT NULL,
  name VARCHAR(64) NOT NULL,
  founder VARCHAR(42) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE alliance_members (
  alliance_id INTEGER REFERENCES alliances(id),
  player VARCHAR(42) NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(alliance_id, player)
);

-- Indexes for common queries
CREATE INDEX idx_territories_owner ON territories(generation_id, owner);
CREATE INDEX idx_armies_owner ON armies(generation_id, owner);
CREATE INDEX idx_armies_destination ON armies(destination_x, destination_y) WHERE destination_x IS NOT NULL;
```

### Redis (Hot State Cache)

```
# Player session
player:{address} -> { connected: bool, lastPing: ts, subscriptions: [...] }

# Territory state (frequently accessed)
territory:{genId}:{x}:{y} -> { owner, garrison, buildings, trust }

# Army positions (real-time tracking)
army:{armyId} -> { location, destination, arrivalTime, status }

# Active timers
timers:{genId} -> SortedSet(triggerTime -> timerId)
timer:{timerId} -> { type, payload }

# Player visibility cache
visibility:{address} -> Set(coord_keys)

# Combat in progress
combat:{combatId} -> { attacker, defender, phase, currentRound }

# Pub/Sub channels
channel:territory:{x}:{y} -> territory updates
channel:player:{address} -> personal updates
channel:alliance:{allianceId} -> alliance chat/updates
channel:global -> server announcements
```

### TimescaleDB (Event History)

```sql
-- Hypertable for time-series events
CREATE TABLE events (
  time TIMESTAMPTZ NOT NULL,
  generation_id INTEGER NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  player VARCHAR(42),
  territory_x SMALLINT,
  territory_y SMALLINT,
  data JSONB
);

SELECT create_hypertable('events', 'time');

-- Examples of event types:
-- 'army_moved', 'building_started', 'building_completed',
-- 'combat_started', 'combat_resolved', 'territory_captured',
-- 'spell_cast', 'alliance_formed', 'player_inactive', etc.

-- Compression policy (older than 7 days)
SELECT add_compression_policy('events', INTERVAL '7 days');

-- Retention policy (keep 2 generations)
SELECT add_retention_policy('events', INTERVAL '180 days');
```

---

## API SPECIFICATION

### REST Endpoints

```yaml
# Authentication
POST /auth/challenge
  Request: { address: string }
  Response: { challenge: string, expiresAt: timestamp }

POST /auth/verify
  Request: { address: string, signature: string }
  Response: { token: string, expiresAt: timestamp }

# Game State
GET /game/generation
  Response: { id, phase, startTime, endTime, playerCount }

GET /game/map
  Response: { territories: [...], zones: [...] }

GET /game/leaderboard
  Query: { limit: number, offset: number }
  Response: { players: [{ address, rank, points, race }] }

# Player
GET /player/state
  Auth: Required
  Response: { territories, armies, resources, captain, alliance }

GET /player/:address/public
  Response: { race, territories, alliance, domainPoints }

# Territories
GET /territory/:x/:y
  Auth: Required
  Response: { ...visibleState } # Based on player's visibility

POST /territory/:x/:y/build
  Auth: Required
  Request: { buildingType: string }
  Response: { buildingId, completionTime }

# Armies
GET /army/:id
  Auth: Required (owner or ally)
  Response: { location, units, status, morale }

POST /army/create
  Auth: Required
  Request: { territoryId, units: { type: count } }
  Response: { armyId }

POST /army/:id/move
  Auth: Required
  Request: { destination: { x, y }, path?: [...] }
  Response: { arrivalTime, path }

POST /army/:id/attack
  Auth: Required
  Request: { target: { x, y } }
  Response: { commitHash, revealDeadline }

# Combat
POST /combat/:id/reveal
  Auth: Required
  Request: { salt: string }
  Response: { revealed: true }

GET /combat/:id/result
  Response: { winner, rounds, casualties, loot }

# Spells
POST /spell/cast
  Auth: Required
  Request: { spellId, target: { x, y } | { armyId } | { player } }
  Response: { success, effect, manaCost, cooldownEnd }

# Alliances
POST /alliance/create
  Auth: Required
  Request: { name: string }
  Response: { allianceId }

POST /alliance/:id/join
  Auth: Required
  Response: { success }

POST /alliance/:id/leave
  Auth: Required
  Response: { success }

GET /alliance/:id/members
  Response: { members: [...] }
```

### WebSocket Events

```typescript
// Client -> Server
interface ClientEvents {
  'subscribe': { channels: string[] };
  'unsubscribe': { channels: string[] };
  'ping': {};
  'action': GameAction;
  'chat': { allianceId: string, message: string };
}

// Server -> Client
interface ServerEvents {
  'pong': {};
  'state_update': { territories?: [...], armies?: [...], resources?: {...} };
  'combat_started': { combatId, attacker, defender, territory };
  'combat_round': { combatId, round, attackerDamage, defenderDamage };
  'combat_resolved': { combatId, winner, casualties };
  'territory_captured': { x, y, oldOwner, newOwner };
  'building_complete': { territoryId, buildingType, level };
  'army_arrived': { armyId, location };
  'spell_effect': { spell, caster, target, effect };
  'timer_tick': { timers: [...] }; // Active timers for UI
  'chat_message': { allianceId, sender, message, timestamp };
  'error': { code, message };
}
```

---

## SECURITY

### Authentication Flow

```
1. Client requests challenge for wallet address
2. Server generates random challenge, stores with expiry
3. Client signs challenge with wallet private key
4. Server verifies signature, issues JWT
5. JWT used for all subsequent requests
6. JWT expires after 24h, refresh with wallet signature
```

### Anti-Cheat Measures

| Threat | Mitigation |
|--------|------------|
| **Fake actions** | All actions validated server-side |
| **State manipulation** | Client receives only visible state |
| **Timing exploits** | Server timestamps authoritative |
| **Bot farming** | Rate limiting, CAPTCHA on registration |
| **Multi-accounting** | Wallet-based identity, on-chain fees |
| **Result manipulation** | Results hashed, disputable on-chain |

### Rate Limiting

```typescript
const rateLimits = {
  // Per player per minute
  'army/move': 10,
  'army/attack': 5,
  'building/start': 5,
  'spell/cast': 10,
  'territory/scout': 20,

  // Global per minute
  'auth/challenge': 100,
  'chat/message': 30
};
```

### Data Validation

```typescript
// All inputs sanitized and validated
function validateMoveAction(action: MoveAction, player: Address): ValidationResult {
  // 1. Army exists
  const army = this.state.armies.get(action.armyId);
  if (!army) return { valid: false, error: 'ARMY_NOT_FOUND' };

  // 2. Player owns army
  if (army.owner !== player) return { valid: false, error: 'NOT_OWNER' };

  // 3. Army not busy
  if (army.status !== 'idle') return { valid: false, error: 'ARMY_BUSY' };

  // 4. Destination is valid coordinate
  if (!this.isValidCoord(action.destination)) return { valid: false, error: 'INVALID_COORD' };

  // 5. Path exists (not blocked by water)
  const path = this.pathfinder.findPath(army.location, action.destination);
  if (!path) return { valid: false, error: 'NO_PATH' };

  return { valid: true };
}
```

---

## SCALABILITY

### Horizontal Scaling

```
Load Balancer
     │
     ├── Game Server 1 (handles players A-M)
     ├── Game Server 2 (handles players N-Z)
     └── Game Server 3 (overflow/backup)

All servers share:
  - Redis Cluster (state sync)
  - PostgreSQL Primary + Replicas
  - Single blockchain connection pool
```

### Sharding Strategy

For large player counts, shard by **map region**:

```typescript
// Each server handles a quadrant
const shards = {
  'server-1': { minX: 0, maxX: 49, minY: 0, maxY: 49 },   // NW
  'server-2': { minX: 50, maxX: 99, minY: 0, maxY: 49 },  // NE
  'server-3': { minX: 0, maxX: 49, minY: 50, maxY: 99 },  // SW
  'server-4': { minX: 50, maxX: 99, minY: 50, maxY: 99 }  // SE
};

// Cross-shard actions (army moving between quadrants)
// are coordinated through Redis pub/sub
```

### Caching Strategy

| Data | Cache | TTL |
|------|-------|-----|
| Player state | Redis | 5 min |
| Territory state | Redis | 1 min |
| Visibility calculations | Redis | 30 sec |
| Leaderboard | Redis | 5 min |
| Map terrain | Memory | Forever (static) |
| Combat history | PostgreSQL | N/A |

---

## MONITORING & OBSERVABILITY

### Metrics (Prometheus)

```typescript
// Game metrics
const metrics = {
  activeConnections: Gauge,
  actionsPerSecond: Counter,
  combatsResolved: Counter,
  averageLatency: Histogram,

  // By type
  actionsByType: Counter({ labels: ['action_type'] }),
  errorsByType: Counter({ labels: ['error_code'] }),

  // Resource usage
  memoryUsage: Gauge,
  cpuUsage: Gauge,
  dbQueryTime: Histogram
};
```

### Logging (Structured JSON)

```typescript
logger.info({
  event: 'combat_resolved',
  generationId: 1,
  combatId: 'abc123',
  attacker: '0x...',
  defender: '0x...',
  winner: 'attacker',
  duration: 1234,
  timestamp: Date.now()
});
```

### Alerts

| Condition | Severity | Action |
|-----------|----------|--------|
| Server down | Critical | Page on-call |
| Latency > 500ms | Warning | Investigate |
| Error rate > 1% | Warning | Investigate |
| DB connections exhausted | Critical | Scale up |
| Blockchain sync lag > 1min | Warning | Check RPC |

---

## DEPLOYMENT

### Infrastructure (AWS Example)

```yaml
Production:
  API Gateway:
    - ALB (Application Load Balancer)
    - WAF (Web Application Firewall)

  Game Servers:
    - ECS Fargate (auto-scaling containers)
    - 2 vCPU, 4GB RAM per instance
    - Min: 2, Max: 10 instances

  Database:
    - RDS PostgreSQL (db.r6g.large)
    - Multi-AZ for failover
    - Read replicas for queries

  Cache:
    - ElastiCache Redis Cluster
    - 3 nodes, cache.r6g.large

  TimescaleDB:
    - Timescale Cloud (managed)

  Blockchain:
    - Alchemy/QuickNode for Base RPC
    - Redundant providers
```

### CI/CD Pipeline

```yaml
# GitHub Actions
on:
  push:
    branches: [main]

jobs:
  test:
    - Unit tests
    - Integration tests
    - Load tests (k6)

  build:
    - Docker build
    - Push to ECR

  deploy:
    - Blue/green deployment
    - Health checks
    - Rollback on failure
```

---

## DISASTER RECOVERY

### Backup Strategy

| Data | Frequency | Retention |
|------|-----------|-----------|
| PostgreSQL | Hourly snapshots | 7 days |
| PostgreSQL | Daily full backup | 30 days |
| Redis | AOF persistence | Continuous |
| Event logs | Real-time to S3 | 1 year |

### Recovery Procedures

1. **Server failure:** Auto-replaced by ECS, state recovered from Redis/DB
2. **Database failure:** Failover to standby, max 60 sec downtime
3. **Redis failure:** Rebuild from PostgreSQL (state recovery script)
4. **Complete outage:** Restore from latest backup, replay events

### RTO/RPO

- **RTO (Recovery Time Objective):** 15 minutes
- **RPO (Recovery Point Objective):** 5 minutes (snapshot interval)

---

## SUMMARY

| Component | Technology | Purpose |
|-----------|------------|---------|
| API Gateway | Node.js + Express | Request routing, auth |
| Game Servers | Node.js/TypeScript | Game logic, state |
| Real-time | Socket.io | Live updates |
| Cache | Redis Cluster | Hot state, pub/sub |
| Database | PostgreSQL | Persistent state |
| Events | TimescaleDB | History, analytics |
| Blockchain | ethers.js + Base RPC | On-chain integration |
| Monitoring | Prometheus + Grafana | Observability |

---

*Document Status: Game server architecture complete*
*Next: Frontend/API design, Testing framework*
