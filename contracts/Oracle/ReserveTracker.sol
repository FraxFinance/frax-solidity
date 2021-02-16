// SPDX-License-Identifier: MIT
pragma solidity 0.6.11;

import "../Math/SafeMath.sol";
import "../Math/Math.sol";
import "../Uniswap/Interfaces/IUniswapV2Pair.sol";
import "./UniswapPairOracle.sol";
import "./ChainlinkETHUSDPriceConsumer.sol";

contract ReserveTracker {
	using SafeMath for uint256;

    uint256 public CONSULT_FXS_DEC;
    uint256 public CONSULT_FRAX_DEC;

	address public frax_contract_address;
    address public fxs_contract_address;
	address public owner_address;
	address public timelock_address;
	address public controller_address;
    address public eth_usd_consumer_address;

	// The pair of which to get FXS price from
	address public fxs_weth_oracle_address;
    address public weth_collat_oracle_address;
	address public weth_address;
	UniswapPairOracle public fxs_weth_oracle;
    UniswapPairOracle public weth_collat_oracle;
    uint256 public weth_collat_decimals;

	// Array of pairs for FXS
	address[] public fxs_pairs_array;

    // Mapping is also used for faster verification
    mapping(address => bool) public fxs_pairs; 

    uint256 public fxs_reserves;

    // The pair of which to get FRAX price from
    address public frax_price_oracle_address;
    address public frax_pair_collateral_address;
    uint256 public frax_pair_collateral_decimals;
    UniswapPairOracle public frax_price_oracle;


    /* ========== MODIFIERS ========== */

    modifier onlyByOwnerOrGovernance() {
        require(msg.sender == owner_address || msg.sender == timelock_address || msg.sender == controller_address, "You are not the owner, controller, or the governance timelock");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

	constructor(
        address _frax_contract_address,
		address _fxs_contract_address,
		address _creator_address,
		address _timelock_address
	) public {
        frax_contract_address = _frax_contract_address;
		fxs_contract_address = _fxs_contract_address;
		owner_address = _creator_address;
		timelock_address = _timelock_address;
	}

    /* ========== VIEWS ========== */

    // Returns FRAX price with 6 decimals of precision
    function getFRAXPrice() public view returns (uint256) {
        return frax_price_oracle.consult(frax_contract_address, CONSULT_FRAX_DEC);
    }

    // Returns FXS price with 6 decimals of precision
    function getFXSPrice() public view returns (uint256) {
        uint256 fxs_weth_price = fxs_weth_oracle.consult(fxs_contract_address, 1e6);
        return weth_collat_oracle.consult(weth_address, CONSULT_FXS_DEC).mul(fxs_weth_price).div(1e6);
    }

    function getFXSReserves() public view returns (uint256) {
        uint256 total_fxs_reserves = 0; 

        for (uint i = 0; i < fxs_pairs_array.length; i++){ 
            // Exclude null addresses
            if (fxs_pairs_array[i] != address(0)){
                if(IUniswapV2Pair(fxs_pairs_array[i]).token0() == fxs_contract_address) {
                    (uint reserves0, , ) = IUniswapV2Pair(fxs_pairs_array[i]).getReserves();
                    total_fxs_reserves = total_fxs_reserves.add(reserves0);
                } else if (IUniswapV2Pair(fxs_pairs_array[i]).token1() == fxs_contract_address) {
                    ( , uint reserves1, ) = IUniswapV2Pair(fxs_pairs_array[i]).getReserves();
                    total_fxs_reserves = total_fxs_reserves.add(reserves1);
                }
            }
        }

        return total_fxs_reserves;
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    // Get the pair of which to price FRAX from
    function setFRAXPriceOracle(address _frax_price_oracle_address, address _frax_pair_collateral_address, uint256 _frax_pair_collateral_decimals) public onlyByOwnerOrGovernance {
        frax_price_oracle_address = _frax_price_oracle_address;
        frax_pair_collateral_address = _frax_pair_collateral_address;
        frax_pair_collateral_decimals = _frax_pair_collateral_decimals;
        frax_price_oracle = UniswapPairOracle(frax_price_oracle_address);
        CONSULT_FRAX_DEC = 1e6 * (10 ** (18 - frax_pair_collateral_decimals));
    }

    // Get the pair of which to price FXS from (using FXS-WETH)
    function setFXSETHOracle(address _fxs_weth_oracle_address, address _weth_address) public onlyByOwnerOrGovernance {
        fxs_weth_oracle_address = _fxs_weth_oracle_address;
    	weth_address = _weth_address;
    	fxs_weth_oracle = UniswapPairOracle(fxs_weth_oracle_address);
    }

    function setETHCollateralOracle(address _weth_collateral_oracle_address, uint _collateral_decimals) public onlyByOwnerOrGovernance {
        weth_collat_oracle_address = _weth_collateral_oracle_address;
        weth_collat_decimals = _collateral_decimals;
        weth_collat_oracle = UniswapPairOracle(_weth_collateral_oracle_address);
        CONSULT_FXS_DEC = 1e6 * (10 ** (18 - _collateral_decimals));
    }

    // Adds collateral addresses supported, such as tether and busd, must be ERC20 
    function addFXSPair(address pair_address) public onlyByOwnerOrGovernance {
        require(fxs_pairs[pair_address] == false, "address already exists");
        fxs_pairs[pair_address] = true; 
        fxs_pairs_array.push(pair_address);
    }

    // Remove a pool 
    function removeFXSPair(address pair_address) public onlyByOwnerOrGovernance {
        require(fxs_pairs[pair_address] == true, "address doesn't exist already");
        
        // Delete from the mapping
        delete fxs_pairs[pair_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < fxs_pairs_array.length; i++){ 
            if (fxs_pairs_array[i] == pair_address) {
                fxs_pairs_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }
    }


}