const {ethers} = require("hardhat");
const {constants, BigNumber, utils} = require('ethers');

function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
}

async function getAmountOutWithTwamm(amountIn, pair, isToken1 = false, fromBlock = null) {

    const currentBlock = (await ethers.provider.getBlock("latest")).number;

    const twammState = await pair.getTwammState(currentBlock);

    tokenRate0 = twammState[0]
    tokenRate1 = twammState[1]
    lastVirtualOrderBlock = fromBlock ? fromBlock : twammState[2]

    console.log(`tokenRate0: ${tokenRate0} tokenRate1: ${tokenRate1} lastVirtualOrderBlock: ${lastVirtualOrderBlock}`)

    const nextBlockSwap = (await ethers.provider.getBlock("latest")).number + 1;

    let [reserve0, reserve1, lastAmmUpdate, twammReserve0, twammReserve1] = await pair.getTwammReserves()
    const blocksEllapsed = nextBlockSwap - lastVirtualOrderBlock

    // uint256 nextExpiryBlock = self.lastVirtualOrderBlock - (self.lastVirtualOrderBlock % self.orderBlockInterval) + self.orderBlockInterval;

    console.log('blocksEllapsed', blocksEllapsed)
    const twammSellingAmt0 = tokenRate0.mul(blocksEllapsed)
    const twammSellingAmt1 = tokenRate1.mul(blocksEllapsed)

    // TWAMM sell
    let twammBoughtAmt1 = getAmountOut(twammSellingAmt0, reserve0, reserve1)

    // update reserves
    reserve0 = reserve0.add(twammSellingAmt0)
    reserve1 = reserve1.sub(twammBoughtAmt1)

    // EOA swap
    let expectedOut
    if (isToken1) {
        expectedOut = getAmountOut(amountIn, reserve0, reserve1)
    } else {
        expectedOut = getAmountOut(amountIn, reserve1, reserve0)
    }

    console.log('***********')
    console.log(`twammSellingAmt: ${utils.formatUnits(twammSellingAmt0, 0)}`)
    console.log(`twammBoughtAmt: ${utils.formatUnits(twammBoughtAmt1, 0)}`)
    // console.log(`twammBoughtAmt2: ${utils.formatUnits(twammBoughtAmt2, 0)}`)
    console.log(`reserve0: ${utils.formatUnits(reserve0, 0)}`)
    console.log(`reserve1: ${utils.formatUnits(reserve1, 0)}`)
    console.log(`expectedOut: ${utils.formatUnits(expectedOut, 0)}`)
    console.log('***********')

    return [expectedOut, twammSellingAmt0, twammBoughtAmt1, reserve0, reserve1, twammReserve0, twammReserve1];
}

module.exports = {
    getAmountOut,
    getAmountOutWithTwamm
}