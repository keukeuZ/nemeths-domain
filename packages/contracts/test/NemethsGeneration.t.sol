// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/NemethsGeneration.sol";

// Mock USDC token for testing
contract MockUSDC {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    function mint(address to, uint256 amount) external {
        balanceOf[to] += amount;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        return true;
    }
}

contract NemethsGenerationTest is Test {
    NemethsGeneration public generation;
    MockUSDC public usdc;
    address public admin = address(1);
    address public treasury = address(2);
    address public player1 = address(3);
    address public player2 = address(4);

    function setUp() public {
        usdc = new MockUSDC();

        vm.prank(admin);
        generation = new NemethsGeneration(address(usdc), treasury);
    }

    function test_StartGeneration() public {
        vm.prank(admin);
        generation.startGeneration();

        assertEq(generation.currentGenerationId(), 1);
        assertEq(uint256(generation.getCurrentPhase()), uint256(NemethsGeneration.GenerationPhase.Planning));
    }

    function test_RegisterFreePlayer() public {
        vm.prank(admin);
        generation.startGeneration();

        vm.prank(player1);
        generation.registerFree("TestCaptain", 0, 0, 0); // Ironveld, Warlord, Vanguard

        assertTrue(generation.isRegistered(player1));
        NemethsGeneration.Player memory player = generation.getPlayer(1, player1);
        assertEq(player.race, 0);
        assertEq(player.captainClass, 0);
        assertEq(player.captainSkill, 0);
        assertFalse(player.isPremium);
    }

    function test_RegisterPremiumPlayer() public {
        vm.prank(admin);
        generation.startGeneration();

        // Mint and approve USDC for player
        usdc.mint(player1, 10e6);
        vm.prank(player1);
        usdc.approve(address(generation), 10e6);

        vm.prank(player1);
        generation.registerPremium("PremiumCaptain", 1, 1, 2); // Vaelthir, Archmage, Destruction

        assertTrue(generation.isRegistered(player1));
        NemethsGeneration.Player memory player = generation.getPlayer(1, player1);
        assertTrue(player.isPremium);
    }

    function test_EndGeneration() public {
        vm.prank(admin);
        generation.startGeneration();

        vm.prank(admin);
        generation.endGeneration(player1);

        NemethsGeneration.Generation memory gen = generation.getCurrentGeneration();
        assertEq(uint256(gen.phase), uint256(NemethsGeneration.GenerationPhase.Ended));
        assertEq(gen.winner, player1);
    }

    function test_RevertWhen_NonAdminStartsGeneration() public {
        vm.expectRevert();
        generation.startGeneration();
    }

    function test_TimeRemaining() public {
        vm.prank(admin);
        generation.startGeneration();

        uint256 remaining = generation.getTimeRemaining();
        assertEq(remaining, 50 days);

        // Move time forward
        vm.warp(block.timestamp + 25 days);
        remaining = generation.getTimeRemaining();
        assertEq(remaining, 25 days);
    }

    function test_PhaseTransition() public {
        vm.prank(admin);
        generation.startGeneration();

        // Should start in Planning
        assertEq(uint256(generation.getCurrentPhase()), uint256(NemethsGeneration.GenerationPhase.Planning));

        // Move to Active phase (after 5 days)
        vm.warp(block.timestamp + 6 days);
        generation.updatePhase();
        assertEq(uint256(generation.getCurrentPhase()), uint256(NemethsGeneration.GenerationPhase.Active));

        // Move to Endgame phase (after 45 days total)
        vm.warp(block.timestamp + 40 days);
        generation.updatePhase();
        assertEq(uint256(generation.getCurrentPhase()), uint256(NemethsGeneration.GenerationPhase.Endgame));
    }

    function test_InvalidSkillForClass() public {
        vm.prank(admin);
        generation.startGeneration();

        // Warlord (class 0) should only accept skills 0 or 1
        vm.prank(player1);
        vm.expectRevert(NemethsGeneration.InvalidSkill.selector);
        generation.registerFree("BadSkill", 0, 0, 2); // Skill 2 is not valid for Warlord
    }

    function test_CannotRegisterTwice() public {
        vm.prank(admin);
        generation.startGeneration();

        vm.prank(player1);
        generation.registerFree("First", 0, 0, 0);

        vm.prank(player1);
        vm.expectRevert(NemethsGeneration.AlreadyRegistered.selector);
        generation.registerFree("Second", 0, 0, 0);
    }
}
