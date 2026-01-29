// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ReferralRegistry
 * @notice Tracks referral codes and distributes rewards
 * @dev Referrers earn % of premium entries they bring in
 */
contract ReferralRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Referrer {
        address wallet;
        string code;
        uint256 totalReferrals;
        uint256 totalEarnings;
        uint256 pendingEarnings;
        bool active;
    }

    struct Referral {
        address referee;
        address referrer;
        uint256 timestamp;
        uint256 amountPaid;     // Premium fee paid
        uint256 rewardAmount;   // Reward to referrer
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Referrer data by address
    mapping(address => Referrer) public referrers;

    /// @notice Code to referrer address
    mapping(string => address) public codeToReferrer;

    /// @notice Check if address has been referred
    mapping(address => bool) public hasBeenReferred;

    /// @notice Referee to referrer mapping
    mapping(address => address) public refereeToReferrer;

    /// @notice All referrals
    Referral[] public referrals;

    /// @notice USDC token
    IERC20 public immutable usdc;

    /// @notice Game generation contract (authorized to record referrals)
    address public generationContract;

    /// @notice Referral reward percentage (basis points, 1000 = 10%)
    uint256 public rewardBps = 1000; // 10% default

    /// @notice Minimum code length
    uint256 public constant MIN_CODE_LENGTH = 3;

    /// @notice Maximum code length
    uint256 public constant MAX_CODE_LENGTH = 16;

    // ==========================================
    // EVENTS
    // ==========================================

    event ReferrerRegistered(address indexed referrer, string code);
    event ReferralRecorded(address indexed referee, address indexed referrer, uint256 amount, uint256 reward);
    event RewardsClaimed(address indexed referrer, uint256 amount);
    event RewardBpsUpdated(uint256 oldBps, uint256 newBps);

    // ==========================================
    // ERRORS
    // ==========================================

    error CodeTaken();
    error InvalidCodeLength();
    error InvalidCode();
    error AlreadyRegistered();
    error AlreadyReferred();
    error SelfReferral();
    error NoReferrer();
    error NoPendingRewards();
    error OnlyGenerationContract();
    error ZeroAddress();
    error ReferrerNotActive();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyGeneration() {
        if (msg.sender != generationContract && msg.sender != owner()) revert OnlyGenerationContract();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address _usdc) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Set generation contract
     */
    function setGenerationContract(address _generationContract) external onlyOwner {
        if (_generationContract == address(0)) revert ZeroAddress();
        generationContract = _generationContract;
    }

    /**
     * @notice Set reward percentage
     * @param newBps New basis points (1000 = 10%, max 5000 = 50%)
     */
    function setRewardBps(uint256 newBps) external onlyOwner {
        require(newBps <= 5000, "Max 50%");
        emit RewardBpsUpdated(rewardBps, newBps);
        rewardBps = newBps;
    }

    /**
     * @notice Deactivate a referrer (e.g., for abuse)
     */
    function setReferrerActive(address referrer, bool active) external onlyOwner {
        referrers[referrer].active = active;
    }

    /**
     * @notice Deposit USDC for rewards
     */
    function depositRewards(uint256 amount) external {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Withdraw excess USDC
     */
    function withdrawExcess(uint256 amount) external onlyOwner {
        usdc.safeTransfer(owner(), amount);
    }

    // ==========================================
    // REFERRER REGISTRATION
    // ==========================================

    /**
     * @notice Register as a referrer with a custom code
     * @param code Unique referral code (3-16 alphanumeric chars)
     */
    function registerAsReferrer(string calldata code) external {
        if (referrers[msg.sender].wallet != address(0)) revert AlreadyRegistered();

        bytes memory codeBytes = bytes(code);
        if (codeBytes.length < MIN_CODE_LENGTH || codeBytes.length > MAX_CODE_LENGTH) {
            revert InvalidCodeLength();
        }

        // Validate alphanumeric only
        for (uint256 i = 0; i < codeBytes.length; i++) {
            bytes1 char = codeBytes[i];
            if (!(
                (char >= 0x30 && char <= 0x39) || // 0-9
                (char >= 0x41 && char <= 0x5A) || // A-Z
                (char >= 0x61 && char <= 0x7A)    // a-z
            )) {
                revert InvalidCode();
            }
        }

        // Convert to lowercase for storage
        string memory lowerCode = _toLower(code);

        if (codeToReferrer[lowerCode] != address(0)) revert CodeTaken();

        referrers[msg.sender] = Referrer({
            wallet: msg.sender,
            code: lowerCode,
            totalReferrals: 0,
            totalEarnings: 0,
            pendingEarnings: 0,
            active: true
        });

        codeToReferrer[lowerCode] = msg.sender;

        emit ReferrerRegistered(msg.sender, lowerCode);
    }

    /**
     * @notice Convert string to lowercase
     */
    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            if (bStr[i] >= 0x41 && bStr[i] <= 0x5A) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }

    // ==========================================
    // REFERRAL RECORDING
    // ==========================================

    /**
     * @notice Record a referral (called by generation contract during premium registration)
     * @param referee The new player being referred
     * @param referralCode The code used
     * @param premiumFee The premium fee paid
     */
    function recordReferral(
        address referee,
        string calldata referralCode,
        uint256 premiumFee
    ) external onlyGeneration {
        if (hasBeenReferred[referee]) revert AlreadyReferred();

        string memory lowerCode = _toLower(referralCode);
        address referrerAddr = codeToReferrer[lowerCode];

        if (referrerAddr == address(0)) revert NoReferrer();
        if (referrerAddr == referee) revert SelfReferral();
        if (!referrers[referrerAddr].active) revert ReferrerNotActive();

        // Calculate reward
        uint256 reward = (premiumFee * rewardBps) / 10000;

        // Update state
        hasBeenReferred[referee] = true;
        refereeToReferrer[referee] = referrerAddr;

        Referrer storage referrer = referrers[referrerAddr];
        referrer.totalReferrals++;
        referrer.totalEarnings += reward;
        referrer.pendingEarnings += reward;

        referrals.push(Referral({
            referee: referee,
            referrer: referrerAddr,
            timestamp: block.timestamp,
            amountPaid: premiumFee,
            rewardAmount: reward
        }));

        emit ReferralRecorded(referee, referrerAddr, premiumFee, reward);
    }

    /**
     * @notice Apply referral code (for players to set before registering)
     * @dev Players call this before premium registration to link their referrer
     */
    function applyReferralCode(string calldata code) external {
        if (hasBeenReferred[msg.sender]) revert AlreadyReferred();

        string memory lowerCode = _toLower(code);
        address referrerAddr = codeToReferrer[lowerCode];

        if (referrerAddr == address(0)) revert NoReferrer();
        if (referrerAddr == msg.sender) revert SelfReferral();
        if (!referrers[referrerAddr].active) revert ReferrerNotActive();

        // Pre-link the referral (actual recording happens during registration)
        refereeToReferrer[msg.sender] = referrerAddr;
    }

    // ==========================================
    // REWARD CLAIMING
    // ==========================================

    /**
     * @notice Claim pending rewards
     */
    function claimRewards() external nonReentrant {
        Referrer storage referrer = referrers[msg.sender];
        uint256 pending = referrer.pendingEarnings;

        if (pending == 0) revert NoPendingRewards();

        referrer.pendingEarnings = 0;

        usdc.safeTransfer(msg.sender, pending);

        emit RewardsClaimed(msg.sender, pending);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get referrer info
     */
    function getReferrer(address wallet) external view returns (Referrer memory) {
        return referrers[wallet];
    }

    /**
     * @notice Get referrer by code
     */
    function getReferrerByCode(string calldata code) external view returns (Referrer memory) {
        string memory lowerCode = _toLower(code);
        address referrerAddr = codeToReferrer[lowerCode];
        return referrers[referrerAddr];
    }

    /**
     * @notice Check if code is available
     */
    function isCodeAvailable(string calldata code) external view returns (bool) {
        string memory lowerCode = _toLower(code);
        return codeToReferrer[lowerCode] == address(0);
    }

    /**
     * @notice Get total referrals count
     */
    function getTotalReferrals() external view returns (uint256) {
        return referrals.length;
    }

    /**
     * @notice Get referral by index
     */
    function getReferral(uint256 index) external view returns (Referral memory) {
        return referrals[index];
    }

    /**
     * @notice Get pending referral for a user (pre-linked but not yet registered)
     */
    function getPendingReferrer(address user) external view returns (address) {
        if (hasBeenReferred[user]) return address(0);
        return refereeToReferrer[user];
    }
}
