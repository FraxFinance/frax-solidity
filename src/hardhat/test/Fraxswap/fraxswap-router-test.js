// const {expect} = require("chai");
const hre = require("hardhat");
const { ethers, network } = hre;
const { constants, BigNumber, utils } = require("ethers");
const { defaultAbiCoder } = utils;
const fse = require("fs-extra");
const {
  bigNumberify,
  expandTo18Decimals,
  encodePrice,
  getCreate2Address,
  getApprovalDigest,
} = require("./utilities");
const {
  getContract,
  getCurvePools,
  getSaddlePools,
  getFraxswapPools,
  getFraxswapV2Pools,
  getUniswapV2Pools,
  getSushiSwapPools,
  getUniswapV3Pools,
  generateEncodedCurveRoute,
  generateEncodedCurveRouteV2,
  generateEncodedSaddleRoute,
  generateEncodedFraxswapRoute,
  generateEncodedFraxswapV2Route,
  generateEncodedUniswapV2Route,
  generateEncodedSushiSwapRoute,
  generateEncodedUniswapV3Route,
  generateEncodedFPIControllerRoute,
  getAvailableRoutes,
  outputSankeyJson,
  oneInchPathfinderAlgo,
  convert1InchRouteToFraxswapRoute,
  generateEncodedWETHRoute,
} = require("./fraxswap-router/fraxswap-router-utils");

/*

FPI: 0x5Ca135cB8527d76e932f34B5145575F9d8cbE08E
FPIS: 0xc2544A32872A91F4A553b404C6950e89De901fdb
FraxSwap TWAMM Factory: 0x54F454D747e037Da288dB568D4121117EAb34e79
FraxSwap TWAMM Router: 0xE52D0337904D4D0519EF7487e707268E1DB6495F
FraxSwap FRAX/FPI TWAMM Pair: 0x7d95b33cbEC441917d4f617482d4b5c7e6c35902
FraxSwap FRAX/FXS TWAMM Pair: 0x122F21a89a0A7197FF18C6e2995322ac29f42873
FraxSwap FPI/FXS TWAMM Pair: 0xdc95403d54a7BB182e9AAb861c1c3a74d9fB9E57
FPIControllerPool: 0x309AC8840f9b4C7eEB5bAb1e89669d8dbb86c060
CPITrackerOracle: 0x7086F2aCB5558043fF9cE3df346D8E3FB4F4f452

 */

// FRAX Minter
const fraxMinterOwner = "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27";
const fraxMinter = "0xcf37B62109b537fa0Cb9A90Af4CA72f6fb85E241";
const fraxMinterAbi = require("../../manual_jsons/FRAX_MINTER_ABI.json");

const ERC20Abi =
  require("../../artifacts/contracts/Fraxswap/core/FraxswapPair.sol/FraxswapPair").abi;

const WETH9 = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"; // ethereum

// IQ
const iqContractAddress = "0x579cea1889991f68acc35ff5c3dd0621ff29b0c9";

// FRAX
const fraxContractAddress = "0x853d955acef822db058eb8505911ed77f175b99e";

// FXS
const fxsContractAddress = "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0";

// USDC
const usdcContractAddress = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

// FPI
const fpiContractAddress = "0x5Ca135cB8527d76e932f34B5145575F9d8cbE08E";

const EMPTY_NEXT_STEP = ethers.utils.hexlify([]);
const EMPTY_BYTE = ethers.constants.HashZero; // "0x00000";// ethers.utils.hexlify("0x00000");

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

async function getBlockTimestamp() {
  return (await ethers.provider.getBlock("latest")).timestamp;
}

const tokenHoldersByToken = {
  [iqContractAddress]: "0xf977814e90da44bfa03b6295a0616a897441acec",
  [fpiContractAddress]: "0x2fb733c3239a1e807d380fa0845b9101ee54c693",
  [usdcContractAddress]: "0x6262998ced04146fa42253a5c0af90ca02dfd2a3",
  [fraxContractAddress]: "0xc83a1bb26dc153c009d5baad9855fe90cf5a1529",
  [fxsContractAddress]: "0x66df2139c24446f5b43db80a680fb94d0c1c5d8e",
};

const getFRAXFromMinter = async (toAddress, value) => {
  await runwithImpersonation(fraxMinterOwner, async (signerImpersonate) => {
    console.log("minter Owner: ", signerImpersonate.address);
    const fraxMinterContract = await getContract(
      fraxMinter,
      fraxMinterAbi,
      signerImpersonate
    );
    console.log("output allAMOAddresses");
    console.log(await fraxMinterContract.allAMOAddresses());
    await fraxMinterContract.addAMO(toAddress, false, { gasLimit: 1000000 });
    await fraxMinterContract.mintFraxForAMO(toAddress, value, {
      gasLimit: 1000000,
    });
  });
};

const getERC20TokenFaucet = async (
  tokenAddress,
  toAddress,
  value,
  testEthAccount = null
) => {
  // holder of the token
  const holderAddr = tokenHoldersByToken[tokenAddress];

  // send a little ETH to holder
  if (testEthAccount) {
    await testEthAccount.sendTransaction({
      to: holderAddr,
      value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
    });
  }

  await runwithImpersonation(holderAddr, async (signerImpersonate) => {
    const tokenContract = (await getErc20Token(tokenAddress)).connect(
      signerImpersonate
    );
    console.log(
      `balance of ${await tokenContract.symbol()} whale: ${await tokenContract.balanceOf(
        signerImpersonate.address
      )}`
    );
    const estGas1 = await tokenContract.estimateGas.approve(toAddress, value);
    await (
      await tokenContract.approve(toAddress, value, { gasLimit: estGas1 })
    ).wait();
    const estGas2 = await tokenContract.estimateGas.transfer(toAddress, value);
    await (
      await tokenContract
        .connect(signerImpersonate)
        .transfer(toAddress, value, { gasLimit: estGas2 })
    ).wait();
  });
};

const getErc20Token = async (address) => {
  return await getContract(address, ERC20Abi, ethers.provider.getSigner());
};

describe("Router Tests", function () {
  let signers;
  let FraxswapRouterV2Deployed;

  // contracts
  let fraxToken;
  let usdcToken;
  let weth9Token;
  let fpiToken;
  let iqToken;
  let fxsToken;

  beforeEach(async function () {
    signers = await hre.ethers.getSigners();

    fraxToken = await getErc20Token(fraxContractAddress);
    usdcToken = await getErc20Token(usdcContractAddress);
    weth9Token = await getErc20Token(WETH9);
    fpiToken = await getErc20Token(fpiContractAddress);
    iqToken = await getErc20Token(iqContractAddress);
    fxsToken = await getErc20Token(fxsContractAddress);

    // deploy the new router
    const FraxswapRouterV2 = await ethers.getContractFactory(
      "FraxswapRouterV2"
    );
    FraxswapRouterV2Deployed = await FraxswapRouterV2.deploy(
      WETH9,
      fraxContractAddress
    );
    console.log("FraxswapRouterV2 address: ", FraxswapRouterV2Deployed.address);
  });

  it("Output Pools", async function () {
    /////////////////
    // Store Pools //
    /////////////////

    await getCurvePools("ethereum"); // query curve for pools
    await getSaddlePools("ethereum"); // query curve for pools
    await getFraxswapPools("ethereum"); // query fraxswap for pools
    await getFraxswapV2Pools("ethereum"); // query fraxswap V2 for pools
    await getUniswapV2Pools("ethereum"); // query uniswapv2 for pool
    await getUniswapV3Pools("ethereum"); // query uniswapv3 for pool
    await getSushiSwapPools("ethereum"); // query sushiswap for pool
  });

  it("Output Sankey", async function () {
    /////////////
    // Sankey  //
    /////////////

    const tokenInAddress = fraxToken.address;
    const tokenOut = fxsToken.address;
    const runSankey = false;
    if (runSankey) {
      console.log("finding routes...");
      const routeNodes = await getAvailableRoutes(tokenInAddress, tokenOut, 3);
      console.log(
        `found routes, using ${routeNodes.length} tokens`,
        routeNodes
      );
      await outputSankeyJson(routeNodes);
      console.log("outputted sankey json file");
    }
  });

  it("Output 1Inch Route", async function () {
    // swap 1,000,000 FRAX to FXS
    const decimals = await fraxToken.decimals();
    const tokenIn = fraxToken;
    const tokenInAddress = tokenIn.address;
    const tokenInAmount = utils.parseUnits(
      `${(1 * 1e6).toLocaleString("fullwide", { useGrouping: false })}`,
      decimals
    );
    const tokenOut = fxsToken.address;

    /////////////
    //  1Inch  //
    /////////////

    const { _routes } = await oneInchPathfinderAlgo(
      tokenInAddress,
      tokenOut,
      tokenInAmount,
      decimals
    );
  });

  it("Test 1Inch Route", async function () {
    const oneInchRoute = require("./fraxswap-router/1inch-saved-routes/1inchOutput.json");

    const forkingUrl = hre.network.config?.forking?.url;

    if (!forkingUrl) {
      throw "forking url is not provided!";
    }

    // set fork to desired block
    const blockNumberToTest = parseInt(oneInchRoute.blockNumber);
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

    const decimals = parseInt(oneInchRoute.decimals);
    const tokenInAddress = oneInchRoute.fromToken;
    const tokenOut = oneInchRoute.toToken;
    const tokenInAmount = utils.parseUnits(oneInchRoute.amountIn, 0);

    const userSigner = signers[1];
    const fraxswapRouterV2 = FraxswapRouterV2Deployed.connect(signers[1]);

    await getERC20TokenFaucet(
      tokenInAddress,
      userSigner.address,
      tokenInAmount
    );

    const routeFirstEncoded = await convert1InchRouteToFraxswapRoute(
      oneInchRoute,
      fraxswapRouterV2
    );

    const amountOutMinimum = bigNumberify(0);
    const recipient = userSigner.address;
    const deadline = (await getBlockTimestamp()) + 3600;

    const populatedTx = await fraxswapRouterV2.populateTransaction.swap({
      tokenIn: tokenInAddress,
      amountIn: tokenInAmount,
      tokenOut,
      amountOutMinimum,
      recipient,
      deadline,
      v: 0,
      r: EMPTY_BYTE,
      s: EMPTY_BYTE,
      route: routeFirstEncoded,
    });

    const estimatedGas = await userSigner.estimateGas(populatedTx);

    const tx = await userSigner.sendTransaction(populatedTx, {
      gasLimit: estimatedGas,
    });

    const iface = fraxswapRouterV2.interface;

    const txReceipt = await tx.wait();

    const decodedLogs = txReceipt.logs
      .map((log) => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return;
        }
      })
      .filter((log) => log?.name == "Swapped" || log?.name == "Routed");

    console.log("decodedLogs", decodedLogs);
  });

  it("Swap ETH => WETH => FRAX => FXS directly", async function () {
    const userSigner = signers[1];

    const fraxswapRouterV2 = FraxswapRouterV2Deployed.connect(signers[1]);

    // amount of ETH to swap
    const decimals = 18;
    const tokenInAddress = ethers.constants.AddressZero;
    const tokenInAmount = utils.parseUnits("10", decimals);

    const tokenOut = fxsToken.address;

    const {
      // address: frax_fxs_fraxswap_address,
      encodedStep: frax_fxs_fraxswap_address,
    } = await generateEncodedFraxswapV2Route(
      fraxToken.address,
      fxsToken.address,
      fraxswapRouterV2
    );
    const frax_fxs_routeEncoded = await fraxswapRouterV2.encodeRoute(
      fraxToken.address,
      10000, // 100%
      [frax_fxs_fraxswap_address],
      []
    );

    const {
      // address: frax_fxs_fraxswap_address,
      encodedStep: weth_frax_fraxswap_address,
    } = await generateEncodedFraxswapV2Route(
      weth9Token.address,
      fraxToken.address,
      fraxswapRouterV2
    );
    const weth_frax_routeEncoded = await fraxswapRouterV2.encodeRoute(
      fraxToken.address,
      10000, // 100%
      [weth_frax_fraxswap_address],
      [frax_fxs_routeEncoded]
    );
    const { encodedStep: eth_weth_swap_address } =
      await generateEncodedWETHRoute(true, fraxswapRouterV2);
    const eth_weth_routeEncoded = await fraxswapRouterV2.encodeRoute(
      "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      10000, // 100%
      [eth_weth_swap_address],
      [weth_frax_routeEncoded]
    );
    routeFirstEncoded = await fraxswapRouterV2.encodeRoute(
      ethers.constants.AddressZero,
      10000, // 100%
      [],
      [eth_weth_routeEncoded]
    );
    const amountIn = tokenInAmount;
    const amountOutMinimum = bigNumberify(0);
    const recipient = userSigner.address;
    const deadline = (await getBlockTimestamp()) + 3600;

    const populatedTx = await fraxswapRouterV2.populateTransaction.swap(
      {
        tokenIn: tokenInAddress,
        amountIn,
        tokenOut,
        amountOutMinimum,
        recipient,
        deadline,
        v: 0,
        r: EMPTY_BYTE,
        s: EMPTY_BYTE,
        route: routeFirstEncoded,
      },
      { value: amountIn }
    );

    // const estimatedGas = await userSigner.estimateGas(populatedTx);

    const tx = await userSigner.sendTransaction(populatedTx, {
      value: amountIn,
      gasLimit: 1000000,
    });

    const iface = fraxswapRouterV2.interface;

    const txReceipt = await tx.wait();

    const decodedLogs = txReceipt.logs
      .map((log) => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return;
        }
      })
      .filter((log) => log?.name == "Swapped" || log?.name == "Routed");

    console.log("decodedLogs", decodedLogs);

    console.log("transfers", txReceipt.logs
    .map((log) => {
      try {
        return iface.parseLog(log);
      } catch (e) {
        return;
      }
    })
    .filter((log) => log?.name == "Transfer"))
  });

  it("Swap Test", async function () {
    const userSigner = signers[1];

    const fraxswapRouterV2 = FraxswapRouterV2Deployed.connect(signers[1]);

    // amount of FRAX to swap
    const decimals = await fraxToken.decimals();
    const tokenIn = fraxToken;
    const tokenInAddress = tokenIn.address;
    const tokenInAmount = utils.parseUnits("1000000", decimals);
    const tokenOut = fxsToken.address;

    // await getFRAXFromMinter(userSigner.address, tokenInAmount)

    await getERC20TokenFaucet(
      tokenInAddress,
      userSigner.address,
      tokenInAmount
    );

    // approve amount transfer
    const estGasTokenApproval = await tokenIn
      .connect(userSigner)
      .estimateGas.approve(fraxswapRouterV2.address, tokenInAmount);
    await tokenIn
      .connect(userSigner)
      .approve(fraxswapRouterV2.address, tokenInAmount, {
        gasLimit: estGasTokenApproval,
      });
    console.log("approved FRAX for transfer");

    const runHardcodedTest = true;

    let routeFirstEncoded;

    if (runHardcodedTest) {
      // HARDCODED ROUTE TO TEST
      // curve
      // const step_swapEncoded = await generateEncodedCurveRoute(usdcToken.address, fraxToken.address, fraxswapRouterV2, fraxswap_swapEncoded);

      // saddle
      // const step_swapEncoded = await generateEncodedSaddleRoute(usdcToken.address, fraxToken.address, fraxswapRouterV2, fraxswap_swapEncoded);

      // uniswap v3
      // const step_swapEncoded1 = await generateEncodedUniswapV3Route(
      //   usdcToken.address,
      //   fraxToken.address,
      //   fraxswapRouterV2,
      //   4000
      // );

      // allSteps.push(step_swapEncoded1);

      // const step_swapEncoded2 = await generateEncodedCurveRoute(
      //   usdcToken.address,
      //   fraxToken.address,
      //   fraxswapRouterV2,
      //   6000
      // );

      // allSteps.push(step_swapEncoded2);

      const frax_fxs_steps = [];

      const {
        // address: frax_fxs_uniswapV2_address,
        encodedStep: frax_fxs_uniswapV2_swapEncoded,
      } = await generateEncodedUniswapV2Route(
        fraxToken.address,
        fxsToken.address,
        fraxswapRouterV2,
        1000
      );
      frax_fxs_steps.push(frax_fxs_uniswapV2_swapEncoded);

      const {
        // address: frax_fxs_fraxswap_address,
        encodedStep: frax_fxs_fraxswap_swapEncoded,
      } = await generateEncodedFraxswapRoute(
        fraxToken.address,
        fxsToken.address,
        fraxswapRouterV2,
        9000
      );
      frax_fxs_steps.push(frax_fxs_fraxswap_swapEncoded);

      const frax_fxs_routeEncoded = await fraxswapRouterV2.encodeRoute(
        fxsToken.address,
        9000, // 90%
        frax_fxs_steps,
        []
      );

      const frax_fpi_steps = [];

      const {
        // address: frax_fpi_uniswapV3_address,
        encodedStep: frax_fpi_uniswapV3_swapEncoded,
      } = await generateEncodedUniswapV3Route(
        fraxToken.address,
        fpiToken.address,
        fraxswapRouterV2,
        10000
      );
      frax_fpi_steps.push(frax_fpi_uniswapV3_swapEncoded);

      const fpi_fxs_steps = [];

      const {
        // address: fpi_fxs_fraxswap_address,
        encodedStep: fpi_fxs_fraxswap_swapEncoded,
      } = await generateEncodedFraxswapRoute(
        fpiToken.address,
        fxsToken.address,
        fraxswapRouterV2,
        10000
      );
      fpi_fxs_steps.push(fpi_fxs_fraxswap_swapEncoded);

      const fpi_fxs_routeEncoded = await fraxswapRouterV2.encodeRoute(
        fxsToken.address,
        10000, // 100%
        fpi_fxs_steps,
        []
      );

      const frax_fpi_routeEncoded = await fraxswapRouterV2.encodeRoute(
        fpiToken.address,
        1000, // 10%
        frax_fpi_steps,
        [fpi_fxs_routeEncoded]
      );

      routeFirstEncoded = await fraxswapRouterV2.encodeRoute(
        ethers.constants.AddressZero,
        10000, // 100%
        [],
        [frax_fxs_routeEncoded, frax_fpi_routeEncoded]
      );
    } else {
      // Debugging UniswapV3

      const { encodedStep: encodingObj_FRAX_USDC } =
        await generateEncodedUniswapV3Route(
          fraxToken.address,
          usdcToken.address,
          fraxswapRouterV2,
          10000,
          null,
          [
            {
              address: "0x9a834b70c07c81a9fcd6f22e842bf002fbffbe4d",
              underlying_coins: [fraxToken.address, usdcToken.address],
            },
          ]
        );

      const { encodedStep: encodingObj_USDC_ETH } =
        await generateEncodedUniswapV3Route(
          usdcToken.address,
          weth9Token.address,
          fraxswapRouterV2,
          10000,
          null,
          [
            {
              address: "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
              underlying_coins: [usdcToken.address, weth9Token.address],
            },
          ]
        );

      const { encodedStep: encodingObj_ETH_FXS } =
        await generateEncodedUniswapV3Route(
          weth9Token.address,
          fxsToken.address,
          fraxswapRouterV2,
          10000,
          null,
          [
            {
              address: "0xcd8286b48936cdac20518247dbd310ab681a9fbf",
              underlying_coins: [weth9Token.address, fxsToken.address],
            },
          ]
        );

      const eth_fxs_routeEncoded = await fraxswapRouterV2.encodeRoute(
        fxsToken.address,
        10000, // 100%
        [encodingObj_ETH_FXS],
        []
      );

      const usdc_eth_routeEncoded = await fraxswapRouterV2.encodeRoute(
        weth9Token.address,
        10000, // 100%
        [encodingObj_USDC_ETH],
        [eth_fxs_routeEncoded]
      );

      const frax_usdc_routeEncoded = await fraxswapRouterV2.encodeRoute(
        usdcToken.address,
        10000, // 100%
        [encodingObj_FRAX_USDC],
        [usdc_eth_routeEncoded]
      );

      routeFirstEncoded = await fraxswapRouterV2.encodeRoute(
        ethers.constants.AddressZero,
        10000, // 100%
        [],
        [frax_usdc_routeEncoded]
      );
    }

    const amountIn = tokenInAmount;
    const amountOutMinimum = bigNumberify(0);
    const recipient = userSigner.address;
    const deadline = (await getBlockTimestamp()) + 3600;

    const populatedTx = await fraxswapRouterV2.populateTransaction.swap({
      tokenIn: tokenInAddress,
      amountIn,
      tokenOut,
      amountOutMinimum,
      recipient,
      deadline,
      v: 0,
      r: EMPTY_BYTE,
      s: EMPTY_BYTE,
      route: routeFirstEncoded,
    });

    const estimatedGas = await userSigner.estimateGas(populatedTx);

    const tx = await userSigner.sendTransaction(populatedTx, {
      gasLimit: estimatedGas,
    });

    const iface = fraxswapRouterV2.interface;

    const txReceipt = await tx.wait();

    const decodedLogs = txReceipt.logs
      .map((log) => {
        try {
          return iface.parseLog(log);
        } catch (e) {
          return;
        }
      })
      .filter((log) => log?.name == "Swapped" || log?.name == "Routed");

    console.log("decodedLogs", decodedLogs);

    // const { amountOut } = decodedLogs[decodedLogs.length - 1];
    // console.log("amountOut", amountOut);
    // console.log("amountOut", ethers.utils.formatUnits(amountOut, 18));

    // console.log(txReceipt.events.map(log=>iface.parseLog(log)));
  });
});
