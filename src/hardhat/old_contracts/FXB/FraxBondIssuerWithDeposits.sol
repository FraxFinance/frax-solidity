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

contract FraxBondIssuerWithDeposits is AccessControl {
    // using SafeMath for uint256;

    // /* ========== STATE VARIABLES ========== */
    // enum DirectionChoice { BUY_FROM_AMM, SELL_INTO_AMM }

    // FRAXStablecoin private FRAX;
    // FraxBond private FXB;

    // address public owner_address;
    // address public timelock_address;

    // uint256 private constant PRICE_PRECISION = 1e6;

    // // Minimum cooldown period before a new epoch, in seconds
    // // Bonds should be redeemed during this time, or they risk being rebalanced with a new epoch
    // uint256 public cooldown_period = 864000; // 10 days

    // // Max FXB outstanding
    // uint256 public max_fxb_outstanding = uint256(10000e18);

    // // Set fees, E6
    // uint256 public buying_fee = 1000; // 0.10% initially
    // uint256 public selling_fee = 1000; // 0.10% initially
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
    // bytes32 public constant BUYING_PAUSER = keccak256("BUYING_PAUSER");
    // bytes32 public constant SELLING_PAUSER = keccak256("SELLING_PAUSER");
    // bytes32 public constant REDEEMING_PAUSER = keccak256("REDEEMING_PAUSER");
    // bytes32 public constant DEPOSITING_PAUSER = keccak256("DEPOSITING_PAUSER");
    // bytes32 public constant DEPOSIT_REDEEMING_PAUSER = keccak256("DEPOSIT_REDEEMING_PAUSER");
    // bytes32 public constant DEFAULT_DISCOUNT_TOGGLER = keccak256("DEFAULT_DISCOUNT_TOGGLER");
    // bytes32 public constant BOND_DEPOSIT_UNLOCK_TOGGLER = keccak256("BOND_DEPOSIT_UNLOCK_TOGGLER");
    // bool public buyingPaused = false;
    // bool public sellingPaused = false;
    // bool public redeemingPaused = false;
    // bool public depositingPaused = false;
    // bool public depositRedeemingPaused = false;
    // bool public useDefaultInitialDiscount = false;
    // bool public bond_deposits_unlock_override = false;

    // // BondDeposit variables
    // struct BondDeposit {
    //     bytes32 kek_id;
    //     uint256 amount;
    //     uint256 deposit_timestamp;
    //     uint256 epoch_end_timestamp;
    // }
    // uint256 public deposited_fxb = 0; // Balance of deposited FXB, E18
    // mapping(address => BondDeposit[]) public bondDeposits;

    // /* ========== MODIFIERS ========== */

    // modifier onlyByOwnGov() {
    //     require(msg.sender == timelock_address || msg.sender == owner_address, "Not owner or timelock");
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

    // modifier notDepositingPaused() {
    //     require(depositingPaused == false, "Depositing is paused");
    //     _;
    // }

    // modifier notDepositRedeemingPaused() {
    //     require(depositRedeemingPaused == false, "Deposit redeeming is paused");
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
    //     grantRole(BUYING_PAUSER, _owner_address);
    //     grantRole(BUYING_PAUSER, _timelock_address);
    //     grantRole(SELLING_PAUSER, _owner_address);
    //     grantRole(SELLING_PAUSER, _timelock_address);
    //     grantRole(REDEEMING_PAUSER, _owner_address);
    //     grantRole(REDEEMING_PAUSER, _timelock_address);
    //     grantRole(DEPOSITING_PAUSER, _owner_address);
    //     grantRole(DEPOSITING_PAUSER, _timelock_address);
    //     grantRole(DEPOSIT_REDEEMING_PAUSER, _owner_address);
    //     grantRole(DEPOSIT_REDEEMING_PAUSER, _timelock_address);
    //     grantRole(DEFAULT_DISCOUNT_TOGGLER, _owner_address);
    //     grantRole(DEFAULT_DISCOUNT_TOGGLER, _timelock_address);
    //     grantRole(BOND_DEPOSIT_UNLOCK_TOGGLER, _owner_address);
    //     grantRole(BOND_DEPOSIT_UNLOCK_TOGGLER, _timelock_address);
    // }

    // /* ========== VIEWS ========== */

    // // Needed for the Frax contract to function 
    // function collatDollarBalance() external view returns (uint256) {
    //     return 1; // 1e0
    // }

    // function depositsOf(address account) external view returns (BondDeposit[] memory) {
    //     return bondDeposits[account];
    // }

    // // Checks if the bond is in the cooldown period
    // function isInCooldown() public view returns (bool in_cooldown) {
    //     in_cooldown = ((block.timestamp >= epoch_end) && (block.timestamp < epoch_end.add(cooldown_period)));
    // }

    // // Checks if the bond is in a maturity epoch
    // function isInEpoch() public view returns (bool in_epoch) {
    //     in_epoch = ((block.timestamp >= epoch_start) && (block.timestamp < epoch_end));
    // }

    // // Calculates FXB outside the contract
    // function FXB_Outside_Contract() public view returns (uint256 fxb_outside_contract) {
    //     fxb_outside_contract = (FXB.totalSupply()).sub(FXB.balanceOf(address(this)));
    // }

    // // Algorithmically calculated optimal initial discount rate
    // function algorithmicInitialDiscount() public view returns (uint256 initial_discount) {
    //     // TODO: Some fancy algorithm
    //     initial_discount = default_initial_discount;
    // }

    // // AMM price for 1 FXB, in FRAX
    // // The contract won't necessarily sell or buy at this price
    // function amm_spot_price() public view returns (uint256 fxb_price) {
    //     fxb_price = getAmountOutNoFee(uint256(1e6), FXB.balanceOf(address(this)), FRAX.balanceOf(address(this)));
    // }

    // // FXB floor price for 1 FXB, in FRAX
    // // Will be used to help prevent someone from doing a huge arb with cheap bonds right before they mature
    // // Also prevents dumping FXB into the AMM and depressing the price too much
    // function floor_price() public view returns (uint256 floor_price) {
    //     uint256 time_into_epoch = (block.timestamp).sub(epoch_start);
    //     uint256 initial_discount = getInitialDiscount();
    //     floor_price = (PRICE_PRECISION.sub(initial_discount)).add(initial_discount.mul(time_into_epoch).div(epoch_length));
    // }

    // function initial_price() public view returns (uint256 initial_price) {
    //     initial_price = (PRICE_PRECISION.sub(getInitialDiscount()));
    // }

    // function getInitialDiscount() public view returns (uint256 initial_discount) {
    //     if (useDefaultInitialDiscount){
    //         initial_discount = default_initial_discount;
    //     }
    //     else {
    //         initial_discount = algorithmicInitialDiscount();
    //     }
    // }

    // // Minimum amount of FRAX needed to buy FXB
    // // If the AMM price is below the floor, you will need to buy up more to bring it back up
    // // Will be 0 if the AMM price is above the floor price
    // function minimum_frax_for_AMM_buy() public view returns (uint256 minimum_frax_for_buy) {
    //     uint256 the_floor_price = floor_price();

    //     if (amm_spot_price() < the_floor_price){
    //         minimum_frax_for_buy = getBoundedIn(DirectionChoice.BUY_FROM_AMM, the_floor_price);
    //         uint256 fee = minimum_frax_for_buy.mul(buying_fee).div(PRICE_PRECISION);

    //         // Add the fee here instead of subtracting so a tiny bit more FRAX is taken and the price lands
    //         // just above the floor price
    //         minimum_frax_for_buy = minimum_frax_for_buy.add(fee);
    //     }
    //     else {
    //         minimum_frax_for_buy = 0;
    //     }

    // }

    // // Maximum amount of FXB you can sell into the AMM at market prices before it hits the floor price and either cuts off
    // // or sells at the floor price, dependingon how sellFXBintoAMM is called
    // // If the AMM price is above the floor, you may sell FXB until doing so would push the price down to the floor
    // // Will be 0 if the AMM price is at or below the floor price
    // function maximum_fxb_AMM_sellable_above_floor() public view returns (uint256 maximum_fxb_for_sell) {
    //     uint256 the_floor_price = floor_price();

    //     if (amm_spot_price() > the_floor_price){
    //         maximum_fxb_for_sell = getBoundedIn(DirectionChoice.SELL_INTO_AMM, the_floor_price);
    //         uint256 fee = maximum_fxb_for_sell.mul(selling_fee).div(PRICE_PRECISION);
    //         maximum_fxb_for_sell = maximum_fxb_for_sell.sub(fee);
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

    // function depositFXB(uint256 fxb_amount) external notDepositingPaused returns (bytes32 kek_id) {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Take in the FXB from the sender
    //     FXB.transferFrom(msg.sender, address(this), fxb_amount);

    //     // Burn FXB from the sender
    //     FXB.burn(fxb_amount);

    //     // Mark the deposit
    //     deposited_fxb = deposited_fxb.add(fxb_amount);
    //     kek_id = keccak256(abi.encodePacked(msg.sender, block.timestamp, fxb_amount));
    //     bondDeposits[msg.sender].push(BondDeposit(
    //         kek_id,
    //         fxb_amount,
    //         block.timestamp,
    //         epoch_end
    //     ));

    //     emit FXB_Deposited(msg.sender, fxb_amount, epoch_end, kek_id);
    // }

    // function buyFXBfromAMM(uint256 frax_amount, uint256 fxb_out_min, bool should_deposit) external notBuyingPaused returns (uint256 fxb_out, uint256 fxb_fee_amt, bytes32 kek_id) {
    //     require(isInEpoch(), 'Not in an epoch');
    //     require(frax_amount >= minimum_frax_for_AMM_buy(), "Not enough FRAX to satisfy the floor price minimum");

    //     // Get the expected resultant FXB price via the AMM
    //     uint256 fxb_out = getAmountOutNoFee(frax_amount, FRAX.balanceOf(address(this)), FXB.balanceOf(address(this)));

    //     // Calculate and apply the normal buying fee
    //     fxb_fee_amt = fxb_out.mul(buying_fee).div(PRICE_PRECISION);

    //     // Apply the fee
    //     fxb_out = fxb_out.sub(fxb_fee_amt);

    //     // Check fxb_out_min
    //     require(fxb_out >= fxb_out_min, "[buyFXBfromAMM fxb_out_min]: Slippage limit reached");

    //     // Take FRAX from the sender
    //     FRAX.transferFrom(msg.sender, address(this), frax_amount);

    //     // The "Forgetful FXB Owner Problem"
    //     // Since the FXB price resets to the discount after each epoch and cooldown period,
    //     // you can optionally deposit your FXB tokens and redeem them any time after that epoch ends
    //     // This is because FXB tokens are fungible and have no 'memory' of which epoch they were issued in
    //     // If you forgot to redeem your FXB tokens otherwise, you would have to wait until the next cooldown period
    //     // Or take a loss and sell on the open market
    //     if (should_deposit){
    //         require(depositingPaused == false, "Depositing is paused");

    //         // Burn the FXB that would have been transfered out to the sender had they not deposited
    //         // This is needed to not mess with the AMM balanceOf(address(this))
    //         FXB.burn(fxb_out);

    //         // Mark the deposit
    //         deposited_fxb = deposited_fxb.add(fxb_out);
    //         kek_id = keccak256(abi.encodePacked(msg.sender, block.timestamp, fxb_out));
    //         bondDeposits[msg.sender].push(BondDeposit(
    //             kek_id,
    //             fxb_out,
    //             block.timestamp,
    //             epoch_end
    //         ));

    //         emit FXB_Deposited(msg.sender, fxb_out, epoch_end, kek_id);
    //     }
    //     else {
    //         // Give FXB to the sender
    //         FXB.transfer(msg.sender, fxb_out);
    //     }

    //     // Safety checks (must be done after the transfers in this case)
    //     // Tx will still revert if not true
    //     {
    //         uint256 amm_price = amm_spot_price();

    //         // The AMM will never sell its FXB below this
    //         require(amm_price >= floor_price(), "[buyFXBfromAMM]: floor price reached");
    //     }
    // }

    // function sellFXBintoAMM(uint256 fxb_amount, uint256 frax_out_min, bool sell_excess_at_floor) external notSellingPaused returns (uint256 fxb_at_market_price, uint256 fxb_at_floor_price, uint256 frax_out, uint256 frax_fee_amt) {
    //     require(isInEpoch(), 'Not in an epoch');
        
    //     // Sell as much as you can at market prices, then the rest at the floor price, unless !sell_excess_at_floor
    //     fxb_at_market_price = 0;
    //     fxb_at_floor_price = 0;
    //     {
    //         uint256 max_above_floor_sellable_fxb = maximum_fxb_AMM_sellable_above_floor();
    //         if(fxb_amount > max_above_floor_sellable_fxb){
    //             if(!sell_excess_at_floor) {
    //                 revert("Sale would push FXB below the floor price");
    //             }
    //             else {
    //                 fxb_at_market_price = fxb_amount.sub(max_above_floor_sellable_fxb);
    //                 fxb_at_floor_price = fxb_amount.sub(fxb_at_market_price);
    //             }
    //         }
    //         else {
    //             fxb_at_market_price = fxb_amount;
    //         }
    //     }

    //     // Get the expected amount of FRAX via the AMM from the market-priced portion
    //     frax_out = getAmountOutNoFee(fxb_at_market_price, FXB.balanceOf(address(this)), FRAX.balanceOf(address(this)));

    //     // Add in the FRAX from the floor-priced portion
    //     uint256 the_floor_price = floor_price();
    //     frax_out = frax_out.add(fxb_at_floor_price.mul(the_floor_price).div(PRICE_PRECISION));

    //     // Apply the normal selling fee
    //     frax_fee_amt = frax_out.mul(selling_fee).div(PRICE_PRECISION);
    //     frax_out = frax_out.sub(frax_fee_amt);

    //     // Check frax_out_min
    //     require(frax_out >= frax_out_min, "[sellFXBintoAMM frax_out_min]: Slippage limit reached");

    //     // Take FXB from the sender
    //     FXB.transferFrom(msg.sender, address(this), fxb_amount);

    //     // Give FRAX to sender
    //     FRAX.transfer(msg.sender, frax_out);

    //     // Safety checks (must be done after the transfers in this case)
    //     // Tx will still revert if not true
    //     {
    //         uint256 amm_price = amm_spot_price();

    //         // The AMM will never buy the FXB back above 1
    //         require(amm_price <= PRICE_PRECISION, "[sellFXBintoAMM]: price is above 1");

    //         // The AMM will never buy the FXB back below this
    //         require(amm_price >= the_floor_price, "[sellFXBintoAMM]: floor price reached");
    //     }
    // }

    // function redeemFXB(uint256 fxb_amount) external notRedeemingPaused returns (uint256 frax_out, uint256 frax_fee) {
    //     require(isInCooldown(), 'Not in the cooldown period');
        
    //     // Take FXB from the sender
    //     FXB.transferFrom(msg.sender, address(this), fxb_amount);

    //     // Give 1 FRAX per 1 FXB, minus the redemption fee
    //     frax_fee = fxb_amount.mul(redemption_fee).div(PRICE_PRECISION);
    //     frax_out = fxb_amount.sub(frax_fee);

    //     FRAX.pool_mint(msg.sender, frax_out);

    //     emit FXB_Redeemed(msg.sender, fxb_amount, frax_out);
    // }

    // function redeemDepositedFXB(bytes32 kek_id) external notDepositRedeemingPaused returns (uint256 frax_out, uint256 frax_fee) {
    //     BondDeposit memory thisDeposit;
    //     thisDeposit.amount = 0;
    //     uint theIndex;
    //     for (uint i = 0; i < bondDeposits[msg.sender].length; i++){ 
    //         if (kek_id == bondDeposits[msg.sender][i].kek_id){
    //             thisDeposit = bondDeposits[msg.sender][i];
    //             theIndex = i;
    //             break;
    //         }
    //     }
    //     require(thisDeposit.kek_id == kek_id, "Deposit not found");
    //     require((block.timestamp >= thisDeposit.epoch_end_timestamp  == true) || bond_deposits_unlock_override, "Deposit is still maturing!");
    //     uint256 fxb_amount = thisDeposit.amount;

    //     // Remove the bond deposit from the array
    //     delete bondDeposits[msg.sender][theIndex];

    //     // Decrease the deposited bonds tracker
    //     deposited_fxb = deposited_fxb.sub(fxb_amount);
        
    //     // Give 1 FRAX per 1 FXB, minus the redemption fee
    //     frax_fee = fxb_amount.mul(redemption_fee).div(PRICE_PRECISION);
    //     uint256 frax_out = fxb_amount.sub(frax_fee);

    //     FRAX.pool_mint(msg.sender, frax_out);

    //     emit FXB_Deposit_Redeemed(msg.sender, fxb_amount, frax_out, epoch_end, kek_id);
    // }
   
    // /* ========== RESTRICTED INTERNAL FUNCTIONS ========== */

    // // Burns as much FXB as possible that the contract owns
    // // Some could still remain outside of the contract
    // function _burnExcessFXB() internal returns (uint256 fxb_total_supply, uint256 fxb_adjusted_total_supply, uint256 fxb_inside_contract, uint256 fxb_outside_contract, uint256 burn_amount) {
    //     // Get the balances
    //     fxb_total_supply = FXB.totalSupply();
    //     fxb_adjusted_total_supply = fxb_total_supply.add(deposited_fxb); // Don't forget to account for deposited FXB
    //     fxb_inside_contract = FXB.balanceOf(address(this));
    //     fxb_outside_contract = fxb_total_supply.sub(fxb_inside_contract);

    //     // Only need to burn if there is an excess
    //     if (fxb_adjusted_total_supply > max_fxb_outstanding){
    //         uint256 total_excess_fxb = fxb_adjusted_total_supply.sub(max_fxb_outstanding);
            
    //         // If the contract has some excess FXB, try to burn it
    //         if(fxb_inside_contract >= total_excess_fxb){
    //             // Burn the entire excess amount
    //             burn_amount = total_excess_fxb;
    //         }
    //         else {
    //             // Burn as much as you can
    //             burn_amount = fxb_inside_contract;
    //         }

    //         // Do the burning
    //         FXB.burn(burn_amount);

    //         // Fetch the new balances
    //         fxb_total_supply = FXB.totalSupply();
    //         fxb_adjusted_total_supply = fxb_total_supply.add(deposited_fxb);
    //         fxb_inside_contract = FXB.balanceOf(address(this));
    //         fxb_outside_contract = fxb_total_supply.sub(fxb_inside_contract);
    //     }

    // }

    // /* ========== RESTRICTED EXTERNAL FUNCTIONS ========== */

    // // Allows for burning new FXB in the middle of an epoch
    // // The contraction must occur at the current AMM price, so both sides (FRAX and FXB) need to be burned
    // function contract_AMM_liquidity(uint256 fxb_contraction_amount) external onlyByOwnGov {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Get the AMM spot price
    //     uint256 fxb_spot_price = amm_spot_price();
        
    //     // Update max_fxb_outstanding
    //     max_fxb_outstanding = max_fxb_outstanding.sub(fxb_contraction_amount);

    //     // Burn the required FRAX
    //     FRAX.burn(fxb_contraction_amount.mul(fxb_spot_price).div(PRICE_PRECISION));

    //     // Burn the required FXB
    //     FXB.burn(fxb_contraction_amount);
    // }

    // // Allows for minting new FXB in the middle of an epoch
    // // The expansion must occur at the current AMM price, so both sides (FRAX and FXB) need to be minted
    // function expand_AMM_liquidity(uint256 fxb_expansion_amount) external onlyByOwnGov {
    //     require(isInEpoch(), 'Not in an epoch');

    //     // Get the AMM spot price
    //     uint256 fxb_spot_price = amm_spot_price();

    //     // Update max_fxb_outstanding
    //     max_fxb_outstanding = max_fxb_outstanding.add(fxb_expansion_amount);

    //     // Mint the required FRAX
    //     FRAX.pool_mint(address(this), fxb_expansion_amount.mul(fxb_spot_price).div(PRICE_PRECISION));

    //     // Mint the required FXB
    //     FXB.issuer_mint(address(this), fxb_expansion_amount);
    // }

    // // Starts a new epoch and rebalances the AMM
    // function startNewEpoch() external onlyByOwnGov {
    //     require(!isInEpoch(), 'Already in an existing epoch');
    //     require(!isInCooldown(), 'Bonds are currently settling in the cooldown');

    //     uint256 initial_discount = getInitialDiscount();

    //     // Sanity check in case algorithmicInitialDiscount() messes up somehow or is exploited
    //     require(initial_discount <= failsafe_max_initial_discount, "Initial discount is more than max failsafe");

    //     // There still will be probably still be some bonds floating around outside, so we need to account for those
    //     // They may also accumulate over time
    //     {
    //         // Burn any excess FXB
    //         (uint256 fxb_total_supply, uint256 fxb_adjusted_total_supply, uint256 fxb_inside_contract, uint256 fxb_outside_contract, ) = _burnExcessFXB();

    //         // Fail if there is still too much FXB
    //         require(fxb_adjusted_total_supply <= max_fxb_outstanding, "Still too much FXB outstanding" ); 

    //         // Mint FXB up to max_fxb_outstanding
    //         uint256 fxb_needed = max_fxb_outstanding.sub(fxb_outside_contract).sub(fxb_inside_contract).sub(deposited_fxb);
    //         FXB.issuer_mint(address(this), fxb_needed);
    //     }


    //     // Mint or burn FRAX to get to the initial_discount
    //     {
    //         uint256 desired_frax_amount = max_fxb_outstanding.mul(PRICE_PRECISION.sub(initial_discount)).div(PRICE_PRECISION);
    //         uint256 frax_inside_contract = FRAX.balanceOf(address(this));
    //         if (desired_frax_amount > frax_inside_contract){
    //             // Mint the deficiency
    //             FRAX.pool_mint(address(this), desired_frax_amount.sub(frax_inside_contract));
    //         }
    //         else if (desired_frax_amount < frax_inside_contract){
    //             // Burn the excess
    //             FRAX.burn(frax_inside_contract.sub(desired_frax_amount));
    //         }
    //         else { /* Do nothing */ }
    //     }

    //     // Set state variables
    //     epoch_start = block.timestamp;
    //     epoch_end = epoch_start.add(epoch_length);


    //     emit FXB_EpochStarted(msg.sender, epoch_start, epoch_end, epoch_length, initial_discount, max_fxb_outstanding);
    // }

    // // This method CAN have some error 
    // function getBoundedIn(DirectionChoice choice, uint256 the_floor_price) internal view returns (uint256 bounded_amount) {
    //     uint256 frax_contract_balance = FRAX.balanceOf(address(this));
    //     uint256 fxb_contract_balance = FXB.balanceOf(address(this));
        
    //     if (choice == DirectionChoice.BUY_FROM_AMM) {
    //         uint256 numerator = sqrt(frax_contract_balance).mul(sqrt(fxb_contract_balance)).mul(sqrt(PRICE_PRECISION));
    //         // The "price" here needs to be inverted 
    //         uint256 denominator = sqrt(uint256(PRICE_PRECISION ** 2).div(the_floor_price));
    //         bounded_amount = numerator.div(denominator).sub(frax_contract_balance);
    //     }
    //     else if (choice == DirectionChoice.SELL_INTO_AMM) {
    //         uint256 numerator = sqrt(frax_contract_balance).mul(sqrt(fxb_contract_balance)).mul(sqrt(PRICE_PRECISION));
    //         uint256 denominator = sqrt(the_floor_price);
    //         bounded_amount = numerator.div(denominator).sub(fxb_contract_balance);
    //     }

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

    // function toggleDepositing() external {
    //     require(hasRole(DEPOSITING_PAUSER, msg.sender));
    //     depositingPaused = !depositingPaused;
    // }

    // function toggleDepositRedeeming() external {
    //     require(hasRole(DEPOSIT_REDEEMING_PAUSER, msg.sender));
    //     depositRedeemingPaused = !depositRedeemingPaused;
    // }

    // function toggleUniversalDepositUnlock() external {
    //     require(hasRole(BOND_DEPOSIT_UNLOCK_TOGGLER, msg.sender));
    //     bond_deposits_unlock_override = !bond_deposits_unlock_override;
    // }

    // function setTimelock(address new_timelock) external onlyByOwnGov {
    //     timelock_address = new_timelock;
    // }

    // function toggleDefaultInitialDiscount() external {
    //     require(hasRole(DEFAULT_DISCOUNT_TOGGLER, msg.sender));
    //     useDefaultInitialDiscount = !useDefaultInitialDiscount;
    // }

    // function setOwner(address _owner_address) external onlyByOwnGov {
    //     owner_address = _owner_address;
    // }

    // function setMaxFXBOutstanding(uint256 _max_fxb_outstanding) external onlyByOwnGov {
    //     max_fxb_outstanding = _max_fxb_outstanding;
    // }

    // function setFees(uint256 _buying_fee, uint256 _selling_fee, uint256 _redemption_fee) external onlyByOwnGov {
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

    // function setDefaultInitialDiscount(uint256 _default_initial_discount) external onlyByOwnGov {
    //     default_initial_discount = _default_initial_discount;
    // }

    // function setFailsafeMaxInitialDiscount(uint256 _failsafe_max_initial_discount) external onlyByOwnGov {
    //     failsafe_max_initial_discount = _failsafe_max_initial_discount;
    // }

    // function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount, address destination_address) external onlyByOwnGov {
    //     ERC20(tokenAddress).transfer(destination_address, tokenAmount);
    //     emit Recovered(tokenAddress, destination_address, tokenAmount);
    // }

    // /* ========== PURE FUNCTIONS ========== */

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
    // event FXB_Deposited(address indexed from, uint256 fxb_amount, uint256 epoch_end, bytes32 kek_id);
    // event FXB_Deposit_Redeemed(address indexed from, uint256 fxb_amount, uint256 frax_out, uint256 epoch_end, bytes32 kek_id);
    
    // event FXB_Redeemed(address indexed from, uint256 fxb_amount, uint256 frax_out);
    // event FXB_EpochStarted(address indexed from, uint256 _epoch_start, uint256 _epoch_end, uint256 _epoch_length, uint256 _initial_discount, uint256 _max_fxb_amount);

}


