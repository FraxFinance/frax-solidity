// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.11;

import "../../ERC20/IERC20_Detailed.sol";

interface IStakedAave is IERC20_Detailed {
    function COOLDOWN_SECONDS() external view returns (uint256);

    function getTotalRewardsBalance(address staker) external view returns (uint256);
    function stakersCooldowns(address staker) external view returns (uint256);

    function stake(address to, uint256 amount) external;
    function redeem(address to, uint256 amount) external;
    function cooldown() external;
    function claimRewards(address to, uint256 amount) external;
}