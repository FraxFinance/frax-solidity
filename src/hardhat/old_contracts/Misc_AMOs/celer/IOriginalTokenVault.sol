// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IOriginalTokenVault {
    function addGovernor(address _account) external;
    function addPauser(address account) external;
    function delayPeriod() external view returns (uint256);
    function delayThresholds(address) external view returns (uint256);
    function delayedTransfers(bytes32) external view returns (address receiver, address token, uint256 amount, uint256 timestamp);
    function deposit(address _token, uint256 _amount, uint64 _mintChainId, address _mintAccount, uint64 _nonce) external;
    function epochLength() external view returns (uint256);
    function epochVolumeCaps(address) external view returns (uint256);
    function epochVolumes(address) external view returns (uint256);
    function executeDelayedTransfer(bytes32 id) external;
    function governors(address) external view returns (bool);
    function isGovernor(address _account) external view returns (bool);
    function isPauser(address account) external view returns (bool);
    function lastOpTimestamps(address) external view returns (uint256);
    function maxDeposit(address) external view returns (uint256);
    function minDeposit(address) external view returns (uint256);
    function owner() external view returns (address);
    function pause() external;
    function paused() external view returns (bool);
    function pausers(address) external view returns (bool);
    function records(bytes32) external view returns (bool);
    function removeGovernor(address _account) external;
    function removePauser(address account) external;
    function renounceGovernor() external;
    function renounceOwnership() external;
    function renouncePauser() external;
    function setDelayPeriod(uint256 _period) external;
    function setDelayThresholds(address[] memory _tokens, uint256[] memory _thresholds) external;
    function setEpochLength(uint256 _length) external;
    function setEpochVolumeCaps(address[] memory _tokens, uint256[] memory _caps) external;
    function setMaxDeposit(address[] memory _tokens, uint256[] memory _amounts) external;
    function setMinDeposit(address[] memory _tokens, uint256[] memory _amounts) external;
    function sigsVerifier() external view returns (address);
    function transferOwnership(address newOwner) external;
    function unpause() external;
    function withdraw(bytes memory _request, bytes[] memory _sigs, address[] memory _signers, uint256[] memory _powers) external;
}