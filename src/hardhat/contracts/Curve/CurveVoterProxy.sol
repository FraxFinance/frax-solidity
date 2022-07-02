// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========================== CurveVoterProxy =========================
// ====================================================================
// Locks CRV, then uses it for gauge voting, depositing, rewards collection, etc
// Graciously stolen from Convex, then modified
// https://github.com/convex-eth/platform/blob/main/contracts/contracts/VoterProxy.sol

// Frax Finance: https://github.com/FraxFinance

// Frax Primary Forker(s) / Modifier(s) 
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// C2tP: https://github.com/C2tP-C2tP

import "../ERC20/ERC20.sol";
import "../ERC20/IERC20.sol";
import "../ERC20/SafeERC20.sol";
import "../Staking/Owned.sol";
import "./CurveInterfaces.sol";
import '../Math/SafeMath.sol';
import '../Uniswap/TransferHelper.sol';
import '../Utils/Address.sol';

contract CurveVoterProxy is Owned {
    using SafeERC20 for IERC20;
    using Address for address;
    using SafeMath for uint256;

    address public constant mintr = address(0xd061D61a4d941c39E5453435B6345Dc261C2fcE0);
    address public constant crv = address(0xD533a949740bb3306d119CC777fa900bA034cd52);

    address public constant escrow = address(0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2);
    address public constant gaugeController = address(0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB);
    IFeeDistro public feeDistroDefault = IFeeDistro(0xA464e6DCda8AC41e03616F95f4BC98a13b8922Dc);
    
    address public operator;
    address public depositor;


    /* ========== CONSTRUCTOR ========== */

    constructor(
        address _owner,
        address _operator,
        address _depositor
    ) Owned(_owner) {
        operator = _operator;
        depositor = _depositor;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyOperator() {
        require(msg.sender == operator, "Not operator");
        _;
    }

    modifier onlyDepositor() {
        require(msg.sender == depositor, "Not depositor");
        _;
    }

    /* ========== VIEWS ========== */

    function getName() external pure returns (string memory) {
        return "CurveVoterProxy";
    }

    function balanceOfPool(address _gauge) public view returns (uint256) {
        return ICurveGauge(_gauge).balanceOf(address(this));
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _withdrawSome(address _gauge, uint256 _amount) internal returns (uint256) {
        ICurveGauge(_gauge).withdraw(_amount);
        return _amount;
    }

    /* ========== OWNER ONLY ========== */

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function setDepositor(address _depositor) external onlyOwner {
        depositor = _depositor;
    }

    function setFeeDistroDefault(address _fee_distro_default) external onlyOwner {
        feeDistroDefault = IFeeDistro(_fee_distro_default);
    }

    /* ========== OPERATOR ONLY ========== */

    function deposit(address _token, address _gauge) external onlyOperator returns (bool) {
        uint256 balance = IERC20(_token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(_token).safeApprove(_gauge, 0);
            IERC20(_token).safeApprove(_gauge, balance);
            ICurveGauge(_gauge).deposit(balance);
        }
        return true;
    }

    // Withdraw partial funds
    function withdraw(address _token, address _gauge, uint256 _amount) public onlyOperator returns (bool) {
        uint256 _balance = IERC20(_token).balanceOf(address(this));
        if (_balance < _amount) {
            _amount = _withdrawSome(_gauge, _amount.sub(_balance));
            _amount = _amount.add(_balance);
        }
        IERC20(_token).safeTransfer(msg.sender, _amount);
        return true;
    }

    function withdrawAll(address _token, address _gauge) external onlyOperator returns (bool) {
        uint256 amount = balanceOfPool(_gauge).add(IERC20(_token).balanceOf(address(this)));
        withdraw(_token, _gauge, amount);
        return true;
    }

    function vote(uint256 _voteId, address _votingAddress, bool _support) external onlyOperator returns (bool) {
        IVoting(_votingAddress).vote(_voteId, _support, false);
        return true;
    }

    function voteGaugeWeight(address _gauge, uint256 _weight) public onlyOperator returns (bool) {
        IVoting(gaugeController).vote_for_gauge_weights(_gauge, _weight);
        return true;
    }

    function voteGaugeWeightMany(address[] memory _gauges, uint256[] memory _weights) external onlyOperator returns (bool) {
        for (uint256 i = 0; i < _gauges.length; i++){
            voteGaugeWeight(_gauges[i], _weights[i]);
        }
        
        return true;
    }

    function claimCrv(address _gauge) public onlyOperator returns (uint256) {
        uint256 _balance = 0;
        try IMinter(mintr).mint(_gauge){
            _balance = IERC20(crv).balanceOf(address(this));
        } catch {

        }

        return _balance;
    }

    function claimCrvMany(address[] memory _gauges) external onlyOperator returns (uint256[] memory balances) {
        for (uint256 i = 0; i < _gauges.length; i++){
           balances[i] = claimCrv(_gauges[i]);
        }
    }

    function claimRewards(address _gauge) public onlyOperator returns (bool) {
        ICurveGauge(_gauge).claim_rewards();
        return true;
    }

    function claimRewardsMany(address[] memory _gauges) external onlyOperator returns (bool) {
        for (uint256 i = 0; i < _gauges.length; i++){
           claimRewards(_gauges[i]);
        }
        return true;
    }

    function claimEverything(address[] memory _gauges) external onlyOperator returns (bool) {
        // CRV fee distributor
        address p = address(this);
        feeDistroDefault.claim_many([p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p]);

        // Gauge specific rewards
        for (uint256 i = 0; i < _gauges.length; i++){
           claimCrv(_gauges[i]);
           claimRewards(_gauges[i]);
        }
        return true;
    }

    function claimFees(address _distroContract, address _token, uint256 arr_length) public onlyOperator returns (uint256) {
        address p = address(this);
        IFeeDistro(_distroContract).claim_many([p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p, p]);
        uint256 _balance = IERC20(_token).balanceOf(address(this));
        IERC20(_token).safeTransfer(operator, _balance);
        return _balance;
    }  

    function recoverManyERC20s(address[] memory tokenAddresses, uint256[] memory tokenAmounts, bool withdraw_entire_balance) external onlyOperator { 
        for (uint256 i = 0; i < tokenAddresses.length; i++){
            uint256 balance_to_use = withdraw_entire_balance ? IERC20(tokenAddresses[i]).balanceOf(address(this)) : tokenAmounts[i];
            IERC20(tokenAddresses[i]).safeTransfer(operator, balance_to_use);
        }
    }

    function recoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOperator {
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tokenAmount);
    }

    function recoverERC20All(address tokenAddress) external onlyOperator {
        uint256 tkn_bal = ERC20(tokenAddress).balanceOf(address(this));
        TransferHelper.safeTransfer(address(tokenAddress), msg.sender, tkn_bal);
    }

    // Generic proxy
    function execute(
        address _to,
        uint256 _value,
        bytes calldata _data
    ) external onlyOperator returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value:_value}(_data);

        return (success, result);
    }

    /* ========== DEPOSITOR ONLY ========== */

    function createLock(uint256 _value, uint256 _unlockTime) external onlyDepositor returns (bool) {
        IERC20(crv).safeApprove(escrow, 0);
        IERC20(crv).safeApprove(escrow, _value);
        ICurveVoteEscrow(escrow).create_lock(_value, _unlockTime);
        return true;
    }

    function increaseAmount(uint256 _value) external onlyDepositor returns (bool) {
        IERC20(crv).safeApprove(escrow, 0);
        IERC20(crv).safeApprove(escrow, _value);
        ICurveVoteEscrow(escrow).increase_amount(_value);
        return true;
    }

    function increaseTime(uint256 _value) external onlyDepositor returns (bool) {
        ICurveVoteEscrow(escrow).increase_unlock_time(_value);
        return true;
    }

    function release() external onlyDepositor returns (bool) {
        ICurveVoteEscrow(escrow).withdraw();
        return true;
    }
}