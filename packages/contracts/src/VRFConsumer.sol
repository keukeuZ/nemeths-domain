// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

interface ICombatSystem {
    function fulfillRandomness(uint256 requestId, uint256 randomness) external;
}

/**
 * @title VRFConsumer
 * @notice Chainlink VRF v2.5 consumer for Nemeths Domain combat randomness
 * @dev Provides verifiable random D20 rolls for fair combat resolution
 */
contract VRFConsumer is VRFConsumerBaseV2Plus {
    // ==========================================
    // STATE
    // ==========================================

    /// @notice Combat system contract
    ICombatSystem public combatSystem;

    /// @notice VRF subscription ID
    uint256 public subscriptionId;

    /// @notice Key hash for gas lane
    bytes32 public keyHash;

    /// @notice Request confirmations
    uint16 public requestConfirmations = 3;

    /// @notice Callback gas limit
    uint32 public callbackGasLimit = 100000;

    /// @notice Number of random words per request
    uint32 public numWords = 1;

    /// @notice Pending requests
    mapping(uint256 => bool) public pendingRequests;

    /// @notice Request to combat ID (stored by combat system)
    mapping(uint256 => address) public requestToRequester;

    // ==========================================
    // EVENTS
    // ==========================================

    event RandomnessRequested(uint256 indexed requestId, address indexed requester);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 randomness);

    // ==========================================
    // ERRORS
    // ==========================================

    error OnlyCombatSystem();
    error RequestNotFound();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyCombatSystem() {
        if (msg.sender != address(combatSystem)) revert OnlyCombatSystem();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    /**
     * @param _vrfCoordinator VRF Coordinator address
     * @param _subscriptionId VRF subscription ID
     * @param _keyHash Gas lane key hash
     *
     * Base Sepolia:
     * - Coordinator: 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE
     * - Key Hash: 0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899
     *
     * Base Mainnet:
     * - Coordinator: 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
     * - Key Hash: 0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70
     */
    constructor(
        address _vrfCoordinator,
        uint256 _subscriptionId,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(_vrfCoordinator) {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Set combat system contract
     */
    function setCombatSystem(address _combatSystem) external onlyOwner {
        combatSystem = ICombatSystem(_combatSystem);
    }

    /**
     * @notice Update VRF configuration
     */
    function setVRFConfig(
        uint256 _subscriptionId,
        bytes32 _keyHash,
        uint16 _requestConfirmations,
        uint32 _callbackGasLimit
    ) external onlyOwner {
        subscriptionId = _subscriptionId;
        keyHash = _keyHash;
        requestConfirmations = _requestConfirmations;
        callbackGasLimit = _callbackGasLimit;
    }

    // ==========================================
    // VRF FUNCTIONS
    // ==========================================

    /**
     * @notice Request random words for combat
     * @return requestId The VRF request ID
     */
    function requestRandomWords() external onlyCombatSystem returns (uint256) {
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subscriptionId,
                requestConfirmations: requestConfirmations,
                callbackGasLimit: callbackGasLimit,
                numWords: numWords,
                extraArgs: VRFV2PlusClient._argsToBytes(
                    VRFV2PlusClient.ExtraArgsV1({nativePayment: false})
                )
            })
        );

        pendingRequests[requestId] = true;
        requestToRequester[requestId] = msg.sender;

        emit RandomnessRequested(requestId, msg.sender);

        return requestId;
    }

    /**
     * @notice Callback from VRF Coordinator
     */
    function fulfillRandomWords(
        uint256 requestId,
        uint256[] calldata randomWords
    ) internal override {
        if (!pendingRequests[requestId]) revert RequestNotFound();

        pendingRequests[requestId] = false;

        uint256 randomness = randomWords[0];

        emit RandomnessFulfilled(requestId, randomness);

        // Forward to combat system
        combatSystem.fulfillRandomness(requestId, randomness);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Check if request is pending
     */
    function isRequestPending(uint256 requestId) external view returns (bool) {
        return pendingRequests[requestId];
    }
}
