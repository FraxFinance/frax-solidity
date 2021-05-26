// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

import "../FraxFarm_UniV3_veFXS.sol";

contract FraxFarm_UniV3_veFXS_FRAX_USDC is FraxFarm_UniV3_veFXS {
    constructor(
        address _owner,
        address _rewardsToken0,
        address _stakingTokenNFT,
        address _timelock_address,
        address _veFXS_address,
        address _uni_token0,
        address _uni_token1
    )
        FraxFarm_UniV3_veFXS(
            _owner,
            _rewardsToken0,
            _stakingTokenNFT,
            _timelock_address,
            _veFXS_address,
            _uni_token0,
            _uni_token1
        )
    {}
}
