// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// ======================== FXBMintRedeemerAMO ========================
// ====================================================================
// Mints and redeems Frax Bonds (FXB)

// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Dennis: https://github.com/denett
// Sam Kazemian: https://github.com/samkazemian

import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "../Frax/IFrax.sol";
import "./FXB.sol";
import "./FXBFactory.sol";
import "../Staking/Owned.sol";
import "../Utils/ReentrancyGuard.sol";

contract FXBMintRedeemerAMO is Owned, ReentrancyGuard {

    /* ========== STATE VARIABLES ========== */

    // Core
    FXBFactory public factory;
    IFrax private frax = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);

    // Mint and redeem tracking
    uint256 public total_fxb_minted; // Total amount of FXB minted by this AMO
    uint256 public total_fxb_redeemed; // Total amount of FXB redeemed by this AMO
    mapping(address => uint256) public bond_mints; // Total amount of a specific bond minted by this AMO
    mapping(address => uint256) public bond_redeems; // Total amount of a specific bond redeemed by this AMO

    /* ========== CONSTRUCTOR ========== */

    /// @notice Constructor
    /// @param _owner The owner of this contract
    /// @param _factory The factory address
    constructor(
        address _owner, 
        address _factory
    ) Owned(_owner) {
        // Set the factory
        factory = FXBFactory(_factory);
    }


    /* ========== VIEW FUNCTIONS ========== */

    /// @notice Determines if a bond can be redeemed
    /// @return is_redeemable If the bond is redeemable
    function isBondRedeemable(address bond_address) public view returns (bool is_redeemable) {
        is_redeemable = !factory.redeems_paused(bond_address) && (block.timestamp >= FXB(bond_address).maturity_timestamp());
    }


    /* ========== PUBLIC FUNCTIONS ========== */

    /// @notice Redeems FXB 1-to-1 for FRAX, without the need to approve first (EIP-712 / EIP-2612)
    /// @param bond_address Address of the bond
    /// @param recipient Recipient of the FRAX
    /// @param redeem_amt Amount to redeem
    function redeemFXBWithPermit(
        address bond_address,
        address recipient,
        uint256 redeem_amt,
        uint256 deadline,
        bool approveMax,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        // See which approval amount to use
        uint256 amount = approveMax ? type(uint256).max : redeem_amt;

        // Call the permit
        FXB(bond_address).permit(msg.sender, address(this), amount, deadline, v, r, s);

        // Do the redemption
        redeemFXB(bond_address, recipient, redeem_amt);
    }

    /// @notice Redeems FXB 1-to-1 for FRAX
    /// @param bond_address Address of the bond
    /// @param recipient Recipient of the FRAX
    /// @param redeem_amt Amount to redeem
    function redeemFXB(address bond_address, address recipient, uint256 redeem_amt) public nonReentrant {
        // Make sure the bond has matured and is not paused
        require(isBondRedeemable(bond_address), "Bond not redeemable");

        // Take the FXB from the user
        TransferHelper.safeTransferFrom(bond_address, msg.sender, address(this), redeem_amt);

        // Burn the FXB
        FXB(bond_address).burn(redeem_amt);

        // Update redeem tracking
        total_fxb_redeemed += redeem_amt;
        bond_redeems[bond_address] += redeem_amt;

        // Give FRAX to the recipient
        TransferHelper.safeTransfer(address(frax), recipient, redeem_amt);
    
        emit BondsRedeemed(bond_address, recipient, redeem_amt);
    }


    /* ========== OWNER / GOVERNANCE FUNCTIONS ONLY ========== */

    /// @notice Mints FXB to this address
    /// @param bond_address Address of the bond
    /// @param mint_amt Amount to mint
    function mintFXB(address bond_address, uint256 mint_amt) external onlyOwner() {
        // Make sure there is enough FRAX in this contract to pay for the FXB you are minting
        require(frax.balanceOf(address(this)) >= ((total_fxb_minted + mint_amt) - total_fxb_redeemed));

        // Mint the FXB
        FXB(bond_address).mint(address(this), mint_amt);

        // Update mint tracking
        total_fxb_minted += mint_amt;
        bond_mints[bond_address] += mint_amt;

        emit BondsMinted(bond_address, mint_amt);
    }

    /// @notice Burn FRAX. Need to make sure you have enough to redeem all outstanding FXB first though.
    /// @param burn_amt Amount to burn
    function burnFrax(uint256 burn_amt) external onlyOwner() {
        // Make sure there is enough FRAX in this contract to pay for the outstanding FXB
        require((frax.balanceOf(address(this)) - burn_amt) >= (total_fxb_minted - total_fxb_redeemed));

        // Burn the FRAX
        frax.burn(burn_amt);

        emit FraxBurned(burn_amt);
    }

    /// @notice Auctions a specified amount of FXB at a certain price
    /// @param bond_address Address of the bond
    /// @param price_e18 How much FRAX per FXB
    /// @param auction_amt Amount to auction
    function auctionFXB(address bond_address, address price_e18, uint256 auction_amt) external onlyOwner() {
        // TODO

        emit BondsAuctionInitiated();
    }

    function setFactory(address new_factory) external onlyOwner {
        require(new_factory != address(0), "Zero address detected");

        factory = FXBFactory(new_factory);
    }

    /* ========== EVENTS ========== */

    /// @dev Emits when new bonds are auctioned off
    event BondsAuctionInitiated();

    /// @dev Emits when new bonds are minted
    event BondsMinted(address bond_address, uint256 mint_amt);
    
    /// @dev Emits when bonds are redeemed
    event BondsRedeemed(address bond_address, address recipient, uint256 amount);

    /// @dev Emits when FRAX is burned
    event FraxBurned(uint256 burn_amt);
}
