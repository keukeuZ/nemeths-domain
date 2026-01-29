// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {ERC20Votes} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Nonces} from "@openzeppelin/contracts/utils/Nonces.sol";

/**
 * @title NemethsGov
 * @notice Governance token for Nemeths Domain
 * @dev Earned by playing. Used to vote on balance changes between generations.
 */
contract NemethsGov is ERC20, ERC20Permit, ERC20Votes, Ownable {

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Proposal {
        uint256 id;
        string title;
        string description;
        ProposalType proposalType;
        bytes data;             // Encoded proposal data
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        bool cancelled;
        address proposer;
    }

    enum ProposalType {
        RaceBalance,        // Adjust race bonuses/penalties
        UnitBalance,        // Adjust unit stats
        BuildingBalance,    // Adjust building costs/effects
        SpellBalance,       // Adjust spell power/costs
        EconomyBalance,     // Adjust resource rates
        GenerationConfig,   // Adjust generation length, phases
        Custom              // Other changes
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Proposal counter
    uint256 public proposalCount;

    /// @notice All proposals
    mapping(uint256 => Proposal) public proposals;

    /// @notice User votes per proposal
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /// @notice Authorized minters (game contracts)
    mapping(address => bool) public minters;

    /// @notice Minimum tokens to create proposal
    uint256 public proposalThreshold = 100_000 * 1e18; // 100k tokens

    /// @notice Voting period in seconds
    uint256 public votingPeriod = 7 days;

    /// @notice Quorum percentage (basis points, 500 = 5%)
    uint256 public quorumBps = 500;

    /// @notice Max supply cap
    uint256 public constant MAX_SUPPLY = 100_000_000 * 1e18; // 100M tokens

    // ==========================================
    // EVENTS
    // ==========================================

    event TokensMinted(address indexed to, uint256 amount, string reason);
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title);
    event Voted(uint256 indexed proposalId, address indexed voter, bool support, uint256 weight);
    event ProposalExecuted(uint256 indexed proposalId);
    event ProposalCancelled(uint256 indexed proposalId);
    event MinterUpdated(address indexed minter, bool authorized);

    // ==========================================
    // ERRORS
    // ==========================================

    error NotAuthorizedMinter();
    error MaxSupplyExceeded();
    error InsufficientTokensForProposal();
    error ProposalNotActive();
    error AlreadyVoted();
    error VotingNotEnded();
    error ProposalAlreadyExecuted();
    error QuorumNotReached();
    error ProposalNotPassed();
    error ZeroAddress();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyMinter() {
        if (!minters[msg.sender] && msg.sender != owner()) revert NotAuthorizedMinter();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor()
        ERC20("Nemeths Governance", "NGOV")
        ERC20Permit("Nemeths Governance")
        Ownable(msg.sender)
    {
        // Mint initial supply to owner for distribution
        _mint(msg.sender, 10_000_000 * 1e18); // 10M initial
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Set minter authorization
     */
    function setMinter(address minter, bool authorized) external onlyOwner {
        if (minter == address(0)) revert ZeroAddress();
        minters[minter] = authorized;
        emit MinterUpdated(minter, authorized);
    }

    /**
     * @notice Set proposal threshold
     */
    function setProposalThreshold(uint256 _threshold) external onlyOwner {
        proposalThreshold = _threshold;
    }

    /**
     * @notice Set voting period
     */
    function setVotingPeriod(uint256 _period) external onlyOwner {
        votingPeriod = _period;
    }

    /**
     * @notice Set quorum
     */
    function setQuorumBps(uint256 _quorumBps) external onlyOwner {
        require(_quorumBps <= 10000, "Max 100%");
        quorumBps = _quorumBps;
    }

    // ==========================================
    // MINTING (GAME REWARDS)
    // ==========================================

    /**
     * @notice Mint tokens as game rewards
     * @param to Recipient
     * @param amount Amount to mint
     * @param reason Reason for minting (for events)
     */
    function mint(address to, uint256 amount, string calldata reason) external onlyMinter {
        if (totalSupply() + amount > MAX_SUPPLY) revert MaxSupplyExceeded();
        _mint(to, amount);
        emit TokensMinted(to, amount, reason);
    }

    /**
     * @notice Batch mint to multiple recipients
     */
    function batchMint(
        address[] calldata recipients,
        uint256[] calldata amounts,
        string calldata reason
    ) external onlyMinter {
        require(recipients.length == amounts.length, "Length mismatch");

        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }

        if (totalSupply() + totalAmount > MAX_SUPPLY) revert MaxSupplyExceeded();

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] != address(0) && amounts[i] > 0) {
                _mint(recipients[i], amounts[i]);
                emit TokensMinted(recipients[i], amounts[i], reason);
            }
        }
    }

    // ==========================================
    // PROPOSAL CREATION
    // ==========================================

    /**
     * @notice Create a new proposal
     */
    function createProposal(
        string calldata title,
        string calldata description,
        ProposalType proposalType,
        bytes calldata data
    ) external returns (uint256) {
        if (balanceOf(msg.sender) < proposalThreshold) {
            revert InsufficientTokensForProposal();
        }

        proposalCount++;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: title,
            description: description,
            proposalType: proposalType,
            data: data,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + votingPeriod,
            executed: false,
            cancelled: false,
            proposer: msg.sender
        });

        emit ProposalCreated(proposalCount, msg.sender, title);

        return proposalCount;
    }

    /**
     * @notice Cancel a proposal (only proposer or owner)
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];
        require(
            msg.sender == proposal.proposer || msg.sender == owner(),
            "Not authorized"
        );
        require(!proposal.executed, "Already executed");

        proposal.cancelled = true;
        emit ProposalCancelled(proposalId);
    }

    // ==========================================
    // VOTING
    // ==========================================

    /**
     * @notice Cast vote on proposal
     * @param proposalId Proposal to vote on
     * @param support True for yes, false for no
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        if (block.timestamp < proposal.startTime ||
            block.timestamp > proposal.endTime ||
            proposal.cancelled) {
            revert ProposalNotActive();
        }

        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

        uint256 weight = balanceOf(msg.sender);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.forVotes += weight;
        } else {
            proposal.againstVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /**
     * @notice Execute a passed proposal
     * @dev Actual execution is off-chain - this marks as executed and emits event
     */
    function executeProposal(uint256 proposalId) external onlyOwner {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.executed) revert ProposalAlreadyExecuted();
        if (block.timestamp <= proposal.endTime) revert VotingNotEnded();
        if (proposal.cancelled) revert ProposalNotActive();

        // Check quorum
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (totalSupply() * quorumBps) / 10000;
        if (totalVotes < quorum) revert QuorumNotReached();

        // Check passed
        if (proposal.forVotes <= proposal.againstVotes) revert ProposalNotPassed();

        proposal.executed = true;

        emit ProposalExecuted(proposalId);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get proposal details
     */
    function getProposal(uint256 proposalId) external view returns (Proposal memory) {
        return proposals[proposalId];
    }

    /**
     * @notice Check if proposal is active for voting
     */
    function isProposalActive(uint256 proposalId) external view returns (bool) {
        Proposal storage proposal = proposals[proposalId];
        return block.timestamp >= proposal.startTime &&
               block.timestamp <= proposal.endTime &&
               !proposal.cancelled;
    }

    /**
     * @notice Get proposal status
     */
    function getProposalStatus(uint256 proposalId) external view returns (string memory) {
        Proposal storage proposal = proposals[proposalId];

        if (proposal.cancelled) return "Cancelled";
        if (proposal.executed) return "Executed";
        if (block.timestamp < proposal.startTime) return "Pending";
        if (block.timestamp <= proposal.endTime) return "Active";

        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 quorum = (totalSupply() * quorumBps) / 10000;

        if (totalVotes < quorum) return "Failed (No Quorum)";
        if (proposal.forVotes > proposal.againstVotes) return "Passed";
        return "Failed";
    }

    /**
     * @notice Get voting power for an account
     */
    function getVotingPower(address account) external view returns (uint256) {
        return balanceOf(account);
    }

    // ==========================================
    // OVERRIDES FOR ERC20Votes
    // ==========================================

    function _update(address from, address to, uint256 value) internal override(ERC20, ERC20Votes) {
        super._update(from, to, value);
    }

    function nonces(address owner) public view override(ERC20Permit, Nonces) returns (uint256) {
        return super.nonces(owner);
    }
}
