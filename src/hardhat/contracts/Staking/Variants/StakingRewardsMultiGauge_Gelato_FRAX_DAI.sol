// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;
pragma experimental ABIEncoderV2;

import "../StakingRewardsMultiGaugeV2.sol";

contract StakingRewardsMultiGauge_Gelato_FRAX_DAI is StakingRewardsMultiGaugeV2 {
    constructor (
        address _owner,
        address _stakingToken, 
        address _rewards_distributor_address,
        string[] memory _rewardSymbols,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers
    ) 
    StakingRewardsMultiGaugeV2(_owner, _stakingToken, _rewards_distributor_address, _rewardSymbols, _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers)
    {}
}
