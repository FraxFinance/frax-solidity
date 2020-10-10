// SPDX-License-Identifier: MIT
pragma solidity >=0.4.25 <0.7.0;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/FakeCollateral/FakeCollateral.sol";
import "../contracts/Frax/Frax.sol";
import "../contracts/Frax/FraxPool.sol";
import "../contracts/FXS/FXS.sol";
import "../contracts/Governance/Governance.sol";
import "../contracts/Staking/StakingRewards.sol";

contract TestAll {
	function testFraxDeployment() public {
		FRAXStablecoin frax = FRAXStablecoin(DeployedAddresses.FRAXStablecoin());

		// Check for 18 decimals
		Assert.equal(frax.decimals(), uint(18), "18 decimals expected");
	}

	function testFraxPoolDeployment() public {
		FraxPool pool = FraxPool(DeployedAddresses.FraxPool());
	}

	function testFXSDeployment() public {
		FRAXShares fxs = FRAXShares(DeployedAddresses.FRAXShares());

		// Check for 18 decimals
		Assert.equal(fxs.decimals(), uint(18), "18 decimals expected");
	}

	function testGovernanceDeployment() public {
		GovernorAlpha governor = GovernorAlpha(DeployedAddresses.GovernorAlpha());
	}

	function testStakingRewardsDeployment() public {
		StakingRewards stake = StakingRewards(DeployedAddresses.StakingRewards());
	}

	function testFakeCollateralDeployment() public {
		FakeCollateral fake = FakeCollateral(DeployedAddresses.FakeCollateral());

		// Check for 18 decimals
		Assert.equal(fake.decimals(), uint(18), "18 decimals expected");

		address creator_address = fake.creator_address();

		// Make sure the received their initial tokens
		Assert.equal(fake.balanceOf(creator_address), uint(10000000e18), "Owner should have 10000000e18 FAKE initially");
	}
}
