const path = require("path");
const fse = require("fs-extra");
const prettier = require("prettier");
const hre = require("hardhat");
const { ethers, network } = hre;
const { BigNumber } = require("ethers");
const { CURVE_METAPOOLS } = require("./ethereumOutputCurve");
const { SADDLE_POOLS } = require("./ethereumOutputSaddle");
const { FRAXSWAP_POOLS } = require("./ethereumOutputFraxswap");
const { FRAXSWAP_V2_POOLS } = require("./ethereumOutputFraxswapV2");
const { UNISWAPV2_POOLS } = require("./ethereumOutputUniswapV2");
const { SUSHISWAP_POOLS } = require("./ethereumOutputSushiSwap");
const { UNISWAPV3_POOLS } = require("./ethereumOutputUniswapV3");

const callOpts = { gasLimit: 500000 }; // hardhat fork can't estimate for some reason

// ethereum
const CONNECTOR_TOKENS = [
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
  "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
  "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
  "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  "0x853d955acef822db058eb8505911ed77f175b99e", // FRAX
];

// Used by UniswapV2 and UniswapV3 Graph Queries to get Pools with the FRAX token
const relevantTokens = [
  "0x853d955acef822db058eb8505911ed77f175b99e", // FRAX
  // "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
  // "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
];

const FPIControllerPools = [
  {
    name: "FPIControllerPool FRAX/FPI",
    symbol: "FPIController",
    address: "0x309ac8840f9b4c7eeb5bab1e89669d8dbb86c060",
    coins: [
      "0x853d955aCEf822Db058eb8505911ED77F175b99e",
      "0x5ca135cb8527d76e932f34b5145575f9d8cbe08e",
    ],
    underlying_coins: [
      "0x853d955acef822db058eb8505911ed77f175b99e",
      "0x5ca135cb8527d76e932f34b5145575f9d8cbe08e",
    ],
    token0Symbol: "FRAX",
    token1Symbol: "FPI",
  },
];

const generateEncodedStep = async ({
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  POOLS,
  swapType, // fraxswap=0, uniswapv2=1, uniswapv3=2, curveV2=3, curveWithReturns=4, curveUnderlying=5, saddle=6, fpiMintRedeem=7
  extraParam1 = null, // curve/saddle
  extraParam2 = null, // curve/saddle
  percentOfHop = 10000, // percent of this hop
  fee = null, // uniswapV3
  directFundNextPool = 0,
  directFundThisPool = 0,
}) => {
  const filteredPools = POOLS.filter(
    (p) =>
      p.underlying_coins.some(
        (x) => x.toLowerCase() == tokenFrom.toLowerCase()
      ) &&
      p.underlying_coins.some(
        (x) => x.toLowerCase() == tokenTo.toLowerCase()
      ) &&
      (swapType != 2 || fee == null || p?.fee == fee) // UniswapV3, order of these checks matter
  );

  if (filteredPools.length == 0) {
    console.log(`Encode Step: Could not find Pool: ${swapType}`);
    return null;
  } else if (filteredPools.length > 1) {
    console.log(`found more than 1 pool: ${filteredPools.length}`);
  }

  const pool = filteredPools[0]; // choose the first pool
  // console.log("found pool: ", swapType, pool);

  const _extraParam1 = extraParam1 ? extraParam1(pool) : 0;
  const _extraParam2 = extraParam2 ? extraParam2(pool) : 0;

  return {
    address: pool.address,
    encodedStep: await combiSwapRouter.encodeStep(
      swapType,
      directFundNextPool,
      directFundThisPool,
      tokenTo,
      pool.address,
      _extraParam1,
      _extraParam2,
      percentOfHop
    ),
  };
};

const outputPoolsToFile = async (pools, jsVariableName, outputFileName) => {
  const listOutputFile = path.join(
    process.cwd(),
    `/test/Fraxswap/fraxswap-router/${outputFileName}.js`
  );
  fse.ensureFileSync(listOutputFile);
  let output = `/**
  ** DO NOT EDIT MANUALLY **
  This file was generated automatically 
  */`;

  console.log(`Got ${Object.keys(pools).length} ${outputFileName} pairs`);

  output += `
   const ${jsVariableName} = ${JSON.stringify(pools, null, 1)};
   module.exports = { ${jsVariableName} }
  `;

  const prettyOutputV2 = prettier.format(output, {
    singleQuote: true,
    semi: false,
    printWidth: 150,
    tabWidth: 2,
    parser: "babel",
  });

  fse.writeFileSync(listOutputFile, prettyOutputV2, "utf8");

  console.log(`${outputFileName} Pairs List generated.\n`);
};

const getContract = async (address, abi, signer) => {
  if (signer == null) signer = ethers.provider.getSigner();
  return new ethers.Contract(address, abi, signer);
};

const mkrERC20Abi = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "bytes32" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];
const ERC20Abi =
  require("../../../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json").abi;

const getERC20Details = async (tokenAddress) => {
  const tokenContract = await getContract(tokenAddress, ERC20Abi);
  const name = await tokenContract.name(callOpts);
  const decimals = await tokenContract.decimals(callOpts);
  return {
    name,
    address: tokenAddress,
    decimals,
  };
};

// WETH

const generateEncodedWETHRoute = async (
  isETHIn,
  combiSwapRouter,
  percentOfHop = 10000
) => {
  const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  return {
    address: wethAddress,
    encodedStep: await combiSwapRouter.encodeStep(
      10, // swapType,
      0, // directFundNextPool = 0. this pool does not support direct funding
      0, // directFundThisPool = 0. this pool does not support direct funding
      isETHIn ? wethAddress : ethers.constants.AddressZero, // tokenTo,
      wethAddress, // pool.address,
      0, // _extraParam1,
      0, // _extraParam2,
      percentOfHop // percentOfHop
    ),
  };
};

// CURVE start

const curveAddressProviderAddress =
  "0x0000000022d53366457f9d5e68ec105046fc4383"; // same across all chains
const curveAddressProviderAbi = require("../../../manual_jsons/CURVE_ADDRESS_PROVIDER_ABI.json");
const curveRegistryAbi = require("../../../manual_jsons/CURVE_REGISTRY_ABI.json");
const metaPoolFactoryAbi = require("../../../manual_jsons/CURVE_METAPOOL_FACTORY_ABI.json");
const metaPoolAbi = require("../../../manual_jsons/CURVE_METAPOOL_ABI.json");
const curveCryptoSwapRegistryAbi = require("../../../manual_jsons/CURVE_CRYPTOSWAP_REGISTRY_ABI.json");
const curveCryptopoolFactoryAbi = require("../../../manual_jsons/CURVE_CRYPTOPOOL_FACTORY_ABI.json");

const getFactoryPoolDetails = async (
  factory,
  address,
  isMeta,
  cryptopool = false
) => {
  try {
    console.log("factory ", factory.address, address);
    const poolBalances = await factory.get_balances(address, callOpts);
    if (poolBalances[0].lt(BigNumber.from(1))) {
      console.log("balance 0: ", address);
      return null; // FILTER OUT EMPTY POOLS
    }
  } catch {}
  const pool = await getContract(address, metaPoolAbi);
  let name;
  let symbol;
  if (cryptopool) {
    const lpTokenAddress = await factory.get_token(address);
    const lpToken = await getContract(lpTokenAddress, ERC20Abi);
    name = await lpToken.name(callOpts);
    symbol = await lpToken.symbol(callOpts);
  } else {
    name = await pool.name(callOpts);
    symbol = await pool.symbol(callOpts);
  }
  const A = await pool.A(callOpts);
  const adminFee = await pool.admin_fee(callOpts);
  const fee = await pool.fee(callOpts);
  const coins = await factory.get_coins(address, callOpts);
  // const coins_tokens = await Promise.all(coins.map((addr) => getERC20Details(addr)));
  const underlying_coins = isMeta
    ? await factory.get_underlying_coins(address, callOpts)
    : coins;
  // const underlying_coins_tokens = await Promise.all(underlying_coins.map((addr) =>
  //   getERC20Details(addr)
  // ));
  return {
    name,
    symbol,
    address,
    A: ethers.utils.formatUnits(A, 0),
    adminFee: ethers.utils.formatUnits(adminFee, 0),
    fee: ethers.utils.formatUnits(fee, 0),
    coins,
    // coins_tokens,
    underlying_coins,
    // underlying_coins_tokens,
    isMeta,
    swapType: 5,
    source: "metafactory",
  };
};

const getRegistryPoolDetails = async (
  registry,
  address,
  isMeta,
  cryptoswap = false
) => {
  console.log("registry ", address);
  const poolBalances = await registry.get_balances(address, callOpts);
  const lpTokenAddress = await registry.get_lp_token(address, callOpts);
  const lpToken = await getContract(lpTokenAddress, ERC20Abi);
  // console.log("poolBalances", poolBalances);
  if (poolBalances[0].eq(BigNumber.from(0))) {
    console.log("balance 0: ", address);
    return null; // FILTER OUT EMPTY POOLS
  }
  const pool = await getContract(address, metaPoolAbi);
  const name = await lpToken.name(callOpts);
  const symbol = await lpToken.symbol(callOpts);
  const A = await pool.A(callOpts);
  const adminFee = await pool.admin_fee(callOpts);
  const fee = await pool.fee(callOpts);
  const coins = await registry.get_coins(address, callOpts);
  // const coins_tokens = await Promise.all(coins.map((addr) => getERC20Details(addr)));
  const underlying_coins = cryptoswap
    ? coins
    : await registry.get_underlying_coins(address, callOpts);
  // const underlying_coins_tokens = await Promise.all(underlying_coins.map((addr) =>
  //   getERC20Details(addr)
  // ));
  return {
    name,
    symbol,
    address,
    A: ethers.utils.formatUnits(A, 0),
    adminFee: ethers.utils.formatUnits(adminFee, 0),
    fee: ethers.utils.formatUnits(fee, 0),
    coins,
    // coins_tokens,
    underlying_coins,
    // underlying_coins_tokens,
    isMeta,
    swapType: 5,
    source: cryptoswap ? "cryptoswap-registry" : "main-registry",
  };
};

const getCurvePools = async (chainName) => {
  const addressProvider = await getContract(
    curveAddressProviderAddress,
    curveAddressProviderAbi
  );
  const registryAddress = await addressProvider.get_registry(callOpts);
  const registry = await getContract(registryAddress, curveRegistryAbi);

  const metaPoolFactoryAddress = await addressProvider.get_address(3, callOpts);
  const factory = await getContract(metaPoolFactoryAddress, metaPoolFactoryAbi);

  const curveV2RegistryAddress = await addressProvider.get_address(5, callOpts);
  const curveV2Registry = await getContract(
    curveV2RegistryAddress,
    curveCryptoSwapRegistryAbi
  );

  const cryptopoolFactoryAddress = await addressProvider.get_address(
    6,
    callOpts
  );
  const cryptopoolFactory = await getContract(
    cryptopoolFactoryAddress,
    curveCryptopoolFactoryAbi
  );

  const pools = [];

  // Using Registry
  for (let i = 0; i < (await registry.pool_count(callOpts)); i++) {
    const address = await registry.pool_list(i, callOpts);
    const isMeta = await registry.is_meta(address);
    const pool = await getRegistryPoolDetails(registry, address, isMeta);
    if (pool != null) {
      pools.push(pool);
    }
  }

  // Using Cryptoswap Registry
  for (let i = 0; i < (await curveV2Registry.pool_count(callOpts)); i++) {
    const address = await curveV2Registry.pool_list(i, callOpts);
    const existingPool = pools.find(
      (p) => p.address.toLowerCase() == address.toLowerCase()
    );
    if (existingPool) {
      console.log("from cryptoswap: found in registry", existingPool);
      continue;
    }
    const pool = await getRegistryPoolDetails(
      curveV2Registry,
      address,
      true,
      true
    );
    if (pool != null) {
      pools.push(pool);
    }
  }

  // Using Metapool Factory
  for (let i = 0; i < (await factory.pool_count(callOpts)); i++) {
    const address = await factory.pool_list(i, callOpts);
    const existingPool = pools.find(
      (p) => p.address.toLowerCase() == address.toLowerCase()
    );
    if (existingPool) {
      console.log("from metapool factory: found in registry", existingPool);
      continue;
    }
    const isMeta = await factory.is_meta(address);
    const pool = await getFactoryPoolDetails(factory, address, isMeta);
    if (pool != null) {
      pools.push(pool);
    }
  }

  // Using CryptoPool Factory
  for (let i = 0; i < (await cryptopoolFactory.pool_count(callOpts)); i++) {
    const address = await cryptopoolFactory.pool_list(i, callOpts);
    const existingPool = pools.find(
      (p) => p.address.toLowerCase() == address.toLowerCase()
    );
    if (existingPool) {
      console.log("from cryptopool factory: found in registry", existingPool);
      continue;
    }
    const pool = await getFactoryPoolDetails(
      cryptopoolFactory,
      address,
      false,
      true
    );
    if (pool != null) {
      pools.push(pool);
    }
  }

  const jsVariableName = "CURVE_METAPOOLS";
  const outputFileName = `${chainName}OutputCurve`;
  await outputPoolsToFile(pools, jsVariableName, outputFileName);
};

const generateEncodedCurveRoute = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  step_extraParam1_override = null,
  step_extraParam2_override = null
) => {
  const step_swapType = 5; // curve exchange_underlying
  const step_extraParam1 =
    step_extraParam1_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenFrom.toLowerCase()));
  const step_extraParam2 =
    step_extraParam2_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenTo.toLowerCase()));

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || CURVE_METAPOOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
  });
};

const generateEncodedCurveRouteV2 = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  step_extraParam1_override = null,
  step_extraParam2_override = null
) => {
  const step_swapType = 3; // curve v2 exchange
  const step_extraParam1 =
    step_extraParam1_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenFrom.toLowerCase()));
  const step_extraParam2 =
    step_extraParam2_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenTo.toLowerCase()));

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || CURVE_METAPOOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
  });
};

// CURVE end

// Saddle start

const saddlePoolRegistryAddress = "0xFb4DE84c4375d7c8577327153dE88f58F69EeC81";
const saddlePoolRegistryAbi = require("../../../manual_jsons/SADDLE_POOL_REGISTRY_ABI.json");
const saddleSwapPoolAbi = require("../../../manual_jsons/SADDLE_SWAPFLASHLOAN_ABI.json");
const { parseUnits } = require("ethers/lib/utils");

const getSaddlePools = async (chainName) => {
  const saddlePoolRegistry = await getContract(
    saddlePoolRegistryAddress,
    saddlePoolRegistryAbi
  );
  const poolsLength = await saddlePoolRegistry.getPoolsLength(callOpts);

  const pools = [];

  for (let i = 0; i < poolsLength; i++) {
    const poolDataAtIndex = await saddlePoolRegistry.getPoolDataAtIndex(
      i,
      callOpts
    );
    const swapAddress = poolDataAtIndex[0];
    console.log("swapAddress", swapAddress);
    const saddlePool = await getContract(swapAddress, saddleSwapPoolAbi);
    const virtualPrice = await saddlePool.getVirtualPrice(callOpts);
    if (virtualPrice.eq(BigNumber.from(0))) {
      console.log("balance 0: ", swapAddress);
      continue;
    }
    const A = await saddlePool.getA(callOpts);
    const coins = await saddlePoolRegistry.getTokens(swapAddress, callOpts);
    // const coins_tokens = await Promise.all(coins.map((addr) => getERC20Details(addr)));
    let underlying_coins = await saddlePoolRegistry.getUnderlyingTokens(
      swapAddress,
      callOpts
    );
    const isMeta = underlying_coins.length > 0;
    if (!isMeta) {
      underlying_coins = coins;
    }
    let swapStorage = await saddlePoolRegistry.getSwapStorage(
      swapAddress,
      callOpts
    );
    const { swapFee, adminFee } = swapStorage;
    let lpToken = swapStorage.lpToken;
    if (lpToken == "0x0000000000000000000000000000000000000000") {
      console.log("difference in swapStorage struct...", swapAddress);
      // saddle decided to change their swapStorage struct for some pools (flashLoanable)
      // example https://etherscan.io/address/0xdec2157831D6ABC3Ec328291119cc91B337272b5#readContract
      // example https://etherscan.io/address/0xc02D481B52Ae04Ebc76a8882441cfAED45eb8342#readContract
      const swapStorage = await saddlePool.swapStorage(callOpts);
      lpToken = swapStorage.lpToken;
    }
    const LpToken = await getContract(lpToken, ERC20Abi);
    const name = await LpToken.name(callOpts);
    const symbol = await LpToken.symbol(callOpts);
    pools.push({
      name,
      symbol,
      address: swapAddress,
      A: ethers.utils.formatUnits(A, 0),
      adminFee: ethers.utils.formatUnits(adminFee, 0),
      fee: ethers.utils.formatUnits(swapFee, 0),
      coins,
      underlying_coins,
      isMeta,
      swapType: 6,
    });
  }

  const jsVariableName = "SADDLE_POOLS";
  const outputFileName = `${chainName}OutputSaddle`;
  await outputPoolsToFile(pools, jsVariableName, outputFileName);
};

const generateEncodedSaddleRoute = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  step_extraParam1_override = null,
  step_extraParam2_override = null
) => {
  const step_swapType = 6; // saddle swap
  const step_extraParam1 =
    step_extraParam1_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenFrom.toLowerCase()));
  const step_extraParam2 =
    step_extraParam2_override ||
    ((pool) =>
      pool.underlying_coins
        .map((addr) => addr.toLowerCase())
        .indexOf(tokenTo.toLowerCase()));

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || SADDLE_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
  });
};

// Saddle end

// Fraxswap start

const fraxswapFactoryAddress = "0xB076b06F669e682609fb4a8C6646D2619717Be4b";
const fraxswapV2FactoryAddress = "0x43eC799eAdd63848443E2347C49f5f52e8Fe0F6f";
const uniswapV2FactoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
const sushiswapFactoryAddress = "0xc0aee478e3658e2610c5f7a4a2e1777ce9e4f2ac";
const fraxswapFactoryAbi =
  require("../../../artifacts/contracts/Fraxswap/core/FraxswapFactory.sol/FraxswapFactory.json").abi;
const fraxswapPairAbi =
  require("../../../artifacts/contracts/Fraxswap/core/FraxswapPair.sol/FraxswapPair.json").abi;

const queryPairsByTokenSushiSwap = `fragment TokenFields on Token {
  id
  name
  symbol
  derivedETH
  volume
  volumeUSD
  untrackedVolumeUSD
  liquidity
  txCount
  __typename
}

query tokens ($tokenAddress: String) {
  tokens(where: {id: $tokenAddress}) {
    ...TokenFields
    __typename
  }
  pairs0: pairs(where: {token0: $tokenAddress}, first: 500, orderBy: reserveUSD, orderDirection: desc) {
    id
    __typename
  }
  pairs1: pairs(where: {token1: $tokenAddress}, first: 500, orderBy: reserveUSD, orderDirection: desc) {
    id
    __typename
  }
}
`;
const callGraphForSushiSwapPairs = async (tokenAddress) => {
  const { fetch } = require("cross-fetch");
  const {
    data: { tokens, pairs0, pairs1 },
  } = await fetch(
    "https://api.thegraph.com/subgraphs/name/sushiswap/exchange",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,zh;q=0.8,ko;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        Referer: "https://app.sushi.com/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: JSON.stringify({
        operationName: "pair",
        query: queryPairsByTokenSushiSwap,
        variables: {
          tokenAddress,
        },
      }),
      method: "POST",
    }
  ).then((data) => data.json());
  const allPairs = [...pairs0, ...pairs1].map((p) => p.id);
  console.log(`theGraph found ${allPairs.length} pairs`);
  return allPairs;
};

const queryPairsByTokenUniV2 = `fragment TokenFields on Token {
  id
  name
  symbol
  derivedETH
  tradeVolume
  tradeVolumeUSD
  untrackedVolumeUSD
  totalLiquidity
  txCount
  __typename
}

query tokens ($tokenAddress: String) {
  tokens(where: {id: $tokenAddress}) {
    ...TokenFields
    __typename
  }
  pairs0: pairs(where: {token0: $tokenAddress}, first: 500, orderBy: reserveUSD, orderDirection: desc) {
    id
    __typename
  }
  pairs1: pairs(where: {token1: $tokenAddress}, first: 500, orderBy: reserveUSD, orderDirection: desc) {
    id
    __typename
  }
}`;

const callGraphForUniswapV2Pairs = async (tokenAddress) => {
  const { fetch } = require("cross-fetch");
  const {
    data: { tokens, pairs0, pairs1 },
  } = await fetch(
    "https://api.thegraph.com/subgraphs/name/ianlapham/uniswapv2",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,zh;q=0.8,ko;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        Referer: "https://v2.info.uniswap.org/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: JSON.stringify({
        operationName: "pair",
        query: queryPairsByTokenUniV2,
        variables: {
          tokenAddress,
        },
      }),
      method: "POST",
    }
  ).then((data) => data.json());
  const allPairs = [...pairs0, ...pairs1].map((p) => p.id);
  console.log(`theGraph found ${allPairs.length} pairs`);
  return allPairs;
};

const getUniswapV2PoolsGeneric = async (
  factoryAddress,
  jsVariableName,
  outputFileName,
  EXISTING_POOLS,
  override = false,
  fraxswapV2 = false,
  startingPool = 0,
  endingPool = null,
  connectorTokens = null,
  specificPools = null
) => {
  const uniswapV2Factory = await getContract(
    factoryAddress,
    fraxswapFactoryAbi
  );
  const pools = override ? [] : EXISTING_POOLS;
  const allPairsLength = endingPool
    ? endingPool
    : await uniswapV2Factory.allPairsLength(callOpts);
  try {
    for (let i = startingPool; i < allPairsLength; i++) {
      let address;
      if (specificPools) {
        address = specificPools[i];
      } else {
        address = await uniswapV2Factory.allPairs(i);
      }
      if (
        !override &&
        pools.find((p) => p.address.toLowerCase() == address.toLowerCase())
      ) {
        // already exists, skip it
        console.log(i, " pool found skipping: ", address);
        continue;
      } else {
        // console.log(i, " retrieving: ", address);
      }
      const uniswapswapPair = await getContract(address, fraxswapPairAbi);
      let name =
        jsVariableName == "UNISWAPV2_POOLS"
          ? "Uniswap V2"
          : await uniswapswapPair.name(callOpts);
      const symbol =
        jsVariableName == "UNISWAPV2_POOLS"
          ? "UNI-V2"
          : await uniswapswapPair.symbol(callOpts);
      const token0 = await uniswapswapPair.token0(callOpts);
      const token1 = await uniswapswapPair.token1(callOpts);
      if (
        connectorTokens &&
        !connectorTokens.some(
          (t) =>
            t.toLowerCase() == token0.toLowerCase() ||
            t.toLowerCase() == token1.toLowerCase()
        )
      ) {
        // pool pair does not contain a connector token
        console.log(
          `skipping pool, no connector tokens: ${address} ${token0}/${token1}`
        );
        continue;
      }
      let token0Symbol = token0;
      let token1Symbol = token1;
      try {
        const token0Contract = await getContract(token0, ERC20Abi);
        token0Symbol = await token0Contract.symbol(callOpts);
      } catch {
        try {
          const token0Contract = await getContract(token0, mkrERC20Abi);
          token0Symbol = ethers.utils.toUtf8String(
            await token0Contract.symbol(callOpts)
          );
        } catch {
          // ignore
        }
      }
      try {
        const token1Contract = await getContract(token1, ERC20Abi);
        token1Symbol = await token1Contract.symbol(callOpts);
      } catch {
        try {
          const token1Contract = await getContract(token1, mkrERC20Abi);
          token1Symbol = ethers.utils.toUtf8String(
            await token1Contract.symbol(callOpts)
          );
        } catch {
          // ignore
        }
      }
      if (fraxswapV2) {
        try {
          const fraxswapV2 = await getContract(address, [
            {
              inputs: [],
              name: "getTwammReserves",
              outputs: [
                {
                  internalType: "uint112",
                  name: "_reserve0",
                  type: "uint112",
                },
                {
                  internalType: "uint112",
                  name: "_reserve1",
                  type: "uint112",
                },
                {
                  internalType: "uint32",
                  name: "_blockTimestampLast",
                  type: "uint32",
                },
                {
                  internalType: "uint112",
                  name: "_twammReserve0",
                  type: "uint112",
                },
                {
                  internalType: "uint112",
                  name: "_twammReserve1",
                  type: "uint112",
                },
                {
                  internalType: "uint256",
                  name: "_fee",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
          ]);
          const [
            _reserve0,
            _reserve1,
            _blockTimestampLast,
            _twammReserve0,
            _twammReserve1,
            _fee,
          ] = await fraxswapV2.getTwammReserves(callOpts);
          fee = _fee.toNumber();
        } catch {
          fee = -1;
        }
      } else {
        fee = 30;
      }

      name += ` ${token0Symbol}/${token1Symbol}`;
      const pool = {
        name,
        symbol,
        address,
        coins: [token0, token1],
        underlying_coins: [token0, token1],
        token0Symbol,
        token1Symbol,
        fee,
        swapType: jsVariableName == "UNISWAPV2_POOLS" ? 1 : 0,
      };
      pools.push(pool);
    }
  } finally {
    // if it fails, just write it to the file
    await outputPoolsToFile(pools, jsVariableName, outputFileName);
  }
};

const getFraxswapPools = async (chainName) => {
  await getUniswapV2PoolsGeneric(
    fraxswapFactoryAddress,
    "FRAXSWAP_POOLS",
    `${chainName}OutputFraxswap`,
    FRAXSWAP_POOLS,
    true // override
  );
};

const getFraxswapV2Pools = async (chainName) => {
  await getUniswapV2PoolsGeneric(
    fraxswapV2FactoryAddress,
    "FRAXSWAP_V2_POOLS",
    `${chainName}OutputFraxswapV2`,
    FRAXSWAP_V2_POOLS,
    true, // override
    true // fraxswap v2
  );
};

const getUniswapV2Pools = async (chainName) => {
  // const startContinuation = UNISWAPV2_POOLS[UNISWAPV2_POOLS.length - 1].poolId;
  // console.log("startContinuation", startContinuation);

  const specificPools = (
    await Promise.all(
      relevantTokens.map(async (tAddr) => {
        return await callGraphForUniswapV2Pairs(tAddr);
      }, [])
    )
  ).reduce((r, tokenArray) => {
    return [...r, ...tokenArray];
  }, []);

  await getUniswapV2PoolsGeneric(
    uniswapV2FactoryAddress,
    "UNISWAPV2_POOLS",
    `${chainName}OutputUniswapV2`,
    UNISWAPV2_POOLS,
    true, // override
    false, // fraxswap v2
    0, // start at 0
    specificPools.length, // to the length of specificPools
    null, // no connector token filter
    specificPools // pools from graph query
  );
};

const getSushiSwapPools = async (chainName) => {
  const specificPools = (
    await Promise.all(
      relevantTokens.map(async (tAddr) => {
        return await callGraphForSushiSwapPairs(tAddr);
      }, [])
    )
  ).reduce((r, tokenArray) => {
    return [...r, ...tokenArray];
  }, []);

  await getUniswapV2PoolsGeneric(
    sushiswapFactoryAddress,
    "SUSHISWAP_POOLS",
    `${chainName}OutputSushiSwap`,
    SUSHISWAP_POOLS,
    true, // override
    false, // fraxswap v2
    0, // start at 0
    specificPools.length, // to the length of specificPools
    null, // no connector token filter
    specificPools // pools from graph query
  );
};

const generateEncodedFraxswapRoute = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  directFundNextPool = 0,
  directFundThisPool = 0
) => {
  const step_swapType = 0; // fraxswap swap
  const step_extraParam1 = () => 0;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || FRAXSWAP_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
    directFundNextPool,
    directFundThisPool,
  });
};

const generateEncodedFraxswapV2Route = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  directFundNextPool = 0,
  directFundThisPool = 0
) => {
  const step_swapType = 0; // fraxswap V2 swap
  const step_extraParam1 = () => 1;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || FRAXSWAP_V2_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
    directFundNextPool,
    directFundThisPool,
  });
};

const generateEncodedUniswapV2Route = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  directFundNextPool = 0,
  directFundThisPool = 0
) => {
  const step_swapType = 1; // uniswap swap
  const step_extraParam1 = () => 0;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || UNISWAPV2_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
    directFundNextPool,
    directFundThisPool,
  });
};

const generateEncodedSushiSwapRoute = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null,
  directFundNextPool = 0,
  directFundThisPool = 0
) => {
  const step_swapType = 1; // uniswap/sushiswap swap
  const step_extraParam1 = () => 0;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || SUSHISWAP_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
    directFundNextPool,
    directFundThisPool,
  });
};
// Fraxswap end

// Uniswap V3 start

const uniswapV3PoolAbi =
  require("../../../artifacts/@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json").abi;

const queryPairsByTokenUniV3 = `query topPools($address: Bytes!) {
  asToken0: pools(
    first: 200
    orderBy: totalValueLockedUSD
    orderDirection: desc
    where: {token0: $address}
    subgraphError: allow
  ) {
    id
    __typename
  }
  asToken1: pools(
    first: 200
    orderBy: totalValueLockedUSD
    orderDirection: desc
    where: {token1: $address}
    subgraphError: allow
  ) {
    id
    __typename
  }
}
`;

const callGraphForUniswapV3Pairs = async (address) => {
  const { fetch } = require("cross-fetch");
  const {
    data: { asToken0, asToken1 },
  } = await fetch(
    "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-subgraph",
    {
      headers: {
        accept: "*/*",
        "accept-language": "en-US,en;q=0.9,zh;q=0.8,ko;q=0.7",
        "cache-control": "no-cache",
        "content-type": "application/json",
        pragma: "no-cache",
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="102", "Google Chrome";v="102"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        Referer: "https://info.uniswap.org/",
        "Referrer-Policy": "strict-origin-when-cross-origin",
      },
      body: JSON.stringify({
        operationName: "topPools",
        query: queryPairsByTokenUniV3,
        variables: {
          address,
        },
      }),
      method: "POST",
    }
  ).then((data) => data.json());
  const allPairs = [...asToken0, ...asToken1].map((p) => p.id);
  console.log(`theGraph found ${allPairs.length} pairs`);
  return allPairs;
};

const getUniswapV3Pools = async (chainName) => {
  const specificPools = (
    await Promise.all(
      relevantTokens.map(async (tAddr) => {
        return await callGraphForUniswapV3Pairs(tAddr);
      }, [])
    )
  ).reduce((r, tokenArray) => {
    return [...r, ...tokenArray];
  }, []);

  const pools = [];
  for (let i = 0; i < specificPools.length; i++) {
    const address = specificPools[i];
    const poolContract = await getContract(address, uniswapV3PoolAbi);
    let name = "UniV3";
    let token0;
    let token1;
    let fee;
    try {
      fee = await poolContract.fee(callOpts);
      token0 = await poolContract.token0(callOpts);
      token1 = await poolContract.token1(callOpts);
    } catch {
      console.log("error univ3 pool: ", address);
      continue;
    }
    let token0Symbol = token0;
    let token1Symbol = token1;
    try {
      const token0Contract = await getContract(token0, ERC20Abi);
      token0Symbol = await token0Contract.symbol(callOpts);
    } catch {
      try {
        const token0Contract = await getContract(token0, mkrERC20Abi);
        token0Symbol = ethers.utils.toUtf8String(
          await token0Contract.symbol(callOpts)
        );
      } catch {
        // ignore
      }
    }
    try {
      const token1Contract = await getContract(token1, ERC20Abi);
      token1Symbol = await token1Contract.symbol(callOpts);
    } catch {
      try {
        const token1Contract = await getContract(token1, mkrERC20Abi);
        token1Symbol = ethers.utils.toUtf8String(
          await token1Contract.symbol(callOpts)
        );
      } catch {
        // ignore
      }
    }
    name += ` ${token0Symbol}/${token1Symbol}`;
    const pool = {
      name,
      symbol: name,
      address,
      coins: [token0, token1],
      underlying_coins: [token0, token1],
      token0Symbol,
      token1Symbol,
      fee,
      swapType: 2,
    };
    pools.push(pool);
  }

  const jsVariableName = "UNISWAPV3_POOLS";
  const outputFileName = `${chainName}OutputUniswapV3`;
  await outputPoolsToFile(pools, jsVariableName, outputFileName);
};

const generateEncodedUniswapV3Route = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  fee = null,
  poolsOverride = null,
  directFundNextPool = 0,
  directFundThisPool = 0
) => {
  const step_swapType = 2; // uniswap v3 swap
  const step_extraParam1 = () => 0;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || UNISWAPV3_POOLS,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
    fee,
    directFundNextPool,
    directFundThisPool,
  });
};

// Uniswap V3 end

// FPIController start

const generateEncodedFPIControllerRoute = async (
  tokenFrom,
  tokenTo,
  combiSwapRouter,
  percentOfHop = 10000,
  poolsOverride = null
) => {
  const step_swapType = 7; // fpi mint/redeem
  const step_extraParam1 = () => 0;
  const step_extraParam2 = () => 0;

  return await generateEncodedStep({
    tokenFrom,
    tokenTo,
    combiSwapRouter,
    POOLS: poolsOverride || FPIControllerPools,
    swapType: step_swapType,
    extraParam1: step_extraParam1,
    extraParam2: step_extraParam2,
    percentOfHop,
  });
};

// FPIController end

// Route Generation start

const toLowerArrayIncludes = (array, search) => {
  return array.map((p) => p.toLowerCase()).includes(search.toLowerCase());
};

const getAvailableRoutes = async (tokenFrom, tokenTo, maxDepth) => {
  const allPools = [
    ...CURVE_METAPOOLS.filter((p) =>
      relevantTokens.some((t) =>
        p.underlying_coins.some((uc) => uc.toLowerCase() === t.toLowerCase())
      )
    ).map((p) => {
      p.type = "curve";
      return p;
    }),
    ...SADDLE_POOLS.filter((p) =>
      relevantTokens.some((t) =>
        p.underlying_coins.some((uc) => uc.toLowerCase() === t.toLowerCase())
      )
    ).map((p) => {
      p.type = "saddle";
      return p;
    }),
    ...FRAXSWAP_POOLS.map((p) => {
      p.type = "fraxswap";
      return p;
    }),
    ...UNISWAPV2_POOLS.map((p) => {
      p.type = "uniswapv2";
      return p;
    }),
    ...SUSHISWAP_POOLS.map((p) => {
      p.type = "sushiswap";
      return p;
    }),
    ...UNISWAPV3_POOLS.map((p) => {
      p.type = "uniswapv3";
      return p;
    }),
    ...FPIControllerPools.map((p) => {
      p.type = "fpicontroller";
      return p;
    }),
  ];

  const startToken = { tokenIn: tokenFrom, edges: {} };
  const allRelevantTokens = [startToken];

  await findRoute(
    startToken,
    allPools,
    tokenTo,
    allRelevantTokens,
    [],
    0,
    maxDepth
  );

  return allRelevantTokens;
};

const filter0x0Addresses = (addressArray) =>
  addressArray.filter(
    (addr) =>
      addr.toLowerCase() !== "0x0000000000000000000000000000000000000000"
  );

const addToEdge = (
  prevToken,
  nextToken,
  currentEdge,
  poolAddress,
  allRelevantTokens,
  found = false
) => {
  if (found) currentEdge.found = true;
  let existingPrevToken = allRelevantTokens.find(
    (t) => t.tokenIn.toLowerCase() == prevToken.tokenIn.toLowerCase()
  );
  if (!existingPrevToken) {
    existingPrevToken = prevToken;
    allRelevantTokens.push(existingPrevToken);
  }

  if (!(nextToken in existingPrevToken.edges))
    existingPrevToken.edges[nextToken] = [];
  if (
    !existingPrevToken.edges[nextToken].find(
      (e) =>
        e.pool.toLowerCase() == poolAddress.toLowerCase() &&
        e.from.toLowerCase() == currentEdge.from.toLowerCase() &&
        e.to.toLowerCase() == currentEdge.to.toLowerCase()
    )
  ) {
    existingPrevToken.edges[nextToken].push(currentEdge);
    return true;
  }
  return true;
};

const liquidityTest = async (pool, swapAmount) => {
  // let poolContract;
  // switch (pool.swapType) {
  //   case 0:
  //   case 1:
  //     poolContract = await getContract(pool.address, fraxswapPairAbi);
  //   case 2:
  //     poolContract = await getContract(pool.address, uniswapV3PoolAbi);
  //   case 5:
  //     poolContract = await getContract(pool.address, metaPoolAbi);
  //   case 6:
  //     poolContract = await getContract(pool.address, saddleSwapPoolAbi);
  // }
  return true;
};

const findRoute = async (
  prevToken,
  poolsToSearch,
  tokenTo,
  allRelevantTokens,
  tokenPath,
  currentDepth,
  maxDepth
) => {
  const { tokenIn } = prevToken;
  tokenPath.push(tokenIn.toLowerCase());
  const possibleNextPools = poolsToSearch.filter((p) =>
    toLowerArrayIncludes(filter0x0Addresses(p.underlying_coins), tokenIn)
  );

  let goodPath = false;
  try {
    for (let possibleNextPool of possibleNextPools) {
      const nextTokensTo = filter0x0Addresses(
        possibleNextPool.underlying_coins
      ).filter((c) => c.toLowerCase() != tokenIn.toLowerCase());

      for (let nextTokenTo of nextTokensTo) {
        if (tokenPath.includes(nextTokenTo.toLowerCase())) {
          continue; // prevent loops of tokens
        }

        // if (!(await liquidityTest(possibleNextPool))) {
        //   continue; // liquidity heuristics are bad
        // }

        const currentEdge = {
          from: tokenIn.toLowerCase(),
          to: nextTokenTo.toLowerCase(),
          pool: possibleNextPool.address.toLowerCase(),
          poolName: possibleNextPool.name,
          type: possibleNextPool.type,
          swapType: possibleNextPool.swapType,
          fee: possibleNextPool?.fee,
        };
        if (nextTokenTo.toLowerCase() == tokenTo.toLowerCase()) {
          // found a tokenTo!
          goodPath = addToEdge(
            prevToken,
            nextTokenTo,
            currentEdge,
            possibleNextPool.address,
            allRelevantTokens,
            true
          );
          continue;
        } else if (currentDepth >= maxDepth) {
          continue; // too many hops
        }

        let nextTokenObj = allRelevantTokens.find(
          (t) => t.tokenIn.toLowerCase() == nextTokenTo.toLowerCase()
        );
        if (!nextTokenObj) {
          nextTokenObj = { tokenIn: nextTokenTo.toLowerCase(), edges: {} };
        }

        const goodSubPath = await findRoute(
          nextTokenObj,
          poolsToSearch.filter(
            (p) =>
              p.address.toLowerCase() != possibleNextPool.address.toLowerCase()
          ),
          tokenTo,
          allRelevantTokens,
          tokenPath,
          currentDepth + 1,
          maxDepth
        );

        if (goodSubPath) {
          // if (!(nextTokenTo in prevToken.edges))
          //   prevToken.edges[nextTokenTo] = [];
          // if (
          //   !prevToken.edges[nextTokenTo].find(
          //     (p) => p.pool.toLowerCase() == .toLowerCase()
          //   )
          // ) {
          //   prevToken.edges[nextTokenTo].push(currentEdge);
          // }
          addToEdge(
            prevToken,
            nextTokenTo,
            currentEdge,
            currentEdge.pool,
            allRelevantTokens
          );
          goodPath = true;
          // console.log("middle path: ", currentDepth, currentEdge);
        }
      }
    }
  } finally {
    tokenPath.pop();
  }

  return goodPath;
};

const outputSankeyJson = (allRelevantTokens) => {
  // Sankey Diagram start

  const edges = allRelevantTokens.reduce(
    (r, t) => [
      ...r,
      ...Object.values(t.edges).reduce((r, e) => [...r, ...e], []),
    ],
    []
  );

  const nodes = edges.reduce((r, e) => {
    if (!r.some((n) => n.address == e.to))
      r.push({ nodeType: "token", address: e.to });

    if (!r.some((n) => n.address == e.from))
      r.push({ nodeType: "token", address: e.from });

    if (!r.some((n) => n.address == e.pool))
      r.push({
        nodeType: "pool",
        poolName: e.poolName,
        address: e.pool,
        swapType: e.swapType,
        typeName: e.type,
        fee: e?.fee,
      });

    return r;
  }, []);

  const nodes_addresses = nodes.map((n) => n.address);

  const nodes_display = nodes.map((n) => {
    if (n.nodeType === "token") {
      return n.address;
    } else if (n.nodeType === "pool") {
      return `${n.poolName} (${n.typeName}) fee:${n?.fee ? n?.fee : ""}`;
    }
  });

  const links = edges.reduce((r, e) => {
    return [
      ...r,
      {
        source: nodes_addresses.indexOf(e.from),
        target: nodes_addresses.indexOf(e.pool),
        value: 1,
      },
      {
        source: nodes_addresses.indexOf(e.pool),
        target: nodes_addresses.indexOf(e.to),
        value: 1,
      },
    ];
  }, []);

  const config = {
    sankey: {
      nodes: nodes_display.map((n) => ({ name: n })),
      links: links,
    },
  };

  const listOutputFile = path.join(
    process.cwd(),
    `/test/Fraxswap/sankeyForRoute.json`
  );
  fse.writeFileSync(listOutputFile, JSON.stringify(config, null, 4), "utf8");

  // Sankey Diagram end
};

// Route Generation end

const oneInchPathfinderAlgo = async (
  fromTokenAddress = "0x853d955acef822db058eb8505911ed77f175b99e",
  toTokenAddress = "0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0",
  amountBN = parseUnits("1000000", 18),
  decimals = 18
) => {
  const amount = +ethers.utils.formatUnits(amountBN, 0);

  const { fetch } = require("cross-fetch");

  const protocolWhiteList =
    "SUSHI,UNISWAP_V2,UNISWAP_V3,SADDLE,CURVE,CURVE_V2,CURVE_V2_TWO_CRYPTO,CURVE_V2_YFI_2_ASSET,CURVE_V2_XAUT_2_ASSET,CURVE_V2_EURT_2_ASSET,CURVE_V2_EURS_2_ASSET,CURVE_V2_ETH_CVX,CURVE_V2_ETH_PAL,CURVE_V2_ETH_CRV,CURVE_V2_THRESHOLDNETWORK_2_ASSET,CURVE_V2_SPELL_2_ASSET,CURVE_V2_SGT_2_ASSET,FRAXSWAP";
  const protocols =
    "SUSHI,UNISWAP_V2,UNISWAP_V3,SADDLE,CURVE,CURVE_V2,CURVE_V2_TWO_CRYPTO,CURVE_V2_YFI_2_ASSET,CURVE_V2_XAUT_2_ASSET,CURVE_V2_EURT_2_ASSET,CURVE_V2_EURS_2_ASSET,CURVE_V2_ETH_CVX,CURVE_V2_ETH_PAL,CURVE_V2_ETH_CRV,CURVE_V2_THRESHOLDNETWORK_2_ASSET,CURVE_V2_SPELL_2_ASSET,CURVE_V2_SGT_2_ASSET";

  const gasPrice = ethers.utils.formatUnits(
    await ethers.provider.getGasPrice(),
    0
  );

  const blockNumber = await ethers.provider.getBlockNumber();

  const url = `https://pathfinder.1inch.io/v1.2/chain/1/router/v4/quotes?deepLevel=2&mainRouteParts=10&parts=50&virtualParts=50&walletAddress=null&fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount.toLocaleString(
    "fullwide",
    { useGrouping: false }
  )}&gasPrice=${gasPrice}&protocolWhiteList=${protocolWhiteList}&protocols=${protocols}&deepLevels=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&mainRoutePartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&partsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1&virtualPartsList=1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1`;
  console.log("1inch url", url);

  const res = await fetch(url, {
    headers: {
      accept: "application/json, text/plain, */*",
      Referer: "https://app.1inch.io/",
    },
    body: null,
    method: "GET",
  }).then((data) => data.json());

  const {
    bestResult: { gasUnitsConsumed, routes },
  } = res;

  const outputJson = {
    fromToken: fromTokenAddress,
    toToken: toTokenAddress,
    amountIn: amountBN.toString(),
    decimals,
    blockNumber,
    gasUnitsConsumed,
    routes,
  };

  const listOutputFile = path.join(
    process.cwd(),
    `/test/Fraxswap/fraxswap-router/1inch-saved-routes/1inchOutput.json`
  );
  fse.writeFileSync(
    listOutputFile,
    JSON.stringify(outputJson, null, 4),
    "utf8"
  );

  return { gasUnitsConsumed, routes };
};

const convert1InchRouteToFraxswapRoute = async (
  oneInchRoute,
  fraxswapRouterV2
) => {
  const allRoutes = [];
  for (let topRoutes of oneInchRoute.routes) {
    let prevRoute = null;
    for (let subRoute of topRoutes.subRoutes.slice().reverse()) {
      const RouteSteps = [];
      let toToken;
      for (let step of subRoute) {
        toToken = step.meta.toTokenAddress;
        const pct = Math.floor((step.part * 10000) / 50);
        // console.log("step pct", pct);
        const poolOverride = [
          {
            address: step.market.id,
            underlying_coins: [
              step.meta.fromTokenAddress,
              step.meta.toTokenAddress,
            ],
          },
        ];
        let encodingObj;
        if (step.market.name == "FRAXSWAP") {
          encodingObj = await generateEncodedFraxswapRoute(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride
          );
        } else if (step.market.name == "UNISWAP_V2") {
          encodingObj = await generateEncodedUniswapV2Route(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride
          );
        } else if (step.market.name == "SUSHI") {
          encodingObj = await generateEncodedSushiSwapRoute(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride
          );
        } else if (step.market.name == "UNISWAP_V3") {
          encodingObj = await generateEncodedUniswapV3Route(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            null,
            poolOverride
          );
        } else if (step.market.name.startsWith("SADDLE")) {
          encodingObj = await generateEncodedSaddleRoute(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride,
            () => step.meta.fromTokenIndex,
            () => step.meta.toTokenIndex
          );
        } else if (step.market.name.startsWith("CURVE_V2")) {
          encodingObj = await generateEncodedCurveRouteV2(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride,
            () => step.meta.fromTokenIndex,
            () => step.meta.toTokenIndex
          );
        } else if (step.market.name == "CURVE") {
          encodingObj = await generateEncodedCurveRoute(
            step.meta.fromTokenAddress,
            step.meta.toTokenAddress,
            fraxswapRouterV2,
            pct,
            poolOverride,
            () => step.meta.fromTokenIndex,
            () => step.meta.toTokenIndex
          );
        } else {
          // new type we did not handle
          console.log("step", step);
          throw "HANDLE THIS STEP";
        }
        RouteSteps.push(encodingObj.encodedStep);
      }
      let pctRoute = 10000;
      if (topRoutes.subRoutes.indexOf(subRoute) == 0) {
        pctRoute = (topRoutes.part * 10000) / 10;
        // console.log('pctRoute', pctRoute);
      }
      prevRoute = await fraxswapRouterV2.encodeRoute(
        toToken,
        pctRoute,
        RouteSteps,
        prevRoute ? [prevRoute] : []
      );
    }
    allRoutes.push(prevRoute);
  }
  routeFirstEncoded = await fraxswapRouterV2.encodeRoute(
    ethers.constants.AddressZero,
    10000, // 100%
    [],
    allRoutes
  );
  return routeFirstEncoded;
};

module.exports = {
  // query & generate pools
  getContract,
  getCurvePools,
  getSaddlePools,
  getFraxswapPools,
  getFraxswapV2Pools,
  getUniswapV2Pools,
  getSushiSwapPools,
  getUniswapV3Pools,

  // encoded routes
  generateEncodedWETHRoute,
  generateEncodedCurveRoute,
  generateEncodedCurveRouteV2,
  generateEncodedSaddleRoute,
  generateEncodedFraxswapRoute,
  generateEncodedFraxswapV2Route,
  generateEncodedUniswapV2Route,
  generateEncodedSushiSwapRoute,
  generateEncodedUniswapV3Route,
  generateEncodedFPIControllerRoute,

  // routing algos
  getAvailableRoutes,
  outputSankeyJson,
  oneInchPathfinderAlgo,
  convert1InchRouteToFraxswapRoute,
};
