// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

interface IFeederPool {

  enum BassetStatus {
      Default,
      Normal,
      BrokenBelowPeg,
      BrokenAbovePeg,
      Blacklisted,
      Liquidating,
      Liquidated,
      Failed
  }

  struct BassetPersonal {
      // Address of the bAsset
      address addr;
      // Address of the bAsset
      address integrator;
      // An ERC20 can charge transfer fee, for example USDT, DGX tokens.
      bool hasTxFee; // takes a byte in storage
      // Status of the bAsset
      BassetStatus status;
  }

  struct BassetData {
      // 1 Basset * ratio / ratioScale == x Masset (relative value)
      // If ratio == 10e8 then 1 bAsset = 10 mAssets
      // A ratio is divised as 10^(18-tokenDecimals) * measurementMultiple(relative value of 1 base unit)
      uint128 ratio;
      // Amount of the Basset that is held in Collateral
      uint128 vaultBalance;
  }

  function allowance(address owner, address spender) external view returns (uint256);
  function approve(address spender, uint256 amount) external returns (bool);
  function balanceOf(address account) external view returns (uint256);
  function collectPendingFees() external;
  function collectPlatformInterest() external returns (uint256 mintAmount, uint256 newSupply);
  // function data() external view returns (uint256 swapFee, uint256 redemptionFee, uint256 govFee, uint256 pendingFees, uint256 cacheSize, tuple ampData, tuple weightLimits);
  function decimals() external view returns (uint8);
  function decreaseAllowance(address spender, uint256 subtractedValue) external returns (bool);
  function getBasset(address _bAsset) external view returns (BassetPersonal memory personal, BassetData memory data);
  function getBassets() external view returns (BassetPersonal[] memory personal, BassetData[] memory data);
  // function getConfig() external view returns (tuple config);
  // function getMintMultiOutput(address[] _inputs, uint256[] _inputQuantities) external view returns (uint256 mintOutput);
  function getMintOutput(address _input, uint256 _inputQuantity) external view returns (uint256 mintOutput);
  function getPrice() external view returns (uint256 price, uint256 k);
  // function getRedeemExactBassetsOutput(address[] _outputs, uint256[] _outputQuantities) external view returns (uint256 fpTokenQuantity);
  function getRedeemOutput(address _output, uint256 _fpTokenQuantity) external view returns (uint256 bAssetOutput);
  function getSwapOutput(address _input, address _output, uint256 _inputQuantity) external view returns (uint256 swapOutput);
  function increaseAllowance(address spender, uint256 addedValue) external returns (bool);
  // function initialize(string _nameArg, string _symbolArg, tuple _mAsset, tuple _fAsset, address[] _mpAssets, tuple _config) external;
  function mAsset() external view returns (address);
  // function migrateBassets(address[] _bAssets, address _newIntegration) external;
  function mint(address _input, uint256 _inputQuantity, uint256 _minOutputQuantity, address _recipient) external returns (uint256 mintOutput);
  // function mintMulti(address[] _inputs, uint256[] _inputQuantities, uint256 _minOutputQuantity, address _recipient) external returns (uint256 mintOutput);
  function name() external view returns (string memory);
  function nexus() external view returns (address);
  function pause() external;
  function paused() external view returns (bool);
  function redeem(address _output, uint256 _fpTokenQuantity, uint256 _minOutputQuantity, address _recipient) external returns (uint256 outputQuantity);
  // function redeemExactBassets(address[] _outputs, uint256[] _outputQuantities, uint256 _maxInputQuantity, address _recipient) external returns (uint256 fpTokenQuantity);
  // function redeemProportionately(uint256 _inputQuantity, uint256[] _minOutputQuantities, address _recipient) external returns (uint256[] outputQuantities);
  function setCacheSize(uint256 _cacheSize) external;
  function setFees(uint256 _swapFee, uint256 _redemptionFee, uint256 _govFee) external;
  function setWeightLimits(uint128 _min, uint128 _max) external;
  function startRampA(uint256 _targetA, uint256 _rampEndTime) external;
  function stopRampA() external;
  function swap(address _input, address _output, uint256 _inputQuantity, uint256 _minOutputQuantity, address _recipient) external returns (uint256 swapOutput);
  function symbol() external view returns (string memory);
  function totalSupply() external view returns (uint256);
  function transfer(address recipient, uint256 amount) external returns (bool);
  function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
  function unpause() external;
}
