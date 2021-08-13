// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;
pragma experimental ABIEncoderV2;

interface IveFXSYieldDistributor {
    function acceptOwnership() external;
    function checkpoint() external;
    function earned(address account) external view returns (uint256);
    function eligibleCurrentVeFXS(address account) external view returns (uint256);
    function emittedToken() external view returns (address);
    function emitted_token_address() external view returns (address);
    function fractionParticipating() external view returns (uint256);
    function getYield() external returns (uint256 yield0);
    function getYieldForDuration() external view returns (uint256);
    function greylist(address) external view returns (bool);
    function greylistAddress(address _address) external;
    function initializeDefault() external;
    function lastTimeYieldApplicable() external view returns (uint256);
    function lastUpdateTime() external view returns (uint256);
    function nominateNewOwner(address _owner) external;
    function nominatedOwner() external view returns (address);
    function owner() external view returns (address);
    function periodFinish() external view returns (uint256);
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external;
    function setPauses(bool _yieldCollectionPaused) external;
    function setTimelock(address _new_timelock) external;
    function setYieldDuration(uint256 _yieldDuration) external;
    function setYieldRate(uint256 _new_rate0, bool sync_too) external;
    function sync() external;
    function timelock_address() external view returns (address);
    function totalVeFXSParticipating() external view returns (uint256);
    function totalVeFXSSupplyStored() external view returns (uint256);
    function userIsInitialized(address) external view returns (bool);
    function userVeFXSCheckpointed(address) external view returns (uint256);
    function userYieldPerTokenPaid(address) external view returns (uint256);
    function yieldCollectionPaused() external view returns (bool);
    function yieldDuration() external view returns (uint256);
    function yieldPerVeFXS() external view returns (uint256);
    function yieldPerVeFXSStored() external view returns (uint256);
    function yieldRate() external view returns (uint256);
    function yields(address) external view returns (uint256);
}
