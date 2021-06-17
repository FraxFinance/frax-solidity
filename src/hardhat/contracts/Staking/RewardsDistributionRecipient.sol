// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// Inheritance
import "./Owned.sol";


// https://docs.synthetix.io/contracts/RewardsDistributionRecipient
abstract contract RewardsDistributionRecipient is Owned {
    address public rewardsDistribution;

    //function notifyRewardAmount(uint256 reward) external virtual;

    modifier onlyRewardsDistribution() {
        require(msg.sender == rewardsDistribution, "Caller is not RewardsDistribution contract");
        _;
    }

    function setRewardsDistribution(address _rewardsDistribution) external onlyOwner {
        rewardsDistribution = _rewardsDistribution;
    }
}
