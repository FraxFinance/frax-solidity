const {ethers} = require("hardhat");
const {constants, BigNumber, utils} = require('ethers');
const {bigNumberify, expandTo18Decimals} = require('./utilities');
const {create, all} = require('mathjs')
const bigmath = new create(all, {number: 'BigNumber'});
const {sqrt, exp, abs} = bigmath;

function getAmountOut(amountIn, reserveIn, reserveOut) {
    const amountInWithFee = amountIn.mul(997);
    const numerator = amountInWithFee.mul(reserveOut);
    const denominator = reserveIn.mul(1000).add(amountInWithFee);
    return numerator.div(denominator);
}

async function getAmountOutWithTwamm(amountIn, pair, isToken1 = false) {

    const currentBlock = (await ethers.provider.getBlock("latest")).number;

    const [
        token0Rate,
        token1Rate,
        lastVirtualOrderBlock,
        orderBlockInterval,
        rewardFactorPool0,
        rewardFactorPool1,
    ] = await pair.getTwammState();

    const [
        reserve0,
        reserve1,
        lastAmmUpdate,
        twammReserve0,
        twammReserve1
    ] = await pair.getTwammReserves()

    const nextBlockSwap = (await ethers.provider.getBlock("latest")).number + 1;
    const blocksEllapsed = nextBlockSwap - lastVirtualOrderBlock

    // TWAMM sell
    const twammSellingAmt0 = tokenRate0.mul(blocksEllapsed)
    const twammSellingAmt1 = tokenRate1.mul(blocksEllapsed)

    // TWAMM bought
    let twammBoughtAmt1 = getAmountOut(twammSellingAmt0, reserve0, reserve1)

    // update reserves
    const newReserve0 = reserve0.add(twammSellingAmt0)
    const newReserve1 = reserve1.sub(twammBoughtAmt1)

    // EOA swap
    let expectedOut
    if (isToken1) {
        expectedOut = getAmountOut(amountIn, reserve0, reserve1)
    } else {
        expectedOut = getAmountOut(amountIn, reserve1, reserve0)
    }

    return [expectedOut, twammSellingAmt0, twammBoughtAmt1, reserve0, reserve1, newReserve0, newReserve1, twammReserve0, twammReserve1];
}

function calculateTwammExpected(tokenAIn, tokenBIn, tokenAReserveRet, tokenBReserveRet) {

    const tokenAInWithFee = bigmath.bignumber(tokenAIn.toString()).mul(997).div(1000);
    const tokenBInWithFee = bigmath.bignumber(tokenBIn.toString()).mul(997).div(1000);
    let tokenAReserve = bigmath.bignumber(tokenAReserveRet.toString())
    let tokenBReserve = bigmath.bignumber(tokenBReserveRet.toString())

    const k = tokenAReserve.mul(tokenBReserve);

    const c = (sqrt(tokenAReserve.mul(tokenBInWithFee)).sub(sqrt(tokenBReserve.mul(tokenAInWithFee)))).div(
        (sqrt(tokenAReserve.mul(tokenBInWithFee)).add(sqrt(tokenBReserve.mul(tokenAInWithFee))))
    );
    //     (
    //     Math.sqrt(tokenAReserve * tokenBIn) - Math.sqrt(tokenBReserve * tokenAIn)
    // ) / (
    //     Math.sqrt(tokenAReserve * tokenBIn) + Math.sqrt(tokenBReserve * tokenAIn)
    // );

    const exponent = sqrt(tokenAInWithFee.mul(tokenBInWithFee).div(k)).mul(2)
    // 2 * Math.sqrt(tokenAIn * tokenBIn / k);


    const finalAReserveExpected = sqrt(k.mul(tokenAInWithFee).div(tokenBInWithFee)).mul(exp(exponent).add(c)).div(exp(exponent).sub(c))
    //     (
    //     Math.sqrt(k * tokenAIn / tokenBIn)
    //     * (Math.exp(exponent) + c)
    //     / (Math.exp(exponent) - c)
    // )

    const finalBReserveExpected = k.div(finalAReserveExpected);

    const tokenAOut = abs(tokenAReserve.sub(finalAReserveExpected).add(tokenAInWithFee));
    const tokenBOut = abs(tokenBReserve.sub(finalBReserveExpected).add(tokenBInWithFee));

    const finalAReserveExpectedBN = bigNumberify(bigmath.format(bigmath.round(finalAReserveExpected), {notation: 'fixed'}));
    const finalBReserveExpectedBN = bigNumberify(bigmath.format(bigmath.round(finalBReserveExpected), {notation: 'fixed'}));

    const tokenAOutBN = bigNumberify(bigmath.format(bigmath.round(tokenAOut), {notation: 'fixed'}))
    const tokenBOutBN = bigNumberify(bigmath.format(bigmath.round(tokenBOut), {notation: 'fixed'}))

    return [finalAReserveExpectedBN, finalBReserveExpectedBN, tokenAOutBN, tokenBOutBN]
}

module.exports = {
    getAmountOut,
    getAmountOutWithTwamm,
    calculateTwammExpected
}