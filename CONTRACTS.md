# Nemeths Domain - Smart Contract Architecture

## DESIGN PHILOSOPHY

**Hybrid Architecture:** Game server handles real-time gameplay, blockchain handles ownership, commitments, and rewards. This gives us the best of both worlds - responsive gameplay with trustless verification.

**Core Principle:** The blockchain is the **source of truth** for anything involving money or permanent records. Everything else can live off-chain.

---

## ON-CHAIN VS OFF-CHAIN

### On-Chain (Blockchain)

| Data | Reason |
|------|--------|
| Plot ownership | Property rights |
| Entry fees paid | Financial |
| Generation results | Permanent record |
| Titan's Witness | Eternal leaderboard |
| Attack commitments | Trustless hidden attacks |
| Attack reveals | Trustless resolution |
| Captain registration | Identity tied to wallet |
| Race selection | Immutable per generation |
| Reward claims | Financial |
| Alliance agreements | Binding contracts |

### Off-Chain (Game Server)

| Data | Reason |
|------|--------|
| Troop positions | Changes constantly |
| Building states | Too many updates |
| Resource balances | High frequency |
| Combat calculations | Complex, needs speed |
| Fog of war | Server-side secret |
| Trust/morale values | Frequent updates |
| Chat/diplomacy | Not financial |
| Scouting results | Temporary data |

### Hybrid (Committed Off-Chain, Verified On-Chain)

| Data | How It Works |
|------|--------------|
| Battle results | Server calculates, winner submits proof, loser can dispute |
| Territory changes | Server tracks, periodic on-chain snapshots |
| Final scores | Server calculates, committed at generation end |

---

## CONTRACT STRUCTURE

```
┌─────────────────────────────────────────────────────────────┐
│                    NemethsProxy (UUPS)                      │
│                 Upgradeable entry point                     │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Generation   │    │    Combat     │    │   Registry    │
│   Manager     │    │    System     │    │   (Witness)   │
└───────────────┘    └───────────────┘    └───────────────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│     Plots     │    │   Alliances   │    │    Rewards    │
│               │    │               │    │               │
└───────────────┘    └───────────────┘    └───────────────┘
                              │
                              ▼
                    ┌───────────────┐
                    │  Chainlink    │
                    │     VRF       │
                    └───────────────┘
```

---

## CORE CONTRACTS

### 1. NemethsProxy.sol

**Purpose:** Upgradeable proxy for future improvements without losing state.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract NemethsProxy is UUPSUpgradeable, OwnableUpgradeable {
    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

---

### 2. GenerationManager.sol

**Purpose:** Handles generation lifecycle, entry fees, and timing.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract GenerationManager {

    // ============ STRUCTS ============

    struct Generation {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        uint256 registrationEnd;
        uint256 totalPlayers;
        uint256 totalFees;
        bool finalized;
        bytes32 resultsHash;  // Merkle root of final scores
    }

    struct Player {
        address wallet;
        uint8 race;           // 1-6
        uint8 plotCount;      // 1-10
        uint256 entryFee;
        bool registered;
        bytes32 captainHash;  // Hash of captain data
    }

    // ============ STATE ============

    uint256 public currentGeneration;
    uint256 public constant GENERATION_DURATION = 90 days;
    uint256 public constant REGISTRATION_PERIOD = 7 days;
    uint256 public constant PLOT_PRICE = 1 ether / 1000;  // ~$1 in ETH
    uint256 public constant MAX_PLOTS = 10;

    mapping(uint256 => Generation) public generations;
    mapping(uint256 => mapping(address => Player)) public players;
    mapping(uint256 => address[]) public playerList;

    // ============ EVENTS ============

    event GenerationStarted(uint256 indexed genId, uint256 startTime);
    event PlayerRegistered(uint256 indexed genId, address indexed player, uint8 race, uint8 plots);
    event GenerationEnded(uint256 indexed genId, bytes32 resultsHash);

    // ============ REGISTRATION ============

    function register(uint8 race, uint8 plotCount, bytes32 captainHash) external payable {
        require(race >= 1 && race <= 6, "Invalid race");
        require(plotCount >= 1 && plotCount <= MAX_PLOTS, "Invalid plot count");
        require(msg.value == PLOT_PRICE * plotCount, "Incorrect fee");

        uint256 genId = currentGeneration;
        Generation storage gen = generations[genId];

        require(block.timestamp < gen.registrationEnd, "Registration closed");
        require(!players[genId][msg.sender].registered, "Already registered");

        players[genId][msg.sender] = Player({
            wallet: msg.sender,
            race: race,
            plotCount: plotCount,
            entryFee: msg.value,
            registered: true,
            captainHash: captainHash
        });

        playerList[genId].push(msg.sender);
        gen.totalPlayers++;
        gen.totalFees += msg.value;

        emit PlayerRegistered(genId, msg.sender, race, plotCount);
    }

    // ============ LIFECYCLE ============

    function startGeneration() external onlyOwner {
        currentGeneration++;
        uint256 genId = currentGeneration;

        generations[genId] = Generation({
            id: genId,
            startTime: block.timestamp + REGISTRATION_PERIOD,
            endTime: block.timestamp + REGISTRATION_PERIOD + GENERATION_DURATION,
            registrationEnd: block.timestamp + REGISTRATION_PERIOD,
            totalPlayers: 0,
            totalFees: 0,
            finalized: false,
            resultsHash: bytes32(0)
        });

        emit GenerationStarted(genId, generations[genId].startTime);
    }

    function finalizeGeneration(bytes32 resultsHash) external onlyOwner {
        uint256 genId = currentGeneration;
        Generation storage gen = generations[genId];

        require(block.timestamp >= gen.endTime, "Generation not ended");
        require(!gen.finalized, "Already finalized");

        gen.resultsHash = resultsHash;
        gen.finalized = true;

        emit GenerationEnded(genId, resultsHash);
    }
}
```

---

### 3. Plots.sol

**Purpose:** Manages plot ownership and assignment.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Plots {

    // ============ STRUCTS ============

    struct Plot {
        uint8 x;
        uint8 y;
        address owner;
        uint8 terrain;
        bool claimed;
    }

    // ============ STATE ============

    uint8 public constant MAP_SIZE = 100;

    // genId => (x,y packed) => Plot
    mapping(uint256 => mapping(uint16 => Plot)) public plots;

    // genId => player => plot coordinates
    mapping(uint256 => mapping(address => uint16[])) public playerPlots;

    // ============ EVENTS ============

    event PlotAssigned(uint256 indexed genId, address indexed player, uint8 x, uint8 y);
    event PlotTransferred(uint256 indexed genId, uint8 x, uint8 y, address from, address to);

    // ============ FUNCTIONS ============

    function packCoords(uint8 x, uint8 y) public pure returns (uint16) {
        return uint16(x) << 8 | uint16(y);
    }

    function unpackCoords(uint16 packed) public pure returns (uint8 x, uint8 y) {
        x = uint8(packed >> 8);
        y = uint8(packed & 0xFF);
    }

    // Called by game server with VRF-generated positions
    function assignPlots(
        uint256 genId,
        address player,
        uint8[] calldata xCoords,
        uint8[] calldata yCoords,
        uint8[] calldata terrains
    ) external onlyGameServer {
        require(xCoords.length == yCoords.length, "Length mismatch");

        for (uint i = 0; i < xCoords.length; i++) {
            uint16 packed = packCoords(xCoords[i], yCoords[i]);
            require(!plots[genId][packed].claimed, "Plot already claimed");

            plots[genId][packed] = Plot({
                x: xCoords[i],
                y: yCoords[i],
                owner: player,
                terrain: terrains[i],
                claimed: true
            });

            playerPlots[genId][player].push(packed);

            emit PlotAssigned(genId, player, xCoords[i], yCoords[i]);
        }
    }

    // Record territory change from combat
    function transferPlot(
        uint256 genId,
        uint8 x,
        uint8 y,
        address newOwner
    ) external onlyGameServer {
        uint16 packed = packCoords(x, y);
        Plot storage plot = plots[genId][packed];

        address oldOwner = plot.owner;
        plot.owner = newOwner;

        // Update player plot lists (simplified - real impl needs array removal)
        playerPlots[genId][newOwner].push(packed);

        emit PlotTransferred(genId, x, y, oldOwner, newOwner);
    }
}
```

---

### 4. CombatSystem.sol

**Purpose:** Handles attack commitments and reveals (commit-reveal scheme).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CombatSystem {

    // ============ STRUCTS ============

    struct AttackCommitment {
        bytes32 commitHash;      // hash(target, salt, armyHash)
        uint256 commitTime;
        uint256 revealDeadline;
        bool revealed;
        bool resolved;
    }

    struct AttackReveal {
        uint8 targetX;
        uint8 targetY;
        bytes32 armyHash;        // Hash of army composition
        bytes32 salt;
        uint256 revealTime;
    }

    // ============ STATE ============

    uint256 public constant REVEAL_WINDOW = 4 hours;
    uint256 public constant MIN_TRAVEL_TIME = 1 hours;

    // genId => attacker => attackId => commitment
    mapping(uint256 => mapping(address => mapping(uint256 => AttackCommitment))) public commitments;
    mapping(uint256 => mapping(address => mapping(uint256 => AttackReveal))) public reveals;
    mapping(uint256 => mapping(address => uint256)) public attackNonce;

    // ============ EVENTS ============

    event AttackCommitted(uint256 indexed genId, address indexed attacker, uint256 attackId, uint256 revealDeadline);
    event AttackRevealed(uint256 indexed genId, address indexed attacker, uint256 attackId, uint8 targetX, uint8 targetY);
    event AttackResolved(uint256 indexed genId, uint256 attackId, address winner, bytes32 resultHash);

    // ============ COMMIT-REVEAL ============

    function commitAttack(
        uint256 genId,
        bytes32 commitHash,
        uint256 travelTime
    ) external returns (uint256 attackId) {
        require(travelTime >= MIN_TRAVEL_TIME, "Travel time too short");

        attackId = attackNonce[genId][msg.sender]++;

        commitments[genId][msg.sender][attackId] = AttackCommitment({
            commitHash: commitHash,
            commitTime: block.timestamp,
            revealDeadline: block.timestamp + travelTime + REVEAL_WINDOW,
            revealed: false,
            resolved: false
        });

        emit AttackCommitted(genId, msg.sender, attackId, commitments[genId][msg.sender][attackId].revealDeadline);
    }

    function revealAttack(
        uint256 genId,
        uint256 attackId,
        uint8 targetX,
        uint8 targetY,
        bytes32 armyHash,
        bytes32 salt
    ) external {
        AttackCommitment storage commit = commitments[genId][msg.sender][attackId];

        require(!commit.revealed, "Already revealed");
        require(block.timestamp <= commit.revealDeadline, "Reveal window closed");

        // Verify commitment
        bytes32 expectedHash = keccak256(abi.encodePacked(targetX, targetY, armyHash, salt));
        require(expectedHash == commit.commitHash, "Invalid reveal");

        commit.revealed = true;

        reveals[genId][msg.sender][attackId] = AttackReveal({
            targetX: targetX,
            targetY: targetY,
            armyHash: armyHash,
            salt: salt,
            revealTime: block.timestamp
        });

        emit AttackRevealed(genId, msg.sender, attackId, targetX, targetY);
    }

    // Called by game server after off-chain combat resolution
    function resolveAttack(
        uint256 genId,
        address attacker,
        uint256 attackId,
        address winner,
        bytes32 resultHash
    ) external onlyGameServer {
        AttackCommitment storage commit = commitments[genId][attacker][attackId];

        require(commit.revealed, "Not revealed");
        require(!commit.resolved, "Already resolved");

        commit.resolved = true;

        emit AttackResolved(genId, attackId, winner, resultHash);
    }
}
```

---

### 5. Alliances.sol

**Purpose:** Manages alliance agreements on-chain.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Alliances {

    // ============ STRUCTS ============

    struct Alliance {
        bytes32 name;
        address founder;
        uint256 createdAt;
        bool active;
    }

    struct AllianceTerms {
        bool allowTroopHosting;
        bool shareBuildingAccess;
        bool mutualDefense;
        uint8 foodShareRate;      // % of food costs covered
    }

    // ============ STATE ============

    // genId => allianceId => Alliance
    mapping(uint256 => mapping(uint256 => Alliance)) public alliances;
    mapping(uint256 => uint256) public allianceCount;

    // genId => allianceId => member => isMember
    mapping(uint256 => mapping(uint256 => mapping(address => bool))) public members;

    // genId => allianceId => terms
    mapping(uint256 => mapping(uint256 => AllianceTerms)) public terms;

    // genId => player => allianceId (0 = no alliance)
    mapping(uint256 => mapping(address => uint256)) public playerAlliance;

    // ============ EVENTS ============

    event AllianceCreated(uint256 indexed genId, uint256 allianceId, bytes32 name, address founder);
    event AllianceJoined(uint256 indexed genId, uint256 allianceId, address member);
    event AllianceLeft(uint256 indexed genId, uint256 allianceId, address member);
    event AllianceDissolved(uint256 indexed genId, uint256 allianceId);

    // ============ FUNCTIONS ============

    function createAlliance(uint256 genId, bytes32 name) external returns (uint256 allianceId) {
        require(playerAlliance[genId][msg.sender] == 0, "Already in alliance");

        allianceId = ++allianceCount[genId];

        alliances[genId][allianceId] = Alliance({
            name: name,
            founder: msg.sender,
            createdAt: block.timestamp,
            active: true
        });

        members[genId][allianceId][msg.sender] = true;
        playerAlliance[genId][msg.sender] = allianceId;

        // Default terms
        terms[genId][allianceId] = AllianceTerms({
            allowTroopHosting: true,
            shareBuildingAccess: false,
            mutualDefense: true,
            foodShareRate: 50
        });

        emit AllianceCreated(genId, allianceId, name, msg.sender);
    }

    function joinAlliance(uint256 genId, uint256 allianceId) external {
        require(playerAlliance[genId][msg.sender] == 0, "Already in alliance");
        require(alliances[genId][allianceId].active, "Alliance not active");

        members[genId][allianceId][msg.sender] = true;
        playerAlliance[genId][msg.sender] = allianceId;

        emit AllianceJoined(genId, allianceId, msg.sender);
    }

    function leaveAlliance(uint256 genId) external {
        uint256 allianceId = playerAlliance[genId][msg.sender];
        require(allianceId != 0, "Not in alliance");

        members[genId][allianceId][msg.sender] = false;
        playerAlliance[genId][msg.sender] = 0;

        emit AllianceLeft(genId, allianceId, msg.sender);
    }

    function areAllied(uint256 genId, address a, address b) external view returns (bool) {
        uint256 allianceA = playerAlliance[genId][a];
        uint256 allianceB = playerAlliance[genId][b];
        return allianceA != 0 && allianceA == allianceB;
    }
}
```

---

### 6. TitansWitness.sol

**Purpose:** Eternal leaderboard that persists across generations.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract TitansWitness {

    // ============ STRUCTS ============

    struct WitnessEntry {
        address player;
        uint256 generation;
        uint256 rank;            // 1 = Champion, 2-3 = Conqueror, 4-10 = Warlord, etc.
        uint256 domainPoints;
        uint8 race;
        bytes32 captainName;
        uint256 timestamp;
    }

    struct PlayerStats {
        uint256 totalGenerations;
        uint256 totalWins;       // #1 finishes
        uint256 topThree;
        uint256 topTen;
        uint256 bestRank;
        uint256 totalDomainPoints;
    }

    // ============ STATE ============

    // Eternal records - NEVER deleted
    WitnessEntry[] public witness;

    // Player lifetime stats
    mapping(address => PlayerStats) public playerStats;

    // Generation => rank => entry index
    mapping(uint256 => mapping(uint256 => uint256)) public generationRanks;

    // ============ EVENTS ============

    event NameEtched(uint256 indexed generation, address indexed player, uint256 rank, uint256 domainPoints);

    // ============ FUNCTIONS ============

    function etchWitness(
        uint256 generation,
        address[] calldata players,
        uint256[] calldata ranks,
        uint256[] calldata points,
        uint8[] calldata races,
        bytes32[] calldata names
    ) external onlyGameServer {
        require(players.length == ranks.length, "Length mismatch");

        for (uint i = 0; i < players.length; i++) {
            uint256 entryIndex = witness.length;

            witness.push(WitnessEntry({
                player: players[i],
                generation: generation,
                rank: ranks[i],
                domainPoints: points[i],
                race: races[i],
                captainName: names[i],
                timestamp: block.timestamp
            }));

            generationRanks[generation][ranks[i]] = entryIndex;

            // Update lifetime stats
            PlayerStats storage stats = playerStats[players[i]];
            stats.totalGenerations++;
            stats.totalDomainPoints += points[i];

            if (ranks[i] == 1) stats.totalWins++;
            if (ranks[i] <= 3) stats.topThree++;
            if (ranks[i] <= 10) stats.topTen++;
            if (stats.bestRank == 0 || ranks[i] < stats.bestRank) {
                stats.bestRank = ranks[i];
            }

            emit NameEtched(generation, players[i], ranks[i], points[i]);
        }
    }

    // ============ VIEWS ============

    function getWitnessCount() external view returns (uint256) {
        return witness.length;
    }

    function getChampion(uint256 generation) external view returns (WitnessEntry memory) {
        return witness[generationRanks[generation][1]];
    }

    function getPlayerHistory(address player) external view returns (WitnessEntry[] memory) {
        // Count entries
        uint256 count = 0;
        for (uint i = 0; i < witness.length; i++) {
            if (witness[i].player == player) count++;
        }

        // Collect entries
        WitnessEntry[] memory history = new WitnessEntry[](count);
        uint256 index = 0;
        for (uint i = 0; i < witness.length; i++) {
            if (witness[i].player == player) {
                history[index++] = witness[i];
            }
        }

        return history;
    }
}
```

---

### 7. Rewards.sol

**Purpose:** Handles prize pool distribution (future feature).

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Rewards {

    // ============ STATE ============

    // Prize pool mode: false = all to dev, true = split
    bool public prizePoolEnabled;

    // Distribution when enabled
    uint256 public constant DEV_SHARE = 30;      // 30%
    uint256 public constant PRIZE_SHARE = 70;    // 70%

    // Prize distribution among top players
    uint256[] public prizeDistribution = [40, 25, 15, 8, 5, 3, 2, 1, 0.5, 0.5]; // Top 10

    // genId => player => claimed
    mapping(uint256 => mapping(address => bool)) public claimed;

    // genId => total prize pool
    mapping(uint256 => uint256) public prizePools;

    // ============ EVENTS ============

    event PrizePoolFunded(uint256 indexed generation, uint256 amount);
    event PrizeClaimed(uint256 indexed generation, address indexed player, uint256 amount);

    // ============ FUNCTIONS ============

    function fundPrizePool(uint256 genId) external payable onlyGenerationManager {
        if (prizePoolEnabled) {
            uint256 prizeAmount = (msg.value * PRIZE_SHARE) / 100;
            prizePools[genId] += prizeAmount;

            // Dev share goes to treasury
            // ... transfer DEV_SHARE to dev wallet

            emit PrizePoolFunded(genId, prizeAmount);
        }
        // If not enabled, all goes to dev (handled in GenerationManager)
    }

    function claimPrize(
        uint256 genId,
        uint256 rank,
        bytes32[] calldata merkleProof
    ) external {
        require(!claimed[genId][msg.sender], "Already claimed");
        require(rank >= 1 && rank <= 10, "Rank not eligible");

        // Verify merkle proof against generation results
        // ... merkle verification

        claimed[genId][msg.sender] = true;

        uint256 prize = (prizePools[genId] * prizeDistribution[rank - 1]) / 100;

        (bool success, ) = msg.sender.call{value: prize}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(genId, msg.sender, prize);
    }

    function enablePrizePool() external onlyOwner {
        prizePoolEnabled = true;
    }
}
```

---

## GAS OPTIMIZATION STRATEGIES

### 1. Lazy Resolution

Instead of resolving every action immediately, piggyback on player transactions:

```solidity
uint256 public constant RESOLUTIONS_PER_TX = 20;
uint256 public pendingResolutionHead;

modifier withResolutions() {
    // Resolve up to 20 pending items before processing this tx
    _resolvePending(RESOLUTIONS_PER_TX);
    _;
}

function _resolvePending(uint256 max) internal {
    uint256 resolved = 0;
    while (resolved < max && pendingResolutionHead < pendingQueue.length) {
        _resolveOne(pendingQueue[pendingResolutionHead++]);
        resolved++;
    }
}
```

### 2. Packed Storage

Pack multiple values into single storage slots:

```solidity
// BAD: 3 storage slots
struct PlotBad {
    uint256 x;      // 32 bytes
    uint256 y;      // 32 bytes
    uint256 terrain; // 32 bytes
}

// GOOD: 1 storage slot
struct PlotGood {
    uint8 x;        // 1 byte
    uint8 y;        // 1 byte
    uint8 terrain;  // 1 byte
    address owner;  // 20 bytes
    // Total: 23 bytes, fits in 1 slot
}
```

### 3. Merkle Proofs for Batch Data

Instead of storing all results on-chain, store a merkle root and let players prove their inclusion:

```solidity
function verifyResult(
    uint256 genId,
    address player,
    uint256 rank,
    uint256 points,
    bytes32[] calldata proof
) public view returns (bool) {
    bytes32 leaf = keccak256(abi.encodePacked(player, rank, points));
    bytes32 root = generations[genId].resultsHash;
    return MerkleProof.verify(proof, root, leaf);
}
```

### 4. Events Over Storage

For historical data that doesn't need on-chain verification, emit events instead of storing:

```solidity
// Instead of storing every battle...
event BattleResult(
    uint256 indexed genId,
    address indexed attacker,
    address indexed defender,
    uint8 targetX,
    uint8 targetY,
    address winner,
    uint256 attackerLosses,
    uint256 defenderLosses
);
// Indexers can reconstruct history from events
```

### 5. Bitmap for Booleans

Use bitmaps for many boolean flags:

```solidity
// BAD: 100 storage slots for 100 booleans
mapping(uint256 => bool) public plotClaimed;

// GOOD: 4 storage slots for 256 booleans each
mapping(uint256 => uint256) public claimedBitmap;

function isClaimed(uint256 plotId) public view returns (bool) {
    uint256 bucket = plotId / 256;
    uint256 bit = plotId % 256;
    return (claimedBitmap[bucket] >> bit) & 1 == 1;
}
```

---

## SECURITY CONSIDERATIONS

### Access Control

```solidity
// Role-based access
bytes32 public constant GAME_SERVER_ROLE = keccak256("GAME_SERVER");
bytes32 public constant ADMIN_ROLE = keccak256("ADMIN");

modifier onlyGameServer() {
    require(hasRole(GAME_SERVER_ROLE, msg.sender), "Not game server");
    _;
}
```

### Reentrancy Protection

```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

function claimPrize(...) external nonReentrant {
    // Safe from reentrancy
}
```

### Commit-Reveal Timing

```solidity
// Prevent front-running by enforcing minimum delay
require(block.timestamp >= commit.commitTime + MIN_REVEAL_DELAY, "Too early to reveal");

// Prevent griefing by enforcing maximum delay
require(block.timestamp <= commit.revealDeadline, "Reveal window closed");
```

### Server Authority Limits

The game server has authority but with constraints:

| Server CAN | Server CANNOT |
|------------|---------------|
| Assign plots (with VRF) | Change plot prices |
| Resolve battles | Mint tokens |
| Update territory ownership | Modify Titan's Witness retroactively |
| Commit results | Withdraw funds |

### Dispute Resolution

```solidity
struct Dispute {
    address challenger;
    bytes32 claimedResultHash;
    uint256 stake;
    uint256 deadline;
    bool resolved;
}

// Players can dispute server results by staking
function disputeResult(uint256 genId, uint256 attackId, bytes32 alternateHash) external payable {
    require(msg.value >= DISPUTE_STAKE, "Insufficient stake");
    // ... create dispute, admin reviews
}
```

---

## DEPLOYMENT ARCHITECTURE

### Base Mainnet Deployment

```
Network: Base (Chain ID: 8453)
Block Time: ~2 seconds
Gas Token: ETH (bridged)

Contracts:
├── NemethsProxy.sol      → 0x...
├── GenerationManager.sol → 0x...
├── Plots.sol             → 0x...
├── CombatSystem.sol      → 0x...
├── Alliances.sol         → 0x...
├── TitansWitness.sol     → 0x...
└── Rewards.sol           → 0x...
```

### Estimated Gas Costs (Base L2)

| Action | Gas | Cost @ 0.001 gwei |
|--------|-----|-------------------|
| Register | ~150,000 | ~$0.01 |
| Commit Attack | ~80,000 | ~$0.005 |
| Reveal Attack | ~100,000 | ~$0.007 |
| Create Alliance | ~120,000 | ~$0.008 |
| Claim Prize | ~60,000 | ~$0.004 |

*Base L2 gas is extremely cheap - most actions cost pennies*

---

## CHAINLINK VRF INTEGRATION

For provably random plot assignment:

```solidity
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

contract RandomPlacement is VRFConsumerBaseV2 {

    function requestRandomPlacement(uint256 genId, address player) external {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            subscriptionId,
            3,              // confirmations
            100000,         // callback gas
            1               // num words
        );
        pendingRequests[requestId] = PlacementRequest(genId, player);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        PlacementRequest memory req = pendingRequests[requestId];

        // Use randomness to determine starting position in Outer Ring
        uint256 seed = randomWords[0];
        (uint8 x, uint8 y) = _getRandomOuterRingPosition(seed);

        // Assign plots
        plots.assignStartingPlots(req.genId, req.player, x, y);
    }
}
```

---

## SUMMARY

| Contract | Purpose | Key Data |
|----------|---------|----------|
| **GenerationManager** | Lifecycle, fees, timing | Players, fees, phases |
| **Plots** | Territory ownership | Coordinates, owners |
| **CombatSystem** | Attack commit-reveal | Commitments, reveals |
| **Alliances** | On-chain agreements | Members, terms |
| **TitansWitness** | Eternal leaderboard | All-time records |
| **Rewards** | Prize distribution | Pools, claims |

**Philosophy:**
- Blockchain = ownership, money, permanent records
- Game server = real-time gameplay, complex calculations
- Merkle proofs = efficient verification of large datasets
- Lazy resolution = gas savings through batching

---

*Document Status: Smart contract architecture drafted*
*Next: Economic balance pass, Frontend/API design*
