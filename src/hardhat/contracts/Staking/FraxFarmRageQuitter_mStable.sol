// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ==================== FraxFarmRageQuitter_mStable ===================
// ====================================================================
// Exits a Frax farm early, with a penalty. Deployed on a case-by-case basis

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../Utils/ReentrancyGuard.sol";

contract FraxFarmRageQuitter_mStable is ReentrancyGuard {
   IFarm public farm = IFarm(0xc425Fd9Ed3C892d849C9E1a971516da1C1B29696);
   IERC20 lp_token = IERC20(0xB30a907084AC8a0d25dDDAB4E364827406Fd09f0);
   address fraxTreasuryAddress = 0xDCB5A4b6Ee39447D700F4FA3303B1d1c25Ea9cA7;
   uint256 treasuryPercentage = 2000; // 20%;

   // Rewards tokens
   IERC20 fxsToken = IERC20(0x3e121107F6F22DA4911079845a470757aF4e1A1b);
   IERC20 mtaToken = IERC20(0xF501dd45a1198C2E1b5aEF5314A68B9006D842E0);

   // NOTE
   // Make sure to enable this contract as a migrator first on the target farm
   
   /// @notice Exits stake for a specific kek_id
   function ragequitOne(bytes32 _kek_id) nonReentrant external {
      uint256 _liquidity;

      // Get all locked stake of the user
      IFarm.LockedStake[] memory lockedStakes = farm.lockedStakesOf(msg.sender);

      // Find stake with the correct kek_id
      for (uint256 i; i < lockedStakes.length; i++) {
         if (lockedStakes[i].kek_id == _kek_id) {
            _liquidity = lockedStakes[i].liquidity;
            break;
         }
      }
      require(_liquidity > 0, "Stake not found");

      // Unlock the stake and transfer the LP tokens to this contract
      farm.migrator_withdraw_locked(msg.sender, _kek_id);

      // Split the LP tokens between the Frax treasury and the user
      uint256 liquidityToTreasury = (_liquidity * treasuryPercentage) / 10000;
      SafeERC20.safeTransfer(lp_token, fraxTreasuryAddress, liquidityToTreasury);
      SafeERC20.safeTransfer(lp_token, msg.sender, _liquidity - liquidityToTreasury);
      
      // All rewards collected during the migration are sent to the user.
      SafeERC20.safeTransfer(fxsToken, msg.sender, fxsToken.balanceOf(address(this)));
      SafeERC20.safeTransfer(mtaToken, msg.sender, mtaToken.balanceOf(address(this)));
   }
   
   /// @notice Exits all stakes
   function ragequitAll() nonReentrant external {  
      uint256 _totalLiquidity;

      // Get all locked stake of the user
      IFarm.LockedStake[] memory lockedStakes = farm.lockedStakesOf(msg.sender);

      for (uint256 i; i < lockedStakes.length; i++) {
         uint256 _liquidity = lockedStakes[i].liquidity;
         if (_liquidity > 0) {
            farm.migrator_withdraw_locked(msg.sender, lockedStakes[i].kek_id); // Unlock the stake and transfer the LP tokens to this contract
            _totalLiquidity += _liquidity;
         }
      }
      require(_totalLiquidity > 0, "Nothing to unlock");

      // Split the LP tokens between the Frax treasury and the user
      uint256 liquidityToTreasury = (_totalLiquidity * treasuryPercentage) / 10000;
      SafeERC20.safeTransfer(lp_token, fraxTreasuryAddress, liquidityToTreasury);
      SafeERC20.safeTransfer(lp_token, msg.sender, _totalLiquidity - liquidityToTreasury);

      // All reward tokens collected during the migration are send to the user.
      SafeERC20.safeTransfer(fxsToken,msg.sender,fxsToken.balanceOf(address(this)));
      SafeERC20.safeTransfer(mtaToken,msg.sender,mtaToken.balanceOf(address(this)));
   }
}

interface IFarm{
   struct LockedStake {
      bytes32 kek_id;
      uint256 start_timestamp;
      uint256 liquidity;
      uint256 ending_timestamp;
      uint256 lock_multiplier; 
   }
   function migrator_withdraw_locked(address, bytes32) external;
   function lockedStakesOf(address) external view returns(LockedStake[] memory);
}