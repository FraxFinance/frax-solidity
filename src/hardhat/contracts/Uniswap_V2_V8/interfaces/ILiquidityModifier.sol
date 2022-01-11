pragma solidity >=0.5.0;

interface ILiquidityModifier {
    function getUpdatedReserve() external returns (uint256 reserve0, uint256 reserve1);
}
