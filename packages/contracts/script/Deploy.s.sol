// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/NemethsGeneration.sol";
import "../src/TitansWitness.sol";
import "../src/Plots.sol";
import "../src/CombatSystem.sol";
import "../src/VRFConsumer.sol";

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

    // Deployed contract addresses
    NemethsGeneration public generation;
    TitansWitness public witness;
    Plots public plots;
    CombatSystem public combat;
    VRFConsumer public vrf;

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

        console.log("Deploying to:", isMainnet ? "Base Mainnet" : "Base Sepolia");
        console.log("Treasury:", treasury);
        console.log("USDC:", usdc);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy TitansWitness (eternal leaderboard)
        witness = new TitansWitness();
        console.log("TitansWitness deployed at:", address(witness));

        // 2. Deploy NemethsGeneration (game manager)
        generation = new NemethsGeneration(usdc, treasury);
        console.log("NemethsGeneration deployed at:", address(generation));

        // 3. Deploy Plots (territory NFTs)
        plots = new Plots();
        console.log("Plots deployed at:", address(plots));

        // 4. Deploy VRFConsumer (randomness)
        vrf = new VRFConsumer(vrfCoordinator, vrfSubscriptionId, vrfKeyHash);
        console.log("VRFConsumer deployed at:", address(vrf));

        // 5. Deploy CombatSystem
        combat = new CombatSystem(address(plots));
        console.log("CombatSystem deployed at:", address(combat));

        // 6. Link contracts together
        console.log("Linking contracts...");

        // TitansWitness -> NemethsGeneration
        witness.setGenerationContract(address(generation));

        // NemethsGeneration -> Plots, TitansWitness
        generation.setPlotsContract(address(plots));
        generation.setTitansWitness(address(witness));

        // Plots -> NemethsGeneration, CombatSystem
        plots.setGenerationContract(address(generation));
        plots.setCombatContract(address(combat));

        // CombatSystem -> VRFConsumer
        combat.setVRFConsumer(address(vrf));

        // VRFConsumer -> CombatSystem
        vrf.setCombatSystem(address(combat));

        console.log("All contracts deployed and linked!");

        vm.stopBroadcast();

        // Output deployment summary
        _logDeploymentSummary();
    }

    function _logDeploymentSummary() internal view {
        console.log("");
        console.log("=== DEPLOYMENT SUMMARY ===");
        console.log("");
        console.log("NemethsGeneration:", address(generation));
        console.log("TitansWitness:", address(witness));
        console.log("Plots:", address(plots));
        console.log("CombatSystem:", address(combat));
        console.log("VRFConsumer:", address(vrf));
        console.log("");
        console.log("=== NEXT STEPS ===");
        console.log("1. Add VRFConsumer to Chainlink VRF subscription as consumer");
        console.log("2. Set server oracle address: generation.setServerOracle(address)");
        console.log("3. Set combat server oracle: combat.setServerOracle(address)");
        console.log("4. Set plots base URI: plots.setBaseURI(uri)");
        console.log("5. Start first generation: generation.startGeneration()");
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
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy TitansWitness
        TitansWitness witness = new TitansWitness();
        console.log("TitansWitness deployed at:", address(witness));

        // Deploy NemethsGeneration with mock USDC
        NemethsGeneration generation = new NemethsGeneration(address(usdc), deployer);
        console.log("NemethsGeneration deployed at:", address(generation));

        // Deploy Plots
        Plots plots = new Plots();
        console.log("Plots deployed at:", address(plots));

        // Deploy CombatSystem (no VRF for testing)
        CombatSystem combat = new CombatSystem(address(plots));
        console.log("CombatSystem deployed at:", address(combat));

        // Link contracts
        witness.setGenerationContract(address(generation));
        generation.setPlotsContract(address(plots));
        generation.setTitansWitness(address(witness));
        generation.setServerOracle(deployer); // Set deployer as oracle for testing
        plots.setGenerationContract(address(generation));
        plots.setCombatContract(address(combat));
        combat.setServerOracle(deployer);

        // Mint test USDC to deployer
        usdc.mint(deployer, 1000000 * 10**6); // 1M USDC

        console.log("Test deployment complete!");
        console.log("Deployer has 1M test USDC");

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
