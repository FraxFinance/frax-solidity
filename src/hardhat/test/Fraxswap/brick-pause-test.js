const hre = require("hardhat");
const { expect } = require("chai");
const { ethers, network } = hre;
const { getContract } = require("./fraxswap-router/fraxswap-router-utils");
const { parseEther } = require("ethers/lib/utils");

let orderTimeInterval = 3600;

const ERC20Abi = require("../../artifacts/contracts/Fraxswap/core/FraxswapPair.sol/FraxswapPair").abi;

const RouterAbi = require("../../artifacts/contracts/Fraxswap/periphery/FraxswapRouter.sol/FraxswapRouter").abi;

async function getBlockTimestamp() { return (await ethers.provider.getBlock("latest")).timestamp; }

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

async function runwithImpersonation(userAddress, func) {
    const signerImpersonate = await ethers.getSigner(userAddress);

    await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [userAddress],
    });

    await func(signerImpersonate);

    await network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [userAddress],
    });
}

describe("Fraxswap Tests", async function () {

    beforeEach(async function () {

        const forkingUrl = hre.network.config?.forking?.url;

        if (!forkingUrl) {
            throw "forking url is not provided!"
        }

        // set fork to desired block
        const blockNumberToTest = 15289721;
        await network.provider.request({
            method: "hardhat_reset",
            params: [
                {
                    forking: {
                        jsonRpcUrl: forkingUrl,
                        blockNumber: blockNumberToTest,
                    },
                },
            ],
        });
    })

    it("Test Pause - cancel existing order", async function () {

        const frax = await getContract('', ERC20Abi, ethers.provider.getSigner());

        const fraxPair = await getContract('0x8206412c107eF1aDb70B9277974f5163760E128E', ERC20Abi, ethers.provider.getSigner());
        // const fraxswapRouter = await getContract('0x8206412c107eF1aDb70B9277974f5163760E128E', ERC20Abi, ethers.provider.getSigner());

        // pause twamm for frax/fxs pair
        await runwithImpersonation('0x6a7efa964cf6d9ab3bc3c47ebddb853a8853c502', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.togglePauseNewSwaps();
            await fraxPairWithSigner.togglePauseNewSwaps({ gasLimit: estGas });
        })

        // output the paused state
        console.log('newSwapsPaused', await fraxPair.newSwapsPaused())

        // cancel twamm
        await runwithImpersonation('0xf286E07ED6889658A3285C05C4f736963cF41456', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.cancelLongTermSwap(98);
            await fraxPairWithSigner.cancelLongTermSwap(98, { gasLimit: estGas });
        })

    })

    it("Test Pause - withdraw expired order", async function () {

        const frax = await getContract('', ERC20Abi, ethers.provider.getSigner());

        const fraxPair = await getContract('0x8206412c107eF1aDb70B9277974f5163760E128E', ERC20Abi, ethers.provider.getSigner());
        // const fraxswapRouter = await getContract('0x8206412c107eF1aDb70B9277974f5163760E128E', ERC20Abi, ethers.provider.getSigner());

        // pause twamm for frax/fxs pair
        await runwithImpersonation('0x6a7efa964cf6d9ab3bc3c47ebddb853a8853c502', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.togglePauseNewSwaps();
            await fraxPairWithSigner.togglePauseNewSwaps({ gasLimit: estGas });
        })

        // output the paused state
        console.log('newSwapsPaused', await fraxPair.newSwapsPaused())

        // withdraw twamm
        await runwithImpersonation('0x8E135A49282863157BdB05063a54FE26DBDD2628', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.withdrawProceedsFromLongTermSwap(3);
            await fraxPairWithSigner.withdrawProceedsFromLongTermSwap(3, { gasLimit: estGas });
        })

    })

    it("Brick TWAMM - Pause and Recover", async function () {
        // FXS/FPI Pair with no active twamms
        const fraxPair = await getContract('0x843B5Ae5861362F20A3aC185A2dD2393D7526C65', ERC20Abi, ethers.provider.getSigner());
        const fxs = await getContract('0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0', ERC20Abi, ethers.provider.getSigner())

        let orderId;
        // add large twamm order for FXS to FPI
        await runwithImpersonation('0xf977814e90da44bfa03b6295a0616a897441acec', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const fxsWithSigner = fxs.connect(signerImpersonate);
            const amountIn = parseEther('10000')

            const estGas1 = await fxsWithSigner.estimateGas.approve(fraxPairWithSigner.address, amountIn);
            await fxsWithSigner.approve(fraxPairWithSigner.address, amountIn, { gasLimit: estGas1 });

            const estGas2 = await fraxPairWithSigner.estimateGas.longTermSwapFrom0To1(amountIn, 1);
            orderId = await fraxPairWithSigner.getNextOrderID(); // next order id
            await fraxPairWithSigner.longTermSwapFrom0To1(amountIn, 1, { gasLimit: estGas2 });
        })

        // get expiry for order
        const { expirationTimestamp } = await fraxPair.getTwammOrder(orderId, { gasLimit: 5000000 })

        // mine passed the expiry
        await mineTimeIntervals(2)

        // execute virtual order on the expiry
        const estGas1 = await fraxPair.estimateGas.executeVirtualOrders(expirationTimestamp)
        await fraxPair.executeVirtualOrders(expirationTimestamp, { gasLimit: estGas1 }); // BRICK

        // mint 1 interval (1hr)
        await mineTimeIntervals(1)

        let currTimestamp = await getBlockTimestamp()

        // execute virtual order should fail
        const estGas2 = await fraxPair.estimateGas.executeVirtualOrders(expirationTimestamp)
        await expect(fraxPair.executeVirtualOrders(currTimestamp, { gasLimit: estGas2 * 2 })).to.be.reverted; // FAIL

        // pause twamm for fxs/fpi pair
        await runwithImpersonation('0x6a7efa964cf6d9ab3bc3c47ebddb853a8853c502', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.togglePauseNewSwaps();
            await fraxPairWithSigner.togglePauseNewSwaps({ gasLimit: estGas });
        })

        // output the paused state
        console.log('newSwapsPaused', await fraxPair.newSwapsPaused())

        // withdraw twamm
        await runwithImpersonation('0xf977814e90da44bfa03b6295a0616a897441acec', async (signerImpersonate) => {
            const fraxPairWithSigner = fraxPair.connect(signerImpersonate);
            const estGas = await fraxPairWithSigner.estimateGas.withdrawProceedsFromLongTermSwap(orderId);
            await fraxPairWithSigner.withdrawProceedsFromLongTermSwap(orderId, { gasLimit: estGas });
        })

    });

})