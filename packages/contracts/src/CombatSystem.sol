// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IPlots {
    function conquerPlot(uint256 tokenId, address newOwner) external;
    function clearForsaken(uint256 tokenId, address claimer) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function getPlot(uint256 tokenId) external view returns (
        uint8 x,
        uint8 y,
        uint8 zone,
        uint8 terrain,
        uint256 generationId,
        bool isForsaken
    );
}

interface IVRFConsumer {
    function requestRandomWords() external returns (uint256 requestId);
}

/**
 * @title CombatSystem
 * @notice Manages combat resolution with commit-reveal pattern for Nemeths Domain
 * @dev Uses commit-reveal to prevent front-running and Chainlink VRF for randomness
 */
contract CombatSystem is Ownable, ReentrancyGuard {
    // ==========================================
    // STRUCTS
    // ==========================================

    struct Combat {
        uint256 id;
        address attacker;
        address defender;
        uint256 plotTokenId;
        uint256 attackerStrength;
        uint256 defenderStrength;
        bytes32 attackerCommit; // Hash of attacker's secret
        bytes32 defenderCommit; // Hash of defender's secret (optional)
        uint256 attackerReveal;
        uint256 defenderReveal;
        CombatPhase phase;
        uint256 commitDeadline;
        uint256 revealDeadline;
        uint256 vrfRequestId;
        uint256 randomSeed;
        CombatResult result;
        uint256 resolvedAt;
    }

    enum CombatPhase {
        Pending,
        CommitPhase,
        RevealPhase,
        AwaitingVRF,
        Resolved,
        Expired
    }

    enum CombatResult {
        None,
        AttackerWins,
        DefenderWins,
        Draw,
        AttackerForfeit,
        DefenderForfeit
    }

    // ==========================================
    // CONSTANTS
    // ==========================================

    /// @notice Commit phase duration
    uint256 public constant COMMIT_DURATION = 1 hours;

    /// @notice Reveal phase duration
    uint256 public constant REVEAL_DURATION = 30 minutes;

    /// @notice Minimum attack strength
    uint256 public constant MIN_ATTACK_STRENGTH = 100;

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Plots contract
    IPlots public plots;

    /// @notice VRF consumer contract
    IVRFConsumer public vrfConsumer;

    /// @notice Generation contract
    address public generationContract;

    /// @notice Server oracle for off-chain combat data
    address public serverOracle;

    /// @notice Combat counter
    uint256 public combatCount;

    /// @notice All combats
    mapping(uint256 => Combat) public combats;

    /// @notice VRF request to combat mapping
    mapping(uint256 => uint256) public vrfRequestToCombat;

    /// @notice Active combat per plot (only one at a time)
    mapping(uint256 => uint256) public activeCombatForPlot;

    /// @notice Player's active attacks
    mapping(address => uint256[]) public playerAttacks;

    /// @notice Player's active defenses
    mapping(address => uint256[]) public playerDefenses;

    // ==========================================
    // EVENTS
    // ==========================================

    event CombatInitiated(
        uint256 indexed combatId,
        address indexed attacker,
        address indexed defender,
        uint256 plotTokenId,
        uint256 attackerStrength,
        uint256 commitDeadline
    );

    event CommitSubmitted(uint256 indexed combatId, address indexed player, bool isAttacker);

    event RevealSubmitted(uint256 indexed combatId, address indexed player, bool isAttacker, uint256 value);

    event VRFRequested(uint256 indexed combatId, uint256 requestId);

    event CombatResolved(
        uint256 indexed combatId,
        CombatResult result,
        address winner,
        uint256 attackerRoll,
        uint256 defenderRoll
    );

    event CombatExpired(uint256 indexed combatId, CombatResult result);

    // ==========================================
    // ERRORS
    // ==========================================

    error OnlyServerOracle();
    error CombatNotFound();
    error InvalidPhase();
    error NotParticipant();
    error AlreadyCommitted();
    error CommitDeadlinePassed();
    error RevealDeadlinePassed();
    error InvalidReveal();
    error PlotHasActiveCombat();
    error InsufficientStrength();
    error CannotAttackOwnPlot();
    error NotAttacker();
    error NotDefender();
    error ZeroAddress();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyServerOracle() {
        if (msg.sender != serverOracle) revert OnlyServerOracle();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address _plots) Ownable(msg.sender) {
        if (_plots == address(0)) revert ZeroAddress();
        plots = IPlots(_plots);
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function setVRFConsumer(address _vrfConsumer) external onlyOwner {
        if (_vrfConsumer == address(0)) revert ZeroAddress();
        vrfConsumer = IVRFConsumer(_vrfConsumer);
    }

    function setServerOracle(address _serverOracle) external onlyOwner {
        if (_serverOracle == address(0)) revert ZeroAddress();
        serverOracle = _serverOracle;
    }

    function setGenerationContract(address _generationContract) external onlyOwner {
        if (_generationContract == address(0)) revert ZeroAddress();
        generationContract = _generationContract;
    }

    // ==========================================
    // COMBAT INITIATION
    // ==========================================

    /**
     * @notice Initiate combat against a plot
     * @param plotTokenId Target plot token ID
     * @param attackerStrength Attacker's army strength (from server)
     * @param commitHash Hash of attacker's secret (keccak256(secret))
     */
    function initiateCombat(
        uint256 plotTokenId,
        uint256 attackerStrength,
        bytes32 commitHash
    ) external nonReentrant returns (uint256) {
        // Validate
        if (attackerStrength < MIN_ATTACK_STRENGTH) revert InsufficientStrength();

        address defender = plots.ownerOf(plotTokenId);
        if (defender == msg.sender) revert CannotAttackOwnPlot();

        // Check no active combat on this plot
        if (activeCombatForPlot[plotTokenId] != 0) {
            Combat storage existingCombat = combats[activeCombatForPlot[plotTokenId]];
            if (existingCombat.phase != CombatPhase.Resolved && existingCombat.phase != CombatPhase.Expired) {
                revert PlotHasActiveCombat();
            }
        }

        // Create combat
        combatCount++;
        uint256 combatId = combatCount;

        Combat storage combat = combats[combatId];
        combat.id = combatId;
        combat.attacker = msg.sender;
        combat.defender = defender;
        combat.plotTokenId = plotTokenId;
        combat.attackerStrength = attackerStrength;
        combat.attackerCommit = commitHash;
        combat.phase = CombatPhase.CommitPhase;
        combat.commitDeadline = block.timestamp + COMMIT_DURATION;
        combat.revealDeadline = block.timestamp + COMMIT_DURATION + REVEAL_DURATION;

        // Set active combat for plot
        activeCombatForPlot[plotTokenId] = combatId;

        // Track for players
        playerAttacks[msg.sender].push(combatId);
        playerDefenses[defender].push(combatId);

        emit CombatInitiated(
            combatId,
            msg.sender,
            defender,
            plotTokenId,
            attackerStrength,
            combat.commitDeadline
        );

        emit CommitSubmitted(combatId, msg.sender, true);

        return combatId;
    }

    // ==========================================
    // COMMIT PHASE
    // ==========================================

    /**
     * @notice Defender submits their commit (optional - can skip)
     * @param combatId Combat ID
     * @param commitHash Hash of defender's secret
     * @param defenderStrength Defender's army strength (verified by server)
     */
    function defenderCommit(
        uint256 combatId,
        bytes32 commitHash,
        uint256 defenderStrength
    ) external {
        Combat storage combat = combats[combatId];

        if (combat.id == 0) revert CombatNotFound();
        if (combat.phase != CombatPhase.CommitPhase) revert InvalidPhase();
        if (msg.sender != combat.defender) revert NotDefender();
        if (combat.defenderCommit != bytes32(0)) revert AlreadyCommitted();
        if (block.timestamp > combat.commitDeadline) revert CommitDeadlinePassed();

        combat.defenderCommit = commitHash;
        combat.defenderStrength = defenderStrength;

        emit CommitSubmitted(combatId, msg.sender, false);
    }

    // ==========================================
    // REVEAL PHASE
    // ==========================================

    /**
     * @notice Advance to reveal phase (can be called by anyone after commit deadline)
     */
    function advanceToReveal(uint256 combatId) external {
        Combat storage combat = combats[combatId];

        if (combat.id == 0) revert CombatNotFound();
        if (combat.phase != CombatPhase.CommitPhase) revert InvalidPhase();
        if (block.timestamp < combat.commitDeadline) revert CommitDeadlinePassed();

        combat.phase = CombatPhase.RevealPhase;
    }

    /**
     * @notice Attacker reveals their secret
     * @param combatId Combat ID
     * @param secret The original secret that was hashed
     */
    function attackerReveal(uint256 combatId, uint256 secret) external {
        Combat storage combat = combats[combatId];

        if (combat.id == 0) revert CombatNotFound();
        if (combat.phase != CombatPhase.RevealPhase) revert InvalidPhase();
        if (msg.sender != combat.attacker) revert NotAttacker();
        if (block.timestamp > combat.revealDeadline) revert RevealDeadlinePassed();

        // Verify the reveal matches the commit
        if (keccak256(abi.encodePacked(secret)) != combat.attackerCommit) {
            revert InvalidReveal();
        }

        combat.attackerReveal = secret;

        emit RevealSubmitted(combatId, msg.sender, true, secret);

        // If both revealed, request VRF
        _checkAndRequestVRF(combatId);
    }

    /**
     * @notice Defender reveals their secret
     */
    function defenderReveal(uint256 combatId, uint256 secret) external {
        Combat storage combat = combats[combatId];

        if (combat.id == 0) revert CombatNotFound();
        if (combat.phase != CombatPhase.RevealPhase) revert InvalidPhase();
        if (msg.sender != combat.defender) revert NotDefender();
        if (block.timestamp > combat.revealDeadline) revert RevealDeadlinePassed();

        // Verify the reveal matches the commit (if committed)
        if (combat.defenderCommit != bytes32(0)) {
            if (keccak256(abi.encodePacked(secret)) != combat.defenderCommit) {
                revert InvalidReveal();
            }
        }

        combat.defenderReveal = secret;

        emit RevealSubmitted(combatId, msg.sender, false, secret);

        // If attacker revealed, request VRF
        _checkAndRequestVRF(combatId);
    }

    /**
     * @notice Check if ready for VRF and request if so
     */
    function _checkAndRequestVRF(uint256 combatId) internal {
        Combat storage combat = combats[combatId];

        // Attacker must reveal
        if (combat.attackerReveal == 0) return;

        // Request VRF
        combat.phase = CombatPhase.AwaitingVRF;

        if (address(vrfConsumer) != address(0)) {
            uint256 requestId = vrfConsumer.requestRandomWords();
            combat.vrfRequestId = requestId;
            vrfRequestToCombat[requestId] = combatId;
            emit VRFRequested(combatId, requestId);
        } else {
            // Fallback: use block hash (less secure but works for testing)
            combat.randomSeed = uint256(blockhash(block.number - 1));
            _resolveCombat(combatId);
        }
    }

    // ==========================================
    // VRF CALLBACK
    // ==========================================

    /**
     * @notice Callback from VRF consumer with random number
     */
    function fulfillRandomness(uint256 requestId, uint256 randomness) external {
        // Only VRF consumer can call this
        require(msg.sender == address(vrfConsumer), "Only VRF");

        uint256 combatId = vrfRequestToCombat[requestId];
        Combat storage combat = combats[combatId];

        if (combat.phase != CombatPhase.AwaitingVRF) return;

        combat.randomSeed = randomness;
        _resolveCombat(combatId);
    }

    // ==========================================
    // COMBAT RESOLUTION
    // ==========================================

    /**
     * @notice Resolve combat with D20 weighted system
     */
    function _resolveCombat(uint256 combatId) internal {
        Combat storage combat = combats[combatId];

        // Combine all entropy sources for the random seed
        uint256 combinedSeed = uint256(
            keccak256(
                abi.encodePacked(
                    combat.randomSeed,
                    combat.attackerReveal,
                    combat.defenderReveal,
                    combat.attackerStrength,
                    combat.defenderStrength
                )
            )
        );

        // D20 rolls (1-20)
        uint256 attackerRoll = (combinedSeed % 20) + 1;
        uint256 defenderRoll = ((combinedSeed >> 128) % 20) + 1;

        // Apply weighted modifiers based on D20 (from game design)
        uint256 attackerModifier = _getD20Modifier(attackerRoll);
        uint256 defenderModifier = _getD20Modifier(defenderRoll);

        // Calculate effective strength
        uint256 attackerEffective = (combat.attackerStrength * attackerModifier) / 100;
        uint256 defenderEffective = (combat.defenderStrength * defenderModifier) / 100;

        // Determine winner
        CombatResult result;
        address winner;

        if (attackerEffective > defenderEffective) {
            result = CombatResult.AttackerWins;
            winner = combat.attacker;

            // Transfer plot to attacker
            plots.conquerPlot(combat.plotTokenId, combat.attacker);
        } else if (defenderEffective > attackerEffective) {
            result = CombatResult.DefenderWins;
            winner = combat.defender;
        } else {
            result = CombatResult.Draw;
            winner = combat.defender; // Defender wins ties
        }

        combat.result = result;
        combat.phase = CombatPhase.Resolved;
        combat.resolvedAt = block.timestamp;

        // Clear active combat
        activeCombatForPlot[combat.plotTokenId] = 0;

        emit CombatResolved(combatId, result, winner, attackerRoll, defenderRoll);
    }

    /**
     * @notice Get D20 modifier based on roll (from COMBAT.md)
     * Returns percentage (50-150)
     */
    function _getD20Modifier(uint256 roll) internal pure returns (uint256) {
        if (roll == 1) return 50; // Critical fail
        if (roll <= 4) return 70;
        if (roll <= 8) return 85;
        if (roll <= 12) return 100; // Median
        if (roll <= 16) return 110;
        if (roll <= 19) return 125;
        return 150; // Critical success (20)
    }

    // ==========================================
    // EXPIRATION HANDLING
    // ==========================================

    /**
     * @notice Handle expired combat (attacker didn't reveal)
     */
    function expireCombat(uint256 combatId) external {
        Combat storage combat = combats[combatId];

        if (combat.id == 0) revert CombatNotFound();
        if (combat.phase == CombatPhase.Resolved || combat.phase == CombatPhase.Expired) {
            revert InvalidPhase();
        }

        // Check if reveal deadline passed
        if (block.timestamp <= combat.revealDeadline) revert RevealDeadlinePassed();

        CombatResult result;

        if (combat.attackerReveal == 0) {
            // Attacker forfeited by not revealing
            result = CombatResult.AttackerForfeit;
        } else {
            // Defender didn't respond - attacker wins by default
            result = CombatResult.DefenderForfeit;
            plots.conquerPlot(combat.plotTokenId, combat.attacker);
        }

        combat.result = result;
        combat.phase = CombatPhase.Expired;
        combat.resolvedAt = block.timestamp;

        // Clear active combat
        activeCombatForPlot[combat.plotTokenId] = 0;

        emit CombatExpired(combatId, result);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    function getCombat(uint256 combatId) external view returns (Combat memory) {
        return combats[combatId];
    }

    function getActiveCombatForPlot(uint256 plotTokenId) external view returns (uint256) {
        return activeCombatForPlot[plotTokenId];
    }

    function getPlayerAttacks(address player) external view returns (uint256[] memory) {
        return playerAttacks[player];
    }

    function getPlayerDefenses(address player) external view returns (uint256[] memory) {
        return playerDefenses[player];
    }

    function getCombatPhase(uint256 combatId) external view returns (CombatPhase) {
        return combats[combatId].phase;
    }

    function getCombatResult(uint256 combatId) external view returns (CombatResult) {
        return combats[combatId].result;
    }
}
