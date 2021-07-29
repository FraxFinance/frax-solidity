// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../StakingRewardsMultiGauge.sol";

contract StakingRewardsMultiGauge_FRAX_MTA is StakingRewardsMultiGauge {
    constructor(
        address _owner,
        address _stakingToken, 
        address _rewards_distributor_address,
        string[] memory _rewardSymbols,
        address[] memory _gaugeControllers,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates
    ) 
    StakingRewardsMultiGauge(_owner, _stakingToken, _rewards_distributor_address, _rewardSymbols, _gaugeControllers, _rewardTokens, _rewardManagers, _rewardRates)
    {}
}
