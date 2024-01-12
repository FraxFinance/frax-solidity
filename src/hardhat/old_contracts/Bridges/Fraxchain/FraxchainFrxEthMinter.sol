// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================= FraxchainFrxEthMinter ======================
// ====================================================================
// Takes ETH and gives back frxETH.
// Stripped down version of the Ethereum mainnet frxETHMinter.
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Jack Corddry: https://github.com/corddry
// Travis Moore: https://github.com/FortisFortuna

import { IfrxETH } from "../../FraxETH/IfrxETH.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../Staking/Owned.sol";

/// @title Authorized minter contract for frxETH
/// @notice Accepts user-supplied ETH and converts it to frxETH (submit()), and also optionally inline stakes it for sfrxETH (submitAndDeposit())
/** @dev Has permission to mint frxETH. */
contract FraxchainFrxEthMinter is Owned, ReentrancyGuard {    
    uint256 public constant RATIO_PRECISION = 1e6; // 1,000,000 

    IfrxETH public immutable frxETHToken;

    bool public submitPaused;

    address public timelock_address;

    constructor(
        address _owner, 
        address _timelock_address,
        address _frxETHAddress
    ) Owned(_owner) {
        timelock_address = _timelock_address;
        frxETHToken = IfrxETH(_frxETHAddress);
    }

    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    /// @notice Mint frxETH to the recipient using sender's funds. Internal portion
    function _submit(address recipient) internal nonReentrant {
        // Initial pause and value checks
        require(!submitPaused, "Submit is paused");
        require(msg.value != 0, "Cannot submit 0");

        // Give the sender frxETH
        frxETHToken.minter_mint(recipient, msg.value);

        emit ETHSubmitted(msg.sender, recipient, msg.value);
    }

    /// @notice Mint frxETH to the sender depending on the ETH value sent
    function submit() external payable {
        _submit(msg.sender);
    }

    /// @notice Mint frxETH to the recipient using sender's funds
    function submitAndGive(address recipient) external payable {
        _submit(recipient);
    }

    /// @notice Fallback to minting frxETH to the sender
    receive() external payable {
        _submit(msg.sender);
    }


    /// @notice Toggle allowing submites
    function togglePauseSubmits() external onlyByOwnGov {
        submitPaused = !submitPaused;

        emit SubmitPaused(submitPaused);
    }

    /// @notice For emergencies if something gets stuck
    function recoverEther(uint256 amount) external onlyByOwnGov {
        (bool success,) = address(owner).call{ value: amount }("");
        require(success, "Invalid transfer");

        emit EmergencyEtherRecovered(amount);
    }

    /// @notice For emergencies if someone accidentally sent some ERC20 tokens here
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyByOwnGov {
        require(IERC20(tokenAddress).transfer(owner, tokenAmount), "recoverERC20: Transfer failed");

        emit EmergencyERC20Recovered(tokenAddress, tokenAmount);
    }

    /// @notice Set the timelock contract
    function setTimelock(address _timelock_address) external onlyByOwnGov {
        require(_timelock_address != address(0), "Zero address detected");
        timelock_address = _timelock_address;
        emit TimelockChanged(_timelock_address);
    }

    event EmergencyEtherRecovered(uint256 amount);
    event EmergencyERC20Recovered(address tokenAddress, uint256 tokenAmount);
    event ETHSubmitted(address indexed sender, address indexed recipient, uint256 sent_amount);
    event SubmitPaused(bool new_status);
    event TimelockChanged(address timelock_address);
}
