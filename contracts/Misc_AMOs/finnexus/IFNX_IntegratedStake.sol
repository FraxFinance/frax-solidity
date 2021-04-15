// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import '../../ERC20/IERC20.sol';

// Original at https://etherscan.io/address/0x23e54F9bBe26eD55F93F19541bC30AAc2D5569b2
// Some functions were omitted for brevity. See the contract for details

interface IFNX_IntegratedStake {
    function stake(address[] memory fpta_tokens,uint256[] memory fpta_amounts,
            address[] memory fptb_tokens, uint256[] memory fptb_amounts,uint256 lockedPeriod) external;

}


// contract integratedStake is Ownable{
//     using SafeERC20 for IERC20;
//     address public _FPTA;
//     address public _FPTB;
//     address public _FPTAColPool;//the option manager address
//     address public _FPTBColPool;//the option manager address
//     address public _minePool;    //the fixed minePool address
//     mapping (address=>bool) approveMapA;
//     mapping (address=>bool) approveMapB;
//     uint256  constant internal MAX_UINT = (2**256 - 1); 
//     /**
//      * @dev constructor.
//      */
//     constructor(address FPTA,address FPTB,address FPTAColPool,address FPTBColPool,address minePool)public{
//         setAddress(FPTA,FPTB,FPTAColPool,FPTBColPool,minePool);
//     }
//     function setAddress(address FPTA,address FPTB,address FPTAColPool,address FPTBColPool,address minePool) onlyOwner public{
//         _FPTA = FPTA;
//         _FPTB = FPTB;
//         _FPTAColPool = FPTAColPool;
//         _FPTBColPool = FPTBColPool;
//         _minePool = minePool;
//         if (IERC20(_FPTA).allowance(msg.sender, _minePool) == 0){
//             IERC20(_FPTA).safeApprove(_minePool,MAX_UINT);
//         }
//         if (IERC20(_FPTB).allowance(msg.sender, _minePool) == 0){
//             IERC20(_FPTB).safeApprove(_minePool,MAX_UINT);
//         }
//     }
//     function stake(address[] memory fpta_tokens,uint256[] memory fpta_amounts,
//             address[] memory fptb_tokens,uint256[] memory fptb_amounts,uint256 lockedPeriod) public{
//         require(fpta_tokens.length==fpta_amounts.length && fptb_tokens.length==fptb_amounts.length,"the input array length is not equal");
//         uint256 i = 0;
//         for(i = 0;i<fpta_tokens.length;i++) {
//             if (!approveMapA[fpta_tokens[i]]){
//                 IERC20(fpta_tokens[i]).safeApprove(_FPTAColPool,MAX_UINT);
//                 approveMapA[fpta_tokens[i]] = true;
//             }
//             uint256 amount = getPayableAmount(fpta_tokens[i],fpta_amounts[i]);
//             IOptionMgrPoxy(_FPTAColPool).addCollateral(fpta_tokens[i],amount);
//             IERC20(_FPTA).safeTransfer(msg.sender,0);
//         }
//         for(i = 0;i<fptb_tokens.length;i++) {
//             if (!approveMapB[fptb_tokens[i]]){
//                 IERC20(fptb_tokens[i]).safeApprove(_FPTBColPool,MAX_UINT);
//                 approveMapB[fptb_tokens[i]] = true;
//             }
//             uint256 amount = getPayableAmount(fptb_tokens[i],fptb_amounts[i]);
//             IOptionMgrPoxy(_FPTBColPool).addCollateral(fptb_tokens[i],amount);
//             IERC20(_FPTB).safeTransfer(msg.sender,0);
//         }
//         IMinePool(_minePool).lockAirDrop(msg.sender,lockedPeriod);
//     }
//     /**
//      * @dev Auxiliary function. getting user's payment
//      * @param settlement user's payment coin.
//      * @param settlementAmount user's payment amount.
//      */
//     function getPayableAmount(address settlement,uint256 settlementAmount) internal returns (uint256) {
//         if (settlement == address(0)){
//             settlementAmount = msg.value;
//         }else if (settlementAmount > 0){
//             IERC20 oToken = IERC20(settlement);
//             uint256 preBalance = oToken.balanceOf(address(this));
//             oToken.safeTransferFrom(msg.sender, address(this), settlementAmount);
//             //oToken.transferFrom(msg.sender, address(this), settlementAmount);
//             uint256 afterBalance = oToken.balanceOf(address(this));
//             require(afterBalance-preBalance==settlementAmount,"settlement token transfer error!");
//         }
//         return settlementAmount;
//     }
// }