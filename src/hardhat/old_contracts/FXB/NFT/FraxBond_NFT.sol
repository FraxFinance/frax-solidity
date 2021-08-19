// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity ^0.8.0;

// ====================================================================
// |     ______                   _______                             |
// |    / _____________ __  __   / ____(_____  ____ _____  ________   |
// |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
// |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
// | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
// |                                                                  |
// ====================================================================
// =========================== FraxBond_NFT ===========================
// ====================================================================
// Frax Finance: https://github.com/FraxFinance

// Primary Author(s)
// Travis Moore: https://github.com/FortisFortuna

// Reviewer(s) / Contributor(s)
// Jason Huan: https://github.com/jasonhuan
// Sam Kazemian: https://github.com/samkazemian

import "../../ERC721/ERC721.sol";
import "../../ERC721/V8_0_0/Governance/AccessControl.sol";
import "../../ERC721/V8_0_0/Math/SafeMath.sol";
import "../../Frax/V8_0_0/IFrax.sol";
import "./FraxBond_NFT_Library.sol";

contract FraxBond_NFT is ERC721, AccessControl {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    IFrax private FRAX = IFrax(0x853d955aCEf822Db058eb8505911ED77F175b99e);

    address public controller_address; // Controller contract to dynamically adjust system parameters automatically
    address public timelock_address; // Governance timelock address

    address public DEFAULT_ADMIN_ADDRESS;
    bytes32 public constant MINT_PAUSER = keccak256("MINT_PAUSER");
    bytes32 public constant REDEEM_PAUSER = keccak256("REDEEM_PAUSER");
    bool public mintPaused = false;
    bool public redeemPaused = false;

    string public series; // E.g. 'EE'
    uint256 public immutable face_value; // E18, in FRAX. AKA par value
    uint256 public immutable maturity_months; // months of maturity
    uint256 public immutable maturity_secs; // seconds of maturity. Assumes 30 day month
    uint256 public immutable min_early_redeem_secs; // minimum amount of time before an early redemption can occur
    uint256 public immutable max_early_redemption_penalty_pct; // E6 , e.g. a 10% penalty = 100000. Applied to discount, not entire face value
    uint256 public immutable discount; // E18, discount off the purchase price
    uint256 public immutable purchase_price; // E18, in FRAX
    uint256 public mint_limit = 3; // # of bonds allowed to be minted
    uint256 public redeemed_bonds_count = 0;

    // Mapping from token ID to bond data
    mapping(uint256 => BondData) public bondData;

    // Used as a shortcut to avoid a for-loop
    mapping(uint256 => bool) public redeemedBonds;

    struct BondViewDetails {
        address owner;
        string name;
        string symbol;
        string series;
        uint256 serial_number;
        uint256 face_value;
        uint256 maturity_months;
        uint256 min_early_redeem_secs;
        uint256 max_early_redemption_penalty_pct;
        uint256 discount;
        uint256 purchase_price;
        uint256 issue_timestamp;
        uint256 maturity_timestamp;
        uint256 redeemed_timestamp;
    }

    struct BondData {
        uint256 issue_timestamp;
        uint256 maturity_timestamp;
        uint256 redeemed_timestamp;
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByControllerOrGovernance() {
        require(msg.sender == controller_address || msg.sender == timelock_address, "You are not the controller or the governance timelock");
        _;
    }

    modifier notMintPaused() {
        require(mintPaused == false, "Minting is paused");
        _;
    }

    modifier notRedeemPaused() {
        require(redeemPaused == false, "Redeeming is paused");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _controller_address,
        address _timelock_address,
        string memory _series,
        uint256 _face_value,
        uint256 _maturity_months,
        uint256 _discount,
        uint256 _min_early_redeem_secs,
        uint256 _max_early_redemption_penalty_pct
    ) ERC721(FraxBond_NFT_Library.fxb_namer(_series, _face_value, _maturity_months), FraxBond_NFT_Library.fxb_symboler(_series, _face_value, _maturity_months)) {
        controller_address = _controller_address;
        timelock_address = _timelock_address;

        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        DEFAULT_ADMIN_ADDRESS = _msgSender();
        grantRole(MINT_PAUSER, controller_address);
        grantRole(MINT_PAUSER, timelock_address);
        grantRole(REDEEM_PAUSER, controller_address);
        grantRole(REDEEM_PAUSER, timelock_address);

        series = _series;
        face_value = _face_value;
        maturity_months = _maturity_months;
        maturity_secs = _maturity_months.mul(2592000); // 2592000 secs for 30 day month
        discount = _discount; // E18
        min_early_redeem_secs = _min_early_redeem_secs;
        max_early_redemption_penalty_pct = _max_early_redemption_penalty_pct;
        purchase_price = _face_value.sub(_discount); // E18

        super._setBaseURI(FraxBond_NFT_Library.concatenate3("https://api.frax.finance/nft/frax-bonds/", FraxBond_NFT_Library.fxb_symboler(_series, _face_value, _maturity_months), "/"));
    }
    /* ============= VIEW FUNCTIONS ============= */

    function bondDetails(uint256 serial_number) external view returns (BondViewDetails memory bond_details) {
        BondData memory thisBond = bondData[serial_number];

        bond_details = BondViewDetails({
            owner: ownerOf(serial_number),
            name: name(),
            symbol: symbol(),
            series: series,
            serial_number: serial_number,
            face_value: face_value,
            maturity_months: maturity_months,
            min_early_redeem_secs: min_early_redeem_secs,
            max_early_redemption_penalty_pct: max_early_redemption_penalty_pct,
            discount: discount,
            purchase_price: purchase_price,
            issue_timestamp: thisBond.issue_timestamp,
            maturity_timestamp: thisBond.maturity_timestamp,
            redeemed_timestamp: thisBond.redeemed_timestamp
        });
    }

    function calcPenaltyMultiplier(uint256 time_elapsed) public view returns (uint256 penalty_multiplier) {
        if (time_elapsed >= maturity_secs) penalty_multiplier = 0;
        else if (maturity_secs == min_early_redeem_secs) penalty_multiplier = 0;
        else {
            uint256 numerator = time_elapsed - min_early_redeem_secs;
            uint256 denominator = maturity_secs - min_early_redeem_secs;
            penalty_multiplier = uint256(1e6).sub(numerator.mul(1e6).div(denominator));
        }
    }

    function calcAPY() public view returns (uint256 apy) {
        // Returns in E6
        apy = discount.mul(1e6).mul(12).div(maturity_months).div(face_value);
    }

    /* ============ PUBLIC FUNCTIONS ============ */

    // allow_unsafe_mint allows skipping the _checkOnERC721Received check 
    // should be set to false most of the time
    function issueBond(bool allow_unsafe_mint) external notMintPaused returns (uint256 serial_number) {
        serial_number = totalSupply();
        require(serial_number < mint_limit, "Mint limit reached");
        require(!_exists(serial_number), "Bond already exists");

        // Pull in the required FRAX
        FRAX.transferFrom(msg.sender, address(this), purchase_price);

        // Burn the FRAX
        FRAX.burn(purchase_price);

        // Create the struct
        bondData[serial_number] = BondData({
            issue_timestamp: block.timestamp,
            maturity_timestamp: (block.timestamp).add(maturity_secs),
            redeemed_timestamp: 0
        });

        // Proceed with minting the bond
        if (allow_unsafe_mint){
            // Unsafe mint. Make sure your smart contract can handle ERC-721 tokens
            super._mint(msg.sender, serial_number);
        }
        else {
            // Issues the bond and makes sure that, if the msg.sender happens to be a contract, it can handle ERC-721 tokens
            // If it is a normal wallet, there should be no issues
            super._safeMint(msg.sender, serial_number);
        }

        emit BondIssued(msg.sender, symbol(), serial_number);
    }

    function redeemBond(uint256 serial_number) external notRedeemPaused returns (uint256 maturity_value, uint256 return_value) {
        // Make sure the caller is the owner of the bond
        require(msg.sender == ownerOf(serial_number), "You are not the bond owner");

        // Get the bond data and make sure it isn't already redeemed
        BondData storage thisBond = bondData[serial_number];
        require(thisBond.redeemed_timestamp == 0, "Bond has already been redeemed");

        // Make sure you are not redeeming too early
        uint256 time_elapsed = (block.timestamp).sub(thisBond.issue_timestamp);
        require(time_elapsed >= min_early_redeem_secs, "You are trying to redeem too early");

        // Set the redeem timestamp
        thisBond.redeemed_timestamp = block.timestamp;

        // Unpenalized value
        // Account for the difference from the early redemption
        if (time_elapsed > maturity_secs) time_elapsed = maturity_secs; // Needed for math below
        maturity_value = face_value.sub(purchase_price).mul(time_elapsed).div(maturity_secs);

        // Calculate the early withdrawal penalty, if applicable
        uint256 penalty_multiplier = calcPenaltyMultiplier(time_elapsed);

        // Apply the penalty, if present
        maturity_value = maturity_value.sub(maturity_value.mul(penalty_multiplier).mul(max_early_redemption_penalty_pct).div(1e12));

        // Calculate the return value
        return_value = purchase_price.add(maturity_value);

        // Mint the FRAX
        FRAX.pool_mint(msg.sender, return_value);

        // Increment the redeem count
        redeemed_bonds_count++;
        
        emit BondRedeemed(msg.sender, symbol(), serial_number);
    }

    function burn() external pure {
        // Allowing bonds to be burned would disrupt the issuance of token_ids
        revert("Bonds can never be burned");
    }

    /* ============ INTERNAL FUNCTIONS ============ */


    /* ========== RESTRICTED FUNCTIONS ========== */

    function toggleMinting() external {
        require(hasRole(MINT_PAUSER, msg.sender));
        mintPaused = !mintPaused;
    }

    function toggleRedeeming() external {
        require(hasRole(REDEEM_PAUSER, msg.sender));
        redeemPaused = !redeemPaused;
    }

    function setTimelock(address _new_timelock) external onlyByControllerOrGovernance {
        timelock_address = _new_timelock;
    }

    function setController(address _controller_address) external onlyByControllerOrGovernance {
        controller_address = _controller_address;
    }

    function setMintLimit(uint256 _new_mint_limit) external onlyByControllerOrGovernance {
        mint_limit = _new_mint_limit;
    }

    /* ========== EVENTS ========== */

    // Track bond issuance
    event BondIssued(address indexed user, string bond_name, uint256 serial_number);

    // Track bond redemption
    event BondRedeemed(address indexed user, string bond_name, uint256 serial_number);
}