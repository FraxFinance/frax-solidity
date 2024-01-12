//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./ABDKMath64x64.sol";
import "./StakedFPI.sol";


/**
 * FPI staking pool.
 */
contract FPIStaking is Ownable {
    using ABDKMath64x64 for int128;
    IERC20 public FPI;
    StakedFPI public sFPI;
    IExitQueue public EXIT_QUEUE;
    uint256 public stakingMultiplier;
    uint256 public lastUpdatedTime;
    uint256 public PERIOD = 100*24*60*60; // 100 days
    uint256 PRECISION = 1e18;
    
    constructor(IERC20 _FPI, uint256 _PERIOD) {
        FPI = _FPI;
        PERIOD = _PERIOD;

        // Each version of the staking contract needs it's own instance of StakedFPI, users can use to claim back rewards
        sFPI = new StakedFPI(); 
        lastUpdatedTime = block.timestamp;
        stakingMultiplier=PRECISION;
    }
    
    
    /** Calculate the updated staking multiplier, based on the given time */
    function stakingMultiplierAt(uint256 time) public view returns(uint256) {
        uint256 sFPISupply = sFPI.totalSupply();
        if (sFPISupply==0) return stakingMultiplier;
        else {
            uint256 FPIInContract = FPI.balanceOf(address(this));
            uint256 owedFPI = balance(sFPISupply);
            uint256 rewardsPoolSize = FPIInContract - owedFPI;
            int128 t = ABDKMath64x64.fromUInt(time - lastUpdatedTime).div(ABDKMath64x64.fromUInt(PERIOD));
            uint256 newRewardsPoolSize = ABDKMath64x64.mulu(ABDKMath64x64.exp(-t),rewardsPoolSize);
            return (FPIInContract-newRewardsPoolSize)*PRECISION/sFPISupply;
        }
    }

    /** Updates rewards in pool */
    function _updateStakingMultiplier() internal {
        stakingMultiplier = stakingMultiplierAt(block.timestamp);
        lastUpdatedTime = block.timestamp;
        emit StakingMultiplierUpdated(stakingMultiplier);
    }
    
    
    function stake(uint256 _amountFPI) external returns(uint256 amountSFPI) {
        return stakeFor(msg.sender, _amountFPI);
    }
    
    function stakeFor(address _staker, uint256 _amountFPI) public returns(uint256 amountSFPI) {
        require(_amountFPI > 0, "Cannot stake 0 tokens");

        _updateStakingMultiplier();

        amountSFPI = _amountFPI*PRECISION/stakingMultiplier;

        SafeERC20.safeTransferFrom(FPI, msg.sender, address(this), _amountFPI);
        sFPI.mint(_staker, amountSFPI);
        emit StakeCompleted(_staker, _amountFPI, 0);

        return amountSFPI;
    }

    function unstake(uint256 _amountSFPI) external {      
        require(sFPI.allowance(msg.sender, address(this)) >= _amountSFPI, 'Insufficient sFPI allowance. Cannot unstake');

        _updateStakingMultiplier();
        uint256 unstakeBalanceFPI = balance(_amountSFPI);

        sFPI.burnFrom(msg.sender, _amountSFPI);
        if (address(EXIT_QUEUE)!=address(0)) {
            SafeERC20.safeIncreaseAllowance(FPI, address(EXIT_QUEUE), unstakeBalanceFPI);
            EXIT_QUEUE.join(msg.sender, unstakeBalanceFPI);
        } else SafeERC20.safeTransfer(FPI,msg.sender,unstakeBalanceFPI);

        emit UnstakeCompleted(msg.sender, _amountSFPI);    
    }
    

    
    /** Remove rewards */
    function removeRewards(uint256 _amountFPI) external onlyOwner {
        _updateStakingMultiplier();
        uint256 sFPISupply = sFPI.totalSupply();
        uint256 FPIInContract = FPI.balanceOf(address(this));
        uint256 owedFPI = balance(sFPISupply);
        require (FPIInContract-_amountFPI>=owedFPI,"No enough FPI left");
        SafeERC20.safeTransfer(FPI,msg.sender,_amountFPI);
    } 
    
    /** Update the staking stakingMultiplier */
    function updateStakingMultiplier() external {
        _updateStakingMultiplier();
    }
    
    
    /** Balance in FPI for a given amount of sFPI */
    function balance(uint256 _amountSFPI) public view returns(uint256) {
        return _amountSFPI*stakingMultiplier/PRECISION;
    }    
    
    /** Set exit queue */
    function setExitQueue(IExitQueue _EXIT_QUEUE) external onlyOwner {
        EXIT_QUEUE = _EXIT_QUEUE;
    }
    
     /** Set period */
    function setPeriod(uint256 _PERIOD) external onlyOwner {
        PERIOD = _PERIOD;
    }

    event StakeCompleted(address _staker, uint256 _amount, uint256 _lockedUntil);
    event StakingMultiplierUpdated(uint256 stakingMultiplier);
    event UnstakeCompleted(address _staker, uint256 _amount);   
    
}

interface IExitQueue {
    function join(address user, uint256 amount) external;
}