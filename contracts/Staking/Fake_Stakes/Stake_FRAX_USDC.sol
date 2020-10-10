// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../StakingRewards.sol";

contract Stake_FRAX_USDC is StakingRewards {
    constructor(
        address _owner,
        address _rewardsDistribution,
        address _rewardsToken,
        address _stakingToken,
        address _frax_address
    ) 
    StakingRewards(_owner, _rewardsDistribution, _rewardsToken, _stakingToken, _frax_address)
    public {}
}