// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/NemethsGeneration.sol";
import "../src/TitansWitness.sol";
import "../src/Plots.sol";
import "../src/CombatSystem.sol";
import "../src/VRFConsumer.sol";
import "../src/NemethsMedals.sol";
import "../src/NemethsSeasonPass.sol";
import "../src/AllianceBanner.sol";
import "../src/ReferralRegistry.sol";
import "../src/NemethsGov.sol";

/**
 * @title DeployScript
 * @notice Deploys all Nemeths Domain contracts to Base network
 *
 * Usage:
 *   # Deploy to Base Sepolia (testnet)
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url base_sepolia --broadcast --verify
 *
 *   # Deploy to Base Mainnet
 *   forge script script/Deploy.s.sol:DeployScript --rpc-url base --broadcast --verify
 *
 * Required Environment Variables:
 *   PRIVATE_KEY - Deployer private key
 *   BASESCAN_API_KEY - For verification
 *   TREASURY_ADDRESS - Treasury for fee collection
 *   VRF_SUBSCRIPTION_ID - Chainlink VRF subscription ID
 */
contract DeployScript is Script {
    // Base Sepolia addresses
    address constant BASE_SEPOLIA_USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant BASE_SEPOLIA_VRF_COORDINATOR = 0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE;
    bytes32 constant BASE_SEPOLIA_VRF_KEYHASH = 0x816bedba8a50b294e5cbd47842baf240c2385f2eaf719edbd4f250a137a8c899;

    // Base Mainnet addresses
    address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant BASE_MAINNET_VRF_COORDINATOR = 0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634;
    bytes32 constant BASE_MAINNET_VRF_KEYHASH = 0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70;

    // Core contracts
    NemethsGeneration public generation;
    TitansWitness public witness;
    Plots public plots;
    CombatSystem public combat;
    VRFConsumer public vrf;

    // New feature contracts
    NemethsMedals public medals;
    NemethsSeasonPass public seasonPass;
    AllianceBanner public allianceBanner;
    ReferralRegistry public referralRegistry;
    NemethsGov public govToken;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        uint256 vrfSubscriptionId = vm.envUint("VRF_SUBSCRIPTION_ID");

        // Detect network
        bool isMainnet = block.chainid == 8453; // Base Mainnet
        bool isSepolia = block.chainid == 84532; // Base Sepolia

        require(isMainnet || isSepolia, "Unsupported network");

        address usdc = isMainnet ? BASE_MAINNET_USDC : BASE_SEPOLIA_USDC;
        address vrfCoordinator = isMainnet ? BASE_MAINNET_VRF_COORDINATOR : BASE_SEPOLIA_VRF_COORDINATOR;
        bytes32 vrfKeyHash = isMainnet ? BASE_MAINNET_VRF_KEYHASH : BASE_SEPOLIA_VRF_KEYHASH;

        console.log("=== NEMETHS DOMAIN FULL DEPLOYMENT ===");
        console.log("Network:", isMainnet ? "Base Mainnet" : "Base Sepolia");
        console.log("Treasury:", treasury);
        console.log("USDC:", usdc);
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // ==========================================
        // CORE CONTRACTS
        // ==========================================
        console.log("--- Deploying Core Contracts ---");

        // 1. Deploy TitansWitness (eternal leaderboard)
        witness = new TitansWitness();
        console.log("TitansWitness:", address(witness));

        // 2. Deploy NemethsGeneration (game manager)
        generation = new NemethsGeneration(usdc, treasury);
        console.log("NemethsGeneration:", address(generation));

        // 3. Deploy Plots (territory NFTs)
        plots = new Plots();
        console.log("Plots:", address(plots));

        // 4. Deploy VRFConsumer (randomness)
        vrf = new VRFConsumer(vrfCoordinator, vrfSubscriptionId, vrfKeyHash);
        console.log("VRFConsumer:", address(vrf));

        // 5. Deploy CombatSystem
        combat = new CombatSystem(address(plots));
        console.log("CombatSystem:", address(combat));

        // ==========================================
        // FEATURE CONTRACTS
        // ==========================================
        console.log("");
        console.log("--- Deploying Feature Contracts ---");

        // 6. Deploy NemethsMedals (achievement NFTs)
        medals = new NemethsMedals();
        console.log("NemethsMedals:", address(medals));

        // 7. Deploy NemethsSeasonPass (season passes)
        seasonPass = new NemethsSeasonPass(usdc, treasury);
        console.log("NemethsSeasonPass:", address(seasonPass));

        // 8. Deploy AllianceBanner (alliance NFTs)
        allianceBanner = new AllianceBanner(treasury);
        console.log("AllianceBanner:", address(allianceBanner));

        // 9. Deploy ReferralRegistry
        referralRegistry = new ReferralRegistry(usdc);
        console.log("ReferralRegistry:", address(referralRegistry));

        // 10. Deploy NemethsGov (governance token)
        govToken = new NemethsGov();
        console.log("NemethsGov:", address(govToken));

        // ==========================================
        // LINK CONTRACTS
        // ==========================================
        console.log("");
        console.log("--- Linking Contracts ---");

        // TitansWitness -> NemethsGeneration
        witness.setGenerationContract(address(generation));

        // NemethsGeneration -> All dependencies
        generation.setPlotsContract(address(plots));
        generation.setTitansWitness(address(witness));
        generation.setReferralRegistry(address(referralRegistry));

        // Plots -> NemethsGeneration, CombatSystem
        plots.setGenerationContract(address(generation));
        plots.setCombatContract(address(combat));

        // CombatSystem -> VRFConsumer
        combat.setVRFConsumer(address(vrf));

        // VRFConsumer -> CombatSystem
        vrf.setCombatSystem(address(combat));

        // ReferralRegistry -> NemethsGeneration
        referralRegistry.setGenerationContract(address(generation));

        // Set minters for Medals (will be called by game server)
        // medals.setMinter(serverOracle, true); // Set after server oracle is known

        console.log("All contracts linked!");

        vm.stopBroadcast();

        // Output deployment summary
        _logDeploymentSummary(usdc);
    }

    function _logDeploymentSummary(address usdc) internal view {
        console.log("");
        console.log("==========================================");
        console.log("       DEPLOYMENT SUMMARY");
        console.log("==========================================");
        console.log("");
        console.log("CORE CONTRACTS:");
        console.log("  NemethsGeneration:", address(generation));
        console.log("  TitansWitness:    ", address(witness));
        console.log("  Plots:            ", address(plots));
        console.log("  CombatSystem:     ", address(combat));
        console.log("  VRFConsumer:      ", address(vrf));
        console.log("");
        console.log("FEATURE CONTRACTS:");
        console.log("  NemethsMedals:    ", address(medals));
        console.log("  NemethsSeasonPass:", address(seasonPass));
        console.log("  AllianceBanner:   ", address(allianceBanner));
        console.log("  ReferralRegistry: ", address(referralRegistry));
        console.log("  NemethsGov:       ", address(govToken));
        console.log("");
        console.log("EXTERNAL:");
        console.log("  USDC:             ", usdc);
        console.log("");
        console.log("==========================================");
        console.log("       NEXT STEPS");
        console.log("==========================================");
        console.log("");
        console.log("1. Add VRFConsumer to Chainlink VRF subscription");
        console.log("2. Set server oracle:");
        console.log("   generation.setServerOracle(address)");
        console.log("   combat.setServerOracle(address)");
        console.log("3. Set minters for Medals:");
        console.log("   medals.setMinter(serverOracle, true)");
        console.log("4. Set minters for Governance token:");
        console.log("   govToken.setMinter(serverOracle, true)");
        console.log("5. Set minters for Alliance Banner:");
        console.log("   allianceBanner.setMinter(serverOracle, true)");
        console.log("6. Start first season:");
        console.log("   seasonPass.startSeason(90, 5e6, 15e6, 40e6, 100e6)");
        console.log("7. Start first generation:");
        console.log("   generation.startGeneration()");
        console.log("");
    }
}

/**
 * @title DeployTestnet
 * @notice Simplified deployment for local testing
 */
contract DeployTestnet is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy mock USDC for testing
        MockUSDC usdc = new MockUSDC();
        console.log("MockUSDC:", address(usdc));

        // ==========================================
        // CORE CONTRACTS
        // ==========================================

        TitansWitness witness = new TitansWitness();
        console.log("TitansWitness:", address(witness));

        NemethsGeneration generation = new NemethsGeneration(address(usdc), deployer);
        console.log("NemethsGeneration:", address(generation));

        Plots plots = new Plots();
        console.log("Plots:", address(plots));

        CombatSystem combat = new CombatSystem(address(plots));
        console.log("CombatSystem:", address(combat));

        // ==========================================
        // FEATURE CONTRACTS
        // ==========================================

        NemethsMedals medals = new NemethsMedals();
        console.log("NemethsMedals:", address(medals));

        NemethsSeasonPass seasonPass = new NemethsSeasonPass(address(usdc), deployer);
        console.log("NemethsSeasonPass:", address(seasonPass));

        AllianceBanner allianceBanner = new AllianceBanner(deployer);
        console.log("AllianceBanner:", address(allianceBanner));

        ReferralRegistry referralRegistry = new ReferralRegistry(address(usdc));
        console.log("ReferralRegistry:", address(referralRegistry));

        NemethsGov govToken = new NemethsGov();
        console.log("NemethsGov:", address(govToken));

        // ==========================================
        // LINK CONTRACTS
        // ==========================================

        witness.setGenerationContract(address(generation));
        generation.setPlotsContract(address(plots));
        generation.setTitansWitness(address(witness));
        generation.setReferralRegistry(address(referralRegistry));
        generation.setServerOracle(deployer);
        plots.setGenerationContract(address(generation));
        plots.setCombatContract(address(combat));
        combat.setServerOracle(deployer);
        referralRegistry.setGenerationContract(address(generation));

        // Set deployer as minter for all
        medals.setMinter(deployer, true);
        allianceBanner.setMinter(deployer, true);
        govToken.setMinter(deployer, true);

        // Mint test USDC
        usdc.mint(deployer, 1000000 * 10**6); // 1M USDC

        // Start a test season
        seasonPass.startSeason(
            90,         // 90 days
            5e6,        // Bronze: $5
            15e6,       // Silver: $15
            40e6,       // Gold: $40
            100e6       // Titan: $100
        );

        // Deposit USDC to referral registry for rewards
        usdc.approve(address(referralRegistry), 10000e6);
        referralRegistry.depositRewards(10000e6);

        console.log("");
        console.log("Test deployment complete!");
        console.log("Deployer has 1M test USDC");
        console.log("Season 1 started (90 days)");
        console.log("Referral registry funded with 10k USDC");

        vm.stopBroadcast();
    }
}

/**
 * @title DeployFeatureOnly
 * @notice Deploy only the new feature contracts (for upgrading existing deployment)
 */
contract DeployFeatureOnly is Script {
    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address generationContract = vm.envAddress("GENERATION_CONTRACT");

        bool isMainnet = block.chainid == 8453;
        address usdc = isMainnet
            ? 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
            : 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

        console.log("Deploying feature contracts only...");

        vm.startBroadcast(deployerPrivateKey);

        NemethsMedals medals = new NemethsMedals();
        console.log("NemethsMedals:", address(medals));

        NemethsSeasonPass seasonPass = new NemethsSeasonPass(usdc, treasury);
        console.log("NemethsSeasonPass:", address(seasonPass));

        AllianceBanner allianceBanner = new AllianceBanner(treasury);
        console.log("AllianceBanner:", address(allianceBanner));

        ReferralRegistry referralRegistry = new ReferralRegistry(usdc);
        console.log("ReferralRegistry:", address(referralRegistry));

        NemethsGov govToken = new NemethsGov();
        console.log("NemethsGov:", address(govToken));

        // Link referral registry to generation
        referralRegistry.setGenerationContract(generationContract);

        console.log("");
        console.log("Feature contracts deployed!");
        console.log("Remember to:");
        console.log("1. Call generation.setReferralRegistry(", address(referralRegistry), ")");
        console.log("2. Set minters for medals, banner, govToken");

        vm.stopBroadcast();
    }
}

/**
 * @title MockUSDC
 * @notice Simple mock ERC20 for testing
 */
contract MockUSDC {
    string public constant name = "USD Coin";
    string public constant symbol = "USDC";
    uint8 public constant decimals = 6;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    uint256 public totalSupply;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(balanceOf[from] >= amount, "Insufficient balance");
        require(allowance[from][msg.sender] >= amount, "Insufficient allowance");
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
}
