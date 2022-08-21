const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { BigNumber } = require('ethers');
const UniV2TWAMMPair = require('../../artifacts/contracts/Fraxswap/core/FraxswapPair.sol/FraxswapPair');
const LongTermOrdersAbi = require('../../artifacts/contracts/Fraxswap/twamm/LongTermOrders.sol/LongTermOrdersLib');
const { BIG6, BIG18, bigNumberify, expandTo18Decimals, sleep } = require('./utilities');
const {
    calculateTwammExpectedFraxswap,
    executeVirtualOrdersUntilTimestamp,
    twammStateSnapshot,
    addLiquidity,
    swapFromToken0,
    swapFromToken1,
    addTwammOrderFrom0To1,
    addTwammOrderFrom1To0,
    cancelTwammOrder,
    withdrawProceedsFromTwammOrder,
    getAmountOut,
    SELL_RATE_ADDITIONAL_PRECISION
} = require('./twamm-utils')
const chalk = require('chalk');
const util = require('util');

const outputVirtualOrderExecutions = async (twamm, txToWaitFor, toRevert = null) => {

    const longTermOrderInterface = new ethers.utils.Interface(LongTermOrdersAbi.abi);

    toRevert == 'revert' && await expect(txToWaitFor).to.be.reverted;
    toRevert == 'not-revert' && await expect(txToWaitFor).to.be.not.reverted;

    const txReceipt = await (await txToWaitFor).wait()

    // console.log(txReceipt.logs)

    const iface = twamm.interface;

    const decodedLogs = txReceipt.logs
        .map((log) => {
            try {
                return iface.parseLog(log);
            } catch (e) {
                try {
                    return longTermOrderInterface.parseLog(log)
                } catch (e) {
                    return;
                }
            }
        })
    //   .filter((log) => log?.name == "VirtualOrderExecution");

    console.log("decodedLogs", decodedLogs);
}

async function getBlockNumber() {
    return (await ethers.provider.getBlock("latest")).number
}

async function getBlockTimestamp() {
    return (await ethers.provider.getBlock("latest")).timestamp
}

async function getBlockTimestampFromBlock(blockNumber) {
    return (await ethers.provider.getBlock(blockNumber)).timestamp
}

function getErrorDiffPct(A, B) {
    const bigger = A > B ? A : B;
    const smaller = A < B ? A : B;
    return bigger.mul(10000).div(smaller).sub(10000)
}

function outputErrorDiffPct(A, B) {
    return `diff: ${ethers.utils.formatUnits(getErrorDiffPct(A, B), 2)} %`
}

function outputRatio(A, B) {
    return ethers.utils.formatUnits(A.mul(10000).div(B), 4)
}

const transactionInSingleBlock = async (func) => {
    await network.provider.send("evm_setAutomine", [false]);
    let results;
    try {
        results = await func();
    } catch (e) {
        console.log(e);
        // reset the block mining
    }
    await network.provider.send("evm_setAutomine", [true]);
    await network.provider.send("evm_mine")
    return results;
}

const alignBlockTimestamp = async (offset) => {
    const currentBlockTimestamp = await getBlockTimestamp()
    const targetTimestamp = currentBlockTimestamp - (currentBlockTimestamp % 3600) + (2 * 3600) - offset;
    await network.provider.send("evm_setNextBlockTimestamp", [targetTimestamp - offset]);
    await network.provider.send("evm_mine");
}

const getFee = (fee) => {
    return 10000 - fee;
}

const initialLiquidityProvided = expandTo18Decimals(100000);
const initialAddr3Token0 = expandTo18Decimals(1000000);
const initialAddr3Token1 = expandTo18Decimals(1000000);

const maxUint112 = bigNumberify(2).pow(112).sub(1) // same as type(uint112).max

let orderTimeInterval = 3600;

const ERC20Supply = ethers.constants.MaxUint256; // expandTo18Decimals(2e200);

async function setupContracts(createPair = true, fee = null) {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy token0/token1 token and distribute
    const DummyToken = await ethers.getContractFactory("contracts/Fraxswap/periphery/test/ERC20PeriTest.sol:ERC20PeriTest");
    let token0 = await DummyToken.deploy(ERC20Supply);
    let token1 = await DummyToken.deploy(ERC20Supply);
    const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();

    if (token1.address.toUpperCase() < token0.address.toUpperCase()) {
        var temp = token1;
        token1 = token0;
        token0 = temp;
    }

    const FraxswapFactory = await ethers.getContractFactory("FraxswapFactory");
    const factory = await FraxswapFactory.deploy(owner.address);
    await factory.deployed();

    let pair;
    if (createPair) {
        if (fee) {
            await factory['createPair(address,address,uint256)'](token0.address, token1.address, fee);
        } else {
            await factory['createPair(address,address)'](token0.address, token1.address);
        }
        const pairAddress = await factory.getPair(token0.address, token1.address);
        pair = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);
    }

    const FraxswapRouter = await ethers.getContractFactory("FraxswapRouter");
    const router = await FraxswapRouter.deploy(factory.address, weth9.address);
    await router.deployed();

    return {
        token0,
        token1,
        weth9,
        factory,
        pair,
        router
    }
}

const runOnce = (runOnceFee) => describe(`Test to Run Once. fee: ${runOnceFee}}`, function () {

    describe("Calculate the FraxswapPair code hash", function () {
        it("Output the Init Hash", async function () {

            // do this twice because sometimes the hash differs depending on which solidity compiler is used

            // compute using ethers js
            const bytecode = UniV2TWAMMPair.bytecode;
            const COMPUTED_INIT_CODE_HASH = ethers.utils.keccak256(bytecode);
            console.log(`COMPUTED_INIT_CODE_HASH: ${COMPUTED_INIT_CODE_HASH}`);

            // compute with smart contract
            const ContractInitHash = await ethers.getContractFactory("ComputeUniswapV2PairInitHash");
            const contractInitHash = await (await ContractInitHash.deploy()).deployed();
            console.log(`getInitHash: ${await contractInitHash.getInitHash()}`);

        });
    });

    describe("Edge cases", function () {

        let token0;
        let token1;
        let factory;
        let twamm;
        let owner, addr1, addr2, addr3;

        beforeEach(async function () {
            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(true, runOnceFee);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;
            twamm = setupCnt.pair;

        });

        const runComputeVirtualBalancesTest = (divisorFactor, smallOrder) => {
            it(`computeVirtualBalances divisorFactor: ${divisorFactor} smallOrder: ${smallOrder}`, async function () {

                const liquidity0 = BigNumber.from(`8379829307706602317717`).div(divisorFactor)
                const liquidity1 = BigNumber.from(`10991961728915299510446`).div(divisorFactor)

                await addLiquidity(twamm, token0, token1, addr1, liquidity0, liquidity1)

                // align so long term order will be on
                await alignBlockTimestamp(4)

                await transactionInSingleBlock(async () => {

                    const swap1To0 = BigNumber.from(`${smallOrder}`)
                    const ltOrder0 = await addTwammOrderFrom1To0(twamm, token1, addr1, swap1To0, 0)

                    const swap0To1 = maxUint112.div(2).div(divisorFactor)
                    const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, swap0To1, 0)
                });

                await mineTimeIntervals(2);

                await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

            });
        }


        it(`computeVirtualBalances no liquidity, swap1To0 = 1, swap0To1 = none`, async function () {


            // align so long term order will be on
            await alignBlockTimestamp(4)

            const swap1To0 = BigNumber.from(`1`)
            const ltOrder0 = await (await addTwammOrderFrom1To0(twamm, token1, addr1, swap1To0, 0)).getResults()

            await mineTimeIntervals(2);
            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

        });

        it(`computeVirtualBalances no liquidity, swap1To0 = none, swap0To1 = 1`, async function () {


            // align so long term order will be on
            await alignBlockTimestamp(4)

            const swap0To1 = BigNumber.from(`1`)
            const ltOrder1 = await (await addTwammOrderFrom0To1(twamm, token0, addr2, swap0To1, 0)).getResults()

            await mineTimeIntervals(2);
            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

        });

        it(`computeVirtualBalances no liquidity, swap1To0 = 1, swap0To1 = large`, async function () {

            // align so long term order will be on
            await alignBlockTimestamp(0)

            const promisesToWaitFor = await transactionInSingleBlock(async () => {
                const swap1To0 = BigNumber.from(`1`)
                const ltOrder0 = await addTwammOrderFrom1To0(twamm, token1, addr1, swap1To0, 0)

                const swap0To1 = maxUint112.div(2)
                const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, swap0To1, 0)

                return [ltOrder0, ltOrder1]
            });

            await Promise.all(promisesToWaitFor.map(o => o.getResults()))

            await mineTimeIntervals(2);
            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

        });

        it(`computeVirtualBalances no liquidity, swap1To0 = large, swap0To1 = 1`, async function () {


            // align so long term order will be on
            await alignBlockTimestamp(0)

            const promisesToWaitFor = await transactionInSingleBlock(async () => {
                const swap1To0 = maxUint112.div(2)
                const ltOrder0 = await addTwammOrderFrom1To0(twamm, token1, addr1, swap1To0, 0)

                const swap0To1 = BigNumber.from(`1`)
                const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, swap0To1, 0)

                return [ltOrder0, ltOrder1]
            });

            await Promise.all(promisesToWaitFor.map(o => o.getResults()))

            await mineTimeIntervals(2);
            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

        });

        it(`computeVirtualBalances no liquidity, swap1To0 = 1, swap0To1 = 1`, async function () {

            // align so long term order will be on
            await alignBlockTimestamp(0)

            const promisesToWaitFor = await transactionInSingleBlock(async () => {
                const swap1To0 = BigNumber.from(`1`)
                const ltOrder0 = await addTwammOrderFrom1To0(twamm, token1, addr1, swap1To0, 0)

                const swap0To1 = BigNumber.from(`1`)
                const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, swap0To1, 0)

                return [ltOrder0, ltOrder1]
            });

            await Promise.all(promisesToWaitFor.map(o => o.getResults()))

            await mineTimeIntervals(2);
            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted

        });

        runComputeVirtualBalancesTest(BigNumber.from(1), 1);
        runComputeVirtualBalancesTest(BigNumber.from(8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(8e2), 1);
        runComputeVirtualBalancesTest(BigNumber.from(8e4), 1);
        runComputeVirtualBalancesTest(BigNumber.from(8e6), 1);
        runComputeVirtualBalancesTest(BigNumber.from(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e1).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e2).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e4).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e5).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e6).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e7).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e8).mul(8e8), 1);
        runComputeVirtualBalancesTest(BigNumber.from(1e9).mul(8e8), 1);//80000000000000000000
        runComputeVirtualBalancesTest(BigNumber.from(1e10).mul(8e8), 1);

        it("Brick contract", async function () {

            // due to rounding in the smart contract

            const newLiquidity = bigNumberify(10).pow(28);
            await addLiquidity(twamm, token0, token1, addr1, newLiquidity, newLiquidity)

            const timeIntervals = 2;
            const token18 = 300;
            const amountIn1 = expandTo18Decimals(token18);


            // align so long term order will be on
            await alignBlockTimestamp(4)

            // open a long term order and then cancel it
            const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, amountIn1, timeIntervals)
            const result1 = await ltOrder1.getResults()

            // console.log(await getBlockTimestampFromBlock(ltOrder1.blockNumber))

            const ordr = await twamm.getTwammOrder(0)

            // execute some of the twamm orders
            await mineTimeIntervals(5);

            await twamm.executeVirtualOrders(ordr.expirationTimestamp, { gasLimit: 5000000 }); // BRICK

            // execute some of the twamm orders
            await mineTimeIntervals(1);
            const currentBlockTimestamp2 = await getBlockTimestamp()
            await expect(twamm.executeVirtualOrders(currentBlockTimestamp2, { gasLimit: 5000000 })).to.be.not.reverted; // FAIL

        });

        it("Long-term order timeInterval 0", async function () {

            // due to rounding in the smart contract

            const newLiquidity = bigNumberify(10).pow(28);
            await addLiquidity(twamm, token0, token1, addr1, newLiquidity, newLiquidity)

            const timeIntervals = 0;
            const token18 = 300;
            const amountIn1 = expandTo18Decimals(token18);

            // align so long term order will be on
            await alignBlockTimestamp(2)

            // open a long term order and then cancel it
            const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, amountIn1, timeIntervals)
            const result1 = await ltOrder1.getResults()

            // console.log(await getBlockTimestampFromBlock(ltOrder1.blockNumber))

            const ordr = await twamm.getTwammOrder(0)

            // should be almost aligned so the difference between the two would be 1
            expect(ordr.expirationTimestamp.sub(await getBlockTimestampFromBlock(ltOrder1.blockNumber))).to.be.eq(bigNumberify(1))
            expect(ordr['saleRate'].div(SELL_RATE_ADDITIONAL_PRECISION)).to.be.eq(amountIn1)

            // console.log(ordr)
            // console.log(`seconds until expiry: ${ordr.expirationTimestamp.sub(await getBlockTimestampFromBlock(ltOrder1.blockNumber))}`)
            // console.log(`saleRate: ${ethers.utils.formatEther(ordr['saleRate'].div(SELL_RATE_ADDITIONAL_PRECISION))}`)

            // execute some of the twamm orders
            await mineTimeIntervals(5);

            const withdrawTxReceipt = await (await withdrawProceedsFromTwammOrder(twamm, addr2, result1.orderId)).wait()
            const withdrawEvent = withdrawTxReceipt.events.find(evt => evt.event == 'WithdrawProceedsFromLongTermOrder');

            expect(withdrawTxReceipt.cumulativeGasUsed).to.be.lt(bigNumberify(4e6));

            // console.log(withdrawEvent['args'])
            // console.log('withdrawTxReceipt.cumulativeGasUsed', withdrawTxReceipt.cumulativeGasUsed)

            const [, , , twammReserve0, twammReserve1] = await twamm.getTwammReserves();

            // console.log(twammReserve0, twammReserve1)

            // should be very small
            expect(twammReserve0).to.be.lte(2)
            expect(twammReserve1).to.be.lte(2)

        });

        it("Long-term order left overs", async function () {

            // due to rounding in the smart contract

            const newLiquidity = bigNumberify(10).pow(28);
            await addLiquidity(twamm, token0, token1, addr1, newLiquidity, newLiquidity)

            const timeIntervals = 100;
            const amountIn1 = expandTo18Decimals(300);

            // align so long term order will be on
            await alignBlockTimestamp(4)

            // open a long term order and then cancel it
            const ltOrder1 = await addTwammOrderFrom0To1(twamm, token0, addr2, amountIn1, timeIntervals)
            const result1 = await ltOrder1.getResults()

            // console.log('getBlockNumber', await getBlockNumber())

            // execute some of the twamm orders
            await mineTimeIntervals(99);

            const cancelTxReceipt = await (await cancelTwammOrder(twamm, addr2, result1.orderId)).wait()
            const cancelEvent = cancelTxReceipt.events.find(evt => evt.event == 'CancelLongTermOrder');

            // console.log('cancelTxReceipt.cumulativeGasUsed', cancelTxReceipt.cumulativeGasUsed)
            // console.log(`unsoldAmount: ${ethers.utils.formatEther(cancelEvent.args['unsoldAmount'])}`)
            // console.log(`purchasedAmount: ${ethers.utils.formatEther(cancelEvent.args['purchasedAmount'])}`)

            expect(cancelTxReceipt.cumulativeGasUsed).to.be.lt(bigNumberify(800000))
            expect(cancelEvent.args['unsoldAmount']).to.be.lt(bigNumberify(5e18))
            expect(cancelEvent.args['purchasedAmount']).to.be.gt(bigNumberify(290e18))

            const [, , , twammReserve0, twammReserve1] = await twamm.getTwammReserves();

            // console.log(twammReserve0, twammReserve1)

            // should be very small
            expect(twammReserve0).to.be.lte(2)

        });

        it("Long-term order inactivity", async function () {

            return // disabled

            // add liquidity
            const newLiquidity = bigNumberify(10).pow(28);
            await addLiquidity(twamm, token0, token1, addr1, newLiquidity, newLiquidity)

            // month (30 days) in hours (720 hourly timeIntervals)
            const timeIntervals = 30 * 24;

            try {
                // set mining interval to 1 secs
                await network.provider.send("evm_setIntervalMining", [1000]);

                // open a long term order two a day for 30 days
                const amountIn1 = expandTo18Decimals(1);
                for (let i = 0; i < timeIntervals; i += timeIntervals / 60) {
                    await addTwammOrderFrom0To1(twamm, token0, addr2, amountIn1, i);
                }
            } finally {
                // set mining interval back
                await network.provider.send("evm_setIntervalMining", [0]);
                await network.provider.send("evm_mine");
            }

            // expect 60 orders to have been created
            expect(await twamm.getNextOrderID()).to.be.eq(bigNumberify(60))

            const beforeMiningForward = await getBlockTimestamp();

            // mine 720 intervals
            await network.provider.send("evm_setNextBlockTimestamp", [await getBlockTimestamp() + (timeIntervals * orderTimeInterval)]);
            await network.provider.send("evm_mine");

            const afterMiningForward = await getBlockTimestamp();

            expect(afterMiningForward - beforeMiningForward).to.be.eq(60 * 60 * 24 * 30)

            const gasEst = await twamm.connect(addr1).estimateGas.executeVirtualOrders(await getBlockTimestamp() + 1)

            await expect(twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)).to.be.not.reverted;

            expect(gasEst).to.be.lte(bigNumberify(6e6)) // less than 6M gas, doesn't gas out
        });

        it("exceeds uint112 addLiquidity", async function () {

            // add liquidity. hit the max
            await addLiquidity(twamm, token0, token1, addr1, maxUint112, maxUint112)

            // fail to add liquidity above max
            await expect(addLiquidity(twamm, token0, token1, addr2, bigNumberify(1), bigNumberify(1))).to.be.revertedWith("Uint112Overflow")

        })

        it("exceeds uint112 addLiquidity token0", async function () {

            // add liquidity. half max
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.div(2), maxUint112.div(2))

            // unbalance pool
            const amountIn = maxUint112.div(3);
            twammReserves = await twamm.getTwammReserves();
            const amountOut = getAmountOut(amountIn, twammReserves._reserve0, twammReserves._reserve1);
            await swapFromToken0(twamm, addr2, amountIn, amountOut, token0);

            // add liquidity. hit the max
            twammReserves = await twamm.getTwammReserves();
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.sub(twammReserves._reserve0), maxUint112.sub(twammReserves._reserve0))

            // over the uint112
            await expect(addLiquidity(twamm, token0, token1, addr1, bigNumberify(10), bigNumberify(10))).to.be.revertedWith("Uint112Overflow");

        })

        it("exceeds uint112 addLiquidity token1", async function () {

            // add liquidity. half max
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.div(2), maxUint112.div(2))

            // unbalance pool
            const amountIn = maxUint112.div(3);
            twammReserves = await twamm.getTwammReserves();
            const amountOut = getAmountOut(amountIn, twammReserves._reserve1, twammReserves._reserve0);
            await swapFromToken1(twamm, addr2, amountIn, amountOut, token1);

            // add liquidity. hit the max
            twammReserves = await twamm.getTwammReserves();
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.sub(twammReserves._reserve1), maxUint112.sub(twammReserves._reserve1))

            // over the uint112
            await expect(addLiquidity(twamm, token0, token1, addr1, bigNumberify(10), bigNumberify(10))).to.be.revertedWith("Uint112Overflow");

        })

        it("exceeds uint112 twammOrder from token0", async function () {

            // add liquidity. half max
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.div(2), maxUint112.div(2))

            // unbalance pool
            const amountIn = maxUint112.div(3);
            twammReserves = await twamm.getTwammReserves();
            const amountOut = getAmountOut(amountIn, twammReserves._reserve0, twammReserves._reserve1);
            await swapFromToken0(twamm, addr2, amountIn, amountOut, token0);

            // add liquidity. hit the max + 10
            const timeIntervals = 20;
            twammReserves = await twamm.getTwammReserves();
            await expect(addTwammOrderFrom0To1(twamm, token0, addr1, maxUint112.sub(twammReserves._reserve0).add(10), timeIntervals)).to.be.reverted;

        })

        it("exceeds uint112 twammOrder from token1", async function () {

            // add liquidity. half max
            await addLiquidity(twamm, token0, token1, addr1, maxUint112.div(2), maxUint112.div(2));

            // unbalance pool
            const amountIn = maxUint112.div(3);
            twammReserves = await twamm.getTwammReserves();
            const amountOut = getAmountOut(amountIn, twammReserves._reserve1, twammReserves._reserve0);
            await swapFromToken1(twamm, addr2, amountIn, amountOut, token1);

            // add liquidity. hit the max + 10
            const timeIntervals = 20;
            twammReserves = await twamm.getTwammReserves();
            await expect(addTwammOrderFrom1To0(twamm, token1, addr1, maxUint112.sub(twammReserves._reserve1).add(10), timeIntervals)).to.be.reverted;

        })

        it("async token0 deposit exceeds uint112, skim", async function () {

            // add liquidity. half max
            const halfMax = maxUint112.div(2);
            await addLiquidity(twamm, token0, token1, addr1, halfMax, halfMax);

            // async add alot of tokens
            const amountIn = halfMax;
            await token0.transfer(addr1.address, amountIn);
            await token1.transfer(addr1.address, amountIn);
            await token0.connect(addr1).approve(twamm.address, amountIn);
            await token1.connect(addr1).approve(twamm.address, amountIn);
            await token0.connect(addr1).transfer(twamm.address, amountIn);
            await token1.connect(addr1).transfer(twamm.address, amountIn);

            // added half max to liquidity pool. check reserves
            const [_reserve0_1, _reserve1_1, _blockTimestampLast_1, _twammReserve0_1, _twammReserve1_1] = await twamm.getTwammReserves();
            expect(_reserve0_1).to.be.eq(halfMax)
            expect(_reserve1_1).to.be.eq(halfMax)

            // max token0 => uint112
            await addTwammOrderFrom0To1(twamm, token0, addr2, maxUint112.sub(_reserve0_1), 100)

            // token0 twamm and reserve should total uint112
            const [_reserve0_2, _reserve1_2, _blockTimestampLast_2, _twammReserve0_2, _twammReserve1_2] = await twamm.getTwammReserves();
            expect(_reserve0_2.add(_twammReserve0_2)).to.be.eq(maxUint112)

            // sync will fail
            await expect(twamm.sync()).to.be.revertedWith("Uint112Overflow");

            // skim extra tokens
            await twamm.connect(addr3).skim(addr3.address);
            const afterSkim = await token0.balanceOf(addr3.address);
            expect(afterSkim).to.be.eq(amountIn);

            // sync will pass
            await expect(twamm.sync()).to.be.not.reverted;

        })
    });

    describe("External functions", function () {
        beforeEach(async function () {
            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(false, runOnceFee);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;

        });
        it("Everyone can call executeVirtualOrders", async function () {

            await factory['createPair(address,address)'](token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp() + 1)
            ).to.not.be.reverted; // anyone can call this function

        });
    });

    describe("Pause Tests", function () {
        beforeEach(async function () {
            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(false, runOnceFee);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;

        });
        it("Pause enabled, withdraw", async function () {

            await factory['createPair(address,address)'](token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);

            await token0.transfer(twamm.address, initialLiquidityProvided);
            await token1.transfer(twamm.address, initialLiquidityProvided);
            await twamm.mint(owner.address);

            const amountIn = expandTo18Decimals(10);

            //trigger long term order
            await token0.transfer(addr1.address, amountIn);
            await token0.connect(addr1).approve(twamm.address, amountIn);
            await expect(twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 2)).to.be.not.reverted;
            await token1.transfer(addr1.address, amountIn);
            await token1.connect(addr1).approve(twamm.address, amountIn);
            await expect(twamm.connect(addr1).longTermSwapFrom1To0(amountIn, 2)).to.be.not.reverted;

            //move blocks forward, and execute virtual orders
            await mineTimeIntervals(3)
            // await twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp());
            await outputVirtualOrderExecutions(twamm, twamm.connect(addr1).executeVirtualOrders(await getBlockTimestamp()), 'not-revert')

            // enabled twamm pause
            await factory.toggleGlobalPause(); // enable it
            await twamm.togglePauseNewSwaps();

            //trigger long term order that should fail
            await token0.transfer(addr1.address, amountIn);
            await token0.connect(addr1).approve(twamm.address, amountIn);
            await expect(twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 2)).to.be.reverted;
            await token1.transfer(addr1.address, amountIn);
            await token1.connect(addr1).approve(twamm.address, amountIn);
            await expect(twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 2)).to.be.reverted;

            // cancel should work
            await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0)
            // await expect(twamm.connect(addr1).cancelLongTermSwap(0)).to.be.not.reverted;
            await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(1)
            // await expect(twamm.connect(addr1).withdrawProceedsFromLongTermSwap(1)).to.be.not.reverted;

        });

        it("execVirtualOrders invalid timestamp", async function () {

            await factory['createPair(address,address)'](token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, UniV2TWAMMPair.abi).connect(owner);

            const currentTimestamp = await getBlockTimestamp();

            await outputVirtualOrderExecutions(twamm, twamm.executeVirtualOrders(currentTimestamp), 'not-revert')

            await mineTimeIntervals(2);

            await outputVirtualOrderExecutions(twamm, twamm.executeVirtualOrders(currentTimestamp - 1))

            await outputVirtualOrderExecutions(twamm, twamm.executeVirtualOrders(await getBlockTimestamp()))

            // await expect(twamm.executeVirtualOrders(currentTimestamp - 1)).to.be.reverted;

        });
    });

});

const allTwammTests = (multiplier, testFee) => describe(`TWAMM - fee: ${testFee} swap multiplier: ${multiplier} longterm swap ratio: ${outputRatio(expandTo18Decimals(10 * multiplier), initialLiquidityProvided)}`, function () {

    let token0;
    let token1;
    let pair;
    let router;

    let twamm;

    let owner;
    let addr1;
    let addr2;
    let addr3;
    let addrs;

    let orderTimeInterval = 3600;

    describe("TWAMM Functionality ", function () {

        beforeEach(async function () {

            [owner, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(true, testFee);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;
            twamm = setupCnt.pair;
            router = setupCnt.router;

            const [
                token0Rate,
                token1Rate,
                lastVirtualOrderTimestamp,
                _orderTimeInterval,
                rewardFactorPool0,
                rewardFactorPool1
            ] = await twamm.getTwammState()

            orderTimeInterval = _orderTimeInterval;

            token0.approve(twamm.address, ERC20Supply);
            token1.approve(twamm.address, ERC20Supply);

            //provide initial liquidity
            await token0.transfer(twamm.address, initialLiquidityProvided);
            await token1.transfer(twamm.address, initialLiquidityProvided);
            await twamm.mint(owner.address);

            // Give addr3 some token0 and token1
            await token0.transfer(addr3.address, initialAddr3Token0);
            await token1.transfer(addr3.address, initialAddr3Token1);
            // const addr3_token0_initial = await token0.balanceOf(addr3.address);
            // const addr3_token1_initial = await token1.balanceOf(addr3.address);
            // console.log(chalk.blue("addr3_token0_initial: ", (addr3_token0_initial.div(BIG18))));
            // console.log(chalk.blue("addr3_token1_initial: ", (addr3_token1_initial.div(BIG18))));
        });

        describe("Twamm execution frequency", function () {
            it("high frequency", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn.mul(2));
                await token0.connect(addr1).approve(twamm.address, amountIn.mul(2));
                await token1.transfer(addr1.address, amountIn.mul(2));
                await token1.connect(addr1).approve(twamm.address, amountIn.mul(2));


                // align so long term order will be on
                await alignBlockTimestamp(0)

                //trigger long term order
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 100);
                });

                // save the twammState here
                const twammState = await twammStateSnapshot(twamm)

                //move blocks forward, and execute virtual orders every time interval
                for (let i = 0; i <= 101; i++) {
                    await mineTimeIntervals(1);
                    await twamm.executeVirtualOrders(await getBlockTimestamp());
                }

                const beforeBalance0 = await token0.balanceOf(addr1.address);
                const beforeBalance1 = await token1.balanceOf(addr1.address);

                //withdraw proceeds
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                });

                // use the twamm state here
                const twammResults = await executeVirtualOrdersUntilTimestamp(twamm, (await getBlockTimestamp()), twammState);

                const afterBalance0 = await token0.balanceOf(addr1.address);
                const afterBalance1 = await token1.balanceOf(addr1.address);

                // console.log(twammResults)
                // console.log(`amountIn: ${ethers.utils.formatEther(amountIn)}`)
                // console.log(`beforeBalance0: ${ethers.utils.formatEther(beforeBalance0)}`)
                // console.log(`beforeBalance1: ${ethers.utils.formatEther(beforeBalance1)}`)
                // console.log(`afterBalance0: ${ethers.utils.formatEther(afterBalance0)}`)
                // console.log(`afterBalance1: ${ethers.utils.formatEther(afterBalance1)}`)

                expect(afterBalance0.sub(beforeBalance0)).to.be.closeTo(twammResults[2], 3)
                expect(afterBalance1.sub(beforeBalance1)).to.be.lt(twammResults[3], 3)

                //expect swap to work as expected
                // expect(beforeBalanceA).to.be.lt(afterBalanceA);
                // expect(beforeBalanceB).to.be.gt(afterBalanceB);
            });

            it("low frequency", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn.mul(2));
                await token0.connect(addr1).approve(twamm.address, amountIn.mul(2));
                await token1.transfer(addr1.address, amountIn.mul(2));
                await token1.connect(addr1).approve(twamm.address, amountIn.mul(2));

                //trigger long term order
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 100);
                });

                // save the twammState here
                const twammState = await twammStateSnapshot(twamm)

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(101)

                const beforeBalance0 = await token0.balanceOf(addr1.address);
                const beforeBalance1 = await token1.balanceOf(addr1.address);

                //withdraw proceeds
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                });

                // use the twamm state here
                const twammResults = await executeVirtualOrdersUntilTimestamp(twamm, (await getBlockTimestamp()), twammState);

                const afterBalance0 = await token0.balanceOf(addr1.address);
                const afterBalance1 = await token1.balanceOf(addr1.address);

                // console.log(twammResults)
                // console.log(`amountIn: ${ethers.utils.formatEther(amountIn)}`)
                // console.log(`beforeBalance0: ${ethers.utils.formatEther(beforeBalance0)}`)
                // console.log(`beforeBalance1: ${ethers.utils.formatEther(beforeBalance1)}`)
                // console.log(`afterBalance0: ${ethers.utils.formatEther(afterBalance0)}`)
                // console.log(`afterBalance1: ${ethers.utils.formatEther(afterBalance1)}`)

                expect(afterBalance0.sub(beforeBalance0)).to.be.closeTo(twammResults[2], 3)
                expect(afterBalance1.sub(beforeBalance1)).to.be.closeTo(twammResults[3], 3)

                //expect swap to work as expected
                // expect(beforeBalanceA).to.be.lt(afterBalanceA);
                // expect(beforeBalanceB).to.be.gt(afterBalanceB);
            });
        });

        describe("Fee update tests", function () {

            it("normal swap with fee change mid way", async function () {
                const amountIn0 = expandTo18Decimals(10 * multiplier);

                const amountIn0MinusFee = amountIn0.mul(getFee(testFee))
                const [token0Reserve, token1Reserve, blockTimestampLast, twammReserve0, twammReserve1] = await twamm.getTwammReserves();
                const expectedOut =
                    (token1Reserve
                        .mul(amountIn0MinusFee)
                        .div(token0Reserve.mul(10000).add(amountIn0MinusFee)));

                await token0.transfer(addr1.address, amountIn0);
                await token0.connect(addr1).transfer(twamm.address, amountIn0)
                await expect(twamm.connect(addr1).swap(0, expectedOut, addr1.address, '0x'))
                .to.emit(token1, 'Transfer')
                .withArgs(twamm.address, addr1.address, expectedOut)
                .to.emit(twamm, 'Swap')
                .withArgs(addr1.address, amountIn0, 0, 0, expectedOut, addr1.address)

                await expect(twamm.connect(addr1).setFee(88)).to.be.reverted; // fee to 0.88% but with user address
                await expect(twamm.connect(owner).setFee(88)).to.be.not.reverted; // using owner
                
                // uint amountInWithFee = amountIn * fee;
                // uint numerator = amountInWithFee * reserveOut;
                // uint denominator = (reserveIn * 10000) + amountInWithFee;
                // return numerator / denominator;

                const _amountIn0MinusFee = amountIn0.mul(getFee(88))
                const [token0Reserve_, token1Reserve_, blockTimestampLast_, twammReserve0_, twammReserve1_] = await twamm.getTwammReserves();

                const _expectedOut =
                    (token1Reserve_
                        .mul(_amountIn0MinusFee)
                        .div(token0Reserve_.mul(10000).add(_amountIn0MinusFee)));

                await token0.transfer(addr2.address, amountIn0);
                await token0.connect(addr2).transfer(twamm.address, amountIn0)
                await expect(twamm.connect(addr2).swap(0, _expectedOut, addr2.address, '0x'))
                .to.emit(token1, 'Transfer')
                .withArgs(twamm.address, addr2.address, _expectedOut)
                .to.emit(twamm, 'Swap')
                .withArgs(addr2.address, amountIn0, 0, 0, _expectedOut, addr2.address)
            })

        })

        describe("Long term swaps", function () {

            it("Single sided long term order behaves like normal swap", async function () {

                const amountIn0 = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn0);

                const amountIn0MinusFee = amountIn0.mul(getFee(testFee)).div(10000)

                //expected output
                let token0Reserve, token1Reserve, blockTimestampLast, twammReserve0, twammReserve1;
                [token0Reserve, token1Reserve, blockTimestampLast, twammReserve0, twammReserve1] = await twamm.getTwammReserves();
                const expectedOut =
                    token1Reserve
                        .mul(amountIn0MinusFee)
                        .div(token0Reserve.add(amountIn0MinusFee));

                //approve long term order transfer
                await token0.connect(addr1).approve(twamm.address, amountIn0);

                // align so long term order will be on
                await alignBlockTimestamp(0)

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFrom0To1(amountIn0, 2)

                //move blocks forward, and execute virtual orders
                const timeIntervalsToMoveForward = 3;
                await mineTimeIntervals(timeIntervalsToMoveForward);
                const newBlockTimestamp = await getBlockTimestamp();

                // get the amounts from the view
                const [
                    _reserve0,
                    _reserve1,
                    _lastVirtualOrderTimestamp,
                    _twammReserve0,
                    _twammReserve1
                ] = await twamm.getReserveAfterTwamm(newBlockTimestamp);

                await twamm.connect(addr1).executeVirtualOrders(newBlockTimestamp);

                [token0Reserve, token1Reserve, blockTimestampLast, twammReserve0, twammReserve1] = await twamm.getTwammReserves();

                // console.log(`token0Reserve: ${token0Reserve}`);
                // console.log(`token1Reserve: ${token1Reserve}`);
                // console.log(`blockTimestamp: ${await getBlockTimestamp()}`);
                // console.log(`twammReserve0: ${twammReserve0}`);
                // console.log(`twammReserve1: ${twammReserve1}`);
                //
                // console.log(`_reserve0: ${_reserve0}`);
                // console.log(`_reserve1: ${_reserve1}`);
                // console.log(`_lastVirtualOrderTimestamp: ${_lastVirtualOrderTimestamp}`);
                // console.log(`_twammReserve0: ${_twammReserve0}`);
                // console.log(`_twammReserve1: ${_twammReserve1}`);

                // current block timestamp should be atleast timeIntervalsToMoveForward
                expect(await getBlockTimestamp()).to.be.gte((parseInt(_lastVirtualOrderTimestamp) + (timeIntervalsToMoveForward * orderTimeInterval)));

                expect(token0Reserve).to.be.eq(_reserve0)
                expect(token1Reserve).to.be.eq(_reserve1)
                expect(twammReserve0).to.be.eq(_twammReserve0)
                expect(twammReserve1).to.be.eq(_twammReserve1)

                //withdraw proceeds
                const beforeBalanceB = await token1.balanceOf(addr1.address);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                const afterBalanceB = await token1.balanceOf(addr1.address);
                const actualOutput = afterBalanceB.sub(beforeBalanceB);

                //since we are breaking up order, match is not exact
                expect(actualOutput).to.be.closeTo(expectedOut, amountIn0.mul(1).div(10000000));

            });

            it("Single sided long term submitted amount too small", async function () {

                const amountIn0 = bigNumberify(15);
                const amountIn0MinusFee = amountIn0.mul(getFee(testFee)).div(1000)
                await token0.transfer(addr1.address, amountIn0);

                //trigger long term order
                await token0.connect(addr1).approve(twamm.address, amountIn0);
                await expect(twamm.connect(addr1).longTermSwapFrom0To1(amountIn0, 20000)).to.be.reverted;
            });

            it("Orders in both pools work as expected", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token1.transfer(addr2.address, amountIn);

                //trigger long term order
                await token0.connect(addr1).approve(twamm.address, amountIn);
                await token1.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 2);
                await twamm.connect(addr2).longTermSwapFrom1To0(amountIn, 2);

                // Try to skim token0 and token1 after initiating the TWAMM swap
                const addr3_token0_before = await token0.balanceOf(addr3.address);
                const addr3_token1_before = await token1.balanceOf(addr3.address);
                await twamm.connect(addr3).skim(addr3.address);
                const addr3_token0_after = await token0.balanceOf(addr3.address);
                const addr3_token1_after = await token1.balanceOf(addr3.address);
                expect(addr3_token0_before).to.equal(addr3_token0_after);
                expect(addr3_token1_before).to.equal(addr3_token1_after);

                // Try to mint LP after initiating the TWAMM swap
                const addr3_lp_bal_before = await twamm.balanceOf(addr3.address);
                await expect(twamm.connect(addr3).mint(addr3.address)).to.be.reverted;
                const addr3_lp_bal_after = await twamm.balanceOf(addr3.address);
                expect(addr3_lp_bal_before).to.equal(addr3_lp_bal_after);

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(3)

                //withdraw proceeds
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountToken0Bought = await token0.balanceOf(addr2.address);
                const amountToken1Bought = await token1.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                //including the fee
                expect(amountToken0Bought.add(amountToken1Bought).div(2)).to.be.closeTo(amountIn, amountIn.mul(998).div(1000))
            });

            it("Swap amounts are consistent with twamm formula", async function () {

                const token0In = expandTo18Decimals(10 * multiplier);
                const token1In = expandTo18Decimals(2 * multiplier);

                await token0.transfer(addr1.address, token0In);
                await token1.transfer(addr2.address, token1In);
                await token0.connect(addr1).approve(twamm.address, token0In);
                await token1.connect(addr2).approve(twamm.address, token1In);

                let token0ReserveRet, token1ReserveRet;
                [token0ReserveRet, token1ReserveRet] = await twamm.getReserves();

                const [
                    finalAReserveExpectedBN,
                    finalBReserveExpectedBN,
                    token0OutBN,
                    token1OutBN
                ] = calculateTwammExpectedFraxswap(token0In, token1In, token0ReserveRet, token1ReserveRet, 10, getFee(testFee))

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(token0In, 10);
                    await twamm.connect(addr2).longTermSwapFrom1To0(token1In, 10);
                })

                let token0ReserveRet_2, token1ReserveRet_2;
                [token0ReserveRet_2, token1ReserveRet_2] = await twamm.getReserves();
                const lp_supply = await twamm.totalSupply();
                const lp_price = ((token0ReserveRet_2.add(token1ReserveRet_2)).div(lp_supply)); // Assumes $1 each token
                // console.log("lp_supply: ", (lp_supply.div(BIG18)));
                // console.log("lp_price: ", lp_price);

                // Try to burn LP and extract token0 and token1 as a profit
                const owner_token0_before = await token0.balanceOf(owner.address);
                const owner_token1_before = await token1.balanceOf(owner.address);
                const owner_lp_bal_before = await twamm.balanceOf(owner.address);
                const owner_lp_bal_to_use = owner_lp_bal_before.div(1000); // Only will transfer a small sample
                // console.log("owner_token0_before: ", (owner_token0_before.div(BIG18)));
                // console.log("owner_token1_before: ", (owner_token1_before.div(BIG18)));
                // console.log("owner_lp_bal_before: ", (owner_lp_bal_before.div(BIG18)));
                await twamm.connect(owner).transfer(twamm.address, owner_lp_bal_to_use);
                await twamm.connect(owner).burn(owner.address);
                const owner_token0_after = await token0.balanceOf(owner.address);
                const owner_token1_after = await token1.balanceOf(owner.address);
                const owner_lp_bal_after = await twamm.balanceOf(owner.address);
                const owner_token0_diff = owner_token0_after.sub(owner_token0_before);
                const owner_token1_diff = owner_token1_after.sub(owner_token1_before);
                const owner_lp_diff = owner_lp_bal_after.sub(owner_lp_bal_before);
                // console.log("owner_token0_after: ", (owner_token0_after.div(BIG18)));
                // console.log("owner_token1_after: ", (owner_token1_after.div(BIG18)));
                // console.log("owner_lp_bal_after: ", (owner_lp_bal_after.div(BIG18)));
                // console.log("owner_token0_diff: ", owner_token0_diff.div(BIG18));
                // console.log("owner_token1_diff: ", owner_token1_diff.div(BIG18));
                // console.log("owner_lp_bal_diff: ", owner_lp_diff.div(BIG18));
                const lp_diff_value = owner_lp_diff.mul(lp_price).mul(-1).div(BIG18).toNumber();
                expect((owner_token0_diff.add(owner_token1_diff)).div(BIG18).toNumber()).to.be.closeTo(lp_diff_value, lp_diff_value / 100);

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(22)

                //withdraw proceeds
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                //make sure the order was marked as completed
                const addr1_det_orders_order0 = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 0, 1);
                // console.log("====== Address 1 [Order 0] ======");
                // console.log(util.inspect(addr1_det_orders_order0, false, null, true));
                expect(addr1_det_orders_order0[0].isComplete).to.be.eq(true);

                const amountToken0Bought = await token0.balanceOf(addr2.address);
                const amountToken1Bought = await token1.balanceOf(addr1.address);

                let [finalAReserveActual, finalBReserveActual] = await twamm.getReserves();

                const finalAReserveActualBN = bigNumberify(finalAReserveActual.toString());
                const finalBReserveActualBN = bigNumberify(finalBReserveActual.toString());

                // console.log(`finalAReserveActualBN: ${ethers.utils.formatEther(finalAReserveActualBN)}`)
                // console.log(`finalAReserveExpectedBN: ${ethers.utils.formatEther(finalAReserveExpectedBN)}`)
                // console.log(`finalBReserveActualBN: ${ethers.utils.formatEther(finalBReserveActualBN)}`)
                // console.log(`finalBReserveExpectedBN: ${ethers.utils.formatEther(finalBReserveExpectedBN)}`)
                //
                // console.log(`amountToken0Bought: ${ethers.utils.formatEther(amountToken0Bought)}`)
                // console.log(`token0OutBN: ${ethers.utils.formatEther(token0OutBN)}`)
                // console.log(`amountToken1Bought: ${ethers.utils.formatEther(amountToken1Bought)}`)
                // console.log(`token1OutBN: ${ethers.utils.formatEther(token1OutBN)}`)

                //expect results to be close to calculation
                expect(finalAReserveActualBN, outputErrorDiffPct(finalAReserveActualBN, finalAReserveExpectedBN)).to.be.closeTo(finalAReserveExpectedBN, finalAReserveExpectedBN.div(99));
                expect(finalBReserveActualBN, outputErrorDiffPct(finalBReserveActualBN, finalBReserveExpectedBN)).to.be.closeTo(finalBReserveExpectedBN, finalBReserveExpectedBN.div(99));

                expect(amountToken0Bought, outputErrorDiffPct(amountToken0Bought, token0OutBN)).to.be.closeTo(token0OutBN, token0OutBN.div(80));
                expect(amountToken1Bought, outputErrorDiffPct(amountToken1Bought, token1OutBN)).to.be.closeTo(token1OutBN, token1OutBN.div(80));
            });

            it("Multiple orders in both pools work as expected [normal]", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token1.transfer(addr2.address, amountIn);

                //trigger long term order
                await token0.connect(addr1).approve(twamm.address, amountIn);
                await token1.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn.div(2), 2);
                    await twamm.connect(addr2).longTermSwapFrom1To0(amountIn.div(2), 3);
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn.div(2), 4);
                    await twamm.connect(addr2).longTermSwapFrom1To0(amountIn.div(2), 5);
                });

                //print the full order info and test the offset and limit
                const addr1_det_orders_full = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 0, 99999);
                const addr1_det_orders_offset = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 1, 99999);
                const addr1_det_orders_limit = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 0, 1);
                const addr1_det_orders_both = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 1, 1);
                // console.log("====== Address 1 [Full] ======");
                // console.log(util.inspect(addr1_det_orders_full, false, null, true));
                // console.log("====== Address 1 [Offset] ======");
                // console.log(util.inspect(addr1_det_orders_offset, false, null, true));
                // console.log("====== Address 1 [Limit] ======");
                // console.log(util.inspect(addr1_det_orders_limit, false, null, true));
                // console.log("====== Address 1 [Offset & Limit] ======");
                // console.log(util.inspect(addr1_det_orders_both, false, null, true));


                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(6);

                const [
                    ammEndToken0,
                    ammEndToken1,
                    token0Out,
                    token1Out
                ] = await executeVirtualOrdersUntilTimestamp(twamm, await getBlockTimestamp())

                //withdraw proceeds
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(2);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(3);

                const amountToken0Bought = await token0.balanceOf(addr2.address);
                const amountToken1Bought = await token1.balanceOf(addr1.address);

                let [finalReserve0, finalReserve1] = await twamm.getReserves();

                // console.log(`ammEndToken0  ${ammEndToken0}`);
                // console.log(`finalReserve0 ${finalReserve0}`);
                // console.log(`ammEndToken1  ${ammEndToken1}`);
                // console.log(`finalReserve1 ${finalReserve1}`);
                // console.log(`token0Out          ${token0Out}`);
                // console.log(`amountToken0Bought ${amountToken0Bought}`);
                // console.log(`token1Out          ${token1Out}`);
                // console.log(`amountToken1Bought ${amountToken1Bought}`);

                expect(ammEndToken0).to.be.closeTo(finalReserve0, 3);
                expect(ammEndToken1).to.be.closeTo(finalReserve1, 3);
                expect(token0Out).to.be.closeTo(amountToken0Bought, 3);
                expect(token1Out).to.be.closeTo(amountToken1Bought, 3);

                //pool is balanced, and orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal minus the fees

                const val1 = amountToken0Bought.add(amountToken1Bought).div(2);
                const val2 = amountIn.mul(getFee(testFee)).div(10000)

                expect(val1,
                    outputErrorDiffPct(val1, val2)
                ).to.be.closeTo(val2, amountIn.mul(20).div(1000))

            });

            it("Multiple orders in both pools work as expected [mid-period activities]", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token1.transfer(addr2.address, amountIn);

                //trigger long term order
                await token0.connect(addr1).approve(twamm.address, amountIn);
                await token1.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn.div(2), 2);
                    await twamm.connect(addr2).longTermSwapFrom1To0(amountIn.div(2), 3);
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn.div(2), 4);
                    await twamm.connect(addr2).longTermSwapFrom1To0(amountIn.div(2), 5);
                });

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(3);

                // Call skim and sync midway to see if anything breaks
                await twamm.connect(addr3).skim(addr3.address);
                await twamm.connect(addr3).sync();

                // Vanilla UniV2 AMM swap 0 to 1
                const token0_in_swap = initialAddr3Token0.div(10000);
                await token0.connect(addr3).approve(router.address, token0_in_swap);
                const addr3_token0_before_swap = await token0.balanceOf(addr3.address);
                const addr3_token1_before_swap = await token1.balanceOf(addr3.address);
                await router.connect(addr3).swapExactTokensForTokens(token0_in_swap, 0, [token0.address, token1.address], addr3.address, 1946337480);
                const addr3_token0_after_swap = await token0.balanceOf(addr3.address);
                const addr3_token1_after_swap = await token1.balanceOf(addr3.address);
                const addr3_token0_diff_swap = addr3_token0_after_swap.sub(addr3_token0_before_swap);
                const addr3_token1_diff_swap = addr3_token1_after_swap.sub(addr3_token1_before_swap);
                // console.log("addr3_token0_after_swap: ", (addr3_token0_after_swap.div(BIG18)));
                // console.log("addr3_token1_after_swap: ", (addr3_token1_after_swap.div(BIG18)));
                // console.log("addr3_token0_diff_swap: ", addr3_token0_diff_swap.div(BIG18));
                // console.log("addr3_token1_diff_swap: ", addr3_token1_diff_swap.div(BIG18));

                // Call skim and sync midway to see if anything breaks
                await twamm.connect(addr3).skim(addr3.address);
                await twamm.connect(addr3).sync();

                // Address 3 adds some LP
                const token0_in_lp = initialAddr3Token0.div(10);
                const token1_in_lp = initialAddr3Token1.div(10);
                await token0.connect(addr3).approve(router.address, token0_in_lp);
                await token1.connect(addr3).approve(router.address, token1_in_lp);
                const addr3_token0_before_add = await token0.balanceOf(addr3.address);
                const addr3_token1_before_add = await token1.balanceOf(addr3.address);
                const addr3_lp_bal_before_add = await twamm.balanceOf(addr3.address);
                await router.connect(addr3).addLiquidity(token0.address, token1.address, token0_in_lp, token1_in_lp, 0, 0, addr3.address, 1946337480);
                const addr3_token0_after_add = await token0.balanceOf(addr3.address);
                const addr3_token1_after_add = await token1.balanceOf(addr3.address);
                const addr3_token0_diff_add = addr3_token0_after_add.sub(addr3_token0_before_add);
                const addr3_token1_diff_add = addr3_token1_after_add.sub(addr3_token1_before_add);
                const addr3_lp_bal_after_add = await twamm.balanceOf(addr3.address);
                const addr3_lp_diff_add = addr3_lp_bal_after_add.sub(addr3_lp_bal_before_add);
                // console.log("addr3_token0_after_add: ", (addr3_token0_after_add.div(BIG18)));
                // console.log("addr3_token1_after_add: ", (addr3_token1_after_add.div(BIG18)));
                // console.log("addr3_token0_diff_add: ", addr3_token0_diff_add.div(BIG18));
                // console.log("addr3_token1_diff_add: ", addr3_token1_diff_add.div(BIG18));
                // console.log("addr3_lp_diff_add: ", addr3_lp_diff_add.div(BIG18));

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(2);

                // Remove some LP
                const lp_remove_amt = addr3_lp_diff_add.div(3);
                await twamm.connect(addr3).approve(router.address, lp_remove_amt);
                const addr3_token0_before_rem = await token0.balanceOf(addr3.address);
                const addr3_token1_before_rem = await token1.balanceOf(addr3.address);
                const addr3_lp_bal_before_rem = await twamm.balanceOf(addr3.address);
                await router.connect(addr3).removeLiquidity(token0.address, token1.address, lp_remove_amt, 0, 0, addr3.address, 1946337480);
                const addr3_token0_after_rem = await token0.balanceOf(addr3.address);
                const addr3_token1_after_rem = await token1.balanceOf(addr3.address);
                const addr3_token0_diff_rem = addr3_token0_after_rem.sub(addr3_token0_before_rem);
                const addr3_token1_diff_rem = addr3_token1_after_rem.sub(addr3_token1_before_rem);
                const addr3_lp_bal_after_rem = await twamm.balanceOf(addr3.address);
                const addr3_lp_diff_rem = addr3_lp_bal_after_rem.sub(addr3_lp_bal_before_rem);
                // console.log("addr3_token0_after_rem: ", (addr3_token0_after_rem.div(BIG18)));
                // console.log("addr3_token1_after_rem: ", (addr3_token1_after_rem.div(BIG18)));
                // console.log("addr3_token0_diff_rem: ", addr3_token0_diff_rem.div(BIG18));
                // console.log("addr3_token1_diff_rem: ", addr3_token1_diff_rem.div(BIG18));
                // console.log("addr3_lp_diff_rem: ", addr3_lp_diff_rem.div(BIG18));

                await mineTimeIntervals(1);

                //withdraw proceeds
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(2);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(3);

                const amountToken0Bought = await token0.balanceOf(addr2.address);
                const amountToken1Bought = await token1.balanceOf(addr1.address);

                //pool is balanced, and orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal minus the fees

                const val1 = amountToken0Bought.add(amountToken1Bought).div(2);
                const val2 = amountIn.mul(getFee(testFee)).div(10000)

                expect(val1,
                    outputErrorDiffPct(val1, val2)
                ).to.be.closeTo(val2, amountIn.mul(20).div(1000))
            });

            it("Normal swap works as expected while long term orders are active", async function () {

                const amountIn = expandTo18Decimals(20 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token1.transfer(addr2.address, amountIn);

                //trigger long term order
                await token0.connect(addr1).approve(twamm.address, amountIn);
                await token1.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 10);
                    await twamm.connect(addr2).longTermSwapFrom1To0(amountIn, 10);
                });

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(3)

                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                    await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                });

                const amountToken0Bought = await token0.balanceOf(addr2.address);
                const amountToken1Bought = await token1.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountToken0Bought, outputErrorDiffPct(amountToken0Bought, amountToken1Bought)).to.be.closeTo(amountToken1Bought, amountIn.div(80))
            });
        });

        describe("Cancelling orders", function () {

            it("Order can be cancelled", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token0.connect(addr1).approve(twamm.address, amountIn);

                const amountToken0Before = await token0.balanceOf(addr1.address);
                const amountToken1Before = await token1.balanceOf(addr1.address);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 10);

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(3)
                await twamm.connect(addr1).cancelLongTermSwap(0);

                //make sure the order was marked as completed
                const addr1_det_orders_order0 = await twamm.connect(addr1).getDetailedOrdersForUser(addr1.address, 0, 1);
                // console.log("====== Address 1 [Order 0] ======");
                // console.log(util.inspect(addr1_det_orders_order0, false, null, true));
                expect(addr1_det_orders_order0[0].isComplete).to.be.eq(true);

                const amountToken0After = await token0.balanceOf(addr1.address);
                const amountToken1After = await token1.balanceOf(addr1.address);

                //expect some amount of the order to be filled
                expect(amountToken0Before).to.be.gt(amountToken0After);
                expect(amountToken1Before).to.be.lt(amountToken1After);
            });

        });

        describe("Partial withdrawal", function () {

            it("proceeds can be withdrawn while order is still active", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await token0.transfer(addr1.address, amountIn);
                await token0.connect(addr1).approve(twamm.address, amountIn);

                await token1.transfer(addr2.address, amountIn);
                await token1.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFrom0To1(amountIn, 10);

                //move blocks forward, and execute virtual orders
                await mineTimeIntervals(3)

                const amountInWithFee = bigNumberify(amountIn).mul(getFee(testFee)).div(1000);
                const numerator = amountInWithFee.mul(100029189);
                const denominator = bigNumberify(99971010).add(amountInWithFee);
                const amountOut = numerator.div(denominator);

                const beforeBalanceA = await token0.balanceOf(addr2.address);
                const beforeBalanceB = await token1.balanceOf(addr2.address);
                await token1.connect(addr2).transfer(twamm.address, amountIn);
                await (await twamm.connect(addr2).swap(amountOut, 0, addr2.address, '0x')).wait();
                const afterBalanceA = await token0.balanceOf(addr2.address);
                const afterBalanceB = await token1.balanceOf(addr2.address);

                //expect swap to work as expected
                expect(beforeBalanceA).to.be.lt(afterBalanceA);
                expect(beforeBalanceB).to.be.gt(afterBalanceB);
            });

        });

    });
});

describe("Multiple TWAMM Tests", function () {
    runOnce(30)
    allTwammTests(1, 30)
    allTwammTests(10, 30)
    allTwammTests(100, 30)
    allTwammTests(1000, 30)
    allTwammTests(2000, 30)
    allTwammTests(3000, 30)
    allTwammTests(4000, 30)
    allTwammTests(5000, 30)
    allTwammTests(6000, 30)
    allTwammTests(7000, 30)
    allTwammTests(8000, 30)
    allTwammTests(9000, 30)

    allTwammTests(1, 1)
    allTwammTests(10, 1)
    allTwammTests(100, 1)
    allTwammTests(1000, 1)
    allTwammTests(2000, 1)
    allTwammTests(3000, 1)
    allTwammTests(4000, 1)
    allTwammTests(5000, 1)
    allTwammTests(6000, 1)
    allTwammTests(7000, 1)
    allTwammTests(8000, 1)
    allTwammTests(9000, 1)

    allTwammTests(1, 5)
    allTwammTests(10, 5)
    allTwammTests(100, 5)
    allTwammTests(1000, 5)
    allTwammTests(2000, 5)
    allTwammTests(3000, 5)
    allTwammTests(4000, 5)
    allTwammTests(5000, 5)
    allTwammTests(6000, 5)
    allTwammTests(7000, 5)
    allTwammTests(8000, 5)
    allTwammTests(9000, 5)

    allTwammTests(1, 50)
    allTwammTests(10, 50)
    allTwammTests(100, 50)
    allTwammTests(1000, 50)
    allTwammTests(2000, 50)
    allTwammTests(3000, 50)
    allTwammTests(4000, 50)
    allTwammTests(5000, 50)
    allTwammTests(6000, 50)
    allTwammTests(7000, 50)
    allTwammTests(8000, 50)
    allTwammTests(9000, 50)

    allTwammTests(1, 100)
    allTwammTests(10, 100)
    allTwammTests(100, 100)
    allTwammTests(1000, 100)
    allTwammTests(2000, 100)
    allTwammTests(3000, 100)
    allTwammTests(4000, 100)
    allTwammTests(5000, 100)
    allTwammTests(6000, 100)
    allTwammTests(7000, 100)
    allTwammTests(8000, 100)
    allTwammTests(9000, 100)
})

async function mineBlocks(blockNumber) {
    for (let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}

async function mineTimeIntervals(timeIntervals) {

    // use this when it's ready from hardhat: https://github.com/NomicFoundation/hardhat/issues/1998#issuecomment-1046824743
    // await network.provider.send("hardhat_mine", [timeIntervals, 3600])

    let currTime = await getBlockTimestamp();
    const targetTime = currTime + (orderTimeInterval * timeIntervals);
    // mine blocks until targetTime is reached
    while (currTime <= targetTime) {
        // mine blocks as half orderTimeInterval
        await network.provider.send("evm_increaseTime", [parseInt(`${orderTimeInterval / 2}`)]);
        await network.provider.send("evm_mine");
        currTime = await getBlockTimestamp();
    }
}
