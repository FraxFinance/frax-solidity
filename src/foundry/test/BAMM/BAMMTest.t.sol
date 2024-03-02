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

contract BAMMTest is FraxTest {
    // JUST going to use the hardhat tests...

    // using stdStorage for StdStorage;

    // // Contract addresses
    // BAMM public bamm;
    // // BAMM public univ2_bamm; // Maybe test generic UniV2s later
    // BAMMHelper public bamm_helper;
    // FraxswapOracle public fs_oracle;
    // FraxswapPair public fs_pair = FraxswapPair(0x03B59Bd1c8B9F6C265bA0c3421923B93f15036Fa); // Use Fraxswap FRAX/FXS
    // FraxswapRouter public fs_router = FraxswapRouter(payable(0xC14d550632db8592D1243Edc8B95b0Ad06703867));
    // FRAXStablecoin public frax = FRAXStablecoin(0x853d955aCEf822Db058eb8505911ED77F175b99e);
    // FRAXShares public fxs = FRAXShares(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);

    // // Test users
    // address internal constant ADDRESS_WITH_LP = 0x3F2E53B1A3036Fd33F3c2f3cC49daB26A88DF2e0; // Fraxswap FRAX/FXS gauge farm
    // address internal constant BORROWER_USER = 0x36A87d1E3200225f881488E4AEedF25303FebcAe;
    // address internal constant COMPTROLLER_ADDRESS = 0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27;
    // address internal constant LOANER_USER = 0x733371d7C15ACECF9e120dd037D6BcDb6E069148;

    // function defaultSetup() public {
    //     // Select the fork block
    //     vm.createSelectFork(vm.envString("ETHEREUM_NETWORK_ENDPOINT"), 17198193); // Should be 17198193

    //     // Initiate some contracts
    //     bamm_helper = new BAMMHelper();
    //     fs_oracle = new FraxswapOracle();
    //     bamm = new BAMM(
    //         fs_pair,
    //         true,
    //         9970,
    //         fs_router,
    //         bamm_helper,
    //         fs_oracle
    //     );

    //     // Give the loaner some LP
    //     vm.startPrank(ADDRESS_WITH_LP);
    //     fs_pair.transfer(LOANER_USER, 1000e18);
    //     vm.stopPrank();
    // }

    // function setUp() public {
    //     defaultSetup();
    // }

    // // Loan some FRAX, accrue no interest, pull the LP back out
    // function testMintRedeemNoLenders() public {
    //     vm.startPrank(LOANER_USER);

    //     // Mint some BAMM
    //     fs_pair.approve(address(bamm), 100e18);
    //     uint256 bamm_minted = bamm.mint(LOANER_USER, 100e18);

    //     // Wait 24 hrs
    //     skip(24 * 3600);

    //     // Accrue interest
    //     bamm.addInterest();

    //     // Wait 24 hrs again
    //     skip(24 * 3600);

    //     // Redeem the BAMM tokens for LP
    //     uint256 lp_redeemed = bamm.redeem(LOANER_USER, bamm_minted);

    //     // Make sure you got the same amount of LP back (minus 1 wei)
    //     assertEq(lp_redeemed, 100e18 - 1 wei);

    //     vm.stopPrank();
    // }

    // // Loan some FRAX, accrue some interest, pull the LP back out
    // function testMintRedeemWithLender() public {
    //     vm.startPrank(LOANER_USER);

    //     // Mint some BAMM
    //     fs_pair.approve(address(bamm), 100e18);
    //     uint256 bamm_minted = bamm.mint(LOANER_USER, 100e18);

    //     // Switch over to the borrower
    //     vm.stopPrank();
    //     vm.startPrank(BORROWER_USER);
        
    //     // Wait 24 hrs
    //     skip(24 * 3600);

    //     // Note token balances before
    //     uint256[6] memory balances_before = [
    //         frax.balanceOf(BORROWER_USER),
    //         frax.balanceOf(address(bamm)),
    //         fxs.balanceOf(BORROWER_USER),
    //         fxs.balanceOf(address(bamm)),
    //         fs_pair.balanceOf(BORROWER_USER),
    //         fs_pair.balanceOf(address(bamm))
    //     ];

    //     // Borrower puts down FRAX as collateral, but doesn't take a loan yet.
    //     frax.approve(address(bamm), 500e18);
    //     BAMM.Action memory action1 = BAMM.Action(
    //         0, // NOTE: There might be dust issues
    //         500e18,
    //         0,
    //         BORROWER_USER,
    //         0,
    //         0,
    //         false,
    //         true,
    //         0,
    //         "",
    //         "",
    //         block.timestamp + 66666666
    //     );
    //     bamm.executeActions(action1);

    //     // Print some info
    //     {
    //         console.log("ACTION 1");
    //         console.log("=================================");
    //         (int256 tkn0, int256 tkn1, int256 rented) = bamm.userVaults(BORROWER_USER);
    //         uint256 rentedMultiplier = bamm.rentedMultiplier();
    //         console.log("Vault token0", tkn0);
    //         console.log("Vault token1", tkn1);
    //         console.log("Vault rented", rented);
    //         console.log("rentedMultiplier", rentedMultiplier);
    //         console.log("FRAX change [Borrower]", int256(frax.balanceOf(BORROWER_USER)) - int256(balances_before[0]));
    //         console.log("FRAX change [BAMM]", int256(frax.balanceOf(address(bamm))) - int256(balances_before[1]));
    //         console.log("FXS change [Borrower]", int256(fxs.balanceOf(BORROWER_USER)) - int256(balances_before[2]));
    //         console.log("FXS change [BAMM]", int256(fxs.balanceOf(address(bamm))) - int256(balances_before[3]));
    //         console.log("FS-LP change [Borrower]", int256(fs_pair.balanceOf(BORROWER_USER)) - int256(balances_before[4]));
    //         console.log("FS-LP change [BAMM]", int256(fs_pair.balanceOf(address(bamm))) - int256(balances_before[5]));
    //         console.log("");

    //         // Update the token balances
    //         balances_before = [
    //             frax.balanceOf(BORROWER_USER),
    //             frax.balanceOf(address(bamm)),
    //             fxs.balanceOf(BORROWER_USER),
    //             fxs.balanceOf(address(bamm)),
    //             fs_pair.balanceOf(BORROWER_USER),
    //             fs_pair.balanceOf(address(bamm))
    //         ];
    //     }

        // // Borrower swaps some of the FRAX for FXS
        // frax.approve(address(bamm), 100e18);
        // {
        //     BAMM.FraxswapV2RouterParams memory swap2 = BAMM.FraxswapV2RouterParams(
        //         XXX
        //     );
        //     BAMM.Action memory action2 = BAMM.Action(
        //         0, // NOTE: There might be dust issues
        //         0,
        //         0,
        //         BORROWER_USER,
        //         0,
        //         0,
        //         false,
        //         true,
        //         0,
        //         "",
        //         "",
        //         block.timestamp + 66666666
        //     );

        //     bamm.executeActionsAndSwap(action2, swap2);
        // }

        // // Print some info
        // {
        //     console.log("ACTION 2");
        //     console.log("=================================");
        //     (int256 tkn0, int256 tkn1, int256 rented) = bamm.userVaults(BORROWER_USER);
        //     uint256 rentedMultiplier = bamm.rentedMultiplier();
        //     console.log("Vault token0", tkn0);
        //     console.log("Vault token1", tkn1);
        //     console.log("Vault rented", rented);
        //     console.log("rentedMultiplier", rentedMultiplier);
        //     console.log("FRAX change [Borrower]", int256(frax.balanceOf(BORROWER_USER)) - int256(balances_before[0]));
        //     console.log("FRAX change [BAMM]", int256(frax.balanceOf(address(bamm))) - int256(balances_before[1]));
        //     console.log("FXS change [Borrower]", int256(fxs.balanceOf(BORROWER_USER)) - int256(balances_before[2]));
        //     console.log("FXS change [BAMM]", int256(fxs.balanceOf(address(bamm))) - int256(balances_before[3]));
        //     console.log("FS-LP change [Borrower]", int256(fs_pair.balanceOf(BORROWER_USER)) - int256(balances_before[4]));
        //     console.log("FS-LP change [BAMM]", int256(fs_pair.balanceOf(address(bamm))) - int256(balances_before[5]));
        //     console.log("");

        //     // Update the token balances
        //     balances_before = [
        //         frax.balanceOf(BORROWER_USER),
        //         frax.balanceOf(address(bamm)),
        //         fxs.balanceOf(BORROWER_USER),
        //         fxs.balanceOf(address(bamm)),
        //         fs_pair.balanceOf(BORROWER_USER),
        //         fs_pair.balanceOf(address(bamm))
        //     ];
        // }

        
        // // Wait 24 hrs again
        // skip(24 * 3600);

        // // Switch back over to the loaner
        // vm.stopPrank();
        // vm.startPrank(LOANER_USER);
        
        // // Redeem the BAMM tokens for LP
        // uint256 lp_redeemed = bamm.redeem(LOANER_USER, bamm_minted);

        // // Make sure you got the same amount of LP back (minus 1 wei)
        // assertEq(lp_redeemed, 100e18 - 1 wei);

        // vm.stopPrank();
    // }
}

