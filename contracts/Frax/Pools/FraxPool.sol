// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;
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
    address[] private owners;
    address private oracle_address;
    address private frax_contract_address;
    address private fxs_contract_address;
    address private timelock_address;
    FRAXShares private FXS;
    FRAXStablecoin private FRAX;
    UniswapPairOracle private oracle;

    mapping (address => uint256) private redeemFXSBalances;
    mapping (address => uint256) private redeemCollateralBalances;
    uint256 public unclaimedPoolCollateral;
    uint256 public unclaimedPoolFXS;
    mapping (address => uint256) lastRedeemed;
    
    // Pool_ceiling is the total units of collateral that a pool contract can hold
    uint256 private pool_ceiling = 0;

    // AccessControl Roles
    bytes32 private constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 private constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bytes32 private constant BUYBACK_PAUSER = keccak256("BUYBACK_PAUSER");
    
    // AccessControl state variables
    bool mintPaused = false;
    bool redeemPaused = false;
    bool buyBackPaused = false;

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        // Loop through the owners until one is found
        bool found = false;
        for (uint i = 0; i < owners.length; i++){ 
            if (owners[i] == msg.sender) {
                found = true;
                break;
            }
        }
        require(found, "You're not an owner");
        _;
    }

    // AccessControl Modifiers
    modifier onlyMintPauser() {
        require(hasRole(MINT_PAUSER, msg.sender));
        _;
    }

    modifier onlyRedeemPauser() {
        require(hasRole(REDEEM_PAUSER, msg.sender));
        _;
    }

    modifier onlyBuyBackPauser() {
        require(hasRole(BUYBACK_PAUSER, msg.sender));
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
        owners.push(_creator_address);
        owners.push(_timelock_address);
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
    }

    /* ========== VIEWS ========== */

    
    function unclaimedFXS(address _account) public view returns (uint256) {
        return redeemFXSBalances[_account];
    }

    function unclaimedCollateral(address _account) public view returns (uint256) {
        return redeemCollateralBalances[_account];
    }

    function collatDollarBalance() public view returns (uint256) {
        return (collateral_token.balanceOf(address(this)) - unclaimedPoolCollateral)
                                .mul(oracle.consult(frax_contract_address, 1e6))  // X FRAX / 1 COLLAT
                                .div(FRAX.frax_price());
    }


    // (uint256 frax_price, uint256 fxs_price, uint256 total_supply, uint256 global_collateral_ratio, uint256 global_collat_value, uint256 minting_fee, uint256 redemption_fee) = FRAX.frax_info();

    function availableExcessCollatDV() public view returns (uint256) {
        (uint256 frax_price, , uint256 total_supply, uint256 global_collateral_ratio, uint256 global_collat_value, , ) = FRAX.frax_info();
        uint256 total_FRAX_dollar_value_d18 = total_supply.mul(1e6).div(frax_price); 
        if (global_collateral_ratio > 1e6) global_collateral_ratio = 1e6; // Handles an overcollateralized contract with CR > 1
        uint256 required_collat_dollar_value_d18 = (total_FRAX_dollar_value_d18.mul(global_collateral_ratio)).div(1e6);
        if (global_collat_value > required_collat_dollar_value_d18) return global_collat_value.sub(required_collat_dollar_value_d18);
        else return 0;
    }

    /* ========== PUBLIC FUNCTIONS ========== */
    
    // We separate out the 1t1, fractional and algorithmic minting functions for gas efficiency 
    // 100+% collateral-backed
    function mint1t1FRAX(uint256 collateral_amount_d18) external notMintPaused {
        (uint256 frax_price, , , uint256 global_collateral_ratio, , uint256 minting_fee, ) = FRAX.frax_info();
        require(global_collateral_ratio >= 1000000, "Collateral ratio must be >= 1");
        require((collateral_token.balanceOf(address(this))) + collateral_amount_d18 <= pool_ceiling, "[Pool's Closed]: Ceiling reached");
        
        (uint256 frax_amount_d18) = FraxPoolLibrary.calcMint1t1FRAX(
            oracle.consult(frax_contract_address, 1e6), // X FRAX / 1 COLLAT
            frax_price,
            minting_fee,
            collateral_amount_d18
        );

        // TransferHelper.safeTransferFrom(collateral_address, msg.sender, address(this), collateral_amount_d18);
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount_d18);
        FRAX.pool_mint(msg.sender, frax_amount_d18);
    }

    // 0% collateral-backed
    function mintAlgorithmicFRAX(uint256 fxs_amount_d18) external notMintPaused {
        (, uint256 fxs_price, , uint256 global_collateral_ratio, , uint256 minting_fee, ) = FRAX.frax_info();
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
        (uint256 frax_price, uint256 fxs_price, , uint256 global_collateral_ratio, , uint256 minting_fee, ) = FRAX.frax_info();
        require(global_collateral_ratio < 1000000 && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        
        FraxPoolLibrary.MintFF_Params memory input_params = FraxPoolLibrary.MintFF_Params(
            minting_fee, 
            fxs_price, // X FXS / 1 USD
            frax_price,
            oracle.consult(frax_contract_address, 1e6),
            fxs_amount,
            collateral_amount,
            (collateral_token.balanceOf(address(this))),
            pool_ceiling,
            global_collateral_ratio
        );

        (uint256 collateral_needed, uint256 mint_amount, uint256 fxs_needed) = FraxPoolLibrary.calcMintFractionalFRAX(input_params);

        require((collateral_token.balanceOf(address(this))) + collateral_needed <= pool_ceiling, "[Pool's Closed]: Ceiling reached");

        // TransferHelper.safeTransferFrom(collateral_address, msg.sender, address(this), collateral_needed);
        collateral_token.transferFrom(msg.sender, address(this), collateral_needed);
        FRAX.pool_mint(msg.sender, mint_amount);
        FXS.burnFrom(msg.sender, fxs_needed);
    }

    // Redeem collateral. 100+% collateral-backed
    function redeem1t1FRAX(uint256 FRAX_amount) external notRedeemPaused {
        (uint256 frax_price, , , uint256 global_collateral_ratio, , , uint256 redemption_fee) = FRAX.frax_info();
        require(global_collateral_ratio >= 1000000, "Collateral ratio must be >= 1");

        (uint256 collateral_needed) = FraxPoolLibrary.calcRedeem1t1FRAX(
            frax_price,
            oracle.consult(frax_contract_address, 1e6).mul(1e6).div(frax_price),
            FRAX_amount,
            redemption_fee
        );

        collateral_token.approve(msg.sender, collateral_needed);
        redeemCollateralBalances[msg.sender] += collateral_needed;
        unclaimedPoolCollateral += collateral_needed;
        
        lastRedeemed[msg.sender] = block.number;

        FRAX.pool_burn_from(msg.sender, FRAX_amount);
    }

    // Will fail if fully collateralized or algorithmic
    // Redeem FRAX for collateral and FXS. .000001% - .999999% collateral-backed
    function redeemFractionalFRAX(uint256 FRAX_amount) external notRedeemPaused {
        (uint256 frax_price, uint256 fxs_price, , uint256 global_collateral_ratio, , , uint256 redemption_fee) = FRAX.frax_info();
        require(global_collateral_ratio < 1000000 && global_collateral_ratio > 0, "Collateral ratio needs to be between .000001 and .999999");
        uint256 frax_dollar_value_d18 = FRAX_amount.mul(1e6).div(frax_price);
        uint256 col_price_usd = oracle.consult(frax_contract_address, 1e6).mul(1e6).div(frax_price);

        frax_dollar_value_d18 = frax_dollar_value_d18.sub((frax_dollar_value_d18.mul(redemption_fee)).div(1e6));
        uint256 collateral_dollar_value_d18 = frax_dollar_value_d18.mul(global_collateral_ratio).div(1e6);
        uint256 fxs_dollar_value_d18 = frax_dollar_value_d18.sub(collateral_dollar_value_d18);

        collateral_token.approve(msg.sender, collateral_dollar_value_d18.mul(col_price_usd).div(1e6));
        redeemCollateralBalances[msg.sender] += collateral_dollar_value_d18.mul(col_price_usd).div(1e6);
        unclaimedPoolCollateral += collateral_dollar_value_d18.mul(col_price_usd).div(1e6);

        FXS.pool_mint(address(this), fxs_dollar_value_d18.mul(fxs_price).div(1e6));
        FXS.approve(msg.sender, fxs_dollar_value_d18.mul(fxs_price).div(1e6));
        redeemFXSBalances[msg.sender] += fxs_dollar_value_d18.mul(fxs_price).div(1e6);
        unclaimedPoolFXS += fxs_dollar_value_d18.mul(fxs_price).div(1e6);
        
        lastRedeemed[msg.sender] = block.number;

        FRAX.pool_burn_from(msg.sender, FRAX_amount);
    }

    // Redeem FRAX for FXS. 0% collateral-backed
    function redeemAlgorithmicFRAX(uint256 FRAX_amount) external notRedeemPaused {
        (uint256 frax_price, uint256 fxs_price, , uint256 global_collateral_ratio, , , uint256 redemption_fee) = FRAX.frax_info();
        require(global_collateral_ratio == 0, "Collateral ratio must be 0"); 
        uint256 frax_dollar_value_d18 = FRAX_amount.mul(1e6).div(frax_price);
        frax_dollar_value_d18 = frax_dollar_value_d18.sub((frax_dollar_value_d18.mul(redemption_fee)).div(1e6));

        FXS.pool_mint(address(this), frax_dollar_value_d18.mul(fxs_price).div(1e6));
        FXS.approve(msg.sender, frax_dollar_value_d18.mul(fxs_price).div(1e6));
        redeemFXSBalances[msg.sender] += frax_dollar_value_d18.mul(fxs_price).div(1e6);
        unclaimedPoolFXS += frax_dollar_value_d18.mul(fxs_price).div(1e6);
        
        lastRedeemed[msg.sender] = block.number;
        
        FRAX.pool_burn_from(msg.sender, FRAX_amount);
    }

    // After a redemption happens, transfer the newly minted FXS and owed collateral from this pool
    // contract to the user. Redemption is split into two functions to prevent flash loans from being able
    // to take out FRAX/collateral from the system, use an AMM to trade the new price, and then mint back into the system.
    function collectRedemption() public {
        require(lastRedeemed[msg.sender] < block.number, "must wait at least one block before collecting redemption");
        if(redeemFXSBalances[msg.sender] > 0){
            FXS.transfer(msg.sender, redeemFXSBalances[msg.sender]);
            unclaimedPoolFXS -= redeemFXSBalances[msg.sender];
            redeemFXSBalances[msg.sender] = 0;
        }
        
        if(redeemCollateralBalances[msg.sender] > 0){
            collateral_token.transfer(msg.sender, redeemCollateralBalances[msg.sender]);
            unclaimedPoolCollateral -= redeemCollateralBalances[msg.sender];
            redeemCollateralBalances[msg.sender] = 0;
        }
    }


    // Function can be called by an FXS holder to have the protocol buy back FXS with excess collateral value from a desired collateral pool
    // This can also happen if the collateral ratio > 1
    function buyBackFXS(uint256 FXS_amount) external {
        require(buyBackPaused == false, "Buyback is paused");
        (uint256 frax_price, uint256 fxs_price, , , , , uint256 redemption_fee) = FRAX.frax_info();
        
        FraxPoolLibrary.BuybackFXS_Params memory input_params = FraxPoolLibrary.BuybackFXS_Params(
            redemption_fee,
            availableExcessCollatDV(),
            fxs_price,
            oracle.consult(frax_contract_address, 1e6).mul(1e6).div(frax_price),
            FXS_amount
        );

        (uint256 collateral_equivalent_d18) = FraxPoolLibrary.calcBuyBackFXS(input_params);

        // Give the sender their desired collateral and burn the FXS
        collateral_token.transfer(msg.sender, collateral_equivalent_d18);
        FXS.burnFrom(msg.sender, FXS_amount);
    }

    
    // When the protocol is recollateralizing, we need to give a discount of FXS to hit the new CR target
    // Returns value of collateral that must increase to reach recollateralization target (if 0 means no recollateralization)
    function recollateralizeAmount() public view returns (uint256 recollateralization_left) {
        ( , , uint256 total_supply, uint256 global_collateral_ratio, uint256 global_collat_value, , ) = FRAX.frax_info();
        uint256 target_collat_value = total_supply.mul(global_collateral_ratio).div(1e12); // We want 6 degrees of precision so divide by 1e12 
        // Subtract the current value of collateral from the target value needed, if higher than 0 then system needs to recollateralize
        if (target_collat_value > global_collat_value) recollateralization_left = target_collat_value.sub(global_collat_value); 
        
        else recollateralization_left = 0;
        
        return(recollateralization_left);
    }
    
    // Thus, if the target collateral ratio is higher than the actual value of collateral, minters get FXS for adding collateral
    // This function simply rewards anyone that sends collateral to a pool with the same amount of FXS + 1% 
    // Anyone can call this function to recollateralize the protocol and take the hardcoded 1% arb opportunity
    function recollateralizeFrax(uint256 collateral_amount_d18) public {
        require(recollateralizeAmount() > 0, "no extra collateral needed"); 

        (uint256 frax_price, uint256 fxs_price, , , , , ) = FRAX.frax_info();
        // The discount rate is the extra FXS they get for the collateral they put in, essentially an open arb opportunity 
        uint256 col_price = oracle.consult(frax_contract_address, 1e6); // X FRAX / 1 COLLAT
        uint256 col_price_usd = col_price.mul(1e6).div(frax_price);
        uint256 c_dollar_value_d18 = (collateral_amount_d18.mul(col_price_usd)).div(1e6);
        uint256 recol_am = recollateralizeAmount();
        
        if (recol_am >= c_dollar_value_d18)  recol_am = c_dollar_value_d18;
        
        else {
           c_dollar_value_d18 = recol_am;  
        }
        uint256 fxs_col_value = c_dollar_value_d18.add(recol_am.div(1e2)); // Add the discount rate of 1% to the FXS amount 
        collateral_token.transferFrom(msg.sender, address(this), collateral_amount_d18);
        FXS.pool_mint(tx.origin, fxs_col_value.mul(fxs_price).div(1e6));

    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleMinting() external onlyMintPauser {
        mintPaused = !mintPaused;
    }
    
    function toggleRedeeming() external onlyRedeemPauser {
        redeemPaused = !redeemPaused;
    }
    
    function toggleBuyBack() external onlyBuyBackPauser {
        buyBackPaused = !buyBackPaused;
    }

    function setPoolCeiling(uint256 new_ceiling) external onlyByOwnerOrGovernance {
        pool_ceiling = new_ceiling;
    }

    function setOracle(address new_oracle) external onlyByOwnerOrGovernance {
        oracle_address = new_oracle;
        oracle = UniswapPairOracle(oracle_address);
    }
    
    function setCollateralAdd(address _collateral_address) external onlyByOwnerOrGovernance {
        collateral_address = _collateral_address;
        collateral_token = ERC20(_collateral_address);
    }
    
    function setFRAXAddress(address _frax_contract_address) external onlyByOwnerOrGovernance {
        FRAX = FRAXStablecoin(_frax_contract_address);
        frax_contract_address = _frax_contract_address;
    }

    function setFXSAddress(address _fxs_contract_address) external onlyByOwnerOrGovernance {
        FXS = FRAXShares(_fxs_contract_address);
        fxs_contract_address = _fxs_contract_address;
    }

    // Adds an owner 
    function addOwner(address owner_address) external onlyByOwnerOrGovernance {
        owners.push(owner_address);
    }

    // Removes an owner 
    function removeOwner(address owner_address) external onlyByOwnerOrGovernance {
        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < owners.length; i++){ 
            if (owners[i] == owner_address) {
                owners[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }
    
    /* ========== EVENTS ========== */

}
