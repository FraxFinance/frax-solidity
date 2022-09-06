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

async function getAmountOutWithTwamm(amountIn, pair, blockTimestamp, isToken0 = true) {

    const currentTimestamp = (await ethers.provider.getBlock("latest")).timestamp;

    const [
        reserve0,
        reserve1,
        lastVirtualOrderTimestamp,
        twammReserve0,
        twammReserve1
    ] = await pair.getReserveAfterTwamm(blockTimestamp)

    // EOA swap
    let expectedOut
    if (isToken0) {
        expectedOut = getAmountOut(amountIn, reserve0, reserve1)
    } else {
        expectedOut = getAmountOut(amountIn, reserve1, reserve0)
    }

    return expectedOut;
}

function calculateTwammExpectedParadigm(tokenAIn, tokenBIn, tokenAReserveRet, tokenBReserveRet) {

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

function calculateTwammExpectedFraxswap(tokenAIn, tokenBIn, tokenAReserveRet, tokenBReserveRet, timeIntervals, fee) {

    // uint256 aIn = token0In * 997 / 1000;
    // uint256 bIn = token1In * 997 / 1000;
    // uint256 k = token0Start * token1Start;
    // ammEndToken1 = token0Start * (token1Start + bIn) / (token0Start + aIn);
    // ammEndToken0 = k / ammEndToken1;
    // token0Out = token0Start + aIn - ammEndToken0;
    // token1Out = token1Start + bIn - ammEndToken1;

    const token0InWithFee = tokenAIn.mul(fee).div(10000); // bigmath.bignumber(tokenAIn.toString()).mul(997).div(1000);
    const token1InWithFee = tokenBIn.mul(fee).div(10000); // bigmath.bignumber(tokenBIn.toString()).mul(997).div(1000);
    const token0Reserve = tokenAReserveRet // bigmath.bignumber(tokenAReserveRet.toString())
    const token1Reserve = tokenBReserveRet // bigmath.bignumber(tokenBReserveRet.toString())

    const k = token0Reserve.mul(token1Reserve);
    const ammEndToken1 = token0Reserve.mul(token1Reserve.add(token1InWithFee)).div(token0Reserve.add(token0InWithFee));
    const ammEndToken0 = k.div(ammEndToken1);
    const token0Out = token0Reserve.add(token0InWithFee).sub(ammEndToken0)
    const token1Out = token1Reserve.add(token1InWithFee).sub(ammEndToken1)

    const final0ReserveExpectedBN = ammEndToken0 // bigNumberify(bigmath.format(bigmath.round(ammEndToken0), {notation: 'fixed'}));
    const final1ReserveExpectedBN = ammEndToken1 // bigNumberify(bigmath.format(bigmath.round(ammEndToken1), {notation: 'fixed'}));

    const token0OutBN = token0Out // bigNumberify(bigmath.format(bigmath.round(token0Out), {notation: 'fixed'}))
    const token1OutBN = token1Out // bigNumberify(bigmath.format(bigmath.round(token1Out), {notation: 'fixed'}))

    return [final0ReserveExpectedBN, final1ReserveExpectedBN, token0OutBN, token1OutBN]
}

function calculateTwammExpectedFraxswapIntervals(tokenAIn, tokenBIn, tokenAReserveRet, tokenBReserveRet, timeIntervals) {

    // uint256 aIn = token0In * 997 / 1000;
    // uint256 bIn = token1In * 997 / 1000;
    // uint256 k = token0Start * token1Start;
    // ammEndToken1 = token0Start * (token1Start + bIn) / (token0Start + aIn);
    // ammEndToken0 = k / ammEndToken1;
    // token0Out = token0Start + aIn - ammEndToken0;
    // token1Out = token1Start + bIn - ammEndToken1;

    let token0InWithFee = tokenAIn.div(timeIntervals).mul(997).div(1000);
    let token1InWithFee = tokenBIn.div(timeIntervals).mul(997).div(1000);

    let token0Out = BigNumber.from('0');
    let token1Out = BigNumber.from('0');
    let token0Reserve = tokenAReserveRet;
    let token1Reserve = tokenBReserveRet;

    for (let i = 0; i < timeIntervals; i++) {
        const k = token0Reserve.mul(token1Reserve);
        const ammEndToken1 = token0Reserve.mul(token1Reserve.add(token1InWithFee)).div(token0Reserve.add(token0InWithFee));
        const ammEndToken0 = k.div(ammEndToken1);
        token0Out = token0Out.add(token0Reserve.add(token0InWithFee).sub(ammEndToken0));
        token1Out = token1Out.add(token1Reserve.add(token1InWithFee).sub(ammEndToken1));
        token0Reserve = ammEndToken0;
        token1Reserve = ammEndToken1;
    }

    const final0ReserveExpectedBN = token0Reserve // bigNumberify(bigmath.format(bigmath.round(token0Reserve), {notation: 'fixed'}));
    const final1ReserveExpectedBN = token1Reserve // bigNumberify(bigmath.format(bigmath.round(token1Reserve), {notation: 'fixed'}));

    const token0OutBN = token0Out // bigNumberify(bigmath.format(bigmath.round(token0Out), {notation: 'fixed'}));
    const token1OutBN = token1Out //  bigNumberify(bigmath.format(bigmath.round(token1Out), {notation: 'fixed'}));

    return [final0ReserveExpectedBN, final1ReserveExpectedBN, token0OutBN, token1OutBN];
}

const SELL_RATE_ADDITIONAL_PRECISION = 1e6;

async function twammStateSnapshot(twamm) {

    const [
        token0Rate,
        token1Rate,
        lastVirtualOrderTimestamp_in,
        orderTimeInterval_rtn,
        rewardFactorPool0,
        rewardFactorPool1
    ] = await twamm.getTwammState()
    let lastVirtualOrderTimestamp = BigNumber.from(lastVirtualOrderTimestamp_in);

    const [
        _reserve0,
        _reserve1,
        _blockTimestampLast,
        _twammReserve0,
        _twammReserve1,
        _fee
    ] = await twamm.getTwammReserves();

    const orderExpiriesAndSellRates = {};
    let nextExpiryBlockTimestamp = lastVirtualOrderTimestamp.sub(lastVirtualOrderTimestamp % orderTimeInterval_rtn).add(orderTimeInterval_rtn);
    for (let i = 0; i < 200; i++) {
        const [orderPool0SalesRateEnding, orderPool1SalesRateEnding] = await twamm.getTwammSalesRateEnding(nextExpiryBlockTimestamp)
        orderExpiriesAndSellRates[nextExpiryBlockTimestamp] = ({
            orderPool0SalesRateEnding, orderPool1SalesRateEnding
        })
        nextExpiryBlockTimestamp = nextExpiryBlockTimestamp.add(orderTimeInterval_rtn);
    }

    // console.log(orderExpiriesAndSellRates)

    return ({
        token0Rate,
        token1Rate,
        lastVirtualOrderTimestamp_in,
        orderTimeInterval_rtn,
        rewardFactorPool0,
        rewardFactorPool1,
        _reserve0,
        _reserve1,
        _blockTimestampLast,
        _twammReserve0,
        _twammReserve1,
        orderExpiriesAndSellRates,
        _fee
    });
}

async function executeVirtualOrdersUntilTimestamp(twamm, blockTimestamp_in, twammstate = null) {

    if (twammstate == null) {
        twammstate = await twammStateSnapshot(twamm);
    }

    const {
        token0Rate,
        token1Rate,
        lastVirtualOrderTimestamp_in,
        orderTimeInterval_rtn,
        rewardFactorPool0,
        rewardFactorPool1,
        _reserve0,
        _reserve1,
        _blockTimestampLast,
        _twammReserve0,
        _twammReserve1,
        orderExpiriesAndSellRates,
        _fee
    } = twammstate;

    let currentSalesRate0 = BigNumber.from(token0Rate);
    let currentSalesRate1 = BigNumber.from(token1Rate);
    let blockTimestamp = BigNumber.from(blockTimestamp_in);
    let lastVirtualOrderTimestamp = BigNumber.from(lastVirtualOrderTimestamp_in);

    let twammReserve0 = BigNumber.from(_twammReserve0);
    let twammReserve1 = BigNumber.from(_twammReserve1);
    let ammEndToken0 = BigNumber.from(_reserve0);
    let ammEndToken1 = BigNumber.from(_reserve1);
    let token0Out = BigNumber.from('0');
    let token1Out = BigNumber.from('0');

    let bal0 = ammEndToken0.add(twammReserve0);
    let bal1 = ammEndToken1.add(twammReserve1);

    // console.log(`currentSalesRate0: ${currentSalesRate0}`)
    // console.log(`currentSalesRate1: ${currentSalesRate1}`)

    let nextExpiryBlockTimestamp = lastVirtualOrderTimestamp.sub(lastVirtualOrderTimestamp % orderTimeInterval_rtn).add(orderTimeInterval_rtn);

    // console.log(`blockTimestamp: ${blockTimestamp}`)
    // console.log(`lastVirtualOrderTimestamp: ${lastVirtualOrderTimestamp}`)
    // console.log(`nextExpiryBlockTimestamp: ${nextExpiryBlockTimestamp}`)

    //iterate through time intervals eligible for order expiries, moving state forward
    while (nextExpiryBlockTimestamp <= blockTimestamp) {

        // console.log('errr', nextExpiryBlockTimestamp, orderExpiriesAndSellRates[nextExpiryBlockTimestamp])

        const {
            orderPool0SalesRateEnding,
            orderPool1SalesRateEnding
        } = orderExpiriesAndSellRates[nextExpiryBlockTimestamp];

        // Optimization for skipping blocks with no expiry
        if (orderPool0SalesRateEnding > 0
            || orderPool1SalesRateEnding > 0) {

            // console.log(`**************`)

            //amount sold from virtual trades
            const blockTimestampElapsed = nextExpiryBlockTimestamp.sub(lastVirtualOrderTimestamp);
            const token0SellAmount = currentSalesRate0.mul(blockTimestampElapsed).div(SELL_RATE_ADDITIONAL_PRECISION);
            const token1SellAmount = currentSalesRate1.mul(blockTimestampElapsed).div(SELL_RATE_ADDITIONAL_PRECISION);
            // console.log(`blockTimestampElapsed: ${blockTimestampElapsed}`);
            // console.log(`token1SellAmount: ${token1SellAmount}`);
            // console.log(`token0SellAmount: ${token0SellAmount}`);

            let _token0Out, _token1Out;
            [
                _token0Out,
                _token1Out
            ] = computeVirtualBalances(ammEndToken0, ammEndToken1, token0SellAmount, token1SellAmount, _fee);

            twammReserve0 = twammReserve0.add(_token0Out).sub(token0SellAmount);
            twammReserve1 = twammReserve1.add(_token1Out).sub(token1SellAmount);
            ammEndToken0 = bal0.sub(twammReserve0);
            ammEndToken1 = bal1.sub(twammReserve1);

            bal0 = ammEndToken0.add(twammReserve0);
            bal1 = ammEndToken1.add(twammReserve1);

            // console.log(`_token0Out: ${_token0Out}`);
            // console.log(`_token1Out: ${_token1Out}`);
            // console.log(`ammEndToken0: ${ammEndToken0}`);
            // console.log(`ammEndToken1: ${ammEndToken1}`);

            token0Out = token0Out.add(_token0Out);
            token1Out = token1Out.add(_token1Out);

            currentSalesRate0 = currentSalesRate0.sub(orderPool0SalesRateEnding);
            currentSalesRate1 = currentSalesRate1.sub(orderPool1SalesRateEnding);

            lastVirtualOrderTimestamp = nextExpiryBlockTimestamp;
        }
        nextExpiryBlockTimestamp = nextExpiryBlockTimestamp.add(orderTimeInterval_rtn);
    }
    // //finally, move state to current blockTimestamp if necessary
    if (lastVirtualOrderTimestamp != blockTimestamp) {

        //amount sold from virtual trades
        const blockTimestampElapsed = blockTimestamp.sub(lastVirtualOrderTimestamp);
        const token0SellAmount = currentSalesRate0.mul(blockTimestampElapsed).div(SELL_RATE_ADDITIONAL_PRECISION);
        const token1SellAmount = currentSalesRate1.mul(blockTimestampElapsed).div(SELL_RATE_ADDITIONAL_PRECISION);
        // console.log(`blockTimestampElapsed: ${blockTimestampElapsed}`);
        // console.log(`token0SellAmount: ${token0SellAmount}`);
        // console.log(`token1SellAmount: ${token1SellAmount}`);

        let _token0Out, _token1Out;
        [
            _token0Out,
            _token1Out,
        ] = computeVirtualBalances(ammEndToken0, ammEndToken1, token0SellAmount, token1SellAmount, _fee);

        twammReserve0 = twammReserve0.add(_token0Out).sub(token0SellAmount);
        twammReserve1 = twammReserve1.add(_token1Out).sub(token1SellAmount);
        ammEndToken0 = bal0.sub(twammReserve0);
        ammEndToken1 = bal1.sub(twammReserve1);

        // console.log(`_token0Out: ${_token0Out}`);
        // console.log(`_token1Out: ${_token1Out}`);
        // console.log(`ammEndToken0: ${ammEndToken0}`);
        // console.log(`ammEndToken1: ${ammEndToken1}`);

        token0Out = token0Out.add(_token0Out);
        token1Out = token1Out.add(_token1Out);
    }

    return [
        ammEndToken0,
        ammEndToken1,
        token0Out,
        token1Out
    ]
}

function computeVirtualBalances(
    token0Start,
    token1Start,
    token0In,
    token1In,
    _fee
) {
    const minusFee = BigNumber.from('10000').sub(_fee);
    let token0Out = BigNumber.from(0);
    let token1Out = BigNumber.from(0);
    //if no tokens are sold to the pool, we don't need to execute any orders
    if (token0In.lt(2) && token1In.lt(2)) {
        // skip
    }
    //in the case where only one pool is selling, we just perform a normal swap
    else if (token0In.lt(2)) {
        //constant product formula
        const token1InWithFee = token1In.mul(minusFee);
        token0Out = token0Start.mul(token1InWithFee).div(token1Start.mul(10000).add(token1InWithFee));
    } else if (token1In.lt(2)) {
        //constant product formula
        const token0InWithFee = token0In.mul(minusFee);
        token1Out = token1Start.mul(token0InWithFee).div(token0Start.mul(10000).add(token0InWithFee));
    }
    //when both pools sell, we use the TWAMM formula
    else {
        const newToken0 = token0Start.add(token0In.mul(minusFee).div(10000));
        const newToken1 = token1Start.add(token1In.mul(minusFee).div(10000));
        token0Out = newToken0.sub(token1Start.mul(newToken0).div(newToken1));
        token1Out = newToken1.sub(token0Start.mul(newToken1).div(newToken0));
    }
    return [
        token0Out,
        token1Out
    ]
}

/// ----------------------------
/// ----- MID TEST ACTIONS -----
/// ----------------------------

async function addLiquidity(twamm, token0, token1, signer, amountIn0, amountIn1) {

    let [token0ReserveBefore, token1ReserveBefore, blockTimestampLastBefore, twammReserve0Before, twammReserve1Before] = await twamm.getTwammReserves();

    let promises = [];

    promises.push(await token0.transfer(signer.address, amountIn0));
    promises.push(await token1.transfer(signer.address, amountIn1));

    promises.push(await token0.connect(signer).approve(twamm.address, amountIn0));
    promises.push(await token1.connect(signer).approve(twamm.address, amountIn1));

    promises.push(await token0.connect(signer).transfer(twamm.address, amountIn0));
    promises.push(await token1.connect(signer).transfer(twamm.address, amountIn1));

    promises.push(await twamm.connect(signer).mint(signer.address));

    Promise.all(promises.map(tx=>tx.wait()));

    let [token0ReserveAfter, token1ReserveAfter, blockTimestampLastAfter, twammReserve0After, twammReserve1After] = await twamm.getTwammReserves();

    return {
        token0ReserveBefore,
        token1ReserveBefore,
        blockTimestampLastBefore,
        twammReserve0Before,
        twammReserve1Before,
        token0ReserveAfter,
        token1ReserveAfter,
        blockTimestampLastAfter,
        twammReserve0After,
        twammReserve1After
    }
}

async function removeLiquidity(twamm, signer, amountToTransfer) {
    const owner_lp_bal_before = await twamm.balanceOf(signer.address);
    expect(amountToTransfer).to.be.lte(owner_lp_bal_before);

    await twamm.connect(signer).transfer(twamm.address, amountToTransfer);
    return await twamm.connect(signer).burn(signer.address);
}

async function swapFromToken0(twamm, signer, amountIn, amountOut, token0) {
    await token0.transfer(signer.address, amountIn);
    await token0.connect(signer).transfer(twamm.address, amountIn);
    return await (await twamm.connect(signer).swap(0, amountOut, signer.address, '0x')).wait();
}

async function swapFromToken1(twamm, signer, amountIn, amountOut, token1) {
    await token1.transfer(signer.address, amountIn);
    await token1.connect(signer).transfer(twamm.address, amountIn);
    return await (await twamm.connect(signer).swap(amountOut, 0, signer.address, '0x')).wait();
}

async function addTwammOrderFrom0To1(twamm, token0, signer, amountIn, timeIntervals) {
    await token0.transfer(signer.address, amountIn);
    await token0.connect(signer).approve(twamm.address, amountIn);
    const tx = await twamm.connect(signer).longTermSwapFrom0To1(amountIn, timeIntervals);

    const getResults = async () => {
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'LongTermSwap0To1');
        const [sender, orderId, amount, numberOfTimeIntervals] = event.args;
        return {sender, orderId, amount, numberOfTimeIntervals};
    }

    return {tx, getResults}
}

async function addTwammOrderFrom1To0(twamm, token1, signer, amountIn, timeIntervals) {
    await token1.transfer(signer.address, amountIn);
    await token1.connect(signer).approve(twamm.address, amountIn);
    const tx = await twamm.connect(signer).longTermSwapFrom1To0(amountIn, timeIntervals);

    const getResults = async () => {
        const rc = await tx.wait();
        const event = rc.events.find(event => event.event === 'LongTermSwap1To0');
        const [sender, orderId, amount, numberOfTimeIntervals] = event.args;
        return {sender, orderId, amount, numberOfTimeIntervals};
    }

    return {tx, getResults}
}

async function cancelTwammOrder(twamm, signer, orderId) {
    return await twamm.connect(signer).cancelLongTermSwap(orderId);
}

async function withdrawProceedsFromTwammOrder(twamm, signer, orderId) {
    return await twamm.connect(signer).withdrawProceedsFromLongTermSwap(orderId);
}

async function executeTwammOrders(twamm, timestamp) {
    await twamm.executeVirtualOrders(btimestamp);
}

module.exports = {
    getAmountOut,
    getAmountOutWithTwamm,
    calculateTwammExpectedParadigm,
    calculateTwammExpectedFraxswap,
    calculateTwammExpectedFraxswapIntervals,
    executeVirtualOrdersUntilTimestamp,
    twammStateSnapshot,
    // mid test actions
    addLiquidity,
    removeLiquidity,
    swapFromToken0,
    swapFromToken1,
    addTwammOrderFrom0To1,
    addTwammOrderFrom1To0,
    cancelTwammOrder,
    withdrawProceedsFromTwammOrder,
    SELL_RATE_ADDITIONAL_PRECISION
}