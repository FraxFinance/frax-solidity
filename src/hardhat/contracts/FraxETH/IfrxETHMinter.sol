// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

interface IfrxETHMinter {
struct Validator {
    bytes pubKey;
    bytes signature;
    bytes32 depositDataRoot;
}

  function DEPOSIT_SIZE (  ) external view returns ( uint256 );
  function RATIO_PRECISION (  ) external view returns ( uint256 );
  function acceptOwnership (  ) external;
  function activeValidators ( bytes memory ) external view returns ( bool );
  function addValidator ( Validator memory validator ) external;
  function addValidators ( Validator[] memory validatorArray ) external;
  function clearValidatorArray (  ) external;
  function currentWithheldETH (  ) external view returns ( uint256 );
  function depositContract (  ) external view returns ( address );
  function depositEther ( uint256 max_deposits ) external;
  function depositEtherPaused (  ) external view returns ( bool );
  function frxETHToken (  ) external view returns ( address );
  function getValidator ( uint256 i ) external view returns ( bytes memory pubKey, bytes memory withdrawalCredentials, bytes memory signature, bytes32 depositDataRoot );
  function getValidatorStruct ( bytes memory pubKey, bytes memory signature, bytes32 depositDataRoot ) external pure returns ( Validator memory );
  function moveWithheldETH ( address to, uint256 amount ) external;
  function nominateNewOwner ( address _owner ) external;
  function nominatedOwner (  ) external view returns ( address );
  function numValidators (  ) external view returns ( uint256 );
  function owner (  ) external view returns ( address );
  function popValidators ( uint256 times ) external;
  function recoverERC20 ( address tokenAddress, uint256 tokenAmount ) external;
  function recoverEther ( uint256 amount ) external;
  function removeValidator ( uint256 remove_idx, bool dont_care_about_ordering ) external;
  function setTimelock ( address _timelock_address ) external;
  function setWithdrawalCredential ( bytes memory _new_withdrawal_pubkey ) external;
  function setWithholdRatio ( uint256 newRatio ) external;
  function sfrxETHToken (  ) external view returns ( address );
  function submit (  ) external payable;
  function submitAndDeposit ( address recipient ) external payable returns ( uint256 shares );
  function submitAndGive ( address recipient ) external payable;
  function submitPaused (  ) external view returns ( bool );
  function swapValidator ( uint256 from_idx, uint256 to_idx ) external;
  function timelock_address (  ) external view returns ( address );
  function togglePauseDepositEther (  ) external;
  function togglePauseSubmits (  ) external;
  function withholdRatio (  ) external view returns ( uint256 );
}
