// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/kyberswap/factory/IKyberFactory.sol";
import "../../Misc_AMOs/kyberswap/elastic/IKyberSwapFarmingToken.sol";
import "../../Oracle/ComboOracle_KyberSwapElasticV2.sol";

contract FraxUnifiedFarm_ERC20_KyberSwapElasticV2 is FraxUnifiedFarm_ERC20 {

    string public farm_type = "ERC20_KyberSwapElasticV2";

    // Need to seed a starting token to use both as a basis for fraxPerLPToken
    // as well as getting ticks, etc
    uint256 public seed_token_id; 

    // For KS-FT pricing
    ComboOracle_KyberSwapElasticV2 public KSE_ComboOracleV2;
    IKyberFactory public immutable kyber_factory = IKyberFactory(0xC7a590291e07B9fe9E64b86c58fD8fC764308C4A);

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
        // stakingToken = IKyberSwapFarmingToken(_stakingToken);
        // frax_is_token0 = false; // Doesn't really matter here

        // seed_token_id = _seed_token_id;
        // KSE_ComboOracleV2 = ComboOracle_KyberSwapElasticV2(_kse_combo_oracle);
        
    }

    function setSeedTokenID(uint256 _seed_token_id) public onlyByOwnGov {
        seed_token_id = _seed_token_id;
    }

    function setKyberSwapElasticComboOracle(address _kse_combo_oracle_address) public onlyByOwnGov {
        KSE_ComboOracleV2 = ComboOracle_KyberSwapElasticV2(_kse_combo_oracle_address);
    }


    function fraxPerLPToken() public view override returns (uint256 frax_per_lp_token) {
        // COMMENTED OUT SO COMPILER DOESNT COMPLAIN. UNCOMMENT WHEN DEPLOYING

        // KyberSwap Elastic KyberSwapFarmingToken (KS-FT)
        // ============================================
        // {
        //     // Fetch liquidity info from the seed token id
        //     // ComboOracle_KyberSwapElasticV2.NFTBasicInfo memory nft_basic_info = KSE_ComboOracleV2.getNFTBasicInfo(seed_token_id);
        //     ComboOracle_KyberSwapElasticV2.NFTValueInfo memory nft_value_info = KSE_ComboOracleV2.getNFTValueInfo(seed_token_id);

        //     // Assume half of the liquidity is FRAX or FRAX-related, even if it is not.
        //     frax_per_lp_token = (nft_value_info.pool_tvl_usd * MULTIPLIER_PRECISION) / (stakingToken.totalSupply() * 2);
        // }
    }
}
