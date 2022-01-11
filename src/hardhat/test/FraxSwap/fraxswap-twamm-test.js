const {expect} = require("chai");
const {ethers} = require("hardhat");
const uniswapV2PairV8 = require('../../artifacts/contracts/Uniswap_V2_V8/core/UniswapV2PairV8.sol/UniswapV2PairV8');
const {
    bigNumberify
} = require('./utilities');

async function getBlockNumber() {
    return (await ethers.provider.getBlock("latest")).number
}

describe("TWAMM", function () {

    let tokenA;
    let tokenB;

    let twamm;

    let owner;
    let addr1;
    let addr2;
    let addrs;

    const blockInterval = 10;

    const initialLiquidityProvided = 100000000;
    const ERC20Supply = ethers.utils.parseUnits("100");


    // describe("Basic AMM", function () {

    //     describe("Providing Liquidity", function () {

    //         it("Should mint correct number of LP tokens", async function () {

    //             const LPBalance = await twamm.balanceOf(owner.address);

    //             expect(LPBalance).to.eq(initialLiquidityProvided);
    //             //Currently doesn't subtract out MINIMUM_LIQUIDITY = 10 ** 3
    //         });

    //         it("can't provide initial liquidity twice", async function () {

    //             const amount = 10000;
    //             await tokenA.transfer(twamm.address, amount);
    //             await tokenB.transfer(twamm.address, amount);
    //             await expect(
    //                 twamm.mint(owner.address)
    //             ).to.be.revertedWith('EC4');
    //             //No longer relevant
    //         });

    //     //     it("LP token value is constant after mint", async function () {

    //     //         let totalSupply = await twamm.totalSupply();

    //     //         let tokenAReserve, tokenBReserve;
    //     //         [tokenAReserve, tokenBReserve] = await twamm.getReserves();

    //     //         const initialTokenAPerLP = tokenAReserve / totalSupply;
    //     //         const initialTokenBPerLP = tokenBReserve / totalSupply;

    //     //         const newLPTokens = 10000;
    //     //         await twamm.mint(newLPTokens);

    //     //         totalSupply = await twamm.totalSupply();

    //     //         tokenAReserve = await twamm.tokenAReserves();
    //     //         tokenBReserve = await twamm.tokenBReserves();

    //     //         const finalTokenAPerLP = tokenAReserve / totalSupply;
    //     //         const finalTokenBPerLP = tokenBReserve / totalSupply;

    //     //         expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
    //     //         expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
    //     //     });
    //     // });

    //     // describe("Removing Liquidity", function () {

    //     //     it("LP token value is constant after removing", async function () {

    //     //         let totalSupply = await twamm.totalSupply();

    //     //         let tokenAReserve = await twamm.tokenAReserves();
    //     //         let tokenBReserve = await twamm.tokenBReserves();

    //     //         const initialTokenAPerLP = tokenAReserve / totalSupply;
    //     //         const initialTokenBPerLP = tokenBReserve / totalSupply;

    //     //         const liquidityToRemove = initialLiquidityProvided / 2;
    //     //         await twamm.removeLiquidity(liquidityToRemove);

    //     //         totalSupply = await twamm.totalSupply();

    //     //         tokenAReserve = await twamm.tokenAReserves();
    //     //         tokenBReserve = await twamm.tokenBReserves();

    //     //         const finalTokenAPerLP = tokenAReserve / totalSupply;
    //     //         const finalTokenBPerLP = tokenBReserve / totalSupply;

    //     //         expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
    //     //         expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
    //     //     });

    //     //     it("can't remove more than available liquidity", async function () {

    //     //         let totalSupply = await twamm.totalSupply();

    //     //         const liquidityToRemove = initialLiquidityProvided * 2;


    //     //         await expect(
    //     //             twamm.removeLiquidity(liquidityToRemove)
    //     //         ).to.be.revertedWith('EC2');
    //     //     });
    //     // });


    //     // describe("Swapping", function () {

    //     //     it("swaps expected amount", async function () {
    //     //         const amountInA = ethers.utils.parseUnits("1");
    //     //         const tokenAReserve = await twamm.tokenAReserves();
    //     //         const tokenBReserve = await twamm.tokenBReserves();
    //     //         const expectedOutBeforeFees =
    //     //             tokenBReserve
    //     //                 .mul(amountInA)
    //     //                 .div(tokenAReserve.add(amountInA));

    //     //         //adjust for LP fee of 0.3%
    //     //         const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);

    //     //         const beforeBalanceB = await tokenB.balanceOf(owner.address);
    //     //         await twamm.swapFromAToB(amountInA);
    //     //         const afterBalanceB = await tokenB.balanceOf(owner.address);
    //     //         const actualOutput = afterBalanceB.sub(beforeBalanceB);

    //     //         expect(actualOutput).to.eq(expectedOutput);

    //     //     });
    //     });
    // });
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
            ).to.be.revertedWith('EC5');

            await twamm.disableWhitelist();

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted;
        });
        it("Factory toggle works on existing pairs", async function () {

            await factory.createPair(token0.address, token1.address);
            const pairAddress = await factory.getPair(token0.address, token1.address);
            twamm = new ethers.Contract(pairAddress, uniswapV2PairV8.abi).connect(owner);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.be.revertedWith('EC5');

            await factory.removeTwammWhitelists(0, 1);

            await expect(
                twamm.connect(addr1).executeVirtualOrders(await getBlockNumber())
            ).to.not.be.reverted;
        });
        it("Factory toggle works on new pairs", async function () {

            await factory.createPair(token0.address, token1.address);
            await factory.removeTwammWhitelists(0, 1);

            const pairAddress = await factory.getPair(token0.address, token1.address);
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

                const amountInA = 10000;
                await tokenA.transfer(addr1.address, amountInA);

                //expected output
                let tokenAReserve, tokenBReserve;
                [tokenAReserve, tokenBReserve] = await twamm.getReserves();
                const expectedOut =
                    tokenBReserve
                        .mul(amountInA)
                        .div(tokenAReserve.add(amountInA));

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
                expect(actualOutput).to.be.closeTo(expectedOut, ethers.utils.parseUnits('100', 'wei'));

            });

            it("Orders in both pools work as expected", async function () {

                const amountIn = ethers.BigNumber.from(10000);
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
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)
            });

            it("Swap amounts are consistent with twamm formula", async function () {

                const tokenAIn = 10000 * 997 / 1000;
                const tokenBIn = 2000 * 997 / 1000;
                await tokenA.transfer(addr1.address, tokenAIn);
                await tokenB.transfer(addr2.address, tokenBIn);
                await tokenA.connect(addr1).approve(twamm.address, tokenAIn);
                await tokenB.connect(addr2).approve(twamm.address, tokenBIn);

                let tokenAReserve, tokenBReserve;
                [tokenAReserve, tokenBReserve] = await twamm.getReserves();

                const k = tokenAReserve * tokenBReserve;
                const c = (
                    Math.sqrt(tokenAReserve * tokenBIn) - Math.sqrt(tokenBReserve * tokenAIn)
                ) / (
                    Math.sqrt(tokenAReserve * tokenBIn) + Math.sqrt(tokenBReserve * tokenAIn)
                );

                const exponent = 2 * Math.sqrt(tokenAIn * tokenBIn / k);

                const finalAReserveExpected = (
                    Math.sqrt(k * tokenAIn / tokenBIn)
                    * (Math.exp(exponent) + c)
                    / (Math.exp(exponent) - c)
                )

                const finalBReserveExpected = k / finalAReserveExpected;

                const tokenAOut = Math.abs(tokenAReserve - finalAReserveExpected + tokenAIn);
                const tokenBOut = Math.abs(tokenBReserve - finalBReserveExpected + tokenBIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFromAToB(tokenAIn, 2);
                await twamm.connect(addr2).longTermSwapFromBToA(tokenBIn, 2);

                //move blocks forward, and execute virtual orders
                await mineBlocks(22 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                // const finalAReserveActual = (await twamm.tokenAReserves());
                // const finalBReserveActual = (await twamm.tokenBReserves());

                let [finalAReserveActual, finalBReserveActual] = await twamm.getReserves();

                //expect results to be close to calculation
                expect(finalAReserveActual.toNumber()).to.be.closeTo(finalAReserveExpected, finalAReserveExpected / 99);
                expect(finalBReserveActual.toNumber()).to.be.closeTo(finalBReserveExpected, finalBReserveExpected / 99);

                expect(amountABought.toNumber()).to.be.closeTo(tokenAOut, tokenAOut / 80);
                expect(amountBBought.toNumber()).to.be.closeTo(tokenBOut, tokenBOut / 80);
            });

            it("Multiple orders in both pools work as expected", async function () {

                const amountIn = 10000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn / 2, 2);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn / 2, 3);
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn / 2, 4);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn / 2, 5);

                //move blocks forward, and execute virtual orders
                await mineBlocks(6 * blockInterval)
                await twamm.connect(addr1).executeVirtualOrders(await getBlockNumber());

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(2);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(3);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)
            });

            it("Normal swap works as expected while long term orders are active", async function () {

                const amountIn = 10000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);

                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 10);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn, 10);

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
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 80)
            });
        });


        describe("Cancelling orders", function () {

            it("Order can be cancelled", async function () {

                const amountIn = 100000;
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

                const amountIn = 100000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenA.connect(addr1).approve(twamm.address, amountIn);

                await tokenB.transfer(addr2.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term order
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn, 10);

                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)

                const amountInWithFee = bigNumberify(amountIn).mul(997).div(1000);
                const numerator = amountInWithFee.mul(100028179);
                const denominator = bigNumberify(99971916).add(amountInWithFee);
                const amountOut = numerator.div(denominator);

                const beforeBalanceA = await tokenA.balanceOf(addr2.address);
                const beforeBalanceB = await tokenB.balanceOf(addr2.address);
                await tokenB.connect(addr2).transfer(twamm.address, amountIn);
                await twamm.connect(addr2).swap(0, amountOut, addr2.address, '0x');
                const afterBalanceA = await tokenA.balanceOf(addr2.address);
                const afterBalanceB = await tokenB.balanceOf(addr2.address);

                //expect swap to work as expected
                expect(beforeBalanceA).to.be.lt(afterBalanceA);
                expect(beforeBalanceB).to.be.gt(afterBalanceB);
            });

        });


    });
});

async function mineBlocks(blockNumber) {
    for (let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}

async function setupContracts(createPair = true, deployDTT = false) {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy token0/token1 token and distribute
    const DummyToken = await ethers.getContractFactory("contracts/Uniswap_V2_V8/periphery/test/ERC20PeriTest.sol:ERC20PeriTest");
    let token0 = await DummyToken.deploy("10000000000000000000000");
    let token1 = await DummyToken.deploy("10000000000000000000000");
    const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();

    let deflatingERC20;
    if (deployDTT) {
        deflatingERC20 = await (await ethers.getContractFactory(
            "contracts/Uniswap_V2_V8/periphery/test/DeflatingERC20.sol:DeflatingERC20"
        )).deploy(expandTo18Decimals(10000));
        await deflatingERC20.transfer(user1.address, expandTo18Decimals(10000));
    }

    if (token1.address.toUpperCase() < token0.address.toUpperCase()) {
        var temp = token1;
        token1 = token0;
        token0 = temp;
    }
    // await token0.transfer(owner.address, "10000000000000000000000");
    // await token1.transfer(owner.address, "10000000000000000000000");
    // await token0.transfer(user2.address, "10000000000000000000");
    // await token1.transfer(user2.address, "10000000000000000000");
    // await token0.transfer(user3.address, "10000000000000000000");
    // await token1.transfer(user3.address, "10000000000000000000");

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
        deflatingERC20,
        factory,
        pair,
        router
    }
}