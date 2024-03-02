// SPDX-License-Identifier: ISC
pragma solidity ^0.8.19;

import "frax-std/FraxTest.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { FRAXStablecoin } from "../../../hardhat/contracts/Frax/Frax.sol";
import { FRAXShares } from "../../../hardhat/contracts/FXS/FXS.sol";
import { BAMM } from "../../../hardhat/contracts/BAMM/BAMM.sol";
import { BAMMHelper } from "../../../hardhat/contracts/BAMM/BAMMHelper.sol";
import { FraxswapRouter } from "../../../hardhat/contracts/Fraxswap/periphery/FraxswapRouter.sol";
import { FraxswapOracle } from "../../../hardhat/contracts/BAMM/FraxswapOracle.sol";
import { FraxswapPair } from "../../../hardhat/contracts/Fraxswap/core/FraxswapPair.sol";
import { GasHelper } from "../../../hardhat/contracts/Utils/GasHelper.sol";

contract BAMMTest is FraxTest, GasHelper {

    // using stdStorage for StdStorage;

    // Contract addresses
    FraxswapPair public fs_pair = FraxswapPair(0x03B59Bd1c8B9F6C265bA0c3421923B93f15036Fa); // Use Fraxswap FRAX/FXS
    FraxswapRouter public fs_router = FraxswapRouter(payable(0xC14d550632db8592D1243Edc8B95b0Ad06703867));
    FRAXStablecoin public frax = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    FRAXShares public fxs = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);

    // Test users
    address internal constant ADDRESS_WITH_LP = 0x3F2E53B1A3036Fd33F3c2f3cC49daB26A88DF2e0; // Fraxswap FRAX/FXS gauge farm
    address internal constant FXS_WHALE = 0xF977814e90dA44bFA03b6295A0616a897441aceC;
    address internal constant UTILITY_WALLET = 0x36A87d1E3200225f881488E4AEedF25303FebcAe;
    address internal constant COMPTROLLER_ADDRESS = 0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27;

    function defaultSetup() public {
        // Select the fork block
        vm.createSelectFork(vm.envString("ETHEREUM_NETWORK_ENDPOINT"), 17198193); // Should be 17198193

        // Turn off FXS vote tracking
        vm.startPrank(COMPTROLLER_ADDRESS);
        fxs.toggleVotes();

        // Switch control to the FXS WHALE
        changePrank(FXS_WHALE);
    }

    function setUp() public {
        defaultSetup();
    }

    function testTransfers() public {
        // Note the balances beforehand
        uint256 bal_before_whale = fxs.balanceOf(FXS_WHALE);
        uint256 bal_before_utility = fxs.balanceOf(UTILITY_WALLET);

        // Do a test transfer with the tracking disabled
        startMeasuringGas("Tracking disabled");
        fxs.transfer(UTILITY_WALLET, 100e18);
        fxs.transferFrom(FXS_WHALE, UTILITY_WALLET, 100e18);
        stopMeasuringGas();

        // Note the balances after
        uint256 bal_after_whale = fxs.balanceOf(FXS_WHALE);
        uint256 bal_after_utility = fxs.balanceOf(UTILITY_WALLET);

        // Check balance changes
        assertEq(int256(bal_after_whale) - int256(bal_before_whale), -200e18);
        assertEq(int256(bal_after_utility) - int256(bal_before_utility), 200e18);

        // Do a test transfer with the tracking re-enabled
        // ======================================================

        // Turn on FXS vote tracking
        vm.startPrank(COMPTROLLER_ADDRESS);
        fxs.toggleVotes();

        // Switch control to the FXS WHALE
        changePrank(FXS_WHALE);

        // Should be like 52638 gwei more for each: about $10 at 100 gwei gas and $1800 ETH
        startMeasuringGas("transfer");
        fxs.transfer(UTILITY_WALLET, 100e18);
        fxs.transferFrom(FXS_WHALE, UTILITY_WALLET, 100e18);
        stopMeasuringGas();
    }

    function testBurn() public {
        // Note the balances beforehand
        uint256 bal_before_whale = fxs.balanceOf(FXS_WHALE);
        uint256 bal_before_utility = fxs.balanceOf(UTILITY_WALLET);

        // Approve a burnFrom
        fxs.approve(FXS_WHALE, 100e18);
        startMeasuringGas("burnFrom");
        fxs.burnFrom(FXS_WHALE, 100e18);
        stopMeasuringGas();

        // Do a test transfer with the tracking disabled
        startMeasuringGas("burn");
        fxs.burn(100e18);
        stopMeasuringGas();

        // Note the balances after
        uint256 bal_after_whale = fxs.balanceOf(FXS_WHALE);
        uint256 bal_after_utility = fxs.balanceOf(UTILITY_WALLET);

        // Check balance changes
        assertEq(int256(bal_after_whale) - int256(bal_before_whale), -200e18);
        assertEq(int256(bal_after_utility) - int256(bal_before_utility), 0);
    }

    function testPoolActions() public {
        // As the FXS whale, approve the utility wallet to burn
        fxs.approve(UTILITY_WALLET, 100e18);

        // Switch control to the COMPTROLLER
        changePrank(COMPTROLLER_ADDRESS);

        // Set the utility wallet as a pool (have to do on FRAX contract, as FXS looks there)
        frax.addPool(UTILITY_WALLET);

        // Switch control to the COMPTROLLER
        changePrank(UTILITY_WALLET);

        // Test mints, pool_mints, and burns
        fxs.mint(FXS_WHALE, 100e18);
        fxs.pool_mint(FXS_WHALE, 100e18);
        fxs.pool_burn_from(FXS_WHALE, 100e18);
    }



    // TEST movements with mint and other weird stuff, clean addresses, etc
}

