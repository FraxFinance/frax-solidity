// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

interface IConvexCvxLPRewardPoolCombo {
    struct EarnedData {
        address token;
        uint256 amount;
    }

    function addExtraReward ( address _token ) external;
    function allowance ( address owner, address spender ) external view returns ( uint256 );
    function approve ( address spender, uint256 amount ) external returns ( bool );
    function balanceOf ( address account ) external view returns ( uint256 );
    function claimable_reward ( address, address ) external view returns ( uint256 );
    function convexBooster (  ) external view returns ( address );
    function convexPoolId (  ) external view returns ( uint256 );
    function convexStaker (  ) external view returns ( address );
    function crv (  ) external view returns ( address );
    function curveGauge (  ) external view returns ( address );
    function decimals (  ) external pure returns ( uint8 );
    function decreaseAllowance ( address spender, uint256 subtractedValue ) external returns ( bool );
    function earned ( address _account ) external returns ( EarnedData[] memory claimable );
    function emergencyWithdraw ( uint256 _amount ) external returns ( bool );
    function getReward ( address _account, address _forwardTo ) external;
    function getReward ( address _account ) external;
    function increaseAllowance ( address spender, uint256 addedValue ) external returns ( bool );
    function initialize ( address _crv, address _curveGauge, address _convexStaker, address _convexBooster, address _lptoken, uint256 _poolId ) external;
    function invalidateReward ( address _token ) external;
    function maxRewards (  ) external view returns ( uint256 );
    function name (  ) external view returns ( string memory );
    function rewardHook (  ) external view returns ( address );
    function rewardLength (  ) external view returns ( uint256 );
    function rewardMap ( address ) external view returns ( uint256 );
    function rewardRedirect ( address ) external view returns ( address );
    function reward_integral_for ( address, address ) external view returns ( uint256 );
    function rewards ( uint256 ) external view returns ( address reward_token, uint256 reward_integral, uint256 reward_remaining );
    function setRewardHook ( address _hook ) external;
    function setRewardRedirect ( address _to ) external;
    function stakeFor ( address _for, uint256 _amount ) external returns ( bool );
    function symbol (  ) external view returns ( string memory );
    function totalSupply (  ) external view returns ( uint256 );
    function transfer ( address recipient, uint256 amount ) external returns ( bool );
    function transferFrom ( address sender, address recipient, uint256 amount ) external returns ( bool );
    function user_checkpoint ( address _account ) external returns ( bool );
    function withdraw ( uint256 _amount, bool _claim ) external returns ( bool );
    function withdrawAll ( bool claim ) external;
}
