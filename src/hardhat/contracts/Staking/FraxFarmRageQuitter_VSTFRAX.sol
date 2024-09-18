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
// ==================== FraxFarmRageQuitter_VSTFRAX ===================
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

contract FraxFarmRageQuitter_VSTFRAX is ReentrancyGuard {
   IFarm public farm = IFarm(0x127963A74c07f72D862F2Bdc225226c3251BD117);
   IERC20 public lp_token = IERC20(0x59bF0545FCa0E5Ad48E13DA269faCD2E8C886Ba4);
   address public fraxTreasuryAddress = 0xe61D9ed1e5Dc261D1e90a99304fADCef2c76FD10;
   uint256 treasuryPercentage = 2000; // 20%;

   // Reward tokens
   IERC20 public fxsToken = IERC20(0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7);
   IERC20 public vstaToken = IERC20(0xa684cd057951541187f288294a1e1C2646aA2d24);

   // NOTE
   // Make sure to enable this contract as a migrator first on the target farm
   
   /// @notice Exits stake for a specific kek_id
   function ragequitOne(bytes32 _kek_id) nonReentrant external {
      uint256 _liquidity;

      // Get all locked stakes of the user
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
      SafeERC20.safeTransfer(vstaToken, msg.sender, vstaToken.balanceOf(address(this)));
   }
   
   /// @notice Exits all stakes
   function ragequitAll() nonReentrant external {  
      uint256 _totalLiquidity;

      // Get all locked stakes of the user
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

      // All reward tokens collected during the migration are sent to the user.
      SafeERC20.safeTransfer(fxsToken,msg.sender,fxsToken.balanceOf(address(this)));
      SafeERC20.safeTransfer(vstaToken,msg.sender,vstaToken.balanceOf(address(this)));
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