// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title AllianceBanner
 * @notice NFT representing alliance ownership/leadership
 * @dev Minted when alliance is created. Transferable (can sell/transfer alliance leadership).
 */
contract AllianceBanner is ERC721Enumerable, Ownable {
    using Strings for uint256;

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Banner {
        string allianceName;
        string motto;
        uint8 primaryColor;     // 0-11 color index
        uint8 secondaryColor;
        uint8 emblemType;       // 0-9 emblem shapes
        uint256 generationId;
        uint256 createdAt;
        uint256 memberCount;    // Updated by game server
        uint256 victoriesCount; // Alliance war victories
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Banner data per token
    mapping(uint256 => Banner) public banners;

    /// @notice Alliance name to token ID (for uniqueness)
    mapping(string => uint256) public allianceNameToToken;

    /// @notice Authorized minters (game contracts)
    mapping(address => bool) public minters;

    /// @notice Color palette
    string[12] public colors;

    /// @notice Minting fee (in wei)
    uint256 public mintFee;

    /// @notice Treasury
    address public treasury;

    // ==========================================
    // EVENTS
    // ==========================================

    event BannerCreated(
        uint256 indexed tokenId,
        address indexed creator,
        string allianceName,
        uint256 generationId
    );

    event BannerUpdated(uint256 indexed tokenId, uint256 memberCount, uint256 victories);
    event MinterUpdated(address indexed minter, bool authorized);

    // ==========================================
    // ERRORS
    // ==========================================

    error AllianceNameTaken();
    error InvalidName();
    error InvalidColor();
    error InvalidEmblem();
    error NotAuthorizedMinter();
    error InsufficientFee();
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

    constructor(address _treasury) ERC721("Nemeths Alliance Banner", "BANNER") Ownable(msg.sender) {
        treasury = _treasury;
        mintFee = 0.005 ether;

        // Initialize color palette
        colors[0] = "#DC143C";  // Crimson
        colors[1] = "#FFD700";  // Gold
        colors[2] = "#4169E1";  // Royal Blue
        colors[3] = "#228B22";  // Forest Green
        colors[4] = "#9932CC";  // Purple
        colors[5] = "#FF8C00";  // Orange
        colors[6] = "#C0C0C0";  // Silver
        colors[7] = "#1a1a1a";  // Black
        colors[8] = "#F5F5F5";  // White
        colors[9] = "#8B4513";  // Brown
        colors[10] = "#00CED1"; // Cyan
        colors[11] = "#FF69B4"; // Pink
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
     * @notice Set mint fee
     */
    function setMintFee(uint256 _mintFee) external onlyOwner {
        mintFee = _mintFee;
    }

    /**
     * @notice Set treasury
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    /**
     * @notice Withdraw funds
     */
    function withdraw() external onlyOwner {
        payable(treasury).transfer(address(this).balance);
    }

    // ==========================================
    // MINTING
    // ==========================================

    /**
     * @notice Create alliance banner (called by player with ETH)
     */
    function createBanner(
        string calldata allianceName,
        string calldata motto,
        uint8 primaryColor,
        uint8 secondaryColor,
        uint8 emblemType,
        uint256 generationId
    ) external payable returns (uint256) {
        if (msg.value < mintFee) revert InsufficientFee();

        // Refund excess
        if (msg.value > mintFee) {
            payable(msg.sender).transfer(msg.value - mintFee);
        }

        // Send fee to treasury
        payable(treasury).transfer(mintFee);

        return _createBanner(msg.sender, allianceName, motto, primaryColor, secondaryColor, emblemType, generationId);
    }

    /**
     * @notice Create banner via authorized minter (free for game integration)
     */
    function mintBanner(
        address to,
        string calldata allianceName,
        string calldata motto,
        uint8 primaryColor,
        uint8 secondaryColor,
        uint8 emblemType,
        uint256 generationId
    ) external onlyMinter returns (uint256) {
        return _createBanner(to, allianceName, motto, primaryColor, secondaryColor, emblemType, generationId);
    }

    /**
     * @notice Internal create function
     */
    function _createBanner(
        address to,
        string calldata allianceName,
        string calldata motto,
        uint8 primaryColor,
        uint8 secondaryColor,
        uint8 emblemType,
        uint256 generationId
    ) internal returns (uint256) {
        // Validate
        bytes memory nameBytes = bytes(allianceName);
        if (nameBytes.length < 3 || nameBytes.length > 24) revert InvalidName();
        if (allianceNameToToken[allianceName] != 0) revert AllianceNameTaken();
        if (primaryColor >= 12 || secondaryColor >= 12) revert InvalidColor();
        if (emblemType >= 10) revert InvalidEmblem();

        uint256 tokenId = ++_tokenIdCounter; // Start from 1

        banners[tokenId] = Banner({
            allianceName: allianceName,
            motto: motto,
            primaryColor: primaryColor,
            secondaryColor: secondaryColor,
            emblemType: emblemType,
            generationId: generationId,
            createdAt: block.timestamp,
            memberCount: 1,
            victoriesCount: 0
        });

        allianceNameToToken[allianceName] = tokenId;

        _safeMint(to, tokenId);

        emit BannerCreated(tokenId, to, allianceName, generationId);

        return tokenId;
    }

    /**
     * @notice Update banner stats (called by game server)
     */
    function updateStats(uint256 tokenId, uint256 memberCount, uint256 victories) external onlyMinter {
        Banner storage banner = banners[tokenId];
        banner.memberCount = memberCount;
        banner.victoriesCount = victories;

        emit BannerUpdated(tokenId, memberCount, victories);
    }

    // ==========================================
    // METADATA
    // ==========================================

    /**
     * @notice Get emblem SVG path
     */
    function getEmblemPath(uint8 emblemType) public pure returns (string memory) {
        // Simple geometric shapes
        if (emblemType == 0) return "M200,80 L240,160 L200,140 L160,160 Z"; // Arrow up
        if (emblemType == 1) return "M160,100 L240,100 L240,180 L160,180 Z"; // Square
        if (emblemType == 2) return "M200,80 L250,140 L230,200 L170,200 L150,140 Z"; // Pentagon
        if (emblemType == 3) return "M200,80 L220,130 L270,140 L230,180 L240,230 L200,200 L160,230 L170,180 L130,140 L180,130 Z"; // Star
        if (emblemType == 4) return "M200,80 L280,200 L120,200 Z"; // Triangle
        if (emblemType == 5) return "M200,140 m-60,0 a60,60 0 1,0 120,0 a60,60 0 1,0 -120,0"; // Circle
        if (emblemType == 6) return "M140,100 L260,100 L280,140 L280,180 L260,220 L140,220 L120,180 L120,140 Z"; // Hexagon
        if (emblemType == 7) return "M200,80 L240,120 L240,180 L200,220 L160,180 L160,120 Z"; // Diamond
        if (emblemType == 8) return "M150,100 L250,100 L270,140 L250,180 L270,220 L150,220 L130,180 L150,140 Z"; // Shield
        if (emblemType == 9) return "M200,80 L230,110 L280,110 L240,150 L260,200 L200,170 L140,200 L160,150 L120,110 L170,110 Z"; // Crown
        return "";
    }

    /**
     * @notice Generate on-chain SVG
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        Banner memory banner = banners[tokenId];
        string memory primary = colors[banner.primaryColor];
        string memory secondary = colors[banner.secondaryColor];

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">',
            '<defs>',
            '<linearGradient id="bannerGrad" x1="0%" y1="0%" x2="0%" y2="100%">',
            '<stop offset="0%" style="stop-color:', primary, '"/>',
            '<stop offset="100%" style="stop-color:', secondary, '"/>',
            '</linearGradient>',
            '</defs>',
            // Banner shape
            '<path d="M50,0 L350,0 L350,400 L200,450 L50,400 Z" fill="url(#bannerGrad)"/>',
            '<path d="M50,0 L350,0 L350,400 L200,450 L50,400 Z" fill="none" stroke="#FFD700" stroke-width="3"/>',
            // Emblem
            '<path d="', getEmblemPath(banner.emblemType), '" fill="', secondary, '" stroke="', primary, '" stroke-width="2"/>',
            // Text
            '<text x="200" y="280" font-family="serif" font-size="24" fill="#FFF" text-anchor="middle" font-weight="bold">', banner.allianceName, '</text>',
            bytes(banner.motto).length > 0 ? string(abi.encodePacked('<text x="200" y="310" font-family="serif" font-size="12" fill="#DDD" text-anchor="middle" font-style="italic">"', banner.motto, '"</text>')) : '',
            '<text x="200" y="380" font-family="serif" font-size="14" fill="#AAA" text-anchor="middle">', banner.memberCount.toString(), ' Members</text>',
            '</svg>'
        ));
    }

    /**
     * @notice Token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        Banner memory banner = banners[tokenId];
        string memory svg = generateSVG(tokenId);

        string memory json = string(abi.encodePacked(
            '{"name":"', banner.allianceName, ' Banner",',
            '"description":"Alliance banner for ', banner.allianceName, '. ', bytes(banner.motto).length > 0 ? banner.motto : '', '",',
            '"attributes":[',
            '{"trait_type":"Alliance","value":"', banner.allianceName, '"},',
            '{"trait_type":"Generation","value":', banner.generationId.toString(), '},',
            '{"trait_type":"Members","value":', banner.memberCount.toString(), '},',
            '{"trait_type":"Victories","value":', banner.victoriesCount.toString(), '}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get banner data
     */
    function getBanner(uint256 tokenId) external view returns (Banner memory) {
        return banners[tokenId];
    }

    /**
     * @notice Check if alliance name is available
     */
    function isNameAvailable(string calldata name) external view returns (bool) {
        return allianceNameToToken[name] == 0;
    }

    /**
     * @notice Get token ID by alliance name
     */
    function getTokenByName(string calldata name) external view returns (uint256) {
        return allianceNameToToken[name];
    }

    /**
     * @notice Get alliance leader (banner owner)
     */
    function getAllianceLeader(string calldata allianceName) external view returns (address) {
        uint256 tokenId = allianceNameToToken[allianceName];
        if (tokenId == 0) return address(0);
        return ownerOf(tokenId);
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
