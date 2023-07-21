// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/kyberswap/elastic/IKyberSwapFarmingToken.sol";
import "../../Oracle/ComboOracle_KyberSwapElastic.sol";

contract FraxUnifiedFarm_KyberSwapElasticGeneric is FraxUnifiedFarm_ERC20 {

    // Need to seed a starting token to use both as a basis for fraxPerLPToken
    // as well as getting ticks, etc
    uint256 public seed_token_id; 

    // For KS-FT pricing
    ComboOracle_KyberSwapElastic public KSE_ComboOracle;

    constructor (
        address _owner, 
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _kse_combo_oracle,
        address _stakingToken,
        uint256 _seed_token_id
    ) 
    FraxUnifiedFarm_ERC20(_owner , _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, _stakingToken)
    {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING
        stakingToken = IKyberSwapFarmingToken(_stakingToken);
        frax_is_token0 = false; // Doesn't really matter here

        seed_token_id = _seed_token_id;
        KSE_ComboOracle = ComboOracle_KyberSwapElastic(_kse_combo_oracle);
    }

    function setSeedTokenID(uint256 _seed_token_id) public onlyByOwnGov {
        seed_token_id = _seed_token_id;
    }

    function setKyberSwapElasticComboOracle(address _kse_combo_oracle_address) public onlyByOwnGov {
        KSE_ComboOracle = ComboOracle_KyberSwapElastic(_kse_combo_oracle_address);
    }


    function fraxPerLPToken() public view override returns (uint256 frax_per_lp_token) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // KyberSwap Elastic KyberSwapFarmingToken (KS-FT)
        // ============================================
        {
            // Fetch liquidity info from the seed token id
            ComboOracle_KyberSwapElastic.NFTBasicInfo memory nft_basic_info = KSE_ComboOracle.getNFTBasicInfo(seed_token_id);
            ComboOracle_KyberSwapElastic.NFTValueInfo memory nft_value_info = KSE_ComboOracle.getNFTValueInfo(seed_token_id);

            // Assume half of the liquidity is FRAX or FRAX-related, even if it is not.
            frax_per_lp_token = (nft_value_info.total_value * MULTIPLIER_PRECISION) / (nft_basic_info.liquidity * 2);
        }
    }
}
