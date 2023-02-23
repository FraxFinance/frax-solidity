// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IVoter {
  function acceptOwnership () external;
  function add (address _gauge, address _lpToken, address _bribe) external;
  function bribes (address) external view returns (address);
  function claimBribes (address[] memory _lpTokens) external returns (uint256[] memory bribeRewards);
  function distribute (address _lpToken) external;
  function emergencyPtpWithdraw () external;
  function getUserVotes (address _user, address _lpToken) external view returns (uint256);
  function index () external view returns (uint128);
  function initialize (address _ptp, address _vePtp, uint88 _ptpPerSec, uint256 _startTimestamp) external;
  function lastRewardTimestamp () external view returns (uint40);
  function lpTokenLength () external view returns (uint256);
  function lpTokens (uint256) external view returns (address);
  function owner () external view returns (address);
  function ownerCandidate () external view returns (address);
  function pause (address _lpToken) external;
  function pauseAll () external;
  function paused () external view returns (bool);
  function pendingBribes (address[] memory _lpTokens, address _user) external view returns (uint256[] memory bribeRewards);
  function pendingPtp (address _lpToken) external view returns (uint256);
  function proposeOwner (address newOwner) external;
  function ptp () external view returns (address);
  function ptpPerSec () external view returns (uint88);
  function renounceOwnership () external;
  function resume (address _lpToken) external;
  function resumeAll () external;
  function setBribe (address _lpToken, address _bribe) external;
  function setGauge (address _lpToken, address _gauge) external;
  function setPtpPerSec (uint88 _ptpPerSec) external;
  function totalWeight () external view returns (uint256);
  function vePtp () external view returns (address);
  function vote (address[] memory _lpVote, int256[] memory _deltas) external returns (uint256[] memory bribeRewards);
  function votes (address, address) external view returns (uint256);
  function weights (address) external view returns (uint256);
}
