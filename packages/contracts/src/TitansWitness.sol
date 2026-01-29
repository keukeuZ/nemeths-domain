// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title TitansWitness
 * @notice Eternal leaderboard for Nemeths Domain
 * @dev Records achievements across all generations
 */
contract TitansWitness {
    // ==========================================
    // STRUCTS
    // ==========================================

    struct PlayerRecord {
        address player;
        string captainName;
        uint8 race; // 0-5 for the 6 races
        uint256 generationId;
        uint256 score;
        uint256 territories;
        uint256 battlesWon;
        uint256 timestamp;
    }

    struct LeaderboardEntry {
        address player;
        uint256 totalWins;
        uint256 totalScore;
        uint256 bestGeneration;
        uint256 bestScore;
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice All player records ever
    PlayerRecord[] public allRecords;

    /// @notice Winning records (index in allRecords)
    uint256[] public winners;

    /// @notice Player statistics
    mapping(address => LeaderboardEntry) public leaderboard;

    /// @notice Generation contract
    address public generationContract;

    /// @notice Admin address
    address public admin;

    // ==========================================
    // EVENTS
    // ==========================================

    event RecordAdded(
        uint256 indexed recordId,
        address indexed player,
        string captainName,
        uint256 generationId,
        uint256 score,
        bool isWinner
    );

    // ==========================================
    // ERRORS
    // ==========================================

    error OnlyAdmin();
    error OnlyGenerationContract();
    error ZeroAddress();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyAdmin() {
        if (msg.sender != admin) revert OnlyAdmin();
        _;
    }

    modifier onlyGeneration() {
        if (msg.sender != generationContract) revert OnlyGenerationContract();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor() {
        admin = msg.sender;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function setGenerationContract(address _generationContract) external onlyAdmin {
        if (_generationContract == address(0)) revert ZeroAddress();
        generationContract = _generationContract;
    }

    // ==========================================
    // RECORDING FUNCTIONS
    // ==========================================

    /**
     * @notice Record a player's achievement
     * @param player Player address
     * @param captainName Captain's name
     * @param race Race (0-5)
     * @param generationId Generation ID
     * @param score Player's score
     * @param territories Number of territories controlled
     * @param battlesWon Number of battles won
     * @param isWinner Whether this player won the generation
     */
    function recordAchievement(
        address player,
        string calldata captainName,
        uint8 race,
        uint256 generationId,
        uint256 score,
        uint256 territories,
        uint256 battlesWon,
        bool isWinner
    ) external onlyGeneration {
        if (player == address(0)) revert ZeroAddress();

        uint256 recordId = allRecords.length;

        allRecords.push(
            PlayerRecord({
                player: player,
                captainName: captainName,
                race: race,
                generationId: generationId,
                score: score,
                territories: territories,
                battlesWon: battlesWon,
                timestamp: block.timestamp
            })
        );

        // Update leaderboard
        LeaderboardEntry storage entry = leaderboard[player];
        entry.player = player;
        entry.totalScore += score;

        if (isWinner) {
            winners.push(recordId);
            entry.totalWins++;
        }

        if (score > entry.bestScore) {
            entry.bestScore = score;
            entry.bestGeneration = generationId;
        }

        emit RecordAdded(recordId, player, captainName, generationId, score, isWinner);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get total number of records
     */
    function getTotalRecords() external view returns (uint256) {
        return allRecords.length;
    }

    /**
     * @notice Get total number of winners
     */
    function getTotalWinners() external view returns (uint256) {
        return winners.length;
    }

    /**
     * @notice Get a specific record
     */
    function getRecord(uint256 recordId) external view returns (PlayerRecord memory) {
        return allRecords[recordId];
    }

    /**
     * @notice Get winner record ID at index
     */
    function getWinnerRecordId(uint256 index) external view returns (uint256) {
        return winners[index];
    }

    /**
     * @notice Get player's leaderboard entry
     */
    function getPlayerStats(address player) external view returns (LeaderboardEntry memory) {
        return leaderboard[player];
    }
}
