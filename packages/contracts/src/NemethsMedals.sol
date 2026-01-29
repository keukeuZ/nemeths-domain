// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title NemethsMedals
 * @notice Soulbound achievement NFTs for Nemeths Domain
 * @dev Minted at end of generation for top performers. Non-transferable (soulbound).
 */
contract NemethsMedals is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // ==========================================
    // ENUMS
    // ==========================================

    enum MedalType {
        Champion,       // 1st place
        RunnerUp,       // 2nd place
        Third,          // 3rd place
        Conqueror,      // Most territories
        Warlord,        // Most kills
        Survivor,       // Longest alive without elimination
        Defender,       // Most successful defenses
        Spellmaster,    // Most spells cast
        Diplomat,       // Largest alliance leader
        Economist       // Highest resource production
    }

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Medal {
        MedalType medalType;
        uint256 generationId;
        uint256 value;          // Score/count associated with achievement
        string playerName;      // Captain name
        uint8 race;
        uint256 mintedAt;
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Medal data per token
    mapping(uint256 => Medal) public medals;

    /// @notice Authorized minters (game contracts)
    mapping(address => bool) public minters;

    /// @notice Base URI for metadata
    string public baseURI;

    /// @notice Medal colors by type (for on-chain SVG)
    mapping(MedalType => string) public medalColors;

    // ==========================================
    // EVENTS
    // ==========================================

    event MedalMinted(
        uint256 indexed tokenId,
        address indexed recipient,
        MedalType medalType,
        uint256 generationId,
        string playerName
    );

    event MinterUpdated(address indexed minter, bool authorized);

    // ==========================================
    // ERRORS
    // ==========================================

    error NotAuthorizedMinter();
    error SoulboundToken();
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

    constructor() ERC721("Nemeths Medals", "MEDAL") Ownable(msg.sender) {
        // Set medal colors for on-chain SVG generation
        medalColors[MedalType.Champion] = "#FFD700";      // Gold
        medalColors[MedalType.RunnerUp] = "#C0C0C0";      // Silver
        medalColors[MedalType.Third] = "#CD7F32";         // Bronze
        medalColors[MedalType.Conqueror] = "#8B0000";     // Dark Red
        medalColors[MedalType.Warlord] = "#DC143C";       // Crimson
        medalColors[MedalType.Survivor] = "#228B22";      // Forest Green
        medalColors[MedalType.Defender] = "#4169E1";      // Royal Blue
        medalColors[MedalType.Spellmaster] = "#9932CC";   // Dark Orchid
        medalColors[MedalType.Diplomat] = "#FF8C00";      // Dark Orange
        medalColors[MedalType.Economist] = "#32CD32";     // Lime Green
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
     * @notice Set base URI for external metadata (optional)
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
    }

    // ==========================================
    // MINTING
    // ==========================================

    /**
     * @notice Mint a medal to a player
     * @param recipient Player address
     * @param medalType Type of medal
     * @param generationId Generation number
     * @param value Achievement value (score, count, etc.)
     * @param playerName Captain name
     * @param race Player's race (0-5)
     */
    function mint(
        address recipient,
        MedalType medalType,
        uint256 generationId,
        uint256 value,
        string calldata playerName,
        uint8 race
    ) external onlyMinter returns (uint256) {
        if (recipient == address(0)) revert ZeroAddress();

        uint256 tokenId = _tokenIdCounter++;

        medals[tokenId] = Medal({
            medalType: medalType,
            generationId: generationId,
            value: value,
            playerName: playerName,
            race: race,
            mintedAt: block.timestamp
        });

        _safeMint(recipient, tokenId);

        emit MedalMinted(tokenId, recipient, medalType, generationId, playerName);

        return tokenId;
    }

    /**
     * @notice Batch mint medals (for end-of-generation ceremony)
     */
    function batchMint(
        address[] calldata recipients,
        MedalType[] calldata medalTypes,
        uint256 generationId,
        uint256[] calldata values,
        string[] calldata playerNames,
        uint8[] calldata races
    ) external onlyMinter returns (uint256[] memory) {
        require(
            recipients.length == medalTypes.length &&
            recipients.length == values.length &&
            recipients.length == playerNames.length &&
            recipients.length == races.length,
            "Array length mismatch"
        );

        uint256[] memory tokenIds = new uint256[](recipients.length);

        for (uint256 i = 0; i < recipients.length; i++) {
            if (recipients[i] == address(0)) continue;

            uint256 tokenId = _tokenIdCounter++;

            medals[tokenId] = Medal({
                medalType: medalTypes[i],
                generationId: generationId,
                value: values[i],
                playerName: playerNames[i],
                race: races[i],
                mintedAt: block.timestamp
            });

            _safeMint(recipients[i], tokenId);
            tokenIds[i] = tokenId;

            emit MedalMinted(tokenId, recipients[i], medalTypes[i], generationId, playerNames[i]);
        }

        return tokenIds;
    }

    // ==========================================
    // SOULBOUND OVERRIDES
    // ==========================================

    /**
     * @notice Prevent transfers (soulbound)
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address) {
        address from = _ownerOf(tokenId);

        // Allow minting (from == address(0)) but prevent transfers
        if (from != address(0) && to != address(0)) {
            revert SoulboundToken();
        }

        return super._update(to, tokenId, auth);
    }

    // ==========================================
    // METADATA
    // ==========================================

    /**
     * @notice Get medal type name
     */
    function getMedalTypeName(MedalType medalType) public pure returns (string memory) {
        if (medalType == MedalType.Champion) return "Champion";
        if (medalType == MedalType.RunnerUp) return "Runner Up";
        if (medalType == MedalType.Third) return "Third Place";
        if (medalType == MedalType.Conqueror) return "Conqueror";
        if (medalType == MedalType.Warlord) return "Warlord";
        if (medalType == MedalType.Survivor) return "Survivor";
        if (medalType == MedalType.Defender) return "Defender";
        if (medalType == MedalType.Spellmaster) return "Spellmaster";
        if (medalType == MedalType.Diplomat) return "Diplomat";
        if (medalType == MedalType.Economist) return "Economist";
        return "Unknown";
    }

    /**
     * @notice Get race name
     */
    function getRaceName(uint8 race) public pure returns (string memory) {
        if (race == 0) return "Ironveld";
        if (race == 1) return "Vaelthir";
        if (race == 2) return "Korrath";
        if (race == 3) return "Sylvaeth";
        if (race == 4) return "Ashborn";
        if (race == 5) return "Breathborn";
        return "Unknown";
    }

    /**
     * @notice Generate on-chain SVG for medal
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        Medal memory medal = medals[tokenId];
        string memory color = medalColors[medal.medalType];
        string memory typeName = getMedalTypeName(medal.medalType);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">',
            '<defs>',
            '<radialGradient id="medalGrad" cx="50%" cy="30%" r="70%">',
            '<stop offset="0%" style="stop-color:', color, ';stop-opacity:1"/>',
            '<stop offset="100%" style="stop-color:#1a1a1a;stop-opacity:1"/>',
            '</radialGradient>',
            '</defs>',
            '<rect width="400" height="400" fill="#0D0A07"/>',
            '<circle cx="200" cy="180" r="120" fill="url(#medalGrad)" stroke="', color, '" stroke-width="4"/>',
            '<circle cx="200" cy="180" r="100" fill="none" stroke="', color, '" stroke-width="2" opacity="0.5"/>',
            '<text x="200" y="175" font-family="serif" font-size="20" fill="white" text-anchor="middle">', typeName, '</text>',
            '<text x="200" y="200" font-family="serif" font-size="14" fill="#888" text-anchor="middle">Generation #', medal.generationId.toString(), '</text>',
            '<text x="200" y="340" font-family="serif" font-size="18" fill="', color, '" text-anchor="middle">', medal.playerName, '</text>',
            '<text x="200" y="365" font-family="serif" font-size="12" fill="#666" text-anchor="middle">', getRaceName(medal.race), '</text>',
            '<polygon points="200,50 210,80 240,80 215,100 225,130 200,110 175,130 185,100 160,80 190,80" fill="', color, '"/>',
            '</svg>'
        ));
    }

    /**
     * @notice Token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        Medal memory medal = medals[tokenId];
        string memory typeName = getMedalTypeName(medal.medalType);
        string memory svg = generateSVG(tokenId);

        string memory json = string(abi.encodePacked(
            '{"name":"', typeName, ' - Gen #', medal.generationId.toString(), '",',
            '"description":"Nemeths Domain achievement medal awarded to ', medal.playerName, ' for ', typeName, ' in Generation #', medal.generationId.toString(), '.",',
            '"attributes":[',
            '{"trait_type":"Medal Type","value":"', typeName, '"},',
            '{"trait_type":"Generation","value":', medal.generationId.toString(), '},',
            '{"trait_type":"Race","value":"', getRaceName(medal.race), '"},',
            '{"trait_type":"Achievement Value","value":', medal.value.toString(), '},',
            '{"trait_type":"Soulbound","value":"Yes"}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get medal data
     */
    function getMedal(uint256 tokenId) external view returns (Medal memory) {
        return medals[tokenId];
    }

    /**
     * @notice Get all medals for a player
     */
    function getPlayerMedals(address player) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(player);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(player, i);
        }

        return tokenIds;
    }

    /**
     * @notice Get total medals minted
     */
    function totalMedals() external view returns (uint256) {
        return _tokenIdCounter;
    }
}
