// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IConvexStakingWrapperFrax {
  function addRewards() external;
  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function collateralVault() external view returns (address);
  function convexBooster() external view returns (address);
  function convexPool() external view returns (address);
  function convexPoolId() external view returns (uint256);
  function convexToken() external view returns (address);
  function crv() external view returns (address);
  function curveToken() external view returns (address);
  function cvx() external view returns (address);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function deposit(uint256 _amount, address _to) external;
//   function earned(address _account) external view returns (tuple[] memory claimable);
  function getReward(address _account, address _forwardTo) external;
  function getReward(address _account) external;
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  function initialize(address _curveToken, address _convexToken, address _convexPool, uint256 _poolId, address _vault) external;
  function isInit() external view returns (bool);
  function isShutdown() external view returns (bool);
  function name() external view returns (string memory);
  function owner() external view returns (address);
  function registeredRewards(address) external view returns (uint256);
  function renounceOwnership() external;
  function rewardLength() external view returns (uint256);
  function rewards(uint256) external view returns (address reward_token, address reward_pool, uint128 reward_integral, uint128 reward_remaining);
  function setApprovals() external;
  function setVault(address _vault) external;
  function shutdown() external;
  function stake(uint256 _amount, address _to) external;
  function symbol() external view returns (string memory);
  function totalBalanceOf(address _account) external view returns (uint256);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function transferOwnership(address newOwner) external;
  function user_checkpoint(address[2] memory _accounts) external returns (bool);
  function withdraw(uint256 _amount) external;
  function withdrawAndUnwrap(uint256 _amount) external;
}



