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
// ================== Bond Issuer for FraxBond (FXB) ==================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../Math/SafeMath.sol";
import "./FXB.sol";
import "../Frax/Frax.sol";
import "../ERC20/ERC20.sol";
import "../Governance/AccessControl.sol";

contract FraxBondIssuerOld is AccessControl {
    // using SafeMath for uint256;

    // /* ========== STATE VARIABLES ========== */
    // enum DirectionChoice { BELOW_TO_FLOOR_FRAX_IN, ABOVE_TO_FLOOR }

    // FRAXStablecoin private FRAX;
    // FraxBond private FXB;

    // address public owner_address;
    // address public timelock_address;

    // uint256 private constant PRICE_PRECISION = 1e6;

    // // Minimum cooldown period before a new epoch, in seconds
    // // Bonds should be redeemed during this time, or they risk being rebalanced with a new epoch
    // uint256 public cooldown_period = 864000; // 10 days

    // // Max FXB outstanding
    // uint256 public max_fxb_outstanding = uint256(1000000e18);

    // // Target liquidity of FXB for the AMM pool
    // uint256 public target_liquidity_fxb = uint256(500000e18);

    // // Issuable FXB
    // // This will be sold at the floor price until depleted, and bypass the AMM
    // uint256 public issuable_fxb = uint256(80000e18);

    // // Set fees, E6
    // uint256 public issue_fee = 500; // 0.05% initially
    // uint256 public buying_fee = 1500; // 0.15% initially
    // uint256 public selling_fee = 1500; // 0.15% initially
    // uint256 public redemption_fee = 500; // 0.05% initially

    // // Epoch start and end times
    // uint256 public epoch_start;
    // uint256 public epoch_end;
    
    // // Epoch length
    // uint256 public epoch_length = 31536000; // 1 year

    // // Initial discount rates per epoch, in E6
    // uint256 public default_initial_discount = 200000; // 20% initially
    // uint256 public failsafe_max_initial_discount = 300000; // 30%. Failsafe max discount rate, in case _calcInitialDiscount() fails

    // // Governance variables
    // address public DEFAULT_ADMIN_ADDRESS;
    // bytes32 public constant ISSUING_PAUSER = keccak256("ISSUING_PAUSER");
    // bytes32 public constant BUYING_PAUSER = keccak256("BUYING_PAUSER");
    // bytes32 public constant SELLING_PAUSER = keccak256("SELLING_PAUSER");
    // bytes32 public constant REDEEMING_PAUSER = keccak256("REDEEMING_PAUSER");
    // bytes32 public constant DEFAULT_DISCOUNT_TOGGLER = keccak256("DEFAULT_DISCOUNT_TOGGLER");
    // bool public issuingPaused = false;
    // bool public buyingPaused = false;
    // bool public sellingPaused = false;
    // bool public redeemingPaused = false;
    // bool public useDefaultInitialDiscount = false;

    // /* ========== MODIFIERS ========== */

    // modifier onlyByOwnGov() {
    //     require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
    //     _;
    // }

    // modifier notIssuingPaused() {
    //     require(issuingPaused == false, "Issuing is paused");
    //     _;
    // }

    // modifier notBuyingPaused() {
    //     require(buyingPaused == false, "Buying is paused");
    //     _;
    // }

    // modifier notSellingPaused() {
    //     require(sellingPaused == false, "Selling is paused");
    //     _;
    // }

    // modifier notRedeemingPaused() {
    //     require(redeemingPaused == false, "Redeeming is paused");
    //     _;
    // }

    // /* ========== CONSTRUCTOR ========== */
    
    // constructor (
    //     address _frax_contract_address,
    //     address _fxb_contract_address,
    //     address _owner_address,
    //     address _timelock_address,
    //     address _custodian_address
    // ) public {
    //     FRAX = FRAXStablecoin(_frax_contract_address);
    //     FXB = FraxBond(_fxb_contract_address);
    //     owner_address = _owner_address;
    //     timelock_address = _timelock_address;

    //     // Needed for initialization
    //     epoch_start = (block.timestamp).sub(cooldown_period).sub(epoch_length);
    //     epoch_end = (block.timestamp).sub(cooldown_period);
        
    //     _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
    //     DEFAULT_ADMIN_ADDRESS = _msgSender();
    //     grantRole(ISSUING_PAUSER, _owner_address);
    //     grantRole(ISSUING_PAUSER, _timelock_address);
    //     grantRole(BUYING_PAUSER, _owner_address);
    //     grantRole(BUYING_PAUSER, _timelock_address);
    //     grantRole(SELLING_PAUSER, _owner_address);
    //     grantRole(SELLING_PAUSER, _timelock_address);
    //     grantRole(REDEEMING_PAUSER, _owner_address);
    //     grantRole(REDEEMING_PAUSER, _timelock_address);
    //     grantRole(DEFAULT_DISCOUNT_TOGGLER, _owner_address);
    //     grantRole(DEFAULT_DISCOUNT_TOGGLER, _timelock_address);
    // }

    // /* ========== VIEWS ========== */

    // // Returns some info
    // function issuer_info() public view returns (uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, uint256, bool, bool, uint256) {
    //     return (
    //         issue_fee,
    //         buying_fee,
    //         selling_fee,
    //         redemption_fee,
    //         issuable_fxb,
    //         epoch_start,
    //         epoch_end,
    //         maximum_fxb_AMM_sellable_above_floor(),
    //         amm_spot_price(),
    //         floor_price(),
    //         isInEpoch(),
    //         isInCooldown(),
    //         cooldown_period
    //     );
    // }

    // // Needed for the Frax contract to function without bricking
    // function collatDollarBalance() external view returns (uint256 dummy_dollar_balance) {
    //     dummy_dollar_balance =  uint256(1e18); // 1 nonexistant USDC
    // }

    // // Checks if the bond is in a maturity epoch
    // function isInEpoch() public view returns (bool in_epoch) {
    //     in_epoch = ((block.timestamp >= epoch_start) && (block.timestamp < epoch_end));
    // }

    // // Checks if the bond is in the cooldown period
    // function isInCooldown() public view returns (bool in_cooldown) {
    //     in_cooldown = ((block.timestamp >= epoch_end) && (block.timestamp < epoch_end.add(cooldown_period)));
    // }

    // // Calculates FXB outside the contract
    // function FXB_Outside_Contract() public view returns (uint256 fxb_outside_contract) {
    //     fxb_outside_contract = (FXB.totalSupply()).sub(FXB.balanceOf(address(this)));
    // }

    // // Algorithmically calculated optimal initial discount rate
    // function algorithmicInitialDiscount() public view returns (uint256 initial_discount) {
    //     // TODO: Some fancy algorithm
    //     // Perhaps in V2
    //     initial_discount = default_initial_discount;
    // }

    // // Liquidity balances for the floor price
    // function getVirtualFloorLiquidityBalances() public view returns (uint256 frax_balance, uint256 fxb_balance) {
    //     frax_balance = target_liquidity_fxb.mul(floor_price()).div(PRICE_PRECISION);
    //     fxb_balance = target_liquidity_fxb;
    // }

    // // AMM price for 1 FXB, in FRAX
    // // The contract won't necessarily sell or buy at this price
    // function amm_spot_price() public view returns (uint256 fxb_price) {
    //     fxb_price = getAmountOutNoFee(uint256(1e6), FXB.balanceOf(address(this)), FRAX.balanceOf(address(this)));
    // }

    // // FXB floor price for 1 FXB, in FRAX
    // // Will be used to help prevent someone from doing a huge arb with cheap bonds right before they mature
    // // Also allows the AMM to buy back cheap FXB under the floor and retire it, meaning less to pay back later at face value
    // function floor_price() public view returns (uint256 floor_price) {
    //     uint256 time_into_epoch = (block.timestamp).sub(epoch_start);
    //     uint256 initial_discount = getInitialDiscount();
    //     floor_price = (PRICE_PRECISION.sub(initial_discount)).add(initial_discount.mul(time_into_epoch).div(epoch_length));
    // }

    // function initial_price() public view returns (uint256 initial_price) {
    //     initial_price = (PRICE_PRECISION.sub(getInitialDiscount()));
    // }

    // function issuable_fxb_value_in_frax() public view returns (uint256 frax_value) {
    //     frax_value = issuable_fxb.mul(floor_price()).div(PRICE_PRECISION);
    // }

    // function getInitialDiscount() public view returns (uint256 initial_discount) {
    //     if (useDefaultInitialDiscount){
    //         initial_discount = default_initial_discount;
    //     }
    //     else {
    //         initial_discount = algorithmicInitialDiscount();
    //     }
    // }

    // // Maximum amount of FXB you can sell into the AMM at market prices before it hits the floor price and either cuts off
    // // or sells at the floor price, dependingon how sellFXBintoAMM is called
    // // If the AMM price is above the floor, you may sell FXB until doing so would push the price down to the floor
    // // Will be 0 if the AMM price is at or below the floor price
    // function maximum_fxb_AMM_sellable_above_floor() public view returns (uint256 maximum_fxb_for_sell) {
    //     uint256 the_floor_price = floor_price();

    //     if (amm_spot_price() > the_floor_price){
    //         maximum_fxb_for_sell = getBoundedIn(DirectionChoice.ABOVE_TO_FLOOR, the_floor_price);
    //     }
    //     else {
    //         maximum_fxb_for_sell = 0;
    //     }
    // }

    // /* ========== PUBLIC FUNCTIONS ========== */

    // // Given an input amount of an asset and pair reserves, returns the maximum output amount of the other asset
    // // Uses constant product concept https://uniswap.org/docs/v2/core-concepts/swaps/
    // function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut, uint the_fee) public view returns (uint amountOut) {
    //     require(amountIn > 0, 'FraxBondIssuer: INSUFFICIENT_INPUT_AMOUNT');
    //     require(reserveIn > 0 && reserveOut > 0, 'FraxBondIssuer: INSUFFICIENT_LIQUIDITY');
    //     uint amountInWithFee = amountIn.mul(uint(1e6).sub(the_fee));
    //     uint numerator = amountInWithFee.mul(reserveOut);
    //     uint denominator = (reserveIn.mul(1e6)).add(amountInWithFee);
    //     amountOut = numerator / denominator;
    // }

    // function getAmountOutNoFee(uint amountIn, uint reserveIn, uint reserveOut) public view returns (uint amountOut) {
    //     amountOut = getAmountOut(amountIn, reserveIn, reserveOut, 0);
    // }

    // function buyUnissuedFXB(uint256 frax_amount, uint256 fxb_out_min) external notIssuingPaused returns (uint256 fxb_out, uint256 fxb_fee_amt) {
    //     require(isInEpoch(), 'Not in an epoch');
    //     require(issuable_fxb > 0, 'No new FXB to issue');

    //     // Get the floor price
    //     uint256 the_floor_price = floor_price();

    //     // Get the expected amount of FXB from the floor-priced portion
    //     fxb_out = frax_amount.mul(PRICE_PRECISION).div(the_floor_price);

    //     // Calculate and apply the normal buying fee
    //     fxb_fee_amt = fxb_out.mul(issue_fee).div(PRICE_PRECISION);

    //     // Apply the fee
    //     fxb_out = fxb_out.sub(fxb_fee_amt);

    //     // Check fxb_out_min
    //     require(fxb_out >= fxb_out_min, "[buyUnissuedFXB fxb_out_min]: Slippage limit reached");

    //     // Check the limit
    //     require(fxb_out <= issuable_fxb, 'Trying to buy too many unissued bonds');

    //     // Decrement the unissued amount
    //     issuable_fxb = issuable_fxb.sub(fxb_out);

    //     // Burn FRAX from the sender
    //     FRAX.pool_burn_from(msg.sender, frax_amount);

    //     // Mint FXB to the sender
    //     FXB.issuer_mint(msg.sender, fxb_out);
    // }

    // function buyFXBfromAMM(uint256 frax_amount, uint256 fxb_out_min) external notBuyingPaused returns (uint256 fxb_out, uint256 fxb_fee_amt) {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Rebalance the AMM if applicable
    //     // This may be the case if the floor price moved up slowly and nobody made any purchases for a while
    //     {
    //         if (amm_spot_price() < floor_price()){
    //             _rebalance_AMM_FXB();
    //             _rebalance_AMM_FRAX_to_price(floor_price());
    //         }
    //     }

    //     // Calculate the FXB output
    //     fxb_out = fxb_out = getAmountOutNoFee(frax_amount, FRAX.balanceOf(address(this)), FXB.balanceOf(address(this)));

    //     // Calculate and apply the normal buying fee
    //     fxb_fee_amt = fxb_out.mul(buying_fee).div(PRICE_PRECISION);

    //     // Apply the fee
    //     fxb_out = fxb_out.sub(fxb_fee_amt);

    //     // Check fxb_out_min
    //     require(fxb_out >= fxb_out_min, "[buyFXBfromAMM fxb_out_min]: Slippage limit reached");

    //     // Take FRAX from the sender
    //     FRAX.transferFrom(msg.sender, address(this), frax_amount);

    //     // Give FXB to the sender
    //     FXB.transfer(msg.sender, fxb_out);

    //     // AMM will burn FRAX if the effective sale price is above 1. It is essentially free FRAX and a protocol-level profit
    //     {
    //         uint256 effective_sale_price = frax_amount.mul(PRICE_PRECISION).div(fxb_out);
    //         if(effective_sale_price > PRICE_PRECISION){
    //             // Rebalance to $1
    //             _rebalance_AMM_FXB();
    //             _rebalance_AMM_FRAX_to_price(PRICE_PRECISION);
    //         }
    //     }
    // }

    // function sellFXBintoAMM(uint256 fxb_amount, uint256 frax_out_min) external notSellingPaused returns (uint256 fxb_bought_above_floor, uint256 fxb_sold_under_floor, uint256 frax_out, uint256 frax_fee_amt) {
    //     require(isInEpoch(), 'Not in an epoch');

    //     fxb_bought_above_floor = fxb_amount;
    //     fxb_sold_under_floor = 0;

    //     // The AMM will buy back FXB at market rates in all cases
    //     // However, any FXB bought back under the floor price will be burned
    //     uint256 max_above_floor_sellable_fxb = maximum_fxb_AMM_sellable_above_floor();
    //     if(fxb_amount >= max_above_floor_sellable_fxb){
    //         fxb_bought_above_floor = max_above_floor_sellable_fxb;
    //         fxb_sold_under_floor = fxb_amount.sub(max_above_floor_sellable_fxb);
    //     }
    //     else {
    //         // no change to fxb_bought_above_floor
    //         fxb_sold_under_floor = 0;
    //     }

    //     // Get the expected amount of FRAX from above the floor
    //     uint256 frax_out_above_floor = 0;
    //     if (fxb_bought_above_floor > 0){
    //         frax_out_above_floor = getAmountOutNoFee(fxb_bought_above_floor, FXB.balanceOf(address(this)), FRAX.balanceOf(address(this)));
        
    //         // Apply the normal selling fee to this portion
    //         uint256 fee_above_floor = frax_out_above_floor.mul(selling_fee).div(PRICE_PRECISION);
    //         frax_out_above_floor = frax_out_above_floor.sub(fee_above_floor);

    //         // Informational for return values
    //         frax_fee_amt += fee_above_floor;
    //         frax_out += frax_out_above_floor;
    //     }

    //     // Get the expected amount of FRAX from below the floor
    //     // Need to adjust the balances virtually for this
    //     uint256 frax_out_under_floor = 0;
    //     if (fxb_sold_under_floor > 0){
    //         // Get the virtual amount under the floor
    //         (uint256 frax_floor_balance_virtual, uint256 fxb_floor_balance_virtual) = getVirtualFloorLiquidityBalances();
    //         frax_out_under_floor = getAmountOutNoFee(fxb_sold_under_floor, fxb_floor_balance_virtual.add(fxb_bought_above_floor), frax_floor_balance_virtual.sub(frax_out_above_floor));

    //         // Apply the normal selling fee to this portion
    //         uint256 fee_below_floor = frax_out_under_floor.mul(selling_fee).div(PRICE_PRECISION);
    //         frax_out_under_floor = frax_out_under_floor.sub(fee_below_floor);

    //         // Informational for return values
    //         frax_fee_amt += fee_below_floor;
    //         frax_out += frax_out_under_floor;
    //     }
        
    //     // Check frax_out_min
    //     require(frax_out >= frax_out_min, "[sellFXBintoAMM frax_out_min]: Slippage limit reached");

    //     // Take FXB from the sender
    //     FXB.transferFrom(msg.sender, address(this), fxb_amount);
        
    //     // Give FRAX to sender from the AMM pool
    //     FRAX.transfer(msg.sender, frax_out);

    //     // If any FXB was sold under the floor price, retire / burn it and rebalance the pool
    //     // This is less FXB that will have to be redeemed at full value later and is essentially a protocol-level profit
    //     if (fxb_sold_under_floor > 0){
    //         // Rebalance to the floor
    //         _rebalance_AMM_FXB();
    //         _rebalance_AMM_FRAX_to_price(floor_price());
    //     }
    // }

    // function redeemFXB(uint256 fxb_amount) external notRedeemingPaused returns (uint256 frax_out, uint256 frax_fee) {
    //     require(isInCooldown(), 'Not in the cooldown period');
        
    //     // Take FXB from the sender
    //     FXB.transferFrom(msg.sender, address(this), fxb_amount);

    //     // Give 1 FRAX per 1 FXB, minus the redemption fee
    //     frax_fee = fxb_amount.mul(redemption_fee).div(PRICE_PRECISION);
    //     frax_out = fxb_amount.sub(frax_fee);

    //     // Give the FRAX to the redeemer
    //     FRAX.pool_mint(msg.sender, frax_out);

    //     emit FXB_Redeemed(msg.sender, fxb_amount, frax_out);
    // }
   
    // /* ========== RESTRICTED INTERNAL FUNCTIONS ========== */

    // function _rebalance_AMM_FRAX_to_price(uint256 rebalance_price) internal {
    //     // Safety checks
    //     require(rebalance_price <= PRICE_PRECISION, "Rebalance price too high");
    //     require(rebalance_price >= (PRICE_PRECISION.sub(failsafe_max_initial_discount)), "Rebalance price too low");

    //     uint256 frax_required = target_liquidity_fxb.mul(rebalance_price).div(PRICE_PRECISION);
    //     uint256 frax_inside_contract = FRAX.balanceOf(address(this));
    //     if (frax_required > frax_inside_contract){
    //         // Mint the deficiency
    //         FRAX.pool_mint(address(this), frax_required.sub(frax_inside_contract));
    //     }
    //     else if (frax_required < frax_inside_contract){
    //         // Burn the excess
    //         FRAX.burn(frax_inside_contract.sub(frax_required));
    //     }
    //     else if (frax_required == frax_inside_contract){
    //         // Do nothing
    //     }
    // }

    // function _rebalance_AMM_FXB() internal {
    //     uint256 fxb_required = target_liquidity_fxb;
    //     uint256 fxb_inside_contract = FXB.balanceOf(address(this));
    //     if (fxb_required > fxb_inside_contract){
    //         // Mint the deficiency
    //         FXB.issuer_mint(address(this), fxb_required.sub(fxb_inside_contract));
    //     }
    //     else if (fxb_required < fxb_inside_contract){
    //         // Burn the excess
    //         FXB.burn(fxb_inside_contract.sub(fxb_required));
    //     }
    //     else if (fxb_required == fxb_inside_contract){
    //         // Do nothing
    //     }

    //     // Quick safety check
    //     require(((FXB.totalSupply()).add(issuable_fxb)) <= max_fxb_outstanding, "Rebalance would exceed max_fxb_outstanding");
    // }

    // /* ========== RESTRICTED EXTERNAL FUNCTIONS ========== */

    // // Allows for expanding the liquidity mid-epoch
    // // The expansion must occur at the current AMM price
    // function expand_AMM_liquidity(uint256 fxb_expansion_amount) external onlyByOwnGov {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Expand the FXB target liquidity
    //     target_liquidity_fxb = target_liquidity_fxb.add(fxb_expansion_amount);

    //     // Do the rebalance
    //     rebalance_AMM_liquidity_to_price(amm_spot_price());
    // }

    // // Allows for contracting the liquidity mid-epoch
    // // The expansion must occur at the current AMM price
    // function contract_AMM_liquidity(uint256 fxb_contraction_amount) external onlyByOwnGov {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Expand the FXB target liquidity
    //     target_liquidity_fxb = target_liquidity_fxb.sub(fxb_contraction_amount);

    //     // Do the rebalance
    //     rebalance_AMM_liquidity_to_price(amm_spot_price());
    // }

    // // Rebalance AMM to a desired price
    // function rebalance_AMM_liquidity_to_price(uint256 rebalance_price) public onlyByOwnGov {
    //     // Rebalance the FXB
    //     _rebalance_AMM_FXB();

    //     // Rebalance the FRAX
    //     _rebalance_AMM_FRAX_to_price(rebalance_price);
    // }

    // // Starts a new epoch and rebalances the AMM
    // function startNewEpoch() external onlyByOwnGov {
    //     require(!isInEpoch(), 'Already in an existing epoch');
    //     require(!isInCooldown(), 'Bonds are currently settling in the cooldown');

    //     uint256 initial_discount = getInitialDiscount();

    //     // Rebalance the AMM liquidity
    //     rebalance_AMM_liquidity_to_price(PRICE_PRECISION.sub(initial_discount));

    //     // Sanity check in case algorithmicInitialDiscount() messes up somehow or is exploited
    //     require(initial_discount <= failsafe_max_initial_discount, "Initial discount is more than max failsafe");

    //     // Set state variables
    //     epoch_start = block.timestamp;
    //     epoch_end = epoch_start.add(epoch_length);

    //     emit FXB_EpochStarted(msg.sender, epoch_start, epoch_end, epoch_length, initial_discount, max_fxb_outstanding);
    // }

    // function getBoundedIn(DirectionChoice choice, uint256 the_floor_price) internal view returns (uint256 bounded_amount) {
    //     uint256 frax_contract_balance = FRAX.balanceOf(address(this));
    //     uint256 fxb_contract_balance = FXB.balanceOf(address(this));
        
    //     if (choice == DirectionChoice.BELOW_TO_FLOOR_FRAX_IN) {
    //         uint256 numerator = sqrt(frax_contract_balance).mul(sqrt(fxb_contract_balance)).mul(sqrt(PRICE_PRECISION));
    //         // The "price" here needs to be inverted 
    //         uint256 denominator = sqrt(uint256(PRICE_PRECISION ** 2).div(the_floor_price));
    //         bounded_amount = numerator.div(denominator).sub(frax_contract_balance);
    //     }
    //     else if (choice == DirectionChoice.ABOVE_TO_FLOOR) {
    //         uint256 numerator = sqrt(frax_contract_balance).mul(sqrt(fxb_contract_balance)).mul(sqrt(PRICE_PRECISION));
    //         uint256 denominator = sqrt(the_floor_price);
    //         bounded_amount = numerator.div(denominator).sub(fxb_contract_balance);
    //     }

    // }

    // function toggleIssuing() external {
    //     require(hasRole(ISSUING_PAUSER, msg.sender));
    //     issuingPaused = !issuingPaused;
    // }

    // function toggleBuying() external {
    //     require(hasRole(BUYING_PAUSER, msg.sender));
    //     buyingPaused = !buyingPaused;
    // }

    // function toggleSelling() external {
    //     require(hasRole(SELLING_PAUSER, msg.sender));
    //     sellingPaused = !sellingPaused;
    // }

    // function toggleRedeeming() external {
    //     require(hasRole(REDEEMING_PAUSER, msg.sender));
    //     redeemingPaused = !redeemingPaused;
    // }

    // function toggleDefaultInitialDiscount() external {
    //     require(hasRole(DEFAULT_DISCOUNT_TOGGLER, msg.sender));
    //     useDefaultInitialDiscount = !useDefaultInitialDiscount;
    // }

    // function setTimelock(address new_timelock) external onlyByOwnGov {
    //     timelock_address = new_timelock;
    // }

    // function setOwner(address _owner_address) external onlyByOwnGov {
    //     owner_address = _owner_address;
    // }

    // function setMaxFXBOutstanding(uint256 _max_fxb_outstanding) external onlyByOwnGov {
    //     max_fxb_outstanding = _max_fxb_outstanding;
    // }

    // function setTargetLiquidity(uint256 _target_liquidity_fxb) external onlyByOwnGov {
    //     target_liquidity_fxb = _target_liquidity_fxb;
    // }

    // function setUnissuedFXB(uint256 _issuable_fxb) external onlyByOwnGov {
    //     if (_issuable_fxb > issuable_fxb){
    //         require(((FXB.totalSupply()).add(_issuable_fxb)) <= max_fxb_outstanding, "New issue would exceed max_fxb_outstanding");
    //     }
    //     issuable_fxb = _issuable_fxb;
    // }

    // function setFees(uint256 _issue_fee, uint256 _buying_fee, uint256 _selling_fee, uint256 _redemption_fee) external onlyByOwnGov {
    //     issue_fee = _issue_fee;
    //     buying_fee = _buying_fee;
    //     selling_fee = _selling_fee;
    //     redemption_fee = _redemption_fee;
    // }

    // function setCooldownPeriod(uint256 _cooldown_period) external onlyByOwnGov {
    //     cooldown_period = _cooldown_period;
    // }

    // function setEpochLength(uint256 _epoch_length) external onlyByOwnGov {
    //     epoch_length = _epoch_length;
    // }

    // function setDefaultInitialDiscount(uint256 _default_initial_discount, bool _rebalance_AMM) external onlyByOwnGov {
    //     default_initial_discount = _default_initial_discount;
    //     if (_rebalance_AMM){
    //         rebalance_AMM_liquidity_to_price(PRICE_PRECISION.sub(getInitialDiscount()));
    //     }
    // }

    // function setFailsafeMaxInitialDiscount(uint256 _failsafe_max_initial_discount) external onlyByOwnGov {
    //     failsafe_max_initial_discount = _failsafe_max_initial_discount;
    // }

    // function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount, address destination_address) external onlyByOwnGov {
    //     ERC20(tokenAddress).transfer(destination_address, tokenAmount);
    //     emit Recovered(tokenAddress, destination_address, tokenAmount);
    // }

    // /* ========== PURE FUNCTIONS ========== */

    // // Babylonian method
    // function sqrt(uint y) internal pure returns (uint z) {
    //     if (y > 3) {
    //         z = y;
    //         uint x = y / 2 + 1;
    //         while (x < z) {
    //             z = x;
    //             x = (y / x + x) / 2;
    //         }
    //     } else if (y != 0) {
    //         z = 1;
    //     }
    //     // else z = 0
    // }

    // /* ========== EVENTS ========== */

    // event Recovered(address token, address to, uint256 amount);

    // // Track bond redeeming
    // event FXB_Redeemed(address indexed from, uint256 fxb_amount, uint256 frax_out);
    // event FXB_EpochStarted(address indexed from, uint256 _epoch_start, uint256 _epoch_end, uint256 _epoch_length, uint256 _initial_discount, uint256 _max_fxb_amount);
}


