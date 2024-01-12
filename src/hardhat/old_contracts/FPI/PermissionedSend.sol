//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PermissionedSend is Ownable {
    mapping(address => mapping(address => bool)) _sendAllowed;
    address public operator;
    constructor() {
    	operator = msg.sender;
    }
    
    event OperatorUpdated(address indexed oldOperator, address indexed newOperator);
    
    modifier onlyOperator() {
       require(operator==msg.sender, "PermissionedSend:Caller is not the operator");
       _;
    }
    function setOperator(address newOperator) external onlyOwner {
	address oldOperator = operator;
	operator = newOperator;
	emit OperatorUpdated(oldOperator, newOperator);
    }
    
    function sendERC20(address targetAddress, IERC20 token, uint256 amount) external onlyOperator {
       require(sendAllowed(targetAddress,address(token)),"Send not allowed");
       token.transfer(targetAddress,amount);
    }
    
    function sendETH(address targetAddress, uint256 amount) external onlyOperator {
	require(sendAllowed(targetAddress,address(0)),"Send not allowed");
	(bool sent,) = targetAddress.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    function addTarget(address targetAddress, address tokenAddress) external onlyOwner {
    	require(targetAddress!=address(0),"Zero target adress not allowed");
       _sendAllowed[targetAddress][tokenAddress]=true;
    }
    
    function removeTarget(address targetAddress, address tokenAddress) external onlyOwner {
       _sendAllowed[targetAddress][tokenAddress]=false;
    }
    
    function sendAllowed(address targetAddress, address tokenAddress) public view returns (bool) {
    	return _sendAllowed[targetAddress][tokenAddress];
    }
    
    fallback() external payable {}
    receive() external payable {}
}
