// SPDX-License-Identifier: MIT
pragma solidity >=0.6.11;
import "../../ERC20/IERC20.sol";

// Original at https://etherscan.io/address/0x43BD92bF3Bb25EBB3BdC2524CBd6156E3Fdd41F3
// Some functions were omitted for brevity. See the contract for details

interface IFNX_Oracle {
    function getAssetAndUnderlyingPrice(address asset, uint256 underlying) external view returns (uint256, uint256);

    function getPrices(uint256[] memory assets) external view returns (uint256[] memory);

    /**
     * @notice retrieves price of an asset
     * @dev function to get price for an asset
     * @param asset Asset for which to get the price
     * @return uint mantissa of asset price (scaled by 1e8) or zero if unset or contract paused
     */
    function getPrice(address asset) external view returns (uint256);

    function getUnderlyingPrice(uint256 underlying) external view returns (uint256);
}

// /**
//  *Submitted for verification at Etherscan.io on 2020-11-04
// */

// // File: contracts\modules\Ownable.sol

// pragma solidity >=0.6.0;

// /**
//  * @dev Contract module which provides a basic access control mechanism, where
//  * there is an account (an owner) that can be granted exclusive access to
//  * specific functions.
//  *
//  * This module is used through inheritance. It will make available the modifier
//  * `onlyOwner`, which can be applied to your functions to restrict their use to
//  * the owner.
//  */
// contract Ownable {
//     address internal _owner;

//     event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

//     /**
//      * @dev Initializes the contract setting the deployer as the initial owner.
//      */
//     constructor() internal {
//         _owner = msg.sender;
//         emit OwnershipTransferred(address(0), _owner);
//     }

//     /**
//      * @dev Returns the address of the current owner.
//      */
//     function owner() public view returns (address) {
//         return _owner;
//     }

//     /**
//      * @dev Throws if called by any account other than the owner.
//      */
//     modifier onlyOwner() {
//         require(isOwner(), "Ownable: caller is not the owner");
//         _;
//     }

//     /**
//      * @dev Returns true if the caller is the current owner.
//      */
//     function isOwner() public view returns (bool) {
//         return msg.sender == _owner;
//     }

//     /**
//      * @dev Leaves the contract without owner. It will not be possible to call
//      * `onlyOwner` functions anymore. Can only be called by the current owner.
//      *
//      * NOTE: Renouncing ownership will leave the contract without an owner,
//      * thereby removing any functionality that is only available to the owner.
//      */
//     function renounceOwnership() public onlyOwner {
//         emit OwnershipTransferred(_owner, address(0));
//         _owner = address(0);
//     }

//     /**
//      * @dev Transfers ownership of the contract to a new account (`newOwner`).
//      * Can only be called by the current owner.
//      */
//     function transferOwnership(address newOwner) public onlyOwner {
//         _transferOwnership(newOwner);
//     }

//     /**
//      * @dev Transfers ownership of the contract to a new account (`newOwner`).
//      */
//     function _transferOwnership(address newOwner) internal {
//         require(newOwner != address(0), "Ownable: new owner is the zero address");
//         emit OwnershipTransferred(_owner, newOwner);
//         _owner = newOwner;
//     }
// }

// // File: contracts\modules\whiteList.sol

// pragma solidity >=0.6.0;
//     /**
//      * @dev Implementation of a whitelist which filters a eligible uint32.
//      */
// library whiteListUint32 {
//     /**
//      * @dev add uint32 into white list.
//      * @param whiteList the storage whiteList.
//      * @param temp input value
//      */

//     function addWhiteListUint32(uint32[] storage whiteList,uint32 temp) internal{
//         if (!isEligibleUint32(whiteList,temp)){
//             whiteList.push(temp);
//         }
//     }
//     /**
//      * @dev remove uint32 from whitelist.
//      */
//     function removeWhiteListUint32(uint32[] storage whiteList,uint32 temp)internal returns (bool) {
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         if (i<len){
//             if (i!=len-1) {
//                 whiteList[i] = whiteList[len-1];
//             }
//             whiteList.pop();
//             return true;
//         }
//         return false;
//     }
//     function isEligibleUint32(uint32[] memory whiteList,uint32 temp) internal pure returns (bool){
//         uint256 len = whiteList.length;
//         for (uint256 i=0;i<len;i++){
//             if (whiteList[i] == temp)
//                 return true;
//         }
//         return false;
//     }
//     function _getEligibleIndexUint32(uint32[] memory whiteList,uint32 temp) internal pure returns (uint256){
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         return i;
//     }
// }
//     /**
//      * @dev Implementation of a whitelist which filters a eligible uint256.
//      */
// library whiteListUint256 {
//     // add whiteList
//     function addWhiteListUint256(uint256[] storage whiteList,uint256 temp) internal{
//         if (!isEligibleUint256(whiteList,temp)){
//             whiteList.push(temp);
//         }
//     }
//     function removeWhiteListUint256(uint256[] storage whiteList,uint256 temp)internal returns (bool) {
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         if (i<len){
//             if (i!=len-1) {
//                 whiteList[i] = whiteList[len-1];
//             }
//             whiteList.pop();
//             return true;
//         }
//         return false;
//     }
//     function isEligibleUint256(uint256[] memory whiteList,uint256 temp) internal pure returns (bool){
//         uint256 len = whiteList.length;
//         for (uint256 i=0;i<len;i++){
//             if (whiteList[i] == temp)
//                 return true;
//         }
//         return false;
//     }
//     function _getEligibleIndexUint256(uint256[] memory whiteList,uint256 temp) internal pure returns (uint256){
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         return i;
//     }
// }
//     /**
//      * @dev Implementation of a whitelist which filters a eligible address.
//      */
// library whiteListAddress {
//     // add whiteList
//     function addWhiteListAddress(address[] storage whiteList,address temp) internal{
//         if (!isEligibleAddress(whiteList,temp)){
//             whiteList.push(temp);
//         }
//     }
//     function removeWhiteListAddress(address[] storage whiteList,address temp)internal returns (bool) {
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         if (i<len){
//             if (i!=len-1) {
//                 whiteList[i] = whiteList[len-1];
//             }
//             whiteList.pop();
//             return true;
//         }
//         return false;
//     }
//     function isEligibleAddress(address[] memory whiteList,address temp) internal pure returns (bool){
//         uint256 len = whiteList.length;
//         for (uint256 i=0;i<len;i++){
//             if (whiteList[i] == temp)
//                 return true;
//         }
//         return false;
//     }
//     function _getEligibleIndexAddress(address[] memory whiteList,address temp) internal pure returns (uint256){
//         uint256 len = whiteList.length;
//         uint256 i=0;
//         for (;i<len;i++){
//             if (whiteList[i] == temp)
//                 break;
//         }
//         return i;
//     }
// }

// // File: contracts\modules\Operator.sol

// pragma solidity >=0.6.0;

// /**
//  * @dev Contract module which provides a basic access control mechanism, where
//  * each operator can be granted exclusive access to specific functions.
//  *
//  */
// contract Operator is Ownable {
//     using whiteListAddress for address[];
//     address[] private _operatorList;
//     /**
//      * @dev modifier, every operator can be granted exclusive access to specific functions.
//      *
//      */
//     modifier onlyOperator() {
//         require(_operatorList.isEligibleAddress(msg.sender),"Managerable: caller is not the Operator");
//         _;
//     }
//     /**
//      * @dev modifier, Only indexed operator can be granted exclusive access to specific functions.
//      *
//      */
//     modifier onlyOperatorIndex(uint256 index) {
//         require(_operatorList.length>index && _operatorList[index] == msg.sender,"Managerable: caller is not the eligible Operator");
//         _;
//     }
//     /**
//      * @dev add a new operator by owner.
//      *
//      */
//     function addOperator(address addAddress)public onlyOwner{
//         _operatorList.addWhiteListAddress(addAddress);
//     }
//     /**
//      * @dev modify indexed operator by owner.
//      *
//      */
//     function setOperator(uint256 index,address addAddress)public onlyOwner{
//         _operatorList[index] = addAddress;
//     }
//     /**
//      * @dev remove operator by owner.
//      *
//      */
//     function removeOperator(address removeAddress)public onlyOwner returns (bool){
//         return _operatorList.removeWhiteListAddress(removeAddress);
//     }
//     /**
//      * @dev get all operators.
//      *
//      */
//     function getOperator()public view returns (address[] memory) {
//         return _operatorList;
//     }
//     /**
//      * @dev set all operators by owner.
//      *
//      */
//     function setOperators(address[] memory operators)public onlyOwner {
//         _operatorList = operators;
//     }
// }

// // File: contracts\interfaces\AggregatorV3Interface.sol

// pragma solidity >=0.6.0;

// interface AggregatorV3Interface {

//   function decimals() external view returns (uint8);
//   function description() external view returns (string memory);
//   function version() external view returns (uint256);

//   // getRoundData and latestRoundData should both raise "No data present"
//   // if they do not have data to report, instead of returning unset values
//   // which could be misinterpreted as actual reported values.
//   function getRoundData(uint80 _roundId)
//     external
//     view
//     returns (
//       uint80 roundId,
//       int256 answer,
//       uint256 startedAt,
//       uint256 updatedAt,
//       uint80 answeredInRound
//     );
//   function latestRoundData()
//     external
//     view
//     returns (
//       uint80 roundId,
//       int256 answer,
//       uint256 startedAt,
//       uint256 updatedAt,
//       uint80 answeredInRound
//     );

// }

// // File: contracts\interfaces\IERC20.sol

// pragma solidity ^0.6.11;
// /**
//  * @dev Interface of the ERC20 standard as defined in the EIP. Does not include
//  * the optional functions; to access them see {ERC20Detailed}.
//  */
// interface IERC20 {
//     function decimals() external view returns (uint8);
//     /**
//      * @dev Returns the amount of tokens in existence.
//      */
//     function totalSupply() external view returns (uint256);

//     /**
//      * @dev Returns the amount of tokens owned by `account`.
//      */
//     function balanceOf(address account) external view returns (uint256);

//     /**
//      * @dev Moves `amount` tokens from the caller's account to `recipient`.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * Emits a {Transfer} event.
//      */
//     function transfer(address recipient, uint256 amount) external returns (bool);

//     /**
//      * @dev Returns the remaining number of tokens that `spender` will be
//      * allowed to spend on behalf of `owner` through {transferFrom}. This is
//      * zero by default.
//      *
//      * This value changes when {approve} or {transferFrom} are called.
//      */
//     function allowance(address owner, address spender) external view returns (uint256);

//     /**
//      * @dev Sets `amount` as the allowance of `spender` over the caller's tokens.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * IMPORTANT: Beware that changing an allowance with this method brings the risk
//      * that someone may use both the old and the new allowance by unfortunate
//      * transaction ordering. One possible solution to mitigate this race
//      * condition is to first reduce the spender's allowance to 0 and set the
//      * desired value afterwards:
//      * https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
//      *
//      * Emits an {Approval} event.
//      */
//     function approve(address spender, uint256 amount) external returns (bool);

//     /**
//      * @dev Moves `amount` tokens from `sender` to `recipient` using the
//      * allowance mechanism. `amount` is then deducted from the caller's
//      * allowance.
//      *
//      * Returns a boolean value indicating whether the operation succeeded.
//      *
//      * Emits a {Transfer} event.
//      */
//     function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);

//     /**
//      * @dev Emitted when `value` tokens are moved from one account (`from`) to
//      * another (`to`).
//      *
//      * Note that `value` may be zero.
//      */
//     event Transfer(address indexed from, address indexed to, uint256 value);

//     /**
//      * @dev Emitted when the allowance of a `spender` for an `owner` is set by
//      * a call to {approve}. `value` is the new allowance.
//      */
//     event Approval(address indexed owner, address indexed spender, uint256 value);
// }

// // File: contracts\FNXOracle.sol

// pragma solidity ^0.6.7;

// contract FNXOracle is Operator {
//     mapping(uint256 => AggregatorV3Interface) private assetsMap;
//     mapping(uint256 => uint256) private decimalsMap;
//     mapping(uint256 => uint256) private priceMap;
//     uint256 internal decimals = 1;

//     /**
//      * Network: Ropsten
//      * Aggregator: LTC/USD
//      * Address: 0x727B59d0989d6D1961138122BC9F94f534E82B32
//      */
//     constructor() public {
//         //mainnet
//         assetsMap[1] = AggregatorV3Interface(0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c);
//         assetsMap[2] = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
//         assetsMap[3] = AggregatorV3Interface(0x24551a8Fb2A7211A25a17B1481f043A8a8adC7f2);
//         assetsMap[4] = AggregatorV3Interface(0xDC3EA94CD0AC27d9A86C180091e7f78C683d3699);
//         assetsMap[5] = AggregatorV3Interface(0x2c1d072e956AFFC0D435Cb7AC38EF18d24d9127c);
//         assetsMap[0] = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);
//         assetsMap[uint256(0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B)] = AggregatorV3Interface(0x80070f7151BdDbbB1361937ad4839317af99AE6c);
//         priceMap[uint256(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)] = 1e20;
//         decimalsMap[0] = 18;
//         decimalsMap[1] = 18;
//         decimalsMap[2] = 18;
//         decimalsMap[3] = 18;
//         decimalsMap[4] = 18;
//         decimalsMap[5] = 18;
//         decimalsMap[uint256(0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B)] = 18;
//         decimalsMap[uint256(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)] = 6;
//         /*
//         //rinkeby
//         assetsMap[1] = AggregatorV3Interface(0xECe365B379E1dD183B20fc5f022230C044d51404);
//         assetsMap[2] = AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);
//         assetsMap[3] = AggregatorV3Interface(0xd8bD0a1cB028a31AA859A21A3758685a95dE4623);
//         assetsMap[4] = AggregatorV3Interface(0xE96C4407597CD507002dF88ff6E0008AB41266Ee);
//         assetsMap[5] = AggregatorV3Interface(0xd8bD0a1cB028a31AA859A21A3758685a95dE4623);
//         assetsMap[0] = AggregatorV3Interface(0x8A753747A1Fa494EC906cE90E9f37563A8AF630e);
//         assetsMap[uint256(0xaf30F6A6B09728a4e793ED6d9D0A7CcBa192c229)] = AggregatorV3Interface(0xcf74110A02b1D391B27cE37364ABc3b279B1d9D1);
//         priceMap[uint256(0xD12BC93Ac5eA2b4Ba99e0ffEd053a53B6d18C7a3)] = 1e20;
//         decimalsMap[0] = 18;
//         decimalsMap[1] = 18;
//         decimalsMap[2] = 18;
//         decimalsMap[3] = 18;
//         decimalsMap[4] = 18;
//         decimalsMap[5] = 18;
//         decimalsMap[uint256(0xaf30F6A6B09728a4e793ED6d9D0A7CcBa192c229)] = 18;
//         decimalsMap[uint256(0xD12BC93Ac5eA2b4Ba99e0ffEd053a53B6d18C7a3)] = 6;
//         */

//     }
//     function setDecimals(uint256 newDecimals) public onlyOwner{
//         decimals = newDecimals;
//     }
//     function getAssetAndUnderlyingPrice(address asset,uint256 underlying) public view returns (uint256,uint256) {
//         return (getUnderlyingPrice(uint256(asset)),getUnderlyingPrice(underlying));
//     }
//     function setPrices(uint256[]memory assets,uint256[]memory prices) public onlyOwner {
//         require(assets.length == prices.length, "input arrays' length are not equal");
//         uint256 len = assets.length;
//         for (uint i=0;i<len;i++){
//             priceMap[i] = prices[i];
//         }
//     }
//     function getPrices(uint256[]memory assets) public view returns (uint256[]memory) {
//         uint256 len = assets.length;
//         uint256[] memory prices = new uint256[](len);
//         for (uint i=0;i<len;i++){
//             prices[i] = getUnderlyingPrice(assets[i]);
//         }
//         return prices;
//     }
//         /**
//   * @notice retrieves price of an asset
//   * @dev function to get price for an asset
//   * @param asset Asset for which to get the price
//   * @return uint mantissa of asset price (scaled by 1e8) or zero if unset or contract paused
//   */
//     function getPrice(address asset) public view returns (uint256) {
//         return getUnderlyingPrice(uint256(asset));
//     }
//     function getUnderlyingPrice(uint256 underlying) public view returns (uint256) {
//         if (underlying == 3){
//             return getMKRPrice();
//         }
//         AggregatorV3Interface assetsPrice = assetsMap[underlying];
//         if (address(assetsPrice) != address(0)){
//             (, int price,,,) = assetsPrice.latestRoundData();
//             uint256 tokenDecimals = decimalsMap[underlying];
//             if (tokenDecimals < 18){
//                 return uint256(price)/decimals*(10**(18-tokenDecimals));
//             }else if (tokenDecimals > 18){
//                 return uint256(price)/decimals/(10**(18-tokenDecimals));
//             }else{
//                 return uint256(price)/decimals;
//             }
//         }else {
//             return priceMap[underlying];
//         }
//     }
//     function getMKRPrice() internal view returns (uint256) {
//         AggregatorV3Interface assetsPrice = assetsMap[3];
//         AggregatorV3Interface ethPrice = assetsMap[0];
//         if (address(assetsPrice) != address(0) && address(ethPrice) != address(0)){
//             (, int price,,,) = assetsPrice.latestRoundData();
//             (, int ethPrice,,,) = ethPrice.latestRoundData();
//             uint256 tokenDecimals = decimalsMap[3];
//             uint256 mkrPrice = uint256(price*ethPrice)/decimals/1e18;
//             if (tokenDecimals < 18){
//                 return mkrPrice/decimals*(10**(18-tokenDecimals));
//             }else if (tokenDecimals > 18){
//                 return mkrPrice/decimals/(10**(18-tokenDecimals));
//             }else{
//                 return mkrPrice/decimals;
//             }
//         }else {
//             return priceMap[3];
//         }
//     }
//     /**
//       * @notice set price of an asset
//       * @dev function to set price for an asset
//       * @param asset Asset for which to set the price
//       * @param price the Asset's price
//       */
//     function setPrice(address asset,uint256 price) public onlyOperatorIndex(0) {
//         priceMap[uint256(asset)] = price;

//     }
//     /**
//       * @notice set price of an underlying
//       * @dev function to set price for an underlying
//       * @param underlying underlying for which to set the price
//       * @param price the underlying's price
//       */
//     function setUnderlyingPrice(uint256 underlying,uint256 price) public onlyOperatorIndex(0) {
//         require(underlying>0 , "underlying cannot be zero");
//         priceMap[underlying] = price;
//     }
//         /**
//       * @notice set price of an asset
//       * @dev function to set price for an asset
//       * @param asset Asset for which to set the price
//       * @param aggergator the Asset's aggergator
//       */
//     function setAssetsAggregator(address asset,address aggergator,uint256 _decimals) public onlyOwner {
//         assetsMap[uint256(asset)] = AggregatorV3Interface(aggergator);
//         decimalsMap[uint256(asset)] = _decimals;
//     }
//     /**
//       * @notice set price of an underlying
//       * @dev function to set price for an underlying
//       * @param underlying underlying for which to set the price
//       * @param aggergator the underlying's aggergator
//       */
//     function setUnderlyingAggregator(uint256 underlying,address aggergator,uint256 _decimals) public onlyOwner {
//         require(underlying>0 , "underlying cannot be zero");
//         assetsMap[underlying] = AggregatorV3Interface(aggergator);
//         decimalsMap[underlying] = _decimals;
//     }
//     function getAssetsAggregator(address asset) public view returns (address,uint256) {
//         return (address(assetsMap[uint256(asset)]),decimalsMap[uint256(asset)]);
//     }
//     function getUnderlyingAggregator(uint256 underlying) public view returns (address,uint256) {
//         return (address(assetsMap[underlying]),decimalsMap[underlying]);
//     }
// }
