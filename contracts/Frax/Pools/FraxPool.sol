// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

import "../../Math/SafeMath.sol";
import "../../FXS/FXS.sol";
import "../../Frax/Frax.sol";
import "../../ERC20/ERC20.sol";
// import '../../Uniswap/TransferHelper.sol';
import "../../Oracle/UniswapPairOracle.sol";
import "../../Governance/AccessControl.sol";
// import "../../Utils/StringHelpers.sol";
import "./FraxPoolLibrary.sol";

contract FraxPool is AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    ERC20 private collateral_token;
    address private collateral_address;
    address private owner_address;
    address private oracle_address;
    address private frax_contract_address;
    address private fxs_contract_address;
    address private timelock_address; // Timelock address for the governance contract
    FRAXShares private FXS;
    FRAXStablecoin private FRAX;
    UniswapPairOracle private oracle;
    UniswapPairOracle private collatEthOracle;
    address private collat_eth_oracle_address;
    address private weth_address;

    mapping (address => uint256) private redeemFXSBalances;
    mapping (address => uint256) private redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral;
    uint256 public unclaimedPoolFXS;
    mapping (address => uint256) public lastRedeemed;

    // Constants for various precisions
    uint256 private constant PRICE_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_PRECISION = 1e6;
    uint256 private constant COLLATERAL_RATIO_MAX = 1e6;
    
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 private pool_ceiling = 0;

    // Stores price of the collateral, if price is paused
    uint256 public pausedPrice = 0;

    // Bonus rate on FXS minted during recollateralizeFrax(); 6 decimals of precision, set to 1% on genesis
    uint256 public bonus_rate = 10000;

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 private constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bytes32 private constant BUYBACK_PAUSER = keccak256("BUYBACK_PAUSER");
    bytes32 private constant COLLATERAL_PRICE_PAUSER = keccak256("COLLATERAL_PRICE_PAUSER");
    
    // AccessControl state variables
    bool public mintPaused = false;
    bool public redeemPaused = false;
    bool public buyBackPaused = false;
    bool public collateralPricePaused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == timelock_address || msg.sender == owner_address, "You are not the owner or the governance timelock");
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, "Redeeming is paused");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "Minting is paused");
        _;
    }
 
    /* ========== CONSTRUCTOR ========== */
    
    constructor(
        address _collateral_address,
        address _oracle_address,
        address _creator_address,
        address _timelock_address,
        uint256 _pool_ceiling
    ) public {
        collateral_address = _collateral_address;
        oracle_address = _oracle_address;
        timelock_address = _timelock_address;
        owner_address = _creator_address;
        oracle = UniswapPairOracle(_oracle_address);
        collateral_token = ERC20(_collateral_address);
        pool_ceiling = _pool_ceiling;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        grantRole(MINT_PAUSER, oracle_address);
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, oracle_address);
        grantRole(REDEEM_PAUSER, timelock_address);
        grantRole(BUYBACK_PAUSER, oracle_address);
        grantRole(BUYBACK_PAUSER, timelock_address);
        grantRole(COLLATERAL_PRICE_PAUSER, oracle_address);
        grantRole(COLLATERAL_PRICE_PAUSER, timelock_address);
    }

    /* ========== VIEWS ========== */

    
    function unclaimedFXS(address _account) public view returns (uint256) {
        return redeemFXSBalances[_account];
    }

    function unclaimedCollateral(address _account) public view returns (uint256) {
        return redeemCollateralBalances[_account];
    }

    function collatDollarBalance() public view returns (uint256) {
        /*
        return (collateral_token.balanceOf(address(this)).sub(unclaimedPoolCollateral))
                                .mul(oracle.consult(frax_contract_address, PRICE_PRECISION))
                                .div(FRAX.frax_price()); //FIX THIS
		*/
        //uint256 error = getCollateralPrice(); //fails
        //uint256 test2 = FRAX.eth_usd_price().mul(PRICE_PRECISION).div(collatEthOracle.consult(weth_address, PRICE_PRECISION)); //fails
        //uint256 test3 = collatEthOracle.consult(collateral_address, PRICE_PRECISION); //fails
        UniswapPairOracle test4 = collatEthOracle; //safe
        //uint256 test5 = test4.consult(weth_address, PRICE_PRECISION); //fails

        //so, this function cannot in any way call collatEthOracle.consult() else it will cause all functions that call it to revert

        uint256 eth_usd_price = FRAX.eth_usd_price(); //safe
        //uint256 collat_to_eth = collatEthOracle.consult(weth_address, PRICE_PRECISION); //fails, but we need collatEthOracle to get collat-ETH price
        return uint256((collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral)); //.mul(getCollateralPrice()).div(1e6);
    }

    function availableExcessCollatDV() public view returns (uint256) {
        ( , , uint256 total_supply, uint256 global_collateral_ratio, uint256 global_collat_value, , ,) = FRAX.frax_info();
        if (global_collateral_ratio > COLLATERAL_RATIO_PRECISION) global_collateral_ratio = COLLATERAL_RATIO_PRECISION; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (total_supply.mul(global_collateral_ratio)).div(COLLATERAL_RATIO_PRECISION); // Calculates collateral needed to back each 1 FRAX with $1 of collateral at current collat ratio
        if (global_collat_value > required_collat_dollar_value_d18) return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // Returns the price of the pool collateral in USD
    function getCollateralPrice() public view returns (uint256) {
        if(collateralPricePaused == true){
            return pausedPrice;
        } else {
            ( , , , , , , , uint256 eth_usd_price) = FRAX.frax_info();
            return eth_usd_price.mul(PRICE_PRECISION).div(collatEthOracle.consult(weth_address, PRICE_PRECISION));
        }
    }

    function setCollatETHOracle(address _collateral_address, address _weth_address) external onlyByOwnerOrGovernance {
        collat_eth_oracle_address = _collateral_address;
        collatEthOracle = UniswapPairOracle(_collateral_address);
        weth_address = _weth_address;
    }

    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency 
    function mint1t1FRAX(uint256 collateral_amount_d18) external notMintPaused {
        ( , , , uint256 global_collateral_ratio, , uint256 minting_fee, ,) = FRAX.frax_info();
        require(global_collateral_ratio >= COLLATERAL_RATIO_MAX, "Collateral ratio must be >= 1");
        require((collateral_token.balanceOf(address(this))) - unclaimedPoolCollateral + collateral_amount_d18 <= pool_ceiling, "[Pool's Closed]: Ceiling reached");
        
        (uint256 frax_amount_d18) = FraxPoolLibrary.calcMint1t1FRAX(
            getCollateralPrice(),
            minting_fee,
            collateral_amount_d18
        ); //1 FRAX for each $1 worth of collateral

        collateral_token.transferFrom(msg.sender, address(this), collateral_amount_d18);
        FRAX.pool_mint(msg.sender, frax_amount_d18);
    }

    // 0% collateral-backed
    function mintAlgorithmicFRAX(uint256 fxs_amount_d18) external notMintPaused {
        ( , uint256 fxs_price, , uint256 global_collateral_ratio, , uint256 minting_fee, ,) = FRAX.frax_info();
        require(global_collateral_ratio == 0, "Collateral ratio must be 0");
        
        (uint256 frax_amount_d18) = FraxPoolLibrary.calcMintAlgorithmicFRAX(
            minting_fee, 
            fxs_price, // X FXS / 1 USD
            fxs_amount_d18
        );

        FXS.pool_burn_from(msg.sender, fxs_amount_d18);
        FRAX.pool_mint(msg.sender, frax_amount_d18);
    }

    // Will fail if fully collateralized or fully algorithmic
    // > 0% and < 100% collateral-backed
    function mintFractionalFRAX(uint256 collateral_amount, uint256 fxs_amount) external notMintPaused {
        (uint256 frax_price, uint256 fxs_price, , uint256 global_collateral_ratio, , uint256 minting_fee, ,) = FRAX.frax_info();
        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        require(collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral + collateral_amount <= pool_ceiling, "Pool ceiling reached, no more FRAX can be minted with this collateral");
        FraxPoolLibrary.MintFF_Params memory input_params = FraxPoolLibrary.MintFF_Params(
            minting_fee, 
            fxs_price,
            frax_price,
            getCollateralPrice(),
            fxs_amount,
            collateral_amount,
            (collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral),
            pool_ceiling,
            global_collateral_ratio
        );

        (uint256 mint_amount, uint256 fxs_needed) = FraxPoolLibrary.calcMintFractionalFRAX(input_params);

        FXS.pool_burn_from(msg.sender, fxs_needed);
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount);
        FRAX.pool_mint(msg.sender, mint_amount);
    }

    // Redeem collateral. 100% collateral-backed
    function redeem1t1FRAX(uint256 FRAX_amount) external notRedeemPaused {
        (, , , uint256 global_collateral_ratio, , , uint256 redemption_fee,) = FRAX.frax_info();
        require(global_collateral_ratio == COLLATERAL_RATIO_MAX, "Collateral ratio must be == 1");

        (uint256 collateral_needed) = FraxPoolLibrary.calcRedeem1t1FRAX(
            getCollateralPrice(),
            FRAX_amount,
            redemption_fee
        );

        
        redeemCollateralBalances[msg.sender] += collateral_needed;
        unclaimedPoolCollateral += collateral_needed;
        
        lastRedeemed[msg.sender] = block.number;

        // Move all external functions to the end
        FRAX.pool_burn_from(msg.sender, FRAX_amount);
        collateral_token.approve(msg.sender, collateral_needed);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem FRAX for collateral and FXS. > 0% and < 100% collateral-backed
    function redeemFractionalFRAX(uint256 FRAX_amount) external notRedeemPaused {
        (, uint256 fxs_price, , uint256 global_collateral_ratio, , , uint256 redemption_fee,) = FRAX.frax_info();
        require(global_collateral_ratio < COLLATERAL_RATIO_MAX && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        uint256 col_price_usd = getCollateralPrice();

        uint256 FRAX_amount_post_fee = FRAX_amount.sub((FRAX_amount.mul(redemption_fee)).div(PRICE_PRECISION));
        uint256 collateral_dollar_value_d18 = FRAX_amount_post_fee.mul(global_collateral_ratio).div(PRICE_PRECISION);
        uint256 fxs_dollar_value_d18 = FRAX_amount_post_fee.sub(collateral_dollar_value_d18);

        uint256 collateral_amount = collateral_dollar_value_d18.mul(PRICE_PRECISION).div(col_price_usd);
        uint256 fxs_amount = fxs_dollar_value_d18.mul(PRICE_PRECISION).div(fxs_price);

        redeemCollateralBalances[msg.sender] += collateral_amount;
        unclaimedPoolCollateral += collateral_amount;

        redeemFXSBalances[msg.sender] += fxs_amount;
        unclaimedPoolFXS += fxs_amount;

        lastRedeemed[msg.sender] = block.number;

        // Move all external functions to the end
        FRAX.pool_burn_from(msg.sender, FRAX_amount);
        collateral_token.approve(msg.sender, collateral_amount);
        FXS.approve(msg.sender, fxs_amount);
        FXS.pool_mint(address(this), fxs_amount);
    }

    // Redeem FRAX for FXS. 0% collateral-backed
    function redeemAlgorithmicFRAX(uint256 FRAX_amount) external notRedeemPaused {
        (, uint256 fxs_price, , uint256 global_collateral_ratio, , , uint256 redemption_fee,) = FRAX.frax_info();
        require(global_collateral_ratio == 0, "Collateral ratio must be 0"); 
        uint256 fxs_dollar_value_d18 = FRAX_amount;
        fxs_dollar_value_d18 = fxs_dollar_value_d18.sub((fxs_dollar_value_d18.mul(redemption_fee)).div(PRICE_PRECISION)); //apply redemption fee

        uint256 fxs_amount = fxs_dollar_value_d18.mul(PRICE_PRECISION).div(fxs_price);
        
        redeemFXSBalances[msg.sender] += fxs_amount;
        unclaimedPoolFXS += fxs_amount;
        
        lastRedeemed[msg.sender] = block.number;
        
        // Move all external functions to the end
        FRAX.pool_burn_from(msg.sender, FRAX_amount);
        FXS.approve(msg.sender, fxs_amount);
        FXS.pool_mint(address(this), fxs_amount);
    }

    // After a redemption happens, transfer the newly minted FXS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out FRAX/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() public {
        require(lastRedeemed[msg.sender] < block.number, "must wait at least one block before collecting redemption");
        bool sendFXS = false;
        bool sendCollateral = false;
        uint FXSAmount;
        uint CollateralAmount;

        // Use Checks-Effects-Interactions pattern
        if(redeemFXSBalances[msg.sender] > 0){
        	FXSAmount = redeemFXSBalances[msg.sender];
        	redeemFXSBalances[msg.sender] = 0;
        	unclaimedPoolFXS -= FXSAmount;

        	sendFXS = true;
        }
        
        if(redeemCollateralBalances[msg.sender] > 0){
        	CollateralAmount = redeemCollateralBalances[msg.sender];
        	redeemCollateralBalances[msg.sender] = 0;
        	unclaimedPoolCollateral -= CollateralAmount;

            sendCollateral = true;
        }

        if(sendFXS == true){
        	FXS.transfer(msg.sender, FXSAmount);
        }
        if(sendCollateral == true){
        	collateral_token.transfer(msg.sender, CollateralAmount);
        }
    }


    // Function can be called by an FXS holder to have the protocol buy back FXS with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackFXS(uint256 FXS_amount) external {
        require(buyBackPaused == false, "Buyback is paused");
        (, uint256 fxs_price, , , , , uint256 redemption_fee,) = FRAX.frax_info();
        
        FraxPoolLibrary.BuybackFXS_Params memory input_params = FraxPoolLibrary.BuybackFXS_Params(
            redemption_fee,
            availableExcessCollatDV(),
            fxs_price,
            getCollateralPrice(),
            FXS_amount
        );

        (uint256 collateral_equivalent_d18) = FraxPoolLibrary.calcBuyBackFXS(input_params);

        // Give the sender their desired collateral and burn the FXS
        FXS.pool_burn_from(msg.sender, FXS_amount);
        collateral_token.transfer(msg.sender, collateral_equivalent_d18);
    }

    // When the protocol is recollateralizing, we need to give a discount of FXS to hit the new CR target
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get FXS for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of FXS + 1% 
    // Anyone can call this function to recollateralize the protocol and take the hardcoded 1% arb opportunity
    function recollateralizeFrax(uint256 collateral_amount_d18) external {
        (, uint256 fxs_price, uint256 total_supply, uint256 global_collateral_ratio, uint256 global_collat_value, , ,) = FRAX.frax_info();

        // The discount rate is the extra FXS they get for the collateral they put in, essentially an open arb opportunity 
        uint256 col_price_usd = getCollateralPrice();
        uint256 c_dollar_value_d18 = (collateral_amount_d18.mul(col_price_usd)).div(PRICE_PRECISION);
        uint256 recollat_value = FraxPoolLibrary.recollateralizeAmount(total_supply, global_collateral_ratio, global_collat_value);
        
        if (recollat_value >= c_dollar_value_d18){
            recollat_value = c_dollar_value_d18;
        } else {
           c_dollar_value_d18 = recollat_value;  
        }
        uint256 fxs_col_value = c_dollar_value_d18.mul(1e6 + bonus_rate).div(1e6); // Add the discount rate of 1% to the FXS amount 

        uint256 recollat_amount = recollat_value.mul(PRICE_PRECISION).div(col_price_usd);
        uint256 fxs_amount = fxs_col_value.mul(PRICE_PRECISION).div(fxs_price);

        FXS.pool_mint(msg.sender, fxs_amount);
        collateral_token.transferFrom(msg.sender, address(this), recollat_amount);
        //require(false, "gets past collateral_token.transferFrom()");
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleMinting() external {
        require(hasRole(MINT_PAUSER, msg.sender));
        mintPaused = !mintPaused;
    }
    
    function toggleRedeeming() external {
        require(hasRole(REDEEM_PAUSER, msg.sender));
        redeemPaused = !redeemPaused;
    }
    
    function toggleBuyBack() external {
        require(hasRole(BUYBACK_PAUSER, msg.sender));
        buyBackPaused = !buyBackPaused;
    }

    function toggleCollateralPrice() external {
        require(hasRole(COLLATERAL_PRICE_PAUSER, msg.sender));
        // If pausing, set paused price; else if unpausing, clear pausedPrice
        if(collateralPricePaused == false){
            pausedPrice = getCollateralPrice();
        } else {
            pausedPrice = 0;
        }
        collateralPricePaused = !collateralPricePaused;
    }

    function setPoolCeiling(uint256 new_ceiling) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
    }

    function setPoolBonusRate(uint256 _bonus_rate) external onlyByOwnerOrGovernance {
        bonus_rate = _bonus_rate;
    }

    function setOracle(address new_oracle) external onlyByOwnerOrGovernance {
        oracle_address = new_oracle;
        oracle = UniswapPairOracle(oracle_address);
    }

    function setTimelock(address new_timelock) external onlyByOwnerOrGovernance {
        timelock_address = new_timelock;
    }

    function setFRAXAddress(address _frax_contract_address) external onlyByOwnerOrGovernance {
        FRAX = FRAXStablecoin(_frax_contract_address);
        frax_contract_address = _frax_contract_address;
    }

    function setFXSAddress(address _fxs_contract_address) external onlyByOwnerOrGovernance {
        FXS = FRAXShares(_fxs_contract_address);
        fxs_contract_address = _fxs_contract_address;
    }

    function setOwner(address _owner_address) external onlyByOwnerOrGovernance {
        owner_address = _owner_address;
    }

    /* ========== EVENTS ========== */

}
