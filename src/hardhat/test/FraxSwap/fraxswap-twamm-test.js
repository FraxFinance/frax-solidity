const {expect} = require("chai");
const {ethers} = require("hardhat");
const uniswapV2PairV8 = require('../../artifacts/contracts/Uniswap_V2_V8/core/UniswapV2PairV8.sol/UniswapV2PairV8');
const {bigNumberify, expandTo18Decimals} = require('./utilities');
const {calculateTwammExpected} = require('./twamm-utils')

async function getBlockNumber() {
    return (await ethers.provider.getBlock("latest")).number
}

function outputErrorDiffPct(A, B) {
    const bigger = A > B ? A : B;
    const smaller = A < B ? A : B;
    return `diff: ${ethers.utils.formatUnits(bigger.mul(10000).div(smaller).sub(10000), 2)} %`
}

function outputRatio(A, B) {
    return ethers.utils.formatUnits(A.mul(10000).div(B), 4)
}

const transactionInSingleBlock = async (func) => {
    await network.provider.send("evm_setAutomine", [false]);
    await func();
    await network.provider.send("evm_setAutomine", [true]);
    await network.provider.send("evm_mine")
}

const initialLiquidityProvided = expandTo18Decimals(100000);

const allTwammTests = (multiplier) => describe(`TWAMM - swap multiplier: ${multiplier} longterm swap ratio: ${outputRatio(expandTo18Decimals(10 * multiplier), initialLiquidityProvided)}`, function () {

    let tokenA;
    let tokenB;

    let twamm;

    let owner;
    let addr1;
    let addr2;
    let addrs;

    let blockInterval = 10;

    const ERC20Supply = expandTo18Decimals(1e22);


    describe("Whitelist", function () {
        beforeEach(async function () {
            [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(false, false);
            token0 = setupCnt.token0;
            token1 = setupCnt.token1;
            factory = setupCnt.factory;

        });
        it("Users are not able to use twamm until after disabling", async function () {

            await factory.createPair(token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted; // anyone can call this function

            await twamm.disableWhitelist();

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted;
        });
        it("Factory toggle works on existing pairs", async function () {

            await factory.createPair(token0.address, token1.address);
            let pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted; // anyone can call this function

            pairAddress = await factory.allPairs(0);
            twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);
            await twamm.disableWhitelist();

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted;
        });
        it("Factory toggle works on new pairs", async function () {

            await factory.createPair(token0.address, token1.address);
            let pairAddress = await factory.allPairs(0);
            let twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);
            await twamm.disableWhitelist();

            pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted;

        });
    });

    describe("TWAMM Functionality ", function () {

        beforeEach(async function () {

            [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

            let setupCnt = await setupContracts(true);
            tokenA = setupCnt.token0;
            tokenB = setupCnt.token1;
            factory = setupCnt.factory;
            twamm = setupCnt.pair;

            const [
                token0Rate,
                token1Rate,
                lastVirtualOrderBlock,
                orderBlockInterval,
                rewardFactorPool0,
                rewardFactorPool1
            ] = await twamm.getTwammState(await getBlockNumber())

            blockInterval = orderBlockInterval;

            await twamm.disableWhitelist();

            tokenA.approve(twamm.address, ERC20Supply);
            tokenB.approve(twamm.address, ERC20Supply);

            //provide initial liquidity
            await tokenA.transfer(twamm.address, initialLiquidityProvided)
            await tokenB.transfer(twamm.address, initialLiquidityProvided)
            await twamm.mint(owner.address)
        });

        describe("Long term swaps", function () {

            it("Single sided long term order behaves like normal swap", async function () {

                const amountInA = expandTo18Decimals(10 * multiplier);
                await tokenA.transfer(addr1.address, amountInA);

                const amountInAMinusFee = amountInA.mul(997).div(1000)

                //expected output
                let tokenAReserve, tokenBReserve;
                [tokenAReserve, tokenBReserve] = await twamm.getReserves();
                const expectedOut =
                    tokenBReserve
                        .mul(amountInAMinusFee)
                        .div(tokenAReserve.add(amountInAMinusFee));

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountInA);
                await twamm.connect(addr1).longTermSwapFromAToB(amountInA, 2)

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                const beforeBalanceB = await tokenB.balanceOf(addr1.address);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                const afterBalanceB = await tokenB.balanceOf(addr1.address);
                const actualOutput = afterBalanceB.sub(beforeBalanceB);

                //since we are breaking up order, match is not exact
                expect(actualOutput).to.be.closeTo(expectedOut, amountInA.mul(1).div(10000000));

            });

            it("Single sided long term submitted amount too small", async function () {

                const amountInA = bigNumberify(15);
                const amountInAMinusFee = amountInA.mul(997).div(1000)
                await tokenA.transfer(addr1.address, amountInA);

                //expected output
                let tokenAReserve, tokenBReserve;
                [tokenAReserve, tokenBReserve] = await twamm.getReserves();
                const expectedOut =
                    tokenBReserve
                        .mul(amountInAMinusFee)
                        .div(tokenAReserve.add(amountInAMinusFee));

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountInA);
                await expect(twamm.connect(addr1).longTermSwapFromAToB(amountInA, 2)).to.be.reverted;
            });

            it("Orders in both pools work as expected", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 2);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn, 2);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                //including the fee
                expect(amountABought.add(amountBBought).div(2)).to.be.closeTo(amountIn, amountIn.mul(998).div(1000))
            });

            it("Swap amounts are consistent with twamm formula", async function () {

                const tokenAIn = expandTo18Decimals(10 * multiplier);
                const tokenBIn = expandTo18Decimals(2 * multiplier);

                await tokenA.transfer(addr1.address, tokenAIn);
                await tokenB.transfer(addr2.address, tokenBIn);
                await tokenA.connect(addr1).approve(twamm.address, tokenAIn);
                await tokenB.connect(addr2).approve(twamm.address, tokenBIn);

                let tokenAReserveRet, tokenBReserveRet;
                [tokenAReserveRet, tokenBReserveRet] = await twamm.getReserves();

                const [
                    finalAReserveExpectedBN,
                    finalBReserveExpectedBN,
                    tokenAOutBN,
                    tokenBOutBN
                ] = calculateTwammExpected(tokenAIn, tokenBIn, tokenAReserveRet, tokenBReserveRet)

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFromAToB(tokenAIn, 10);
                    await twamm.connect(addr2).longTermSwapFromBToA(tokenBIn, 10);
                })

                //move blocks forward, and execute virtual orders
                await mineBlocks(22 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                let [finalAReserveActual, finalBReserveActual] = await twamm.getReserves();

                const finalAReserveActualBN = bigNumberify(finalAReserveActual.toString());
                const finalBReserveActualBN = bigNumberify(finalBReserveActual.toString());

                //expect results to be close to calculation
                expect(finalAReserveActualBN, outputErrorDiffPct(finalAReserveActualBN, finalAReserveExpectedBN)).to.be.closeTo(finalAReserveExpectedBN, finalAReserveExpectedBN.div(99));
                expect(finalBReserveActualBN, outputErrorDiffPct(finalBReserveActualBN, finalBReserveExpectedBN)).to.be.closeTo(finalBReserveExpectedBN, finalBReserveExpectedBN.div(99));

                expect(amountABought, outputErrorDiffPct(amountABought, tokenAOutBN)).to.be.closeTo(tokenAOutBN, tokenAOutBN.div(80));
                expect(amountBBought, outputErrorDiffPct(amountBBought, tokenBOutBN)).to.be.closeTo(tokenBOutBN, tokenBOutBN.div(80));
            });

            it("Multiple orders in both pools work as expected", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFromAToB(amountIn.div(2), 2);
                    await twamm.connect(addr2).longTermSwapFromBToA(amountIn.div(2), 3);
                    await twamm.connect(addr1).longTermSwapFromAToB(amountIn.div(2), 4);
                    await twamm.connect(addr2).longTermSwapFromBToA(amountIn.div(2), 5);
                });

                //move blocks forward, and execute virtual orders
                await mineBlocks(6 * blockInterval);
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(2);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(3);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal minus the fees
                expect(amountABought.add(amountBBought).div(2),
                    outputErrorDiffPct(amountABought.add(amountBBought).div(2), amountIn.mul(997).div(1000))
                ).to.be.closeTo(amountIn.mul(997).div(1000), amountIn.div(1000))
            });

            it("Normal swap works as expected while long term orders are active", async function () {

                const amountIn = expandTo18Decimals(20 * multiplier);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 10);
                    await twamm.connect(addr2).longTermSwapFromBToA(amountIn, 10);
                });

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                await transactionInSingleBlock(async () => {
                    await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                    await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                });

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought, outputErrorDiffPct(amountABought, amountBBought)).to.be.closeTo(amountBBought, amountIn.div(80))
            });
        });


        describe("Cancelling orders", function () {

            it("Order can be cancelled", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenA.connect(addr1).approve(twamm.address, amountIn);

                const amountABefore = await tokenA.balanceOf(addr1.address);
                const amountBBefore = await tokenB.balanceOf(addr1.address);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 10);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.connect(addr1).cancelLongTermSwap(0);

                const amountAAfter = await tokenA.balanceOf(addr1.address);
                const amountBAfter = await tokenB.balanceOf(addr1.address);

                //expect some amount of the order to be filled
                expect(amountABefore).to.be.gt(amountAAfter);
                expect(amountBBefore).to.be.lt(amountBAfter);
            });

        });

        describe("partial withdrawal", function () {

            it("proceeds can be withdrawn while order is still active", async function () {

                const amountIn = expandTo18Decimals(10 * multiplier);
                await tokenA.transfer(addr1.address, amountIn);
                await tokenA.connect(addr1).approve(twamm.address, amountIn);

                await tokenB.transfer(addr2.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 10);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)

                const amountInWithFee = bigNumberify(amountIn).mul(997).div(1000);
                const numerator = amountInWithFee.mul(100029189);
                const denominator = bigNumberify(99971010).add(amountInWithFee);
                const amountOut = numerator.div(denominator);

                const beforeBalanceA = await tokenA.balanceOf(addr2.address);
                const beforeBalanceB = await tokenB.balanceOf(addr2.address);
                await tokenB.connect(addr2).transfer(twamm.address, amountIn);
                await (await twamm.connect(addr2).swap(amountOut, 0, addr2.address, '0x')).wait();
                const afterBalanceA = await tokenA.balanceOf(addr2.address);
                const afterBalanceB = await tokenB.balanceOf(addr2.address);

                //expect swap to work as expected
                expect(beforeBalanceA).to.be.lt(afterBalanceA);
                expect(beforeBalanceB).to.be.gt(afterBalanceB);
            });

        });

    });

    async function setupContracts(createPair = true) {
        const [owner, user1, user2, user3] = await ethers.getSigners();

        // Deploy token0/token1 token and distribute
        const DummyToken = await ethers.getContractFactory("contracts/Uniswap_V2_V8/periphery/test/ERC20PeriTest.sol:ERC20PeriTest");
        let token0 = await DummyToken.deploy(ERC20Supply);
        let token1 = await DummyToken.deploy(ERC20Supply);
        const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();

        if (token1.address.toUpperCase() < token0.address.toUpperCase()) {
            var temp = token1;
            token1 = token0;
            token0 = temp;
        }

        const FraxswapFactory = await ethers.getContractFactory("UniswapV2FactoryV8");
        const factory = await FraxswapFactory.deploy(owner.address);
        await factory.deployed();

        let pair;
        if (createPair) {
            await factory.createPair(token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            pair = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);
        }

        const FraxswapRouter = await ethers.getContractFactory("UniswapV2Router02V8");
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
});

describe("Multiple TWAMM Tests", function () {
    allTwammTests(1)
    allTwammTests(10)
    allTwammTests(100)
    allTwammTests(1000)
    allTwammTests(2000)
    allTwammTests(3000)
    allTwammTests(4000)
    allTwammTests(5000)
    allTwammTests(6000)
    allTwammTests(7000)
    allTwammTests(8000)
    allTwammTests(9000)
})


async function mineBlocks(blockNumber) {
    for (let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}
