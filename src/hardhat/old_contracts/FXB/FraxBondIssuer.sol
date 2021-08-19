// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ========= Bond Issuer with virtual AMM for FraxBonds (FXB) =========
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian
// Dennis: github.com/denett

import "../Math/SafeMath.sol";
import "./FXB.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../Governance/AccessControl.sol";

contract FraxBondIssuer is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */
    enum DirectionChoice { BELOW_TO_PRICE_FRAX_IN, ABOVE_TO_PRICE }

    FRAXStablecoin private FRAX;
    FraxBond private FXB;

    address public owner_address;
    address public timelock_address;
    address public controller_address;

    uint256 public constant PRICE_PRECISION = 1e6;
    uint256 private constant PRICE_PRECISION_SQUARED = 1e12;
    uint256 private constant PRICE_PRECISION_SQRT = 1e3;

    // Minimum cooldown period before a new epoch, in seconds
    // Bonds should be redeemed during this time, or they risk being rebalanced with a new epoch
    uint256 public cooldown_period = 864000; // 10 days

    // Max FXB outstanding
    uint256 public max_fxb_outstanding = 1000000e18;

    // Target liquidity of FXB for the vAMM
    uint256 public target_liquidity_fxb = 500000e18;

    // Issuable FXB
    // This will be sold at the floor price until depleted, and bypass the vAMM
    uint256 public issuable_fxb = 80000e18;
    uint256 public issue_price = 750000;

    // Set fees, E6
    uint256 public issue_fee = 500; // 0.05% initially
    uint256 public buying_fee = 1500; // 0.15% initially
    uint256 public selling_fee = 1500; // 0.15% initially
    uint256 public redemption_fee = 500; // 0.05% initially

    // Epoch start and end times
    uint256 public epoch_start;
    uint256 public epoch_end;
    
    // Epoch length
    uint256 public epoch_length = 31536000; // 1 year

    // Initial discount rates per epoch, in E6
    uint256 public initial_discount = 200000; // 20% initially

    // Minimum collateral ratio
    uint256 public min_collateral_ratio = 850000;

    // Governance variables
    address public DEFAULT_ADMIN_ADDRESS;
    bytes32 public constant ISSUING_PAUSER = keccak256("ISSUING_PAUSER");
    bytes32 public constant BUYING_PAUSER = keccak256("BUYING_PAUSER");
    bytes32 public constant SELLING_PAUSER = keccak256("SELLING_PAUSER");
    bytes32 public constant REDEEMING_PAUSER = keccak256("REDEEMING_PAUSER");
    bool public issuingPaused = false;
    bool public buyingPaused = false;
    bool public sellingPaused = false;
    bool public redeemingPaused = false;

    // Virtual balances
    uint256 public vBal_FRAX;
    uint256 public vBal_FXB;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerControllerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address || msg.sender == controller_address, "Not the owner, controller, or the governance timelock");
        _;
    }

    modifier onlyByOwnerOrTimelock() {
        require(msg.sender == owner_address || msg.sender == timelock_address, "Not owner or timelock");
        _;
    }

    modifier notIssuingPaused() {
        require(issuingPaused == false, "Issuing is paused");
        _;
    }

    modifier notBuyingPaused() {
        require(buyingPaused == false, "Buying is paused");
        _;
    }

    modifier notSellingPaused() {
        require(sellingPaused == false, "Selling is paused");
        _;
    }

    modifier notRedeemingPaused() {
        require(redeemingPaused == false, "Redeeming is paused");
        _;
    }

    /* ========== CONSTRUCTOR ========== */
    
    constructor (
        address _frax_contract_address,
        address _fxb_contract_address,
        address _owner_address,
        address _timelock_address,
        address _controller_address
    ) {
        FRAX = FRAXStablecoin(_frax_contract_address);
        FXB = FraxBond(_fxb_contract_address);
        owner_address = _owner_address;
        timelock_address = _timelock_address;
        controller_address = _controller_address;

        // Needed for initialization
        epoch_start = (block.timestamp).sub(cooldown_period).sub(epoch_length);
        epoch_end = (block.timestamp).sub(cooldown_period);
        
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        grantRole(ISSUING_PAUSER, _owner_address);
        grantRole(ISSUING_PAUSER, _timelock_address);
        grantRole(ISSUING_PAUSER, _controller_address);
        grantRole(BUYING_PAUSER, _owner_address);
        grantRole(BUYING_PAUSER, _timelock_address);
        grantRole(BUYING_PAUSER, _controller_address);
        grantRole(SELLING_PAUSER, _owner_address);
        grantRole(SELLING_PAUSER, _timelock_address);
        grantRole(SELLING_PAUSER, _controller_address);
        grantRole(REDEEMING_PAUSER, _owner_address);
        grantRole(REDEEMING_PAUSER, _timelock_address);
        grantRole(REDEEMING_PAUSER, _controller_address);
    }

    /* ========== VIEWS ========== */

    // Returns some info
    function issuer_info() public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool, bool, uint256, uint256) {
        return (
            issue_fee,
            buying_fee,
            selling_fee,
            redemption_fee,
            issuable_fxb,
            epoch_start,
            epoch_end,
            maximum_fxb_AMM_sellable_above_floor(),
            amm_spot_price(),
            floor_price(),
            isInEpoch(),
            isInCooldown(),
            cooldown_period,
            issue_price
        );
    }

    // Needed for the Frax contract to function without bricking
    function collatDollarBalance() external pure returns (uint256) {
        return uint256(1e18); // 1 nonexistant USDC
    }

    // Checks if the bond is in a maturity epoch
    function isInEpoch() public view returns (bool in_epoch) {
        in_epoch = ((block.timestamp >= epoch_start) && (block.timestamp < epoch_end));
    }

    // Checks if the bond is in the cooldown period
    function isInCooldown() public view returns (bool in_cooldown) {
        in_cooldown = ((block.timestamp >= epoch_end) && (block.timestamp < epoch_end.add(cooldown_period)));
    }

    // Liquidity balances for the floor price
    function getVirtualFloorLiquidityBalances() public view returns (uint256 frax_balance, uint256 fxb_balance) {
        frax_balance = target_liquidity_fxb.mul(floor_price()).div(PRICE_PRECISION);
        fxb_balance = target_liquidity_fxb;
    }

    // vAMM price for 1 FXB, in FRAX
    // The contract won't necessarily sell or buy at this price
    function amm_spot_price() public view returns (uint256 fxb_price) {
        fxb_price = vBal_FRAX.mul(PRICE_PRECISION).div(vBal_FXB);
    }

    // FXB floor price for 1 FXB, in FRAX
    // Will be used to help prevent someone from doing a huge arb with cheap bonds right before they mature
    // Also allows the vAMM to buy back cheap FXB under the floor and retire it, meaning less to pay back later at face value
    function floor_price() public view returns (uint256 _floor_price) {
        uint256 time_into_epoch = (block.timestamp).sub(epoch_start);
        _floor_price = (PRICE_PRECISION.sub(initial_discount)).add(initial_discount.mul(time_into_epoch).div(epoch_length));
    }

    function initial_price() public view returns (uint256 _initial_price) {
        _initial_price = (PRICE_PRECISION.sub(initial_discount));
    }

    // How much FRAX is needed to buy out the remaining unissued FXB
    function frax_to_buy_out_issue() public view returns (uint256 frax_value) {
        uint256 fxb_fee_amt = issuable_fxb.mul(issue_fee).div(PRICE_PRECISION);
        frax_value = (issuable_fxb.add(fxb_fee_amt)).mul(issue_price).div(PRICE_PRECISION);
    }

    // Maximum amount of FXB you can sell into the vAMM at market prices before it hits the floor price and either cuts off
    // or sells at the floor price, dependingon how sellFXBintoAMM is called
    // If the vAMM price is above the floor, you may sell FXB until doing so would push the price down to the floor
    // Will be 0 if the vAMM price is at or below the floor price
    function maximum_fxb_AMM_sellable_above_floor() public view returns (uint256 maximum_fxb_for_sell) {
        uint256 the_floor_price = floor_price();

        if (amm_spot_price() > the_floor_price){
            maximum_fxb_for_sell = getBoundedIn(DirectionChoice.ABOVE_TO_PRICE, the_floor_price);
        }
        else {
            maximum_fxb_for_sell = 0;
        }
    }

    // Used for buying up to the issue price from below
    function frax_from_spot_to_issue() public view returns (uint256 frax_spot_to_issue) {
        if (amm_spot_price() < issue_price){
            frax_spot_to_issue = getBoundedIn(DirectionChoice.BELOW_TO_PRICE_FRAX_IN, issue_price);
        }
        else {
            frax_spot_to_issue = 0;
        }
    }
    


    /* ========== PUBLIC FUNCTIONS ========== */

    // Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // Uses constant product concept https://uniswap.org/docs/v2/core-concepts/swaps/
    function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint the_fee) public pure returns (uint amountOut) {
        require(amountIn > 0, 'FraxBondIssuer: INSUFFICIENT_INPUT_AMOUNT');
        require(reserveIn > 0 && reserveOut > 0, 'FraxBondIssuer: INSUFFICIENT_LIQUIDITY');
        uint amountInWithFee = amountIn.mul(uint(PRICE_PRECISION).sub(the_fee));
        uint numerator = amountInWithFee.mul(reserveOut);
        uint denominator = (reserveIn.mul(PRICE_PRECISION)).add(amountInWithFee);
        amountOut = numerator.div(denominator);
    }

    function getAmountOutNoFee(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut) {
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut, 0);
    }

    function buyUnissuedFXB(uint256 frax_in, uint256 fxb_out_min) public notIssuingPaused returns (uint256 fxb_out, uint256 fxb_fee_amt) {
        require(isInEpoch(), 'Not in an epoch');
        require(issuable_fxb > 0, 'No new FXB to issue');
        require(FRAX.frax_price() < PRICE_PRECISION, "FRAX price must be less than $1");
        require(FRAX.global_collateral_ratio() >= min_collateral_ratio, "FRAX is already too undercollateralized");

        // Issue at the issue_price or the floor_price, whichever is higher
        uint256 price_to_use = issue_price;
        {
            uint256 the_floor_price = floor_price();
            if (the_floor_price > issue_price) {
                price_to_use = the_floor_price;
            }
        }
        
        // Get the expected amount of FXB from the floor-priced portion
        fxb_out = frax_in.mul(PRICE_PRECISION).div(price_to_use);

        // Calculate and apply the normal buying fee
        fxb_fee_amt = fxb_out.mul(issue_fee).div(PRICE_PRECISION);

        // Apply the fee
        fxb_out = fxb_out.sub(fxb_fee_amt);

        // Check fxb_out_min
        require(fxb_out >= fxb_out_min, "[buyUnissuedFXB fxb_out_min]: Slippage limit reached");

        // Check the limit
        require(fxb_out <= issuable_fxb, 'Trying to buy too many unissued bonds');

        // Safety check
        require(((FXB.totalSupply()).add(fxb_out)) <= max_fxb_outstanding, "New issue would exceed max_fxb_outstanding");

        // Decrement the unissued amount
        issuable_fxb = issuable_fxb.sub(fxb_out);

        // Zero out precision-related crumbs if less than 1 FXB left 
        if (issuable_fxb < uint256(1e18)) {
            issuable_fxb = 0;
        }

        // Burn FRAX from the sender. No vAMM balance change here
        FRAX.pool_burn_from(msg.sender, frax_in);

        // Mint FXB to the sender. No vAMM balance change here
        FXB.issuer_mint(msg.sender, fxb_out);
    }

    function buyFXBfromAMM(uint256 frax_in, uint256 fxb_out_min) external notBuyingPaused returns (uint256 fxb_out, uint256 fxb_fee_amt) {
        require(isInEpoch(), 'Not in an epoch');

        // Get the vAMM price
        uint256 spot_price = amm_spot_price();

        // Rebalance the vAMM if applicable
        // This may be the case if the floor price moved up slowly and nobody made any purchases for a while
        {
            if (spot_price < floor_price()){
                _rebalance_AMM_FXB();
                _rebalance_AMM_FRAX_to_price(floor_price());
            }
        }

        // Calculate the FXB output
        fxb_out = getAmountOutNoFee(frax_in, vBal_FRAX, vBal_FXB);

        // Calculate and apply the normal buying fee
        fxb_fee_amt = fxb_out.mul(buying_fee).div(PRICE_PRECISION);

        // Apply the fee
        fxb_out = fxb_out.sub(fxb_fee_amt);

        // Check fxb_out_min
        require(fxb_out >= fxb_out_min, "[buyFXBfromAMM fxb_out_min]: Slippage limit reached");

        // Safety check
        require(((FXB.totalSupply()).add(fxb_out)) <= max_fxb_outstanding, "New issue would exceed max_fxb_outstanding");

        // Burn FRAX from the sender and increase the virtual balance
        FRAX.burnFrom(msg.sender, frax_in);
        vBal_FRAX = vBal_FRAX.add(frax_in);

        // Mint FXB to the sender and decrease the virtual balance
        FXB.issuer_mint(msg.sender, fxb_out);
        vBal_FXB = vBal_FXB.sub(fxb_out);

        // vAMM will burn FRAX if the effective sale price is above 1. It is essentially free FRAX and a protocol-level profit
        {
            uint256 effective_sale_price = frax_in.mul(PRICE_PRECISION).div(fxb_out);
            if(effective_sale_price > PRICE_PRECISION){
                // Rebalance to $1
                _rebalance_AMM_FXB();
                _rebalance_AMM_FRAX_to_price(PRICE_PRECISION);
            }
        }
    }

    function sellFXBintoAMM(uint256 fxb_in, uint256 frax_out_min) external notSellingPaused returns (uint256 fxb_bought_above_floor, uint256 fxb_sold_under_floor, uint256 frax_out, uint256 frax_fee_amt) {
        require(isInEpoch(), 'Not in an epoch');

        fxb_bought_above_floor = fxb_in;
        fxb_sold_under_floor = 0;

        // The vAMM will buy back FXB at market rates in all cases
        // However, any FXB bought back under the floor price will be burned
        uint256 max_above_floor_sellable_fxb = maximum_fxb_AMM_sellable_above_floor();
        if(fxb_in >= max_above_floor_sellable_fxb){
            fxb_bought_above_floor = max_above_floor_sellable_fxb;
            fxb_sold_under_floor = fxb_in.sub(max_above_floor_sellable_fxb);
        }
        else {
            // no change to fxb_bought_above_floor
            fxb_sold_under_floor = 0;
        }

        // Get the expected amount of FRAX from above the floor
        uint256 frax_out_above_floor = 0;
        if (fxb_bought_above_floor > 0){
            frax_out_above_floor = getAmountOutNoFee(fxb_bought_above_floor, vBal_FXB, vBal_FRAX);
        
            // Apply the normal selling fee to this portion
            uint256 fee_above_floor = frax_out_above_floor.mul(selling_fee).div(PRICE_PRECISION);
            frax_out_above_floor = frax_out_above_floor.sub(fee_above_floor);

            // Informational for return values
            frax_fee_amt += fee_above_floor;
            frax_out += frax_out_above_floor;
        }

        // Get the expected amount of FRAX from below the floor
        // Need to adjust the balances virtually for this
        uint256 frax_out_under_floor = 0;
        if (fxb_sold_under_floor > 0){
            // Get the virtual amount under the floor
            (uint256 frax_floor_balance_virtual, uint256 fxb_floor_balance_virtual) = getVirtualFloorLiquidityBalances();
            frax_out_under_floor = getAmountOutNoFee(fxb_sold_under_floor, fxb_floor_balance_virtual.add(fxb_bought_above_floor), frax_floor_balance_virtual.sub(frax_out_above_floor));

            // Apply the normal selling fee to this portion
            uint256 fee_below_floor = frax_out_under_floor.mul(selling_fee).div(PRICE_PRECISION);
            frax_out_under_floor = frax_out_under_floor.sub(fee_below_floor);

            // Informational for return values
            frax_fee_amt += fee_below_floor;
            frax_out += frax_out_under_floor;
        }
        
        // Check frax_out_min
        require(frax_out >= frax_out_min, "[sellFXBintoAMM frax_out_min]: Slippage limit reached");

        // Take FXB from the sender and increase the virtual balance
        FXB.burnFrom(msg.sender, fxb_in);
        vBal_FXB = vBal_FXB.add(fxb_in);
        
        // Give FRAX to sender from the vAMM and decrease the virtual balance
        FRAX.pool_mint(msg.sender, frax_out);
        vBal_FRAX = vBal_FRAX.sub(frax_out);

        // If any FXB was sold under the floor price, retire / burn it and rebalance the pool
        // This is less FXB that will have to be redeemed at full value later and is essentially a protocol-level profit
        if (fxb_sold_under_floor > 0){
            // Rebalance to the floor
            _rebalance_AMM_FXB();
            _rebalance_AMM_FRAX_to_price(floor_price());
        }
    }

    function redeemFXB(uint256 fxb_in) external notRedeemingPaused returns (uint256 frax_out, uint256 frax_fee) {
        require(!isInEpoch(), 'Not in the cooldown period or outside an epoch');
        
        // Burn FXB from the sender
        FXB.burnFrom(msg.sender, fxb_in);

        // Give 1 FRAX per 1 FXB, minus the redemption fee
        frax_fee = fxb_in.mul(redemption_fee).div(PRICE_PRECISION);
        frax_out = fxb_in.sub(frax_fee);

        // Give the FRAX to the redeemer
        FRAX.pool_mint(msg.sender, frax_out);

        emit FXB_Redeemed(msg.sender, fxb_in, frax_out);
    }
   
    /* ========== RESTRICTED INTERNAL FUNCTIONS ========== */

    function _rebalance_AMM_FRAX_to_price(uint256 rebalance_price) internal {
        // Safety checks
        require(rebalance_price <= PRICE_PRECISION, "Rebalance price too high");
        require(rebalance_price >= (PRICE_PRECISION.sub(initial_discount)), "Rebalance price too low"); 

        uint256 frax_required = target_liquidity_fxb.mul(rebalance_price).div(PRICE_PRECISION);
        if (frax_required > vBal_FRAX){
            // Virtually add the deficiency
            vBal_FRAX = vBal_FRAX.add(frax_required.sub(vBal_FRAX));
        }
        else if (frax_required < vBal_FRAX){
            // Virtually subtract the excess
            vBal_FRAX = vBal_FRAX.sub(vBal_FRAX.sub(frax_required));
        }
        else if (frax_required == vBal_FRAX){
            // Do nothing
        }
    }

    function _rebalance_AMM_FXB() internal {
        uint256 fxb_required = target_liquidity_fxb;
        if (fxb_required > vBal_FXB){
            // Virtually add the deficiency
            vBal_FXB = vBal_FXB.add(fxb_required.sub(vBal_FXB));
        }
        else if (fxb_required < vBal_FXB){
            // Virtually subtract the excess
            vBal_FXB = vBal_FXB.sub(vBal_FXB.sub(fxb_required));
        }
        else if (fxb_required == vBal_FXB){
            // Do nothing
        }

        // Quick safety check
        require(((FXB.totalSupply()).add(issuable_fxb)) <= max_fxb_outstanding, "Rebalance would exceed max_fxb_outstanding");
    }

    function getBoundedIn(DirectionChoice choice, uint256 the_price) internal view returns (uint256 bounded_amount) {        
        if (choice == DirectionChoice.BELOW_TO_PRICE_FRAX_IN) {
            uint256 numerator = sqrt(vBal_FRAX).mul(sqrt(vBal_FXB)).mul(PRICE_PRECISION_SQRT);
            // The "price" here needs to be inverted 
            uint256 denominator = sqrt((PRICE_PRECISION_SQUARED).div(the_price));
            bounded_amount = numerator.div(denominator).sub(vBal_FRAX);
        }
        else if (choice == DirectionChoice.ABOVE_TO_PRICE) {
            uint256 numerator = sqrt(vBal_FRAX).mul(sqrt(vBal_FXB)).mul(PRICE_PRECISION_SQRT);
            uint256 denominator = sqrt(the_price);
            bounded_amount = numerator.div(denominator).sub(vBal_FXB);
        }
    }

    /* ========== RESTRICTED EXTERNAL FUNCTIONS ========== */

    // Allows for expanding the liquidity mid-epoch
    // The expansion must occur at the current vAMM price
    function expand_AMM_liquidity(uint256 fxb_expansion_amount, bool do_rebalance) external onlyByOwnerControllerOrGovernance {
        require(isInEpoch(), 'Not in an epoch');
        require(FRAX.global_collateral_ratio() >= min_collateral_ratio, "FRAX is already too undercollateralized");

        // Expand the FXB target liquidity
        target_liquidity_fxb = target_liquidity_fxb.add(fxb_expansion_amount);

        // Optionally do the rebalance. If not, it will be done at an applicable time in one of the buy / sell functions
        if (do_rebalance) {
            rebalance_AMM_liquidity_to_price(amm_spot_price());
        }
    }

    // Allows for contracting the liquidity mid-epoch
    // The expansion must occur at the current vAMM price
    function contract_AMM_liquidity(uint256 fxb_contraction_amount, bool do_rebalance) external onlyByOwnerControllerOrGovernance {
        require(isInEpoch(), 'Not in an epoch');

        // Expand the FXB target liquidity
        target_liquidity_fxb = target_liquidity_fxb.sub(fxb_contraction_amount);

        // Optionally do the rebalance. If not, it will be done at an applicable time in one of the buy / sell functions
        if (do_rebalance) {
            rebalance_AMM_liquidity_to_price(amm_spot_price());
        }
    }

    // Rebalance vAMM to a desired price
    function rebalance_AMM_liquidity_to_price(uint256 rebalance_price) public onlyByOwnerControllerOrGovernance {
        // Rebalance the FXB
        _rebalance_AMM_FXB();

        // Rebalance the FRAX
        _rebalance_AMM_FRAX_to_price(rebalance_price);
    }

    // Starts a new epoch and rebalances the vAMM
    function startNewEpoch() external onlyByOwnerControllerOrGovernance {
        require(!isInEpoch(), 'Already in an existing epoch');
        require(!isInCooldown(), 'Bonds are currently settling in the cooldown');

        // Rebalance the vAMM liquidity
        rebalance_AMM_liquidity_to_price(PRICE_PRECISION.sub(initial_discount));

        // Set state variables
        epoch_start = block.timestamp;
        epoch_end = epoch_start.add(epoch_length);

        emit FXB_EpochStarted(msg.sender, epoch_start, epoch_end, epoch_length, initial_discount, max_fxb_outstanding);
    }

    function toggleIssuing() external {
        require(hasRole(ISSUING_PAUSER, msg.sender));
        issuingPaused = !issuingPaused;
    }

    function toggleBuying() external {
        require(hasRole(BUYING_PAUSER, msg.sender));
        buyingPaused = !buyingPaused;
    }

    function toggleSelling() external {
        require(hasRole(SELLING_PAUSER, msg.sender));
        sellingPaused = !sellingPaused;
    }

    function toggleRedeeming() external {
        require(hasRole(REDEEMING_PAUSER, msg.sender));
        redeemingPaused = !redeemingPaused;
    }

    function setMaxFXBOutstanding(uint256 _max_fxb_outstanding) external onlyByOwnerControllerOrGovernance {
        max_fxb_outstanding = _max_fxb_outstanding;
    }

    function setTargetLiquidity(uint256 _target_liquidity_fxb, bool _rebalance_vAMM) external onlyByOwnerControllerOrGovernance {
        target_liquidity_fxb = _target_liquidity_fxb;
        if (_rebalance_vAMM){
            rebalance_AMM_liquidity_to_price(amm_spot_price());
        }
    }

    function clearIssuableFXB() external onlyByOwnerControllerOrGovernance {
        issuable_fxb = 0;
        issue_price = PRICE_PRECISION;
    }

    function setIssuableFXB(uint256 _issuable_fxb, uint256 _issue_price) external onlyByOwnerControllerOrGovernance {
        if (_issuable_fxb > issuable_fxb){
            require(((FXB.totalSupply()).add(_issuable_fxb)) <= max_fxb_outstanding, "New issue would exceed max_fxb_outstanding");
        }
        issuable_fxb = _issuable_fxb;
        issue_price = _issue_price;
    }

    function setFees(uint256 _issue_fee, uint256 _buying_fee, uint256 _selling_fee, uint256 _redemption_fee) external onlyByOwnerControllerOrGovernance {
        issue_fee = _issue_fee;
        buying_fee = _buying_fee;
        selling_fee = _selling_fee;
        redemption_fee = _redemption_fee;
    }

    function setCooldownPeriod(uint256 _cooldown_period) external onlyByOwnerControllerOrGovernance {
        cooldown_period = _cooldown_period;
    }

    function setEpochLength(uint256 _epoch_length) external onlyByOwnerControllerOrGovernance {
        epoch_length = _epoch_length;
    }

    function setMinCollateralRatio(uint256 _min_collateral_ratio) external onlyByOwnerControllerOrGovernance {
        min_collateral_ratio = _min_collateral_ratio;
    }

    function setInitialDiscount(uint256 _initial_discount, bool _rebalance_AMM) external onlyByOwnerControllerOrGovernance {
        initial_discount = _initial_discount;
        if (_rebalance_AMM){
            rebalance_AMM_liquidity_to_price(PRICE_PRECISION.sub(initial_discount));
        }
    }

    /* ========== HIGHLY RESTRICTED EXTERNAL FUNCTIONS [Owner and Timelock only]  ========== */

    function setController(address _controller_address) external onlyByOwnerOrTimelock {
        controller_address = _controller_address;
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrTimelock {
        timelock_address = new_timelock;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrTimelock {
        owner_address = _owner_address;
    }

    function emergencyRecoverERC20(address destination_address, address tokenAddress, uint256 tokenAmount) external onlyByOwnerOrTimelock {
        ERC20(tokenAddress).transfer(destination_address, tokenAmount);
        emit Recovered(tokenAddress, destination_address, tokenAmount);
    }

    /* ========== PURE FUNCTIONS ========== */

    // Babylonian method
    function sqrt(uint y) internal pure returns (uint z) {
        if (y > 3) {
            z = y;
            uint x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
        // else z = 0
    }

    /* ========== EVENTS ========== */

    event Recovered(address token, address to, uint256 amount);

    // Track bond redeeming
    event FXB_Redeemed(address indexed from, uint256 fxb_amount, uint256 frax_out);
    event FXB_EpochStarted(address indexed from, uint256 _epoch_start, uint256 _epoch_end, uint256 _epoch_length, uint256 _initial_discount, uint256 _max_fxb_amount);
}


