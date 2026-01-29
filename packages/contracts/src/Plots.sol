// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title Plots
 * @notice ERC-721 contract for Nemeths Domain territory plots
 * @dev Each plot is an NFT with coordinates (x, y) on the 100x100 grid
 */
contract Plots is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // ==========================================
    // STRUCTS
    // ==========================================

    struct PlotData {
        uint8 x;
        uint8 y;
        uint8 zone; // 0: outer, 1: middle, 2: inner, 3: heart
        uint8 terrain; // 0: plains, 1: forest, 2: mountain, 3: river, 4: ruins, 5: corruption
        uint256 generationId;
        bool isForsaken;
    }

    // ==========================================
    // CONSTANTS
    // ==========================================

    /// @notice Map size (100x100)
    uint8 public constant MAP_SIZE = 100;

    /// @notice Total plots
    uint256 public constant TOTAL_PLOTS = 10000;

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Generation contract address
    address public generationContract;

    /// @notice Combat system contract address
    address public combatContract;

    /// @notice Plot data by token ID
    mapping(uint256 => PlotData) public plots;

    /// @notice Coordinate to token ID mapping: generationId => x => y => tokenId
    mapping(uint256 => mapping(uint8 => mapping(uint8 => uint256))) public coordToTokenId;

    /// @notice Current generation for minting
    uint256 public currentGenerationId;

    /// @notice Base URI for metadata
    string public baseURI;

    /// @notice Next token ID
    uint256 private _nextTokenId;

    /// @notice Tracks if a generation has ended (plots become historical/non-transferable)
    mapping(uint256 => bool) public generationEnded;

    // ==========================================
    // EVENTS
    // ==========================================

    event PlotMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint8 x,
        uint8 y,
        uint8 zone,
        uint8 terrain,
        uint256 generationId
    );

    event PlotTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        uint8 x,
        uint8 y
    );

    event PlotConquered(
        uint256 indexed tokenId,
        address indexed previousOwner,
        address indexed newOwner
    );

    event PlotBecameForsaken(uint256 indexed tokenId);
    event PlotClearedForsaken(uint256 indexed tokenId, address indexed claimer);
    event GenerationEnded(uint256 indexed generationId);
    event NewGenerationStarted(uint256 indexed generationId);

    // ==========================================
    // ERRORS
    // ==========================================

    error OnlyGenerationContract();
    error OnlyCombatContract();
    error InvalidCoordinates();
    error PlotAlreadyMinted();
    error PlotNotForsaken();
    error PlotIsForsaken();
    error NotPlotOwner();
    error PlotFromOldGeneration();
    error GenerationAlreadyEnded();
    error TransferDisabledForOldGeneration();
    error ZeroAddress();

    // ==========================================
    // MODIFIERS
    // ==========================================

    modifier onlyGenerationContract() {
        if (msg.sender != generationContract) revert OnlyGenerationContract();
        _;
    }

    modifier onlyCombatContract() {
        if (msg.sender != combatContract) revert OnlyCombatContract();
        _;
    }

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor() ERC721("Nemeths Domain Plots", "PLOT") Ownable(msg.sender) {
        _nextTokenId = 1; // Start at 1
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Set generation contract address
     */
    function setGenerationContract(address _generationContract) external onlyOwner {
        if (_generationContract == address(0)) revert ZeroAddress();
        generationContract = _generationContract;
    }

    /**
     * @notice Set combat contract address
     */
    function setCombatContract(address _combatContract) external onlyOwner {
        if (_combatContract == address(0)) revert ZeroAddress();
        combatContract = _combatContract;
    }

    /**
     * @notice Set base URI for metadata
     */
    function setBaseURI(string calldata _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    /**
     * @notice End current generation (plots become non-transferable historical records)
     */
    function endGeneration(uint256 generationId) external onlyGenerationContract {
        if (generationEnded[generationId]) revert GenerationAlreadyEnded();
        generationEnded[generationId] = true;
        emit GenerationEnded(generationId);
    }

    /**
     * @notice Start new generation (called when new generation starts)
     * @dev Previous generation plots remain as historical records but can't be used
     */
    function startNewGeneration(uint256 generationId) external onlyGenerationContract {
        // End previous generation if not already ended
        if (currentGenerationId > 0 && !generationEnded[currentGenerationId]) {
            generationEnded[currentGenerationId] = true;
            emit GenerationEnded(currentGenerationId);
        }

        currentGenerationId = generationId;
        emit NewGenerationStarted(generationId);
    }

    /**
     * @notice Check if a plot is from the current active generation
     */
    function isActiveGenerationPlot(uint256 tokenId) public view returns (bool) {
        PlotData storage plot = plots[tokenId];
        return plot.generationId == currentGenerationId && !generationEnded[currentGenerationId];
    }

    // ==========================================
    // MINTING
    // ==========================================

    /**
     * @notice Mint a plot to a player (called by generation contract)
     * @param to Player address
     * @param x X coordinate (0-99)
     * @param y Y coordinate (0-99)
     * @param zone Zone (0-3)
     * @param terrain Terrain type (0-5)
     */
    function mintPlot(
        address to,
        uint8 x,
        uint8 y,
        uint8 zone,
        uint8 terrain
    ) external onlyGenerationContract returns (uint256) {
        if (x >= MAP_SIZE || y >= MAP_SIZE) revert InvalidCoordinates();

        // Check if already minted for this generation
        if (coordToTokenId[currentGenerationId][x][y] != 0) {
            revert PlotAlreadyMinted();
        }

        uint256 tokenId = _nextTokenId++;

        // Store plot data
        plots[tokenId] = PlotData({
            x: x,
            y: y,
            zone: zone,
            terrain: terrain,
            generationId: currentGenerationId,
            isForsaken: false
        });

        // Map coordinates to token
        coordToTokenId[currentGenerationId][x][y] = tokenId;

        // Mint NFT
        _safeMint(to, tokenId);

        emit PlotMinted(tokenId, to, x, y, zone, terrain, currentGenerationId);

        return tokenId;
    }

    /**
     * @notice Batch mint plots (for efficiency)
     */
    function batchMintPlots(
        address to,
        uint8[] calldata xCoords,
        uint8[] calldata yCoords,
        uint8[] calldata zones,
        uint8[] calldata terrains
    ) external onlyGenerationContract returns (uint256[] memory) {
        require(
            xCoords.length == yCoords.length &&
                yCoords.length == zones.length &&
                zones.length == terrains.length,
            "Array length mismatch"
        );

        uint256[] memory tokenIds = new uint256[](xCoords.length);

        for (uint256 i = 0; i < xCoords.length; i++) {
            if (xCoords[i] >= MAP_SIZE || yCoords[i] >= MAP_SIZE) revert InvalidCoordinates();
            if (coordToTokenId[currentGenerationId][xCoords[i]][yCoords[i]] != 0) {
                revert PlotAlreadyMinted();
            }

            uint256 tokenId = _nextTokenId++;

            plots[tokenId] = PlotData({
                x: xCoords[i],
                y: yCoords[i],
                zone: zones[i],
                terrain: terrains[i],
                generationId: currentGenerationId,
                isForsaken: false
            });

            coordToTokenId[currentGenerationId][xCoords[i]][yCoords[i]] = tokenId;
            _safeMint(to, tokenId);

            tokenIds[i] = tokenId;

            emit PlotMinted(tokenId, to, xCoords[i], yCoords[i], zones[i], terrains[i], currentGenerationId);
        }

        return tokenIds;
    }

    // ==========================================
    // COMBAT FUNCTIONS
    // ==========================================

    /**
     * @notice Transfer plot ownership after combat (called by combat contract)
     * @param tokenId Plot token ID
     * @param newOwner New owner address
     */
    function conquerPlot(uint256 tokenId, address newOwner) external onlyCombatContract {
        if (newOwner == address(0)) revert ZeroAddress();

        address previousOwner = ownerOf(tokenId);

        PlotData storage plot = plots[tokenId];
        if (plot.isForsaken) revert PlotIsForsaken();

        // Force transfer
        _transfer(previousOwner, newOwner, tokenId);

        emit PlotConquered(tokenId, previousOwner, newOwner);
    }

    /**
     * @notice Mark plot as Forsaken (NPC controlled)
     */
    function markForsaken(uint256 tokenId) external onlyGenerationContract {
        PlotData storage plot = plots[tokenId];
        plot.isForsaken = true;

        // Burn the NFT or transfer to zero address equivalent
        // Keep the NFT but mark as Forsaken - owner retains technical ownership
        // but cannot use the plot until cleared

        emit PlotBecameForsaken(tokenId);
    }

    /**
     * @notice Clear Forsaken status and transfer to new owner
     */
    function clearForsaken(uint256 tokenId, address claimer) external onlyCombatContract {
        if (claimer == address(0)) revert ZeroAddress();

        PlotData storage plot = plots[tokenId];
        if (!plot.isForsaken) revert PlotNotForsaken();

        plot.isForsaken = false;

        address currentOwner = ownerOf(tokenId);
        if (currentOwner != claimer) {
            _transfer(currentOwner, claimer, tokenId);
        }

        emit PlotClearedForsaken(tokenId, claimer);
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get plot data
     */
    function getPlot(uint256 tokenId) external view returns (PlotData memory) {
        return plots[tokenId];
    }

    /**
     * @notice Get token ID by coordinates
     */
    function getTokenIdByCoords(uint256 generationId, uint8 x, uint8 y) external view returns (uint256) {
        return coordToTokenId[generationId][x][y];
    }

    /**
     * @notice Check if coordinates are minted
     */
    function isMinted(uint256 generationId, uint8 x, uint8 y) external view returns (bool) {
        return coordToTokenId[generationId][x][y] != 0;
    }

    /**
     * @notice Get zone name
     */
    function getZoneName(uint8 zone) external pure returns (string memory) {
        if (zone == 0) return "Outer";
        if (zone == 1) return "Middle";
        if (zone == 2) return "Inner";
        if (zone == 3) return "Heart";
        return "Unknown";
    }

    /**
     * @notice Get terrain name
     */
    function getTerrainName(uint8 terrain) external pure returns (string memory) {
        if (terrain == 0) return "Plains";
        if (terrain == 1) return "Forest";
        if (terrain == 2) return "Mountain";
        if (terrain == 3) return "River";
        if (terrain == 4) return "Ruins";
        if (terrain == 5) return "Corruption";
        return "Unknown";
    }

    /**
     * @notice Get all plots owned by address in current generation
     */
    function getPlayerPlots(address player) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(player);
        uint256[] memory result = new uint256[](balance);

        uint256 count = 0;
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(player, i);
            if (plots[tokenId].generationId == currentGenerationId) {
                result[count] = tokenId;
                count++;
            }
        }

        // Resize array
        assembly {
            mstore(result, count)
        }

        return result;
    }

    /**
     * @notice Get plot count for player in current generation
     */
    function getPlayerPlotCount(address player) external view returns (uint256) {
        uint256 balance = balanceOf(player);
        uint256 count = 0;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(player, i);
            if (plots[tokenId].generationId == currentGenerationId) {
                count++;
            }
        }

        return count;
    }

    // ==========================================
    // METADATA
    // ==========================================

    /**
     * @notice Get token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        PlotData storage plot = plots[tokenId];

        if (bytes(baseURI).length > 0) {
            return string(
                abi.encodePacked(
                    baseURI,
                    tokenId.toString(),
                    "?x=",
                    uint256(plot.x).toString(),
                    "&y=",
                    uint256(plot.y).toString(),
                    "&zone=",
                    uint256(plot.zone).toString(),
                    "&terrain=",
                    uint256(plot.terrain).toString()
                )
            );
        }

        // Return on-chain metadata if no base URI
        return string(
            abi.encodePacked(
                '{"name":"Plot (',
                uint256(plot.x).toString(),
                ",",
                uint256(plot.y).toString(),
                ')","description":"Nemeths Domain Territory Plot","attributes":[{"trait_type":"X","value":',
                uint256(plot.x).toString(),
                '},{"trait_type":"Y","value":',
                uint256(plot.y).toString(),
                '},{"trait_type":"Zone","value":"',
                this.getZoneName(plot.zone),
                '"},{"trait_type":"Terrain","value":"',
                this.getTerrainName(plot.terrain),
                '"},{"trait_type":"Forsaken","value":',
                plot.isForsaken ? "true" : "false",
                "}]}"
            )
        );
    }

    // ==========================================
    // OVERRIDES
    // ==========================================

    /**
     * @notice Override transfer to:
     * 1. Prevent transfers of old generation plots (they're historical records)
     * 2. Emit custom transfer event
     *
     * Note: Plots from ended generations become soulbound historical NFTs.
     * They prove participation but can't be used in new games.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = super._update(to, tokenId, auth);

        // If this is a transfer (not mint/burn), check generation
        if (from != address(0) && to != address(0)) {
            PlotData storage plot = plots[tokenId];

            // Block transfers for plots from ended generations
            // Exception: combat contract can still transfer during resolution
            if (generationEnded[plot.generationId] && msg.sender != combatContract) {
                revert TransferDisabledForOldGeneration();
            }

            emit PlotTransferred(tokenId, from, to, plot.x, plot.y);
        }

        return from;
    }

    /**
     * @notice Check if plot can be used in gameplay (current generation only)
     */
    function canUseInGameplay(uint256 tokenId) external view returns (bool) {
        PlotData storage plot = plots[tokenId];
        return plot.generationId == currentGenerationId &&
               !generationEnded[currentGenerationId] &&
               !plot.isForsaken;
    }
}
