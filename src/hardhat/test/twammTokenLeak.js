//Modified from https://github.com/FrankieIsLost/TWAMM/blob/master/test/twamm-test.js
//Extension of "Orders in both pools work as expected" test

const { expect } = require("chai");
const { ethers } = require("hardhat");

const numTrials = 10;

const increment = 10;
const startIntervals = 10;

const blockInterval = 10;

const initialLiquidityProvided = 100000000;
const ERC20Supply = ethers.utils.parseUnits("100");

const tokensIn = 10000;

async function main() {

    console.log("Two users trading opposite long term trades of", tokensIn, "tokens A and", tokensIn, "tokens B")

    let owner;
    let addr1;
    let addr2;
    let addrs;

    await network.provider.send("evm_setAutomine", [true]);
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    const ERC20Factory = await ethers.getContractFactory("ERC20MockTWAMM");

    for (let i = 0; i < numTrials; i++) {

        let numIntervals = startIntervals + i * increment;
        console.log("After opposite LongTermSwaps of", numIntervals, "intervals, (", numIntervals * blockInterval, "blocks)");

        const tokenA = await ERC20Factory.deploy("TokenA", "TokenA", ERC20Supply);
        const tokenB = await ERC20Factory.deploy("TokenB", "TokenB", ERC20Supply);
        const TWAMMFactory = await ethers.getContractFactory("TWAMM")

        let twamm = await TWAMMFactory.deploy(
            "TWAMM"
            , "TWAMM"
            , tokenA.address
            , tokenB.address
            , blockInterval
            , addr1.address
        );

        await twamm.connect(addr1).disableWhitelist()

        tokenA.approve(twamm.address, ERC20Supply);
        tokenB.approve(twamm.address, ERC20Supply);

        await twamm.provideInitialLiquidity(initialLiquidityProvided, initialLiquidityProvided);

        const amountIn = ethers.BigNumber.from(10000);
        await tokenA.transfer(addr1.address, amountIn);
        await tokenB.transfer(addr2.address, amountIn);

        //trigger long term order
        await tokenA.connect(addr1).approve(twamm.address, amountIn);
        await tokenB.connect(addr2).approve(twamm.address, amountIn);

        //trigger long term orders
        await twamm.connect(addr1).longTermSwapFromAToB(amountIn, numIntervals);
        await twamm.connect(addr2).longTermSwapFromBToA(amountIn, numIntervals);

        //move blocks forward, and execute virtual orders
        await mineBlocks(numIntervals * blockInterval * 2)
        await twamm.executeVirtualOrders();

        //withdraw proceeds 
        await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
        await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

        const amountABought = await tokenA.balanceOf(addr2.address);
        const amountBBought = await tokenB.balanceOf(addr1.address);

        console.log("  addr2 amountABought:", amountABought.toNumber(), "error:", (tokensIn - amountABought.toNumber()) / tokensIn * 100, "%");
        console.log("  addr1 amountBBought:", amountBBought.toNumber(), "error:", (tokensIn - amountBBought.toNumber()) / tokensIn * 100, "%");
    }
};

async function mineBlocks(blockNumber) {
    for (let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });