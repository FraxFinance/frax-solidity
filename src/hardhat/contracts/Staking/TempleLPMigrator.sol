// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TempleLPMigrator {
   ITempleGauge public templeGauge = ITempleGauge(0x10460d02226d6ef7B2419aE150E6377BdbB7Ef16);
   IERC20 templeFraxLPToken = IERC20(0x6021444f1706f15465bEe85463BCc7d7cC17Fc03);
   address fraxTreasuryAddress = 0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27;
   uint256 treasuryPercentage = 2000; // 20%;

   // Rewards tokens
   IERC20 fxsToken = IERC20(0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0);
   IERC20 templeToken = IERC20(0x470EBf5f030Ed85Fc1ed4C2d36B9DD02e77CF1b7);
   
   /// @notice Migrates stake for a specific kek_id
   function migrate(bytes32 _kek_id) external {
      uint256 _liquidity;

      // Get all locked stake of the user
      ITempleGauge.LockedStake[] memory lockedStakes = templeGauge.lockedStakesOf(msg.sender);

      // Find stake with the correct kek_id
      for (uint256 i; i < lockedStakes.length; i++) {
         if (lockedStakes[i].kek_id == _kek_id) {
            _liquidity = lockedStakes[i].liquidity;
            break;
         }
      }
      require(_liquidity>0,"Stake not found");

      // Unlock the stake and transfer the LP tokens to this contract
      templeGauge.migrator_withdraw_locked(msg.sender, _kek_id);

      // Split the LP tokens between the Frax treasury and the user
      uint256 liquidityToTreasury = _liquidity*treasuryPercentage/10000;
      SafeERC20.safeTransfer(templeFraxLPToken,fraxTreasuryAddress,liquidityToTreasury);
      SafeERC20.safeTransfer(templeFraxLPToken,msg.sender,_liquidity-liquidityToTreasury);
      
      // All rewards collected during the migration are send to the user.
      SafeERC20.safeTransfer(fxsToken,msg.sender,fxsToken.balanceOf(address(this)));
      SafeERC20.safeTransfer(templeToken,msg.sender,templeToken.balanceOf(address(this)));
   }
   
   /// @notice Migrates all stakes
   function migrateAll() external {  
      uint256 _totalLiquidity;

      // Get all locked stake of the user
      ITempleGauge.LockedStake[] memory lockedStakes = templeGauge.lockedStakesOf(msg.sender);

      for (uint256 i; i < lockedStakes.length; i++) {
         uint256 _liquidity = lockedStakes[i].liquidity;
         if (_liquidity>0) {
            templeGauge.migrator_withdraw_locked(msg.sender, lockedStakes[i].kek_id); // Unlock the stake and transfer the LP tokens to this contract
            _totalLiquidity+=_liquidity;
         }
      }
      require(_totalLiquidity>0,"Nothing to unlock");

      // Split the LP tokens between the Frax treasury and the user
      uint256 liquidityToTreasury = _totalLiquidity*treasuryPercentage/10000;
      SafeERC20.safeTransfer(templeFraxLPToken,fraxTreasuryAddress,liquidityToTreasury);
      SafeERC20.safeTransfer(templeFraxLPToken,msg.sender,_totalLiquidity-liquidityToTreasury);

      // All reward tokens collected during the migration are send to the user.
      SafeERC20.safeTransfer(fxsToken,msg.sender,fxsToken.balanceOf(address(this)));
      SafeERC20.safeTransfer(templeToken,msg.sender,templeToken.balanceOf(address(this)));
   }
}

interface ITempleGauge{
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