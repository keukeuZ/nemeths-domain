// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/**
 * @title NemethsSeasonPass
 * @notice Season pass NFTs for special access and cosmetics
 * @dev Purchasable with ETH or USDC. Transferable. Grants access to special generations.
 */
contract NemethsSeasonPass is ERC721Enumerable, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Strings for uint256;

    // ==========================================
    // ENUMS
    // ==========================================

    enum PassTier {
        Bronze,     // Basic cosmetics
        Silver,     // + Priority queue
        Gold,       // + Exclusive generations
        Titan       // + All benefits + founder badge
    }

    // ==========================================
    // STRUCTS
    // ==========================================

    struct SeasonPass {
        PassTier tier;
        uint256 seasonNumber;
        uint256 purchasedAt;
        bool isFounder;         // True for early supporters
    }

    struct Season {
        uint256 seasonNumber;
        uint256 startTime;
        uint256 endTime;
        uint256 bronzePrice;    // In USDC (6 decimals)
        uint256 silverPrice;
        uint256 goldPrice;
        uint256 titanPrice;
        bool active;
    }

    // ==========================================
    // STATE
    // ==========================================

    /// @notice Token ID counter
    uint256 private _tokenIdCounter;

    /// @notice Current season number
    uint256 public currentSeason;

    /// @notice Season data
    mapping(uint256 => Season) public seasons;

    /// @notice Pass data per token
    mapping(uint256 => SeasonPass) public passes;

    /// @notice USDC token
    IERC20 public immutable usdc;

    /// @notice Treasury address
    address public treasury;

    /// @notice Base URI for metadata
    string public baseURI;

    /// @notice ETH prices (alternative to USDC)
    mapping(PassTier => uint256) public ethPrices;

    // ==========================================
    // EVENTS
    // ==========================================

    event SeasonStarted(uint256 indexed seasonNumber, uint256 startTime, uint256 endTime);
    event PassPurchased(uint256 indexed tokenId, address indexed buyer, PassTier tier, uint256 seasonNumber);
    event SeasonEnded(uint256 indexed seasonNumber);

    // ==========================================
    // ERRORS
    // ==========================================

    error SeasonNotActive();
    error InvalidTier();
    error InsufficientPayment();
    error ZeroAddress();
    error SeasonAlreadyActive();

    // ==========================================
    // CONSTRUCTOR
    // ==========================================

    constructor(address _usdc, address _treasury) ERC721("Nemeths Season Pass", "NPASS") Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        treasury = _treasury;

        // Default ETH prices (can be updated)
        ethPrices[PassTier.Bronze] = 0.01 ether;
        ethPrices[PassTier.Silver] = 0.03 ether;
        ethPrices[PassTier.Gold] = 0.08 ether;
        ethPrices[PassTier.Titan] = 0.2 ether;
    }

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    /**
     * @notice Start a new season
     */
    function startSeason(
        uint256 durationDays,
        uint256 bronceUSDC,
        uint256 silverUSDC,
        uint256 goldUSDC,
        uint256 titanUSDC
    ) external onlyOwner {
        if (currentSeason > 0 && seasons[currentSeason].active) {
            revert SeasonAlreadyActive();
        }

        currentSeason++;

        seasons[currentSeason] = Season({
            seasonNumber: currentSeason,
            startTime: block.timestamp,
            endTime: block.timestamp + (durationDays * 1 days),
            bronzePrice: bronceUSDC,
            silverPrice: silverUSDC,
            goldPrice: goldUSDC,
            titanPrice: titanUSDC,
            active: true
        });

        emit SeasonStarted(currentSeason, block.timestamp, block.timestamp + (durationDays * 1 days));
    }

    /**
     * @notice End current season
     */
    function endSeason() external onlyOwner {
        if (!seasons[currentSeason].active) revert SeasonNotActive();

        seasons[currentSeason].active = false;
        seasons[currentSeason].endTime = block.timestamp;

        emit SeasonEnded(currentSeason);
    }

    /**
     * @notice Set ETH prices
     */
    function setEthPrices(
        uint256 bronze,
        uint256 silver,
        uint256 gold,
        uint256 titan
    ) external onlyOwner {
        ethPrices[PassTier.Bronze] = bronze;
        ethPrices[PassTier.Silver] = silver;
        ethPrices[PassTier.Gold] = gold;
        ethPrices[PassTier.Titan] = titan;
    }

    /**
     * @notice Set treasury
     */
    function setTreasury(address _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }

    /**
     * @notice Set base URI
     */
    function setBaseURI(string calldata newBaseURI) external onlyOwner {
        baseURI = newBaseURI;
    }

    /**
     * @notice Withdraw ETH to treasury
     */
    function withdrawETH() external onlyOwner {
        payable(treasury).transfer(address(this).balance);
    }

    /**
     * @notice Withdraw USDC to treasury
     */
    function withdrawUSDC() external onlyOwner {
        uint256 balance = usdc.balanceOf(address(this));
        if (balance > 0) {
            usdc.safeTransfer(treasury, balance);
        }
    }

    // ==========================================
    // PURCHASE FUNCTIONS
    // ==========================================

    /**
     * @notice Purchase pass with USDC
     */
    function purchaseWithUSDC(PassTier tier) external nonReentrant returns (uint256) {
        if (!seasons[currentSeason].active) revert SeasonNotActive();

        uint256 price = _getUSDCPrice(tier);
        usdc.safeTransferFrom(msg.sender, treasury, price);

        return _mintPass(msg.sender, tier);
    }

    /**
     * @notice Purchase pass with ETH
     */
    function purchaseWithETH(PassTier tier) external payable nonReentrant returns (uint256) {
        if (!seasons[currentSeason].active) revert SeasonNotActive();

        uint256 price = ethPrices[tier];
        if (msg.value < price) revert InsufficientPayment();

        // Refund excess
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        // Send to treasury
        payable(treasury).transfer(price);

        return _mintPass(msg.sender, tier);
    }

    /**
     * @notice Internal mint function
     */
    function _mintPass(address to, PassTier tier) internal returns (uint256) {
        uint256 tokenId = _tokenIdCounter++;

        passes[tokenId] = SeasonPass({
            tier: tier,
            seasonNumber: currentSeason,
            purchasedAt: block.timestamp,
            isFounder: currentSeason == 1 // First season buyers are founders
        });

        _safeMint(to, tokenId);

        emit PassPurchased(tokenId, to, tier, currentSeason);

        return tokenId;
    }

    /**
     * @notice Get USDC price for tier
     */
    function _getUSDCPrice(PassTier tier) internal view returns (uint256) {
        Season storage season = seasons[currentSeason];
        if (tier == PassTier.Bronze) return season.bronzePrice;
        if (tier == PassTier.Silver) return season.silverPrice;
        if (tier == PassTier.Gold) return season.goldPrice;
        if (tier == PassTier.Titan) return season.titanPrice;
        revert InvalidTier();
    }

    // ==========================================
    // METADATA
    // ==========================================

    /**
     * @notice Get tier name
     */
    function getTierName(PassTier tier) public pure returns (string memory) {
        if (tier == PassTier.Bronze) return "Bronze";
        if (tier == PassTier.Silver) return "Silver";
        if (tier == PassTier.Gold) return "Gold";
        if (tier == PassTier.Titan) return "Titan";
        return "Unknown";
    }

    /**
     * @notice Get tier color
     */
    function getTierColor(PassTier tier) public pure returns (string memory) {
        if (tier == PassTier.Bronze) return "#CD7F32";
        if (tier == PassTier.Silver) return "#C0C0C0";
        if (tier == PassTier.Gold) return "#FFD700";
        if (tier == PassTier.Titan) return "#E5E4E2";
        return "#888888";
    }

    /**
     * @notice Generate on-chain SVG
     */
    function generateSVG(uint256 tokenId) public view returns (string memory) {
        SeasonPass memory pass = passes[tokenId];
        string memory tierName = getTierName(pass.tier);
        string memory color = getTierColor(pass.tier);

        return string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">',
            '<defs>',
            '<linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">',
            '<stop offset="0%" style="stop-color:#1a1510"/>',
            '<stop offset="100%" style="stop-color:#0D0A07"/>',
            '</linearGradient>',
            '</defs>',
            '<rect width="400" height="250" rx="20" fill="url(#cardGrad)"/>',
            '<rect x="10" y="10" width="380" height="230" rx="15" fill="none" stroke="', color, '" stroke-width="2"/>',
            '<text x="30" y="50" font-family="serif" font-size="24" fill="', color, '">SEASON PASS</text>',
            '<text x="30" y="80" font-family="serif" font-size="14" fill="#888">Season #', pass.seasonNumber.toString(), '</text>',
            '<text x="200" y="150" font-family="serif" font-size="36" fill="', color, '" text-anchor="middle">', tierName, '</text>',
            pass.isFounder ? '<text x="200" y="180" font-family="serif" font-size="12" fill="#FFD700" text-anchor="middle">FOUNDER</text>' : '',
            '<text x="370" y="230" font-family="serif" font-size="10" fill="#444" text-anchor="end">#', tokenId.toString(), '</text>',
            '</svg>'
        ));
    }

    /**
     * @notice Token URI with on-chain metadata
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);

        SeasonPass memory pass = passes[tokenId];
        string memory tierName = getTierName(pass.tier);
        string memory svg = generateSVG(tokenId);

        string memory json = string(abi.encodePacked(
            '{"name":"', tierName, ' Season Pass - S', pass.seasonNumber.toString(), '",',
            '"description":"Nemeths Domain Season ', pass.seasonNumber.toString(), ' ', tierName, ' Pass. ',
            pass.isFounder ? 'Founder Edition.' : '', '",',
            '"attributes":[',
            '{"trait_type":"Tier","value":"', tierName, '"},',
            '{"trait_type":"Season","value":', pass.seasonNumber.toString(), '},',
            '{"trait_type":"Founder","value":"', pass.isFounder ? 'Yes' : 'No', '"}',
            '],',
            '"image":"data:image/svg+xml;base64,', Base64.encode(bytes(svg)), '"}'
        ));

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    /**
     * @notice Get pass data
     */
    function getPass(uint256 tokenId) external view returns (SeasonPass memory) {
        return passes[tokenId];
    }

    /**
     * @notice Get current season info
     */
    function getCurrentSeason() external view returns (Season memory) {
        return seasons[currentSeason];
    }

    /**
     * @notice Check if player has pass for current season
     */
    function hasCurrentSeasonPass(address player) external view returns (bool) {
        uint256 balance = balanceOf(player);
        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(player, i);
            if (passes[tokenId].seasonNumber == currentSeason) {
                return true;
            }
        }
        return false;
    }

    /**
     * @notice Get player's highest tier pass for current season
     */
    function getPlayerTier(address player) external view returns (PassTier) {
        uint256 balance = balanceOf(player);
        PassTier highest = PassTier.Bronze;
        bool hasPass = false;

        for (uint256 i = 0; i < balance; i++) {
            uint256 tokenId = tokenOfOwnerByIndex(player, i);
            SeasonPass memory pass = passes[tokenId];
            if (pass.seasonNumber == currentSeason) {
                hasPass = true;
                if (uint8(pass.tier) > uint8(highest)) {
                    highest = pass.tier;
                }
            }
        }

        require(hasPass, "No pass for current season");
        return highest;
    }

    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
