// SPDX-License-Identifier: agpl-3.0
pragma solidity >=0.6.11;


interface IAaveIncentivesControllerPartial {
    /**
    * @dev Returns the total of rewards of an user, already accrued + not yet accrued
    * @param user The address of the user
    * @return The rewards
    **/
    function getRewardsBalance(address[] calldata assets, address user)
      external
      view
      returns (uint256);

    /**
    * @dev Claims reward for an user, on all the assets of the lending pool, accumulating the pending rewards
    * @param amount Amount of rewards to claim
    * @param to Address that will be receiving the rewards
    * @return Rewards claimed
    **/
    function claimRewards(
      address[] calldata assets,
      uint256 amount,
      address to
    ) external returns (uint256);

    /**
    * @dev Claims reward for an user on behalf, on all the assets of the lending pool, accumulating the pending rewards. The caller must
    * be whitelisted via "allowClaimOnBehalf" function by the RewardsAdmin role manager
    * @param amount Amount of rewards to claim
    * @param user Address to check and claim rewards
    * @param to Address that will be receiving the rewards
    * @return Rewards claimed
    **/
    function claimRewardsOnBehalf(
      address[] calldata assets,
      uint256 amount,
      address user,
      address to
    ) external returns (uint256);

    /**
    * @dev returns the unclaimed rewards of the user
    * @param user the address of the user
    * @return the unclaimed user rewards
    */
    function getUserUnclaimedRewards(address user) external view returns (uint256);

    /**
    * @dev for backward compatibility with previous implementation of the Incentives controller
    */
    function REWARD_TOKEN() external view returns (address);
}