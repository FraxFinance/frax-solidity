// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =============================== BAMM ===============================
// ====================================================================
/*
** BAMM (Borrow AMM)
** - The BAMM wraps Uniswap/Fraxswap like LP tokens (#token0 * #token1 = K), giving out an ERC-20 wrapper token in return
** - Users have a personal vault where they can add / remove token0 and token1.
** - Users can rent the LP constituent token0s and token1s, the liquidity from which will be removed and stored in the users vault.
** - Rented LP constituent token0s and token1s are accounted as SQRT(#token0 * #token1)
** - The user can remove tokens from their personal vault as long as the SQRT(#token0 * #token1) is more than the rented value
** - Borrowers pay an interest rate based on the utility factor
** - Borrowers can only be liquidated due to interest rate payments, not due to price movements.
** - No price oracle needed!
*/

/*
   -----------------------------------------------------------
   -------------------- EXAMPLE SCENARIOS --------------------
   -----------------------------------------------------------

   Assume Fraxswap FRAX/FXS LP @ 0x03B59Bd1c8B9F6C265bA0c3421923B93f15036Fa.
   token0 = FXS, token1 = FRAX

   Scenario 1: User wants to rent some FXS using FRAX as collateral
   ===================================
   1) User obtains some FRAX, which will be used as collateral
   2) User calls executeActionsAndSwap() with 
      a) Positive token1Amount (add FRAX to vault)
      b) Negative token0Amount (withdraw FXS from vault)
      c) Positive rent (renting)
      d) The swapParams to swap SOME of the excess FRAX for FXS (they need to remain solvent at the end of the day)
      e) (Optional) v,r,s for a permit (token1 to this contract) for the vault add
   3) The internal call flow will be:
      i) BAMM-owned LP is unwound into BOTH FRAX and FXS, according to the supplied rent parameter. Both tokens are added to the user's vault.
      ii) User supplied FRAX is added to their vault to increase their collateral
      iii) Some of the excess FRAX from the LP unwind is swapped for FXS (according to swapParams)
      iv) FXS is sent to the user
      v) Contract will revert if the user is insolvent or the LP utility is above MAX_UTILITY_RATE


   Scenario 2: User from Scenario 1 wants to repay SOME of their rented FXS and get SOME FRAX back
   ===================================
   1) User calls executeActionsAndSwap() with 
      a) Negative token1Amount (withdraw FRAX from vault)
      b) Positive token0Amount (add FXS to vault)
      c) Negative rent (repaying)
      d) minToken0Amount to prevent sandwiches from the LP add
      e) minToken1Amount to prevent sandwiches from the LP add
      f) The swapParams to swap SOME of the FXS for FRAX. LP will be added at the current ratio so this is helpful.
      g) (Optional) v,r,s for a permit (token0 to this contract) for the vault add
   2) The internal call flow will be:
      i) Interest accrues so the user owes a little bit more FXS (and/or FRAX) now.
      ii) User-supplied FXS is added to the vault
      iii) Some of the FXS is swapped for FRAX (according to swapParams). 
      iv) FRAX and FXS are added (at current LP ratio) to make the Fraxswap LP, which becomes BAMM-owned, according to the supplied rent parameter.
      v) Accounting updated to lower rent and vaulted tokens.
      vi) FRAX is sent to the user
      vii) Contract will revert if the user is insolvent or the LP utility is above MAX_UTILITY_RATE


   Scenario 3: User from Scenario 1 wants to repay the remaining rented FXS, get their FRAX back, and close the position
   ===================================
   1) User calls executeActionsAndSwap() with 
      a) Negative token1Amount (withdraw FRAX from vault)
      b) Positive token0Amount (add FXS to vault)
      c) closePosition as true. No need to supply rent as the function will override it anyways 
      d) minToken0Amount to prevent sandwiches from the LP add
      e) minToken1Amount to prevent sandwiches from the LP add
      f) The swapParams to swap SOME of the FXS for FRAX. LP will be added at the current ratio so this is helpful.
      g) (Optional) v,r,s for a permit (token0 to this contract) for the vault add
   2) The internal call flow will be:
      i) Interest accrues so the user owes a little bit more FXS (and/or FRAX) now.
      ii) User-supplied FXS is added to the vault
      iii) Some of the FXS is swapped for FRAX (according to swapParams). 
      iv) Accounting updated to lower rent and vaulted tokens. 
      v) Any remaining FRAX or FXS needed is safeTransferFrom'd the user
      vi) FRAX and FXS are added (at current LP ratio) to make the Fraxswap LP, which becomes BAMM-owned, according to the supplied rent parameter
      vii) FRAX is sent back to the user
      viii) Contract will revert if the user is insolvent or the LP utility is above MAX_UTILITY_RATE


   Scenario 4: User wants to loan some LP and earn interest
   ===================================
   1) Approve LP to this BAMM contract
   2) Call mint(), which will give you BAMM tokens as a "receipt"
   3) Wait some time, and assume some other people borrow. Interest accrues
   4) Call redeem(), which burns your BAMM tokens and gives you your LP back, plus some extra LP as interest.
 
*/

// Frax Finance: https://github.com/FraxFinance

// Primary Author
// Dennis: https://github.com/denett

// Reviewer(s) / Contributor(s)
// Travis Moore: https://github.com/FortisFortuna


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../Fraxswap/core/FraxswapPair.sol";
import { FraxswapRouterMultihop } from "../Fraxswap/periphery/FraxswapRouterMultihop.sol";
import "./BAMMHelper.sol";
import "./FraxswapOracle.sol";
import "hardhat/console.sol";

contract BAMM is ERC20, ERC20Burnable, ReentrancyGuard {
   using SafeCast for *;

   // ############################################
   // ############## STATE VARIABLES ############# 
   // ############################################
   
   /// @notice Token 0 in the UniV2-like LP
   IERC20 public immutable token0;

   /// @notice Token 1 in the UniV2-like LP
   IERC20 public immutable token1;

   /// @notice Address of the UniV2-like pair
   FraxswapPair public immutable pair;

   /// @notice Whether the wrapped LP is Fraxswap or another UniV2 derivative
   bool public immutable isFraxswapPair;

   /// @notice The swap fee for the LP. E.g for 1%, use 9900. (10000 - 9900) / 100 = 1%
   uint public immutable pairFee;

   /// @notice The Fraxswap router
   FraxswapRouterMultihop public immutable fraxswapRouter;

   /// @notice Has helper functions, especially for unbalanced liquidity calculations
   BAMMHelper public immutable bammHelper;

   /// @notice Price oracle for the Fraxswap pair
   FraxswapOracle public immutable fraxswapOracle;

   /// @notice Tracks the amount of rented liquidity
   uint public sqrtRented;

   /// @notice Multiplier used in interest rate and rent amount calculations. Never decreases and acts like an accumulator of sorts.
   uint public rentedMultiplier = PRECISION; // Initialized at PRECISION, but will change
   
   /// @notice The last time an interest payment was made
   uint public timeSinceLastInterestPayment = block.timestamp;

   /// @notice Vault information for a given user
   mapping(address => Vault) public userVaults;
   
   /// @notice Nominated new owner. They still need to call acceptOwnership()
   address public nominatedOwner;

   /// @notice Current owner of this contract
   address public owner;
   

   // #######################################
   // ############## CONSTANTS ############## 
   // ####################################### 

   /// @notice The precision to use and conform to
   uint constant PRECISION = 1E18;

   /// @notice The minimum interest rate
   uint public constant MIN_RATE = 1 * PRECISION; // 1%

   /// @notice Interest rate after the first kink (70% utility)
   uint public constant KINK1_RATE = 10 * PRECISION; // 10%

   /// @notice Interest rate after the second kink (80% utility)
   uint public constant KINK2_RATE = 100 * PRECISION; // 100%

   /// @notice The maximum interest rate
   uint public constant MAX_RATE = 730 * PRECISION; // 730% = 2% per day   

   /// @notice Percent above which the position is considered insolvent
   uint public constant SOLVENCY_THRESHOLD = (98 * PRECISION) / 100; // 98%

   /// @notice Protocol's cut of the interest rate
   uint public constant FEE_SHARE = (10 * 10000) / 100; // 10%

   /// @notice The fee when a liquidation occurs
   uint public constant LIQUIDATION_FEE = 100; // 1%

   /// @notice The maximum utility rate for an LP
   uint public constant MAX_UTILITY_RATE = (PRECISION * 9) / 10; // 90%
   

   // #####################################
   // ############## Structs ##############   
   // #####################################

   /// @notice Details for a user's vault
   struct Vault {
      int token0; // Token 0 in the LP
      int token1; // Token 1 in the LP
      int rented; // SQRT(#token0 * #token1) that is rented
   }
   
   /// @notice Function parameter pack for various actions. Different parts may be empty for different actions.
   struct Action {
      int256 token0Amount; // Amount of token 0. Positive = add to vault. Negative = remove from vault
      int256 token1Amount; // Amount of token 1. Positive = add to vault. Negative = remove from vault
      int256 rent; // SQRT(#token0 * #token1). Positive if borrowing, negative if repaying
      address to; // A destination address
      uint minToken0Amount; // Minimum amount of token 0 expected
      uint minToken1Amount; // Minimum amount of token 1 expected
      bool closePosition; // Whether to close the position or not
      bool approveMax; // Whether to approve max (e.g. uint256(-1) or similar)
      uint8 v; // Part of a signature
      bytes32 r; // Part of a signature
      bytes32 s; // Part of a signature
      uint256 deadline; // Deadline of this action
   }   
   

   // ####################################
   // ############## Events ##############
   // ####################################
   
   /// @notice Emitted when BAMM tokens get minted by a user directly
   /// @param sender The person sending in the LP
   /// @param recipient The recipient of the minted BAMM tokens
   /// @param lp_in The amount of LP being sent in
   /// @param bamm_out The amount of BAMM tokens minted
   event BAMMMinted(address indexed sender, address indexed recipient, uint256 lp_in, uint256 bamm_out);  

   /// @notice Emitted when BAMM tokens get redeemed by a user directly
   /// @param sender The person sending in the BAMM tokens
   /// @param recipient The recipient of the LP tokens
   /// @param bamm_in The amount of BAMM tokens being sent in
   /// @param lp_out The amount of LP sent out
   event BAMMRedeemed(address indexed sender, address indexed recipient, uint256 bamm_in, uint256 lp_out); 

   /// @notice Emitted when a borrower pays back a loan
   /// @param borrower The borrower
   /// @param rent The rent change
   /// @param token0ToAddToLP Token0 paid back
   /// @param token1ToAddToLP Token1 paid back
   /// @param closePosition Whether the position was closed or not
   event LoanRepaid(address indexed borrower, int256 rent, uint256 token0ToAddToLP, uint256 token1ToAddToLP, bool closePosition);
   
   /// @notice Emitted when a borrower takes a loan
   /// @param borrower The borrower
   /// @param rent The rent change
   /// @param token0Amount Token0 credited to borrower's vault
   /// @param token1Amount Token1 credited to borrower's vault
   event LoanTaken(address indexed borrower, int256 rent, uint256 token0Amount, uint256 token1Amount);

   /// @notice Emitted when a new owner is nominated
   /// @param newOwner The address nominated to be the new owner
   event OwnerNominated(address indexed newOwner);

   /// @notice Emitted when the nominated new owner accepts ownership
   /// @param previousOwner The old owner
   /// @param newOwner The new owner
   event OwnerChanged(address indexed previousOwner, address indexed newOwner);   

   /// @notice Emitted when the borrower deposits tokens to their vault
   /// @param borrower The borrower
   /// @param token0_amt Amount of token0 deposited
   /// @param token1_amt Amount of token1 deposited
   event TokensDepositedToVault(address indexed borrower, uint256 token0_amt, uint256 token1_amt);   

   /// @notice Emitted when the borrower withdraws tokens from their vault
   /// @param borrower The borrower
   /// @param token0_amt Amount of token0 withdrawn
   /// @param token1_amt Amount of token1 withdrawn
   event TokensWithdrawnFromVault(address indexed borrower, uint256 token0_amt, uint256 token1_amt);   

   /// @notice Emitted when a user gets liquidated
   /// @param user The user being liquidated
   /// @param liquidator The person doing the liquidating
   /// @param liquidity The total amount of liquidity in question
   /// @param liquidity_out Liquidity sent back to the user
   /// @param liquidation_fee Liquidity fee sent to the liquidator
   event UserLiquidated(address indexed user, address indexed liquidator, uint liquidity, uint liquidity_out, uint liquidation_fee);   


   // #######################################
   // ############## Modifiers ##############
   // #######################################

   /// @notice Whether msg.sender is the owner
   modifier isOwner() {
      require (msg.sender == owner, "Not owner");
      _;
   }
   

   // #########################################
   // ############## Constructor ##############
   // #########################################

   /// @notice Constructor for this contract
   /// @param _pair Address of the UniV2-like pair
   /// @param _isFraxswapPair Whether the wrapped LP is Fraxswap or another UniV2 derivative
   /// @param _pairFee The swap fee for the LP. E.g for 1%, use 9900. (10000 - 9900) / 100 = 1%
   /// @param _fraxswapRouter The Fraxswap router
   /// @param _bammHelper Helper contract for the BAMM
   /// @param _fraxswapOracle Price oracle for the Fraxswap pair
   constructor(
      FraxswapPair _pair, 
      bool _isFraxswapPair, 
      uint _pairFee, 
      FraxswapRouterMultihop _fraxswapRouter,
      BAMMHelper _bammHelper, 
      FraxswapOracle _fraxswapOracle
   ) ERC20("BAMM", "BAMM") {
      // Fill in the state variables
      token0 = IERC20(_pair.token0());
      token1 = IERC20(_pair.token1());
      pair = _pair;
      isFraxswapPair = _isFraxswapPair;
      pairFee = _pairFee;
      fraxswapRouter = _fraxswapRouter;
      bammHelper = _bammHelper;
      fraxswapOracle = _fraxswapOracle;
      owner = msg.sender;
   }
   

   // ############################################
   // ############## Lender actions ##############
   // ############################################
 
   /// @notice Mint BAMM wrapper tokens
   /// @param to Destination address for the wrapper tokens
   /// @param amount The amount of UniV2-like LP to wrap
   /// @return bamm_out The amount of BAMM tokens generated
   /// @dev Make sure to approve first
   function mint(address to, uint256 amount) external nonReentrant returns (uint256 bamm_out) {
      // Sync the LP, then add the interest
      (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) = _addInterest();

      // Calculate the LP to BAMM conversion
      uint256 sqrtReserve = Math.sqrt(uint256(reserve0) * reserve1);
      uint256 sqrtAmount = (amount * sqrtReserve) / pairTotalSupply;
      uint256 balance = pair.balanceOf(address(this));
      uint256 sqrtBalance = (balance * sqrtReserve) / pairTotalSupply;
      uint sqrtRentedReal = (sqrtRented * rentedMultiplier) / PRECISION;

      // Take the LP from the sender and mint them BAMM wrapper tokens
      bamm_out = ((sqrtBalance + sqrtRentedReal) == 0) ? sqrtAmount : ((sqrtAmount * totalSupply()) / (sqrtBalance + sqrtRentedReal));
      if (amount > 0) SafeERC20.safeTransferFrom(IERC20(address(pair)), msg.sender, address(this), amount);
      _mint(((to == address(0)) ? msg.sender : to), bamm_out);

      emit BAMMMinted(msg.sender, to, amount, bamm_out); 
   }
   
   /// @notice Redeem BAMM wrapper tokens
   /// @param to Destination address for the LP tokens
   /// @param amount The amount of BAMM tokens to redeem for UniV2-like LP
   /// @return lp_out The amount of LP tokens generated
   function redeem(address to, uint256 amount) external nonReentrant returns (uint256 lp_out) {
      // Sync the LP, then add the interest
      (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) = _addInterest();

      // Calculate the BAMM to LP conversion
      uint256 sqrtToRedeem;
      uint256 sqrtReserve;
      {
         uint256 balance = pair.balanceOf(address(this));
         sqrtReserve = Math.sqrt(uint256(reserve0) * reserve1);
         uint256 sqrtBalance = (balance * sqrtReserve) / pairTotalSupply;
         uint sqrtRentedReal = (sqrtRented * rentedMultiplier) / PRECISION;
         sqrtToRedeem = (amount * (sqrtBalance + sqrtRentedReal)) / totalSupply();
      }

      // Burn the BAMM wrapper tokens from the sender and give them LP
      // lp_out = 0;
      if (sqrtToRedeem > 0) {
         lp_out = (sqrtToRedeem * pairTotalSupply) / sqrtReserve;
         SafeERC20.safeTransfer(IERC20(address(pair)), (to == address(0) ? msg.sender : to), lp_out);
      }
      _burn(msg.sender, amount);

      // Max sure the max utility would not be exceeded
      _checkMaxUtility(reserve0, reserve1, pairTotalSupply);

      emit BAMMRedeemed(msg.sender, to, amount, lp_out); 
   }   
   

   // ############################################
   // ############# Borrower actions ############# 
   // ############################################ 
   
   /// @notice Execute actions
   /// @param action The details of the action to be executed
   function executeActions(Action memory action) public {
      FraxswapRouterMultihop.FraxswapParams memory swapParams;
      executeActionsAndSwap(action, swapParams);
   }
   
   /// @notice Execute actions and also do a swap
   /// @param action The details of the action to be executed
   /// @param swapParams The details of the swap to be executed
   function executeActionsAndSwap(Action memory action, FraxswapRouterMultihop.FraxswapParams memory swapParams) public nonReentrant {
      // Get the existing vault info for the user
      Vault memory vault = userVaults[msg.sender];
   
      // Sync the LP, then add the interest
      (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) = _addInterest();
      
      // Note if the user is closing the position
      if (action.closePosition) action.rent = -vault.rented;
      
      // Rent LP constituent tokens (if specified). Positive rent means borrowing
      if (action.rent > 0) { 
         // Calculate the amount of LP, token0, and token1
         uint sqrtAmountRented = (uint256(action.rent > 0 ? action.rent : -action.rent) * rentedMultiplier) / 1e18;
         uint lpTokenAmount = (sqrtAmountRented * pairTotalSupply) / Math.sqrt(uint256(reserve0) * reserve1);
         uint token0Amount = (reserve0 * lpTokenAmount) / pairTotalSupply;
         uint token1Amount = (reserve1 * lpTokenAmount) / pairTotalSupply;

         // Transfer LP to the LP contract, then optimistically burn it there to release token0 and token1 to this contract
         // The tokens will be given to the borrower later, assuming action.token0Amount and/or action.token1Amount is positive
         SafeERC20.safeTransfer(IERC20(address(pair)), address(pair), lpTokenAmount);
         pair.burn(address(this));

         // Update the rent and credit the user some token0 and token1
         vault.rented += action.rent;
         vault.token0 += token0Amount.toInt256();
         vault.token1 += token1Amount.toInt256();

         // Update the total rented liquidity
         sqrtRented += uint(action.rent);

         emit LoanTaken(msg.sender, action.rent, token0Amount, token1Amount);
      }
      
      // If specified in the action, add tokens to the vault (vault is modified by reference)
      // Positive token0Amount and/or token1Amount means add from vault
      if (action.token0Amount > 0 || action.token1Amount > 0) _addTokensToVault(vault, action);
      
      // Execute the swap if there are swapParams
      if (swapParams.amountIn != 0) { 
         // Do the swap
         _executeSwap(vault, swapParams); 

         // Swap might have changed the reserves of the pair.
         if (action.rent != 0) {
            (reserve0, reserve1, pairTotalSupply) = _addInterest(); 
         }
      }
      
      // Return rented LP constituent tokens (if specified) to this contract. 
      // Negative rent means repaying but not closing.
      uint token0ToAddToLP;
      uint token1ToAddToLP;
      if (action.rent < 0) { 
         // Calculate some values
         uint sqrtAmountRented = (uint256(-action.rent) * rentedMultiplier) / 1e18;
         uint lpTokenAmount = (sqrtAmountRented * pairTotalSupply) / Math.sqrt(uint256(reserve0) * reserve1);
         token0ToAddToLP = (reserve0 * lpTokenAmount) / pairTotalSupply;
         token1ToAddToLP = (reserve1 * lpTokenAmount) / pairTotalSupply;

         // Avoid sandwich attacks
         require ((token0ToAddToLP > action.minToken0Amount) && (token1ToAddToLP > action.minToken1Amount), "Min amount used");

         // Update the working copy of the user's vault
         vault.rented -= (-action.rent); // For clarity
         vault.token0 -= token0ToAddToLP.toInt256();
         vault.token1 -= token1ToAddToLP.toInt256();

         // Update the total rented liquidity
         sqrtRented -= uint(-action.rent);
      }
      //console.log("vault.rented", uint(vault.rented));
      //console.log("sqrtRented", sqrtRented);
      
      // Close the position (if specified)
      if (action.closePosition) {
         // You might have some leftover tokens you can withdraw later if you over-collateralized
         action.token0Amount = -vault.token0;
         action.token1Amount = -vault.token1;
          _addTokensToVault(vault, action);
      }
      
      // Return rented LP constituent tokens (continued from above)
      // This portion recovers the LP and gives it to this BAMM contract
      if (token0ToAddToLP > 0) {
         // Send token0 and token1 directly to the LP address
         SafeERC20.safeTransfer(IERC20(address(token0)), address(pair), token0ToAddToLP);
         SafeERC20.safeTransfer(IERC20(address(token1)), address(pair), token1ToAddToLP);

         // Mint repayed LP last, so we know we have enough tokens in the contract
         pair.mint(address(this));

         emit LoanRepaid(msg.sender, -action.rent, token0ToAddToLP, token1ToAddToLP, action.closePosition);
      }
      
      // Remove token0 from the vault and give to the user (if specified)
      // Negative token0Amount means remove from vault
      if (action.token0Amount < 0) {
         vault.token0 += action.token0Amount;
         SafeERC20.safeTransfer(IERC20(address(token0)), (action.to == address(0) ? msg.sender : action.to), uint256(-action.token0Amount));
         
         emit TokensWithdrawnFromVault(msg.sender, uint256(-action.token0Amount), 0);
      }

      // Remove token1 from the vault and give to the user (if specified)
      // Negative token1Amount means remove from vault
      if (action.token1Amount < 0) {
         vault.token1 += action.token1Amount;
         SafeERC20.safeTransfer(IERC20(address(token1)), (action.to == address(0) ? msg.sender : action.to), uint256(-action.token1Amount));
         
         emit TokensWithdrawnFromVault(msg.sender, 0, uint256(-action.token1Amount));
      }


      
      // Write the final vault state to storage after all the above operations are completed
      userVaults[msg.sender] = vault;
      
      // Make sure the user is still solvent
      if (!_solvent(vault)) revert("Not solvent");
      
      // Check max utility after a rent
      if (action.rent > 0) _checkMaxUtility(reserve0, reserve1, pairTotalSupply);
   }
   

   // ############################################
   // ############ Liquidator actions ############
   // ############################################ 
 
   /// @notice Liquidate an underwater user by adding the liquidity back to the pool
   /// @param user The user to be liquidated
   function liquidate(address user) external nonReentrant returns (uint liq_out, uint liq_fee) {
      // Sync the LP, then add the interest
      (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) = _addInterest();

      // Compare the spot price from the reserves to the oracle price. Revert if they are off by too much.
      ammPriceCheck(reserve0, reserve1);

      // Make sure the user is NOT solvent
      if (solvent(user)) revert("User solvent");

      // Get the existing vault info for the user
      Vault memory vault = userVaults[user];

      // Calculate the number of LP tokens rented
      uint sqrtAmountRented = (uint256(vault.rented) * rentedMultiplier) / 1e18;
      uint lpTokenAmount = (sqrtAmountRented * pairTotalSupply) / Math.sqrt(uint256(reserve0) * reserve1);

      // Approve the bammHelper contract to take token0 and token1 from this contract
      SafeERC20.safeApprove(token0, address(bammHelper), uint(vault.token0));
      SafeERC20.safeApprove(token1, address(bammHelper), uint(vault.token1));

      // Give token0 and token1 to bammHelper, which will interact with the LP and mint LP to this contract
      uint liquidity = bammHelper.addLiquidityUnbalanced(uint(vault.token0), uint(vault.token1), 0, pair, (isFraxswapPair ? pair.fee(): pairFee), isFraxswapPair);
      
      // Give the liquidation fee to msg.sender
      liq_fee = (liquidity * LIQUIDATION_FEE) / 10000;
      SafeERC20.safeTransfer(IERC20(address(pair)), msg.sender, liq_fee);

      // Give the vault user their LP back, minus the liquidation fee and swap fee(s).
      if ((liquidity - liq_fee) > lpTokenAmount) {
         liq_out = liquidity - liq_fee - lpTokenAmount;
         SafeERC20.safeTransfer(IERC20(address(pair)), user, liq_out);
      }

      // Update the total rented liquidity
      sqrtRented -= uint(vault.rented);

      // Update the user's vault
      vault.token0 = 0;
      vault.token1 = 0;
      vault.rented = 0;
      userVaults[user] = vault;

      emit UserLiquidated(user, msg.sender, liquidity, liq_out, liq_fee);
   }   
   

   // ############################################
   // ############# External utility #############    
   // ############################################
   
   /// @notice Accrue interest payments
   function addInterest() external nonReentrant {
      _addInterest();
   }   

   /// @notice Is a user solvent?
   /// @param user The user to check
   /// @return bool If the user is solvent
   function solvent(address user) public view returns (bool) {
      Vault memory vault = userVaults[user];
      return _solvent(vault);
   }
   
   /// @notice Get the interest rate at the specified utilityRate
   /// @param utilityRate The utility rate where you want to check the interest rate
   /// @return uint The interest rate at the specified utilityRate
   function getInterestRate(uint utilityRate) public pure returns (uint) {
      if (utilityRate < 7e17) return MIN_RATE + ((utilityRate * (KINK1_RATE - MIN_RATE)) / 7e17);
      if (utilityRate < 8e17) return KINK1_RATE + (((utilityRate - 7e17) * (KINK2_RATE - KINK1_RATE)) / 1e17);
      else if (utilityRate < 9e17) return KINK2_RATE + (((utilityRate - 8e17)*(MAX_RATE - KINK2_RATE)) / 1e17);
      else return MAX_RATE;
   }

   /// @notice Given a token you want to borrow, how much rent do you need.
   /// @notice Modifies state because the TWAMMs and interest need to be synced.
   /// @param tkn_desired_addr Address of the token you want to borrow
   /// @param amt_tkn_desired How much of the token you want to borrow
   /// @return rent The value of "rent" you should use in executeActions's Action
   /// @return lp_unwound Informational: the amount of BAMM LP that was unwound to release your desired token
   /// @return amt_tkn_other How much of the other token was also released in the LP unwinding. 
   /// You can swap it out for even more of your desired token if you want with executeActionsAndSwap's swapParams
   function calcRent(
      address tkn_desired_addr, 
      uint256 amt_tkn_desired
   ) external returns (
      int256 rent,
      uint256 lp_unwound, 
      uint256 amt_tkn_other
   ) {
      // Sync the LP, then add the interest
      (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) = _addInterest();

      // Get the price (in terms of the other token) of your desired token
      {
         uint256 desired_reserve;
         uint256 other_reserve;
         if (tkn_desired_addr == address(token0)) {
            desired_reserve = reserve0;
            other_reserve = reserve1;
         } else {
            desired_reserve = reserve1;
            other_reserve = reserve0;
         }

         // Calculate the amount of the other token, as well as the LP
         // Use substitution to avoid rounding errors
         amt_tkn_other = (amt_tkn_desired * other_reserve) / desired_reserve;
         lp_unwound = (amt_tkn_desired * pairTotalSupply) / desired_reserve;

      }
      uint256 sqrtAmountRented = (amt_tkn_desired * Math.sqrt(uint256(reserve0) * reserve1)) / reserve0;
      rent = int256((sqrtAmountRented * 1e18) / uint256(rentedMultiplier));
   }


   // ############################################
   // ################# Internal #################
   // ############################################
   
   /// @notice Transfers LP constituent tokens from the user to this contract, and marks it as part of their vault.
   /// @param vault The vault you are modifying
   /// @param action The action
   /// @dev vault is passed by reference, so it modified in the caller
   function _addTokensToVault(Vault memory vault, Action memory action) internal {
      // // Make sure only one token is being added
      // require(!(action.token0Amount > 0 && action.token1Amount > 0), 'Can only add one token');

      // Approve via permit
      if (action.v != 0 && (action.token0Amount > 0 || action.token1Amount > 0)) { 
          // Determine the token of the permit
         IERC20 token = action.token0Amount > 0 ? token0 : token1;

         // Do the permit
         uint256 amount = action.approveMax ? type(uint256).max : uint256(action.token0Amount > 0 ? action.token0Amount : action.token1Amount);
         IERC20Permit(address(token)).permit(msg.sender, address(this), amount, action.deadline, action.v, action.r, action.s);
      }
      
      // Add token0 to the vault
      if (action.token0Amount > 0) { 
         vault.token0 += action.token0Amount;
         SafeERC20.safeTransferFrom(IERC20(address(token0)), msg.sender, address(this), uint256(action.token0Amount));

         emit TokensDepositedToVault(msg.sender, uint256(action.token0Amount), 0);
      }
      // Add token1 to the vault
      if (action.token1Amount > 0) { 
         vault.token1 += action.token1Amount;
         SafeERC20.safeTransferFrom(IERC20(address(token1)), msg.sender, address(this), uint256(action.token1Amount));

         emit TokensDepositedToVault(msg.sender, 0, uint256(action.token1Amount));
      }

      
   }
   
   /// @notice Swaps tokens in the users vault
   /// @param vault The vault you are modifying
   /// @param swapParams Info about the swap. Is modified
   /// @dev vault and swapParams are passed by reference, so they modified in the caller
   function _executeSwap(Vault memory vault, FraxswapRouterMultihop.FraxswapParams memory swapParams) internal {
      // Make sure the order of the swap is one of two directions
      require((swapParams.tokenIn == address(token0) && swapParams.tokenOut == address(token1)) 
               || (swapParams.tokenIn == address(token1) && swapParams.tokenOut == address(token0)),
               "Wrong swap tokens");

      // Approve the input token to the router
      SafeERC20.safeApprove(IERC20(swapParams.tokenIn), address(fraxswapRouter), swapParams.amountIn);

      // Set the recipient to this address
      swapParams.recipient = address(this);

      // Router checks the minAmountOut
      uint256 amountOut = fraxswapRouter.swap(swapParams); 
      if (swapParams.tokenIn == address(token0)) {
         vault.token0 -= swapParams.amountIn.toInt256(); 
         vault.token1 += amountOut.toInt256();
      } else {
         vault.token1 -= swapParams.amountIn.toInt256();
         vault.token0 += amountOut.toInt256();
      }
   }
   
   /// @notice Sync the LP and accrue interest
   /// @return reserve0 The LP's reserve0
   /// @return reserve1 The LP's reserve1
   /// @return pairTotalSupply The LP's totalSupply()
   function _addInterest() internal returns (uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) {
       // We need to call sync for Fraxswap pairs first to execute TWAMMs
      pair.sync();

      // Get the total supply and the updated reserves
      (reserve0, reserve1, ) = pair.getReserves();
      pairTotalSupply = pair.totalSupply();
      

      // Calculate and accumulate interest if time has passed
      uint period = block.timestamp - timeSinceLastInterestPayment;
      if (period > 0) {
         // If there are outstanding rents, proceed
         if (sqrtRented > 0) {
            // Do the interest calculations
            uint256 balance = pair.balanceOf(address(this));
            uint256 sqrtBalance = Math.sqrt(((balance * reserve0) / pairTotalSupply) * ((balance * reserve1) / pairTotalSupply));
            uint sqrtRentedReal = (sqrtRented * rentedMultiplier) / PRECISION;
            uint256 utilityRate = (sqrtRented * PRECISION) / (sqrtBalance + sqrtRentedReal);
            uint256 interestRate = getInterestRate(utilityRate);
            uint256 sqrtInterest = (interestRate * period * sqrtRented) / (PRECISION * 3153600000);
            
            // Update the rentedMultiplier
            // The original lender will get more LP back as their "earnings" when they redeem their BAMM tokens
            rentedMultiplier = (rentedMultiplier * (sqrtInterest + sqrtRented)) / sqrtRented;

            // Give the contract owner their cut of the fee, directly as BAMM tokens
            uint256 fee = (sqrtInterest * FEE_SHARE) / 10000;
            uint feeMintAmount = (fee * totalSupply()) / (sqrtBalance + ((sqrtRented * rentedMultiplier) / PRECISION));
            _mint(owner, feeMintAmount);
         }

         // Update the timeSinceLastInterestPayment
         timeSinceLastInterestPayment = block.timestamp;
      }
   }
   
   /// @notice Is the vault solvent?
   /// @param vault The vault to check
   /// @return bool If the vault is solvent
   function _solvent(Vault memory vault) internal view returns (bool) {
      require(vault.rented >= 0 && vault.token0 >= 0 && vault.token1 >= 0, "Negative positions not allowed");
      if (vault.rented == 0) return true;
      else {
         // Check the LTV
         uint ltv = (uint256(vault.rented) * rentedMultiplier) / Math.sqrt(uint256(vault.token0 * vault.token1));
         return ltv < SOLVENCY_THRESHOLD;
      }
   }
   
   /// @notice Reverts if the max utility has been reached
   /// @param reserve0 The LP's reserve0
   /// @param reserve1 The LP's reserve1
   /// @param pairTotalSupply The LP's totalSupply
   function _checkMaxUtility(uint112 reserve0, uint112 reserve1, uint256 pairTotalSupply) internal {
      //console.log("sqrtRented", sqrtRented);
      if (sqrtRented > 0) {
         uint256 balance = pair.balanceOf(address(this));
         uint256 sqrtBalance = Math.sqrt(((balance * reserve0) / pairTotalSupply) * ((balance * reserve1) / pairTotalSupply));
         uint256 utilityRate = (sqrtRented * PRECISION) / (sqrtBalance + sqrtRented);
         if (utilityRate > MAX_UTILITY_RATE) revert("MAX_UTILITY_RATE");
      }
   }
   

   /// @notice Compare the spot price from the reserves to the oracle price. Revert if they are off by too much.
   /// @param reserve0 The LP's reserve0
   /// @param reserve1 The LP's reserve1
   function ammPriceCheck(uint112 reserve0, uint112 reserve1) internal {
      // 30 minutes and max 1024 blocks
      (uint result0, uint result1) = fraxswapOracle.getPrice(IFraxswapPair(address(pair)), 60 * 30, 10, 10000); 
      result0 = 1e36 / result0;
      uint spotPrice = (uint256(reserve0) * 1e18) / reserve1;

      // Check the price differences and revert if they are too much
      uint diff = (spotPrice > result0 ? spotPrice - result0 : result0 - spotPrice);
      if ((diff * 10000) / result0 > 500) revert("ammPriceCheck");
      diff = (spotPrice > result1 ? spotPrice - result1 : result1 - spotPrice);
      if ((diff * 10000) / result1 > 500) revert("ammPriceCheck");
   }
   

   // ############################################
   // ############# Roles management #############
   // ############################################
      
   /// @notice Nominate a new owner for this contract
   /// @param newOwner The new nominated owner. They still need to acceptOwnership
   function nominateNewOwner(address newOwner) external isOwner {
      nominatedOwner = newOwner;
      emit OwnerNominated(newOwner);
   } 

   /// @notice Accept ownership for this contract. Needs to be called by the nominatedOwner
   function acceptOwnership() external {
      if (msg.sender != nominatedOwner) revert();
      emit OwnerChanged(owner, nominatedOwner);
      owner = nominatedOwner;
   }
}

//                          .,,.
//               ,;;<!;;;,'``<!!!!;,
//            =c,`<!!!!!!!!!>;``<!!!!>,
//         ,zcc;$$c`'!!!!!!!!!,;`<!!!!!>
//         .  $$$;F?b`!'!!!!!!!,    ;!!!!>
//      ;!; `",,,`"b " ;!!!!!!!!    .!!!!!!;
//     ;!>>;;  r'  :<!!!!!!!''''```,,,,,,,,,,,,.
//     ;!>;!>; ""):!```.,,,nmMMb`'!!!!!!!!!!!!!!!!!!!!!'''`,,,,;;;
//    <!!;;;;;''.,,ndMr'4MMMMMMMMb,``'''''''''''''',,;;<!!!!!!!!'
//   !!!'''''. "TMMMMMPJ,)MMMMMMMMMMMMMMMMMnmnmdM !!!!!!!!!!!!'
//   `.,nMbmnm $e."MMM J$ MMMMMMMMMMMMMMMMMMMMMP  `!!!!!!!''
//   .MMMMMMMM>$$$b 4 c$$>4MMMMMMM?MMMMM"MMM4M",M
//    4MMMMMMM>$$$P   "?$>,MMMMMP,dMMM",;M",",nMM
//    'MMMMMMM $$Ez$$$$$$>JMMM",MMMP .' .c nMMMMM
//     4Mf4MMP $$$$$$$$P"uP",uP"",zdc,'$$F;MMMfP
//      "M'MM d$$",="=,cccccc$$$$$$$$$$$P MMM"
//      \/\"f.$$$cb  ,b$$$$$$$" -."?$$$$ dP)"
//      `$c, $$$$$$$$$$",,,,"$$   "J$$$'J" ,c
//       `"$ $$$$$$P)3$ccd$,,$$$$$$$$$'',z$$F
//           `$$$$$$$`?$$$$$$"$$$$$$$P,c$P"
//             "?$$$$;=,""',c$$$$$$$"
//                `"??bc,,z$$$$PF""
//     .,,,,,,,,.    4c,,,,,
//  4$$$$$$$$$$$??$bd$$$$$P";!' ccd$$PF"  c,
//  4$$$$$$$$$P.d$$$$$?$P"<!! z$$$P",c$$$$$$$b.
//  `$$c,""??".$$$$$?4P';!!! J$$P'z$$$$$$$$$$P"
//   `?$$$$L z$$$$$$ C ,<!! $$$"J$$$?$$$PF"""
//    `?$$$".$$$$$$$F ;!!! zP" J$$$$-;;;
//     ,$$%z$$$$$$$";!!!' d$L`z?$?$" <!';
//  ..'$$"-",nr"$" !!!!! $$$$;3L?c"? `<>`;
//   "C": \'MMM ";!!!!!'<$$$$$        !! <;
//     <`.dMMT4bn`.!';! ???$$F        !!! <>
//    !!>;`T",;- !! emudMMb.??        <!!! <>
//   !<!!!!,,`''!!! `TMMMP",!!!>      !!!!!.`!
//    !!!!!!!!!>.`'!`:MMM.<!!!!       !!!!!!>`!;
//   !!!!!!`<!!!!!;,,`TT" <!!!,      ;!'.`'!!! <>
//  '!''<! ,.`!!!``!!!!'`!!! '!      !! <!:`'!!.`!;
//  '      ?",`! dc''`,r;`,-  `     ;!!!`!!!;`!!:`!>
//    cbccc$$$$c$$$bd$$bcd          `!!! <;'!;`!! !!>
//   <$$$$$$$$$$$$$?)$$P"            `!!! <! ! !!>`!!
//   d$$$$$$P$$?????""                `!!> !> ,!!',!!
// .$$$$$$   cccc$$$                   `!!>`!!!!! !!!
//  "$C" ",d$$$$$$$$                    `!!:`!!!! !!!
//      ` `,c$$$$""                       <!!;,,,<!!!
//                                         `!!!!!'`
//                                           `

// ------------------------------------------------
// https://asciiart.website/index.php?art=cartoons/flintstones
