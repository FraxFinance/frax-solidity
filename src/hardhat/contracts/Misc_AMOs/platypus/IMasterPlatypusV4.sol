// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IMasterPlatypusV4 {
    struct UserInfo {
        // 256 bit packed
        uint128 amount; // How many LP tokens the user has provided.
        uint128 factor; // non-dialuting factor = sqrt (lpAmount * vePtp.balanceOf())
        // 256 bit packed
        uint128 rewardDebt; // Reward debt. See explanation below.
        uint128 claimablePtp;
        //
        // We do some fancy math here. Basically, any point in time, the amount of PTPs
        // entitled to a user but is pending to be distributed is:
        //
        //   ((user.amount * pool.accPtpPerShare + user.factor * pool.accPtpPerFactorShare) / 1e12) -
        //        user.rewardDebt
        //
        // Whenever a user deposits or withdraws LP tokens to a pool. Here's what happens:
        //   1. The pool's `accPtpPerShare`, `accPtpPerFactorShare` (and `lastRewardTimestamp`) gets updated.
        //   2. User receives the pending reward sent to his/her address.
        //   3. User's `amount` gets updated.
        //   4. User's `rewardDebt` gets updated.
    }

    // Info of each pool.
    struct PoolInfo {
        address lpToken; // Address of LP token contract.
        address rewarder;
        uint128 sumOfFactors; // 20.18 fixed point. The sum of all non dialuting factors by all of the users in the pool
        uint128 accPtpPerShare; // 26.12 fixed point. Accumulated PTPs per share, times 1e12.
        uint128 accPtpPerFactorShare; // 26.12 fixed point. Accumulated ptp per factor share
    }

    function acceptOwnership () external;
    function add (address _lpToken, address _rewarder) external;
    function deposit (uint256 _pid, uint256 _amount) external returns (uint256 reward, uint256[] memory additionalRewards);
    function depositFor (uint256 _pid, uint256 _amount, address _user) external;
    function dilutingRepartition () external view returns (uint16);
    function emergencyPtpWithdraw () external;
    function emergencyWithdraw (uint256 _pid) external;
    function getPoolId (address _lp) external view returns (uint256);
    function getSumOfFactors (uint256 _pid) external view returns (uint256);
    function getUserInfo (uint256 _pid, address _user) external view returns (UserInfo memory);
    function initialize (address _ptp, address _vePtp, address _voter, uint16 _dilutingRepartition) external;
    function liquidate (uint256 _pid, address _user, uint256 _amount) external;
    function massUpdatePools () external;
    function maxPoolLength () external view returns (uint256);
    function migrate (uint256[] memory _pids) external;
    function multiClaim (uint256[] memory _pids) external returns (uint256 reward, uint256[] memory amounts, uint256[][] memory additionalRewards);
    function newMasterPlatypus () external view returns (address);
    function nonDilutingRepartition () external view returns (uint256);
    function notifyRewardAmount (address _lpToken, uint256 _amount) external;
    function owner () external view returns (address);
    function ownerCandidate () external view returns (address);
    function pause () external;
    function paused () external view returns (bool);
    function pendingTokens (uint256 _pid, address _user) external view returns (uint256 pendingPtp, address[] memory bonusTokenAddresses, string[] memory bonusTokenSymbols, uint256[] memory pendingBonusTokens);
    function platypusTreasure () external view returns (address);
    function poolInfo (uint256) external view returns (address lpToken, address rewarder, uint128 sumOfFactors, uint128 accPtpPerShare, uint128 accPtpPerFactorShare);
    function poolLength () external view returns (uint256);
    function proposeOwner (address newOwner) external;
    function ptp () external view returns (address);
    function renounceOwnership () external;
    function rewarderBonusTokenInfo (uint256 _pid) external view returns (address[] memory bonusTokenAddresses, string[] memory bonusTokenSymbols);
    function setMaxPoolLength (uint256 _maxPoolLength) external;
    function setNewMasterPlatypus (address _newMasterPlatypus) external;
    function setPlatypusTreasure (address _platypusTreasure) external;
    function setRewarder (uint256 _pid, address _rewarder) external;
    function setVePtp (address _newVePtp) external;
    function unpause () external;
    function updateEmissionRepartition (uint16 _dilutingRepartition) external;
    function updateFactor (address _user, uint256 _newVePtpBalance) external;
    function updatePool (uint256 _pid) external;
    function userInfo (uint256, address) external view returns (uint128 amount, uint128 factor, uint128 rewardDebt, uint128 claimablePtp);
    function vePtp () external view returns (address);
    function version () external pure returns (uint256);
    function voter () external view returns (address);
    function withdraw (uint256 _pid, uint256 _amount) external returns (uint256 reward, uint256[] memory additionalRewards);
}
