# frax-solidity
Solidity implementation of the Frax Protocol

==Development==
Deploy an ERC20 (tether_sample.sol) token sample used for testing collateral

Deploy FRAXStablecoin (frax.sol)

Deploy FRAXShares (fxs.sol), set constructor args to FRAXStablecoin contract address + an oracle address

Set FRAX & FXS prices as oracle in FRAXStablecoin

Deploy frax_pool (frax_pool.sol)

Add frax_pool address to FRAXStablecoin contract's frax_pools mapping


## app.js (WIP)
Node.js script that compiles & deploys the contracts locally
