// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./AggregatorV3Interface.sol";
import "./IPricePerShareOptions.sol";
import "../Staking/Owned.sol";

contract ComboOracle is Owned {

    /* ========== STATE VARIABLES ========== */
    
    address timelock_address;
    address address_to_consult;
    AggregatorV3Interface private priceFeedETHUSD = AggregatorV3Interface(0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419);

    uint256 public PRICE_PRECISION = 1e6;
    uint256 public PRECISE_PRICE_PRECISION = 1e12;

    mapping(address => TokenInfo) public token_info; // token address => info

    /* ========== STRUCTS ========== */

    struct TokenInfoConstructorArgs {
        address token_address;
        address agg_addr_for_underlying; 
        uint256 agg_other_side; // 0: USD, 1: ETH
        address pps_address; // Will be address(0) for simple tokens. Otherwise, the aUSDC, yvUSDC address, etc
        bytes4 pps_call_selector; // eg bytes4(keccak256("pricePerShare()"));
        uint256 pps_decimals;
    }

    struct TokenInfo {
        address token_address;
        string description;
        address agg_addr_for_underlying; 
        uint256 agg_other_side; // 0: USD, 1: ETH
        uint256 agg_decimals;
        address pps_address; // Will be address(0) for simple tokens. Otherwise, the aUSDC, yvUSDC address, etc
        bytes4 pps_call_selector; // eg bytes4(keccak256("pricePerShare()"));
        uint256 pps_decimals;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor (
        address _owner_address,
        TokenInfoConstructorArgs[] memory _initial_token_infos
    ) public Owned(_owner_address) {

        // Set the initial token info
        for (uint256 i = 0; i < _initial_token_infos.length; i++){ 
            TokenInfoConstructorArgs memory this_token_info = _initial_token_infos[i];
            _setTokenInfo(
                this_token_info.token_address, 
                this_token_info.agg_addr_for_underlying, 
                this_token_info.pps_address, 
                this_token_info.agg_other_side, 
                this_token_info.pps_call_selector, 
                this_token_info.pps_decimals
            );
        }
    }

    /* ========== MODIFIERS ========== */

    modifier onlyByOwnGov() {
        require(msg.sender == owner || msg.sender == timelock_address, "You are not an owner or the governance timelock");
        _;
    }

    /* ========== VIEWS ========== */

    function getETHPrice() public view returns (uint256) {
        ( , int price, , , ) = priceFeedETHUSD.latestRoundData();
        return (uint256(price) * (PRICE_PRECISION)) / (1e8); // ETH/USD is 8 decimals on Chainlink
    }

    function getETHPricePrecise() public view returns (uint256) {
        ( , int price, , , ) = priceFeedETHUSD.latestRoundData();
        return (uint256(price) * (PRECISE_PRICE_PRECISION)) / (1e8); // ETH/USD is 8 decimals on Chainlink
    }

    function getTokenPrice(address token_address) public view returns (uint256 precise_price, uint256 short_price) {
        // Get the token info
        TokenInfo memory thisTokenInfo = token_info[token_address];

        // Get the price for the underlying token
        ( , int price, , , ) = AggregatorV3Interface(thisTokenInfo.agg_addr_for_underlying).latestRoundData();
        uint256 agg_price = uint256(price);

        // Convert to USD, if not already
        if (thisTokenInfo.agg_other_side == 1) agg_price = (agg_price * getETHPricePrecise()) / PRECISE_PRICE_PRECISION;

        // cToken balance * pps = amt of underlying in native decimals
        uint256 price_per_share = 1;
        if (thisTokenInfo.pps_address != address(0)){
            (bool success, bytes memory data) = (thisTokenInfo.pps_address).staticcall(abi.encodeWithSelector(thisTokenInfo.pps_call_selector));
            require(success, 'Oracle Failed');

            price_per_share = abi.decode(data, (uint256));
        }

        // E12
        uint256 pps_multiplier = (uint256(10) ** (thisTokenInfo.pps_decimals));
        precise_price = (agg_price * PRECISE_PRICE_PRECISION * price_per_share) / (pps_multiplier * (uint256(10) ** (thisTokenInfo.agg_decimals)));

        // E6
        short_price = precise_price / PRICE_PRECISION;
    }

    /* ========== RESTRICTED GOVERNANCE FUNCTIONS ========== */

    function setTimelock(address _timelock_address) external onlyByOwnGov {
        timelock_address = _timelock_address;
    }

    // Sets oracle info for a token 
    // Chainlink Addresses
    // https://docs.chain.link/docs/ethereum-addresses/

    // pricePerShare: 0x99530b06

    // Function signature encoder
    //     web3_data.eth.abi.encodeFunctionSignature({
    //     name: 'pricePerShare',
    //     type: 'function',
    //     inputs: []
    // })
    //     web3_data.eth.abi.encodeFunctionSignature({
    //     name: 'myMethod',
    //     type: 'function',
    //     inputs: [{
    //         type: 'uint256',
    //         name: 'myNumber'
    //     }]
    // })
    function _setTokenInfo(
        address token_address, 
        address agg_addr_for_underlying, 
        address pps_address,
        uint256 agg_other_side,
        bytes4 pps_call_selector,
        uint256 pps_decimals
    ) internal {
        token_info[token_address] = TokenInfo(
            token_address,
            AggregatorV3Interface(agg_addr_for_underlying).description(),
            agg_addr_for_underlying,
            agg_other_side,
            uint256(AggregatorV3Interface(agg_addr_for_underlying).decimals()),
            pps_address,
            pps_call_selector,
            pps_decimals
        );
    }

    function setTokenInfo(
        address token_address, 
        address agg_addr_for_underlying, 
        address pps_address,
        uint256 agg_other_side,
        bytes4 pps_call_selector,
        uint256 pps_decimals
    ) public onlyByOwnGov {
        _setTokenInfo(token_address, agg_addr_for_underlying, pps_address, agg_other_side, pps_call_selector, pps_decimals);
    }

}
