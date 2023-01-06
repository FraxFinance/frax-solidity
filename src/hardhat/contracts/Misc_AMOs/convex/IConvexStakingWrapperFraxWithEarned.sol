// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./IConvexStakingWrapperFrax.sol";

interface IConvexStakingWrapperFraxWithEarned is IConvexStakingWrapperFrax {
  struct EarnedData {
    address token;
    uint256 amount;
  }

  function earned(address _account) external view returns (EarnedData[] memory claimable);
}



