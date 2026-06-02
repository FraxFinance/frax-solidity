# Frax Finance – Solidity Implementation

<p align="center">
  <img width="200" height="200" src="https://i.ibb.co/9HHVcGV/frax-logo.png">
</p>

<p align="center">

🖥 **Website** – https://frax.finance

📖 **Documentation** – https://docs.frax.finance

🔐 **Security** – Please see [SECURITY.md](./SECURITY.md) before reporting vulnerabilities.

📲 **Telegram** – https://t.me/fraxfinance
</p>

## What is Frax?
Frax is the first fractional-algorithmic stablecoin protocol. Frax is open-source, permissionless, and entirely on-chain – currently implemented on Ethereum (with possible cross chain implementations in the future). The end goal of the Frax protocol is to provide a highly scalable, decentralized, algorithmic money in place of fixed-supply digital assets like BTC. 

<b> Frax is a new paradigm in stablecoin design. It brings together familiar concepts into a never before seen protocol: </b>
  
  * <b>Fractional-Algorithmic</b> – Frax is the first and only stablecoin with parts of its supply backed by collateral and parts of the supply algorithmic. The ratio of collateralized and algorithmic depends on the market's pricing of the FRAX stablecoin. If FRAX is trading at above $1, the protocol decreases the collateral ratio. If FRAX is trading at under $1, the protocol increases the collateral ratio. 

  * <b>Decentralized & Governance-minimized</b> – Community governed and emphasizing a highly autonomous, algorithmic approach with no active management.  

  * <b>Fully on-chain oracles</b> – Frax v1 uses Uniswap (ETH, USDT, USDC time-weighted average prices) and Chainlink (USD price) oracles. 

  * <b>Two Tokens</b> – FRAX is the stablecoin targeting a tight band around $1/coin. Frax Shares (FXS) is the governance token which accrues fees, seigniorage revenue, and excess collateral value.

  * <b>Swap-based Monetary Policy</b> – Frax uses principles from automated market makers like Uniswap to create swap-based price discovery and real-time stabilization incentives through arbitrage.
  

## Running tests
cd ./src/hardhat
npx hardhat test ./test/FraxSwap/fraxswap-twamm-test.js