const { expect } = require("chai");
const { ethers } = require("hardhat");

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
    
    beforeEach(async function () {
        
        await network.provider.send("evm_setAutomine", [true]);
        [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

        const ERC20Factory =  await ethers.getContractFactory("ERC20MockTWAMM");
        tokenA = await ERC20Factory.deploy("TokenA", "TokenA", ERC20Supply);
        tokenB = await ERC20Factory.deploy("TokenB", "TokenB", ERC20Supply);

        const TWAMMFactory = await ethers.getContractFactory("TWAMM")

        twamm = await TWAMMFactory.deploy(
              "TWAMM" 
            , "TWAMM"
            , tokenA.address
            , tokenB.address
            , blockInterval);

        tokenA.approve(twamm.address, ERC20Supply);
        tokenB.approve(twamm.address, ERC20Supply);

        await twamm.provideInitialLiquidity(initialLiquidityProvided,initialLiquidityProvided);
    });

    describe("Basic AMM", function () {

        describe("Providing Liquidity", function () {

            it("Should mint correct number of LP tokens", async function () {

                const LPBalance = await twamm.balanceOf(owner.address);

                expect(LPBalance).to.eq(initialLiquidityProvided);
            });

            it("can't provide initial liquidity twice", async function () {

                const amount = 10000;
                await expect(
                    twamm.provideInitialLiquidity(amount,amount)
                ).to.be.revertedWith('liquidity has already been provided, need to call provideLiquidity');
            });

            it("LP token value is constant after mint", async function () {
                
                let totalSupply = await twamm.totalSupply();
                
                let tokenAReserve = await twamm.tokenAReserves();
                let tokenBReserve = await twamm.tokenBReserves();

                const initialTokenAPerLP = tokenAReserve / totalSupply;
                const initialTokenBPerLP = tokenBReserve / totalSupply;

                const newLPTokens = 10000;
                await twamm.provideLiquidity(newLPTokens);

                totalSupply = await twamm.totalSupply();
                
                tokenAReserve = await twamm.tokenAReserves();
                tokenBReserve = await twamm.tokenBReserves();

                const finalTokenAPerLP = tokenAReserve / totalSupply;
                const finalTokenBPerLP = tokenBReserve / totalSupply;

                expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
                expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
            });
        });

        describe("Removing Liquidity", function () {

            it("LP token value is constant after removing", async function () {
                
                let totalSupply = await twamm.totalSupply();
                
                let tokenAReserve = await twamm.tokenAReserves();
                let tokenBReserve = await twamm.tokenBReserves();

                const initialTokenAPerLP = tokenAReserve / totalSupply;
                const initialTokenBPerLP = tokenBReserve / totalSupply;

                const liquidityToRemove = initialLiquidityProvided / 2;
                await twamm.removeLiquidity(liquidityToRemove);

                totalSupply = await twamm.totalSupply();
                
                tokenAReserve = await twamm.tokenAReserves();
                tokenBReserve = await twamm.tokenBReserves();

                const finalTokenAPerLP = tokenAReserve / totalSupply;
                const finalTokenBPerLP = tokenBReserve / totalSupply;

                expect(finalTokenAPerLP).to.eq(initialTokenAPerLP);
                expect(finalTokenBPerLP).to.eq(initialTokenBPerLP);
            });

            it("can't remove more than available liquidity", async function () {
                
                let totalSupply = await twamm.totalSupply();
                
                const liquidityToRemove = initialLiquidityProvided * 2;


                await expect(
                    twamm.removeLiquidity(liquidityToRemove)
                ).to.be.revertedWith('not enough lp tokens available');                
            });
        });


        describe("Swapping", function () {

            it("swaps expected amount", async function () {
                const amountInA = ethers.utils.parseUnits("1");
                const tokenAReserve = await twamm.tokenAReserves();
                const tokenBReserve = await twamm.tokenBReserves();
                const expectedOutBeforeFees = 
                    tokenBReserve
                        .mul(amountInA)
                        .div(tokenAReserve.add(amountInA));

                //adjust for LP fee of 0.3%
                const expectedOutput = expectedOutBeforeFees.mul(1000 - 3).div(1000);

                const beforeBalanceB = await tokenB.balanceOf(owner.address);
                await twamm.swapFromAToB(amountInA);
                const afterBalanceB = await tokenB.balanceOf(owner.address);
                const actualOutput = afterBalanceB.sub(beforeBalanceB);

                expect(actualOutput).to.eq(expectedOutput);
            
            });
        });
    });

    describe("TWAMM Functionality ", function () {
        
        describe("Long term swaps", function () {

            it("Single sided long term order behaves like normal swap", async function () {

                const amountInA = 10000; 
                await tokenA.transfer(addr1.address, amountInA);
                
                //expected output
                const tokenAReserve = await twamm.tokenAReserves();
                const tokenBReserve = await twamm.tokenBReserves();
                const expectedOut = 
                    tokenBReserve
                        .mul(amountInA)
                        .div(tokenAReserve.add(amountInA));

                //trigger long term order
                tokenA.connect(addr1).approve(twamm.address, amountInA);
                await twamm.connect(addr1).longTermSwapFromAToB(amountInA, 2)
                
                //move blocks forward, and execute virtual orders
                await mineBlocks(3 * blockInterval)
                await twamm.executeVirtualOrders();

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
                await twamm.executeVirtualOrders();

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

                const tokenAIn = 10000;
                const tokenBIn = 2000;
                await tokenA.transfer(addr1.address, tokenAIn);
                await tokenB.transfer(addr2.address, tokenBIn);
                await tokenA.connect(addr1).approve(twamm.address, tokenAIn);
                await tokenB.connect(addr2).approve(twamm.address, tokenBIn);

                const tokenAReserve = (await twamm.tokenAReserves()).toNumber();
                const tokenBReserve = (await twamm.tokenBReserves()).toNumber();

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
                await twamm.executeVirtualOrders();

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                const finalAReserveActual = (await twamm.tokenAReserves());
                const finalBReserveActual = (await twamm.tokenBReserves());

                //expect results to be within 1% of calculation
                expect(finalAReserveActual.toNumber()).to.be.closeTo(finalAReserveExpected, finalAReserveExpected/100);
                expect(finalBReserveActual.toNumber()).to.be.closeTo(finalBReserveExpected, finalBReserveExpected/100);

                expect(amountABought.toNumber()).to.be.closeTo(tokenAOut, tokenAOut/100);
                expect(amountBBought.toNumber()).to.be.closeTo(tokenBOut, tokenBOut/100);
            });

            it("Multiple orders in both pools work as expected", async function () {

                const amountIn = 10000;
                await tokenA.transfer(addr1.address, amountIn);
                await tokenB.transfer(addr2.address, amountIn);
                
                //trigger long term order
                await tokenA.connect(addr1).approve(twamm.address, amountIn);
                await tokenB.connect(addr2).approve(twamm.address, amountIn);

                //trigger long term orders
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn/2, 2);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn/2, 3);
                await twamm.connect(addr1).longTermSwapFromAToB(amountIn/2, 4);
                await twamm.connect(addr2).longTermSwapFromBToA(amountIn/2, 5);

                //move blocks forward, and execute virtual orders
                await mineBlocks(6 * blockInterval)
                await twamm.executeVirtualOrders();

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
                await twamm.executeVirtualOrders();

                //withdraw proceeds 
                await twamm.connect(addr1).withdrawProceedsFromLongTermSwap(0);
                await twamm.connect(addr2).withdrawProceedsFromLongTermSwap(1);

                const amountABought = await tokenA.balanceOf(addr2.address);
                const amountBBought = await tokenB.balanceOf(addr1.address);

                //pool is balanced, and both orders execute same amount in opposite directions,
                //so we expect final balances to be roughly equal
                expect(amountABought).to.be.closeTo(amountBBought, amountIn / 100)          
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
                
                const beforeBalanceA = await tokenA.balanceOf(addr2.address);
                const beforeBalanceB = await tokenB.balanceOf(addr2.address);
                await twamm.connect(addr2).swapFromBToA(amountIn);
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
    for(let i = 0; i < blockNumber; i++) {
        await network.provider.send("evm_mine")
    }
}
