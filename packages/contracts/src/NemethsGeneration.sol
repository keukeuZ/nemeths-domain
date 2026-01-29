// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title NemethsGeneration
 * @notice Manages game generations and player registration for Nemeths Domain
 * @dev Each generation represents a complete game cycle (50 days)
 */
contract NemethsGeneration is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Generation {
        uint256 id;
        uint256 startTime;
        uint256 endTime;
        GenerationPhase phase;
        address winner;
        uint256 totalPlayers;
        uint256 prizePool;
    }

    struct Player {
        address wallet;
        uint8 race; // 0-5 for 6 races
        uint8 captainClass; // 0-5 for 6 classes
        uint8 captainSkill; // 0-11 for 12 skills
        string captainName;
        bool isPremium;
        uint256 registeredAt;
        uint256 score;
        bool eliminated;
    }

    enum GenerationPhase {
        NotStarted,
        Planning, // Days 1-5
        Active, // Days 6-45
        Endgame, // Days 46-50
        Ended
    }

    // ==========================================
    // CONSTANTS
    // ==========================================

    /// @notice Generation duration in seconds (50 days)
    uint256 public constant GENERATION_DURATION = 50 days;

    /// @notice Planning phase duration (5 days)
    uint256 public constant PLANNING_DURATION = 5 days;

    /// @notice Active phase duration (40 days, days 6-45)
    uint256 public constant ACTIVE_DURATION = 40 days;

    /// @notice Premium entry fee (10 USDC = 10e6 with 6 decimals)
    uint256 public constant PREMIUM_FEE = 10e6;

    /// @notice Free player starting plots
    uint256 public constant FREE_PLOTS = 2;

    /// @notice Premium player starting plots
    uint256 public constant PREMIUM_PLOTS = 10;

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Current generation number
    uint256 public currentGenerationId;

    /// @notice All generations
    mapping(uint256 => Generation) public generations;

    /// @notice Players per generation: generationId => wallet => Player
    mapping(uint256 => mapping(address => Player)) public players;

    /// @notice Player list per generation for iteration
    mapping(uint256 => address[]) public playerList;

    /// @notice USDC token address
    IERC20 public immutable usdc;

    /// @notice Treasury address for fee collection
    address public treasury;

    /// @notice Plots contract address (set after deployment)
    address public plotsContract;

    /// @notice TitansWitness contract address
    address public titansWitness;

    /// @notice Server oracle address (for off-chain game state updates)
    address public serverOracle;

    /// @notice Referral registry contract
    address public referralRegistry;

    // ==========================================
    // EVENTS
    // ==========================================

    event GenerationStarted(uint256 indexed generationId, uint256 startTime, uint256 endTime);
    event GenerationPhaseChanged(uint256 indexed generationId, GenerationPhase newPhase);
    event GenerationEnded(uint256 indexed generationId, address winner, uint256 totalPlayers, uint256 prizePool);

    event PlayerRegistered(
        uint256 indexed generationId,
        address indexed player,
        string captainName,
        uint8 race,
        uint8 captainClass,
        uint8 captainSkill,
        bool isPremium,
        uint256 plots
    );

    event PlayerEliminated(uint256 indexed generationId, address indexed player);
    event ScoreUpdated(uint256 indexed generationId, address indexed player, uint256 newScore);

    // ==========================================
    // ERRORS
    // ==========================================

    error GenerationNotActive();
    error GenerationAlreadyEnded();
    error AlreadyRegistered();
    error InvalidRace();
    error InvalidClass();
    error InvalidSkill();
    error InvalidName();
    error InsufficientAllowance();
    error OnlyServerOracle();
    error OnlyPlotsContract();
    error NotRegistered();
    error TransferFailed();
    error ZeroAddress();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyServerOracle() {
        if (msg.sender != serverOracle) revert OnlyServerOracle();
        _;
    }

    modifier onlyPlotsContract() {
        if (msg.sender != plotsContract) revert OnlyPlotsContract();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address _usdc, address _treasury) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Start a new generation
     */
    function startGeneration() external onlyOwner {
        // End previous generation if exists and not ended
        if (currentGenerationId > 0) {
            Generation storage prevGen = generations[currentGenerationId];
            if (prevGen.phase != GenerationPhase.Ended) {
                prevGen.phase = GenerationPhase.Ended;
            }
        }

        currentGenerationId++;

        Generation storage gen = generations[currentGenerationId];
        gen.id = currentGenerationId;
        gen.startTime = block.timestamp;
        gen.endTime = block.timestamp + GENERATION_DURATION;
        gen.phase = GenerationPhase.Planning;

        emit GenerationStarted(currentGenerationId, gen.startTime, gen.endTime);
        emit GenerationPhaseChanged(currentGenerationId, GenerationPhase.Planning);
    }

    /**
     * @notice Update generation phase (called by automation or admin)
     */
    function updatePhase() external {
        Generation storage gen = generations[currentGenerationId];

        if (gen.phase == GenerationPhase.Ended) return;

        uint256 elapsed = block.timestamp - gen.startTime;
        GenerationPhase newPhase;

        if (elapsed < PLANNING_DURATION) {
            newPhase = GenerationPhase.Planning;
        } else if (elapsed < PLANNING_DURATION + ACTIVE_DURATION) {
            newPhase = GenerationPhase.Active;
        } else if (elapsed < GENERATION_DURATION) {
            newPhase = GenerationPhase.Endgame;
        } else {
            newPhase = GenerationPhase.Ended;
        }

        if (newPhase != gen.phase) {
            gen.phase = newPhase;
            emit GenerationPhaseChanged(currentGenerationId, newPhase);
        }
    }

    /**
     * @notice End the current generation with winner
     * @param winner The winning player's address
     */
    function endGeneration(address winner) external onlyOwner nonReentrant {
        if (winner == address(0)) revert ZeroAddress();

        Generation storage gen = generations[currentGenerationId];

        if (gen.phase == GenerationPhase.Ended) revert GenerationAlreadyEnded();

        gen.phase = GenerationPhase.Ended;
        gen.winner = winner;
        gen.totalPlayers = playerList[currentGenerationId].length;

        // Distribute prize pool (90% to winner, 10% to treasury)
        if (gen.prizePool > 0) {
            uint256 winnerShare = (gen.prizePool * 90) / 100;
            uint256 treasuryShare = gen.prizePool - winnerShare;

            if (winnerShare > 0) {
                usdc.safeTransfer(winner, winnerShare);
            }
            if (treasuryShare > 0) {
                usdc.safeTransfer(treasury, treasuryShare);
            }
        }

        emit GenerationEnded(currentGenerationId, winner, gen.totalPlayers, gen.prizePool);
    }

    /**
     * @notice Set server oracle address
     */
    function setServerOracle(address _serverOracle) external onlyOwner {
        if (_serverOracle == address(0)) revert ZeroAddress();
        serverOracle = _serverOracle;
    }

    /**
     * @notice Set plots contract address
     */
    function setPlotsContract(address _plotsContract) external onlyOwner {
        if (_plotsContract == address(0)) revert ZeroAddress();
        plotsContract = _plotsContract;
    }

    /**
     * @notice Set TitansWitness contract address
     */
    function setTitansWitness(address _titansWitness) external onlyOwner {
        if (_titansWitness == address(0)) revert ZeroAddress();
        titansWitness = _titansWitness;
    }

    /**
     * @notice Set treasury address
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    /**
     * @notice Set referral registry contract
     */
    function setReferralRegistry(address _referralRegistry) external onlyOwner {
        if (_referralRegistry == address(0)) revert ZeroAddress();
        referralRegistry = _referralRegistry;
    }

    // ==========================================
    // PLAYER REGISTRATION
    // ==========================================

    /**
     * @notice Register as a free player (2 plots)
     * @param captainName Captain's name (max 32 chars)
     * @param race Race selection (0-5)
     * @param captainClass Class selection (0-5)
     * @param captainSkill Skill selection (must match class)
     */
    function registerFree(
        string calldata captainName,
        uint8 race,
        uint8 captainClass,
        uint8 captainSkill
    ) external nonReentrant {
        _register(captainName, race, captainClass, captainSkill, false);
    }

    /**
     * @notice Register as a premium player (10 plots, requires USDC)
     * @param captainName Captain's name (max 32 chars)
     * @param race Race selection (0-5)
     * @param captainClass Class selection (0-5)
     * @param captainSkill Skill selection (must match class)
     */
    function registerPremium(
        string calldata captainName,
        uint8 race,
        uint8 captainClass,
        uint8 captainSkill
    ) external nonReentrant {
        _processPremiumPayment("");
        _register(captainName, race, captainClass, captainSkill, true);
    }

    /**
     * @notice Register as a premium player with referral code
     * @param captainName Captain's name (max 32 chars)
     * @param race Race selection (0-5)
     * @param captainClass Class selection (0-5)
     * @param captainSkill Skill selection (must match class)
     * @param referralCode Referral code (optional, empty string if none)
     */
    function registerPremiumWithReferral(
        string calldata captainName,
        uint8 race,
        uint8 captainClass,
        uint8 captainSkill,
        string calldata referralCode
    ) external nonReentrant {
        _processPremiumPayment(referralCode);
        _register(captainName, race, captainClass, captainSkill, true);
    }

    /**
     * @notice Internal function to process premium payment
     */
    function _processPremiumPayment(string memory referralCode) internal {
        // Check USDC allowance
        if (usdc.allowance(msg.sender, address(this)) < PREMIUM_FEE) {
            revert InsufficientAllowance();
        }

        // Transfer USDC (safeTransferFrom reverts on failure)
        usdc.safeTransferFrom(msg.sender, address(this), PREMIUM_FEE);

        // Add to prize pool
        generations[currentGenerationId].prizePool += PREMIUM_FEE;

        // Record referral if code provided and registry is set
        if (bytes(referralCode).length > 0 && referralRegistry != address(0)) {
            // Call referral registry to record (it handles validation)
            // Using low-level call to avoid reverting if referral fails
            (bool success, ) = referralRegistry.call(
                abi.encodeWithSignature(
                    "recordReferral(address,string,uint256)",
                    msg.sender,
                    referralCode,
                    PREMIUM_FEE
                )
            );
            // Silently ignore referral failures - registration should still succeed
            success; // Suppress unused variable warning
        }
    }

    /**
     * @notice Internal registration logic
     */
    function _register(
        string calldata captainName,
        uint8 race,
        uint8 captainClass,
        uint8 captainSkill,
        bool isPremium
    ) internal {
        Generation storage gen = generations[currentGenerationId];

        // Can only register during Planning or early Active phase
        if (gen.phase == GenerationPhase.Ended || gen.phase == GenerationPhase.NotStarted) {
            revert GenerationNotActive();
        }

        // Check not already registered
        if (players[currentGenerationId][msg.sender].wallet != address(0)) {
            revert AlreadyRegistered();
        }

        // Validate inputs
        if (race > 5) revert InvalidRace();
        if (captainClass > 5) revert InvalidClass();
        if (!_isValidSkillForClass(captainClass, captainSkill)) revert InvalidSkill();
        if (bytes(captainName).length == 0 || bytes(captainName).length > 32) revert InvalidName();

        // Create player
        Player storage player = players[currentGenerationId][msg.sender];
        player.wallet = msg.sender;
        player.race = race;
        player.captainClass = captainClass;
        player.captainSkill = captainSkill;
        player.captainName = captainName;
        player.isPremium = isPremium;
        player.registeredAt = block.timestamp;

        // Add to player list
        playerList[currentGenerationId].push(msg.sender);

        uint256 plots = isPremium ? PREMIUM_PLOTS : FREE_PLOTS;

        emit PlayerRegistered(
            currentGenerationId,
            msg.sender,
            captainName,
            race,
            captainClass,
            captainSkill,
            isPremium,
            plots
        );
    }

    /**
     * @notice Validate skill matches class
     * Skills per class:
     * - Warlord (0): vanguard (0), fortress (1)
     * - Archmage (1): destruction (2), protection (3)
     * - HighPriest (2): crusader (4), oracle (5)
     * - ShadowMaster (3): assassin (6), saboteur (7)
     * - MerchantPrince (4): profiteer (8), artificer (9)
     * - Beastlord (5): packalpha (10), warden (11)
     */
    function _isValidSkillForClass(uint8 captainClass, uint8 skill) internal pure returns (bool) {
        uint8 expectedSkillBase = captainClass * 2;
        return skill == expectedSkillBase || skill == expectedSkillBase + 1;
    }

    // ==========================================
    // SERVER ORACLE FUNCTIONS
    // ==========================================

    /**
     * @notice Update player score (called by server oracle)
     */
    function updateScore(address playerAddr, uint256 newScore) external onlyServerOracle {
        Player storage player = players[currentGenerationId][playerAddr];
        if (player.wallet == address(0)) revert NotRegistered();

        player.score = newScore;
        emit ScoreUpdated(currentGenerationId, playerAddr, newScore);
    }

    /**
     * @notice Mark player as eliminated (called by server oracle)
     */
    function eliminatePlayer(address playerAddr) external onlyServerOracle {
        Player storage player = players[currentGenerationId][playerAddr];
        if (player.wallet == address(0)) revert NotRegistered();

        player.eliminated = true;
        emit PlayerEliminated(currentGenerationId, playerAddr);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get current generation info
     */
    function getCurrentGeneration() external view returns (Generation memory) {
        return generations[currentGenerationId];
    }

    /**
     * @notice Get current phase
     */
    function getCurrentPhase() external view returns (GenerationPhase) {
        return generations[currentGenerationId].phase;
    }

    /**
     * @notice Check if generation is accepting registrations
     */
    function canRegister() external view returns (bool) {
        GenerationPhase phase = generations[currentGenerationId].phase;
        return phase == GenerationPhase.Planning || phase == GenerationPhase.Active;
    }

    /**
     * @notice Get player info
     */
    function getPlayer(uint256 generationId, address playerAddr) external view returns (Player memory) {
        return players[generationId][playerAddr];
    }

    /**
     * @notice Check if address is registered in current generation
     */
    function isRegistered(address playerAddr) external view returns (bool) {
        return players[currentGenerationId][playerAddr].wallet != address(0);
    }

    /**
     * @notice Get number of plots for a player type
     */
    function getPlotCount(bool isPremium) external pure returns (uint256) {
        return isPremium ? PREMIUM_PLOTS : FREE_PLOTS;
    }

    /**
     * @notice Get player count for generation
     */
    function getPlayerCount(uint256 generationId) external view returns (uint256) {
        return playerList[generationId].length;
    }

    /**
     * @notice Get time remaining in current generation
     */
    function getTimeRemaining() external view returns (uint256) {
        Generation storage gen = generations[currentGenerationId];
        if (gen.phase == GenerationPhase.Ended || block.timestamp >= gen.endTime) {
            return 0;
        }
        return gen.endTime - block.timestamp;
    }

    /**
     * @notice Get race name
     */
    function getRaceName(uint8 race) external pure returns (string memory) {
        if (race == 0) return "Ironveld";
        if (race == 1) return "Vaelthir";
        if (race == 2) return "Korrath";
        if (race == 3) return "Sylvaeth";
        if (race == 4) return "Ashborn";
        if (race == 5) return "Breathborn";
        return "Unknown";
    }

    /**
     * @notice Get class name
     */
    function getClassName(uint8 captainClass) external pure returns (string memory) {
        if (captainClass == 0) return "Warlord";
        if (captainClass == 1) return "Archmage";
        if (captainClass == 2) return "HighPriest";
        if (captainClass == 3) return "ShadowMaster";
        if (captainClass == 4) return "MerchantPrince";
        if (captainClass == 5) return "Beastlord";
        return "Unknown";
    }
}
