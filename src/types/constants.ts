const BigNumber = require('bignumber.js');

export const BIG6 = new BigNumber("1e6");
export const BIG12 = new BigNumber("1e12");
export const BIG18 = new BigNumber("1e18");
export const ONE_E18 = 10**18;

// For getPastLogs
export const PAST_LOGS_BATCH_SIZE = 10000;

// FXS contract created in block 11465584
export const LAST_GOOD_FXS_BURNED_SYNC_BLOCK = 12474737; // 12340690
export const LAST_GOOD_LOCKED_STAKES_SYNC_BLOCK = 12432225;
export const LAST_GOOD_LOCKED_VEFXS_SYNC_BLOCK = 12377613;

export function omit(key, obj) {
  const { [key]: omitted, ...rest } = obj;
  return rest;
}

export type GraphTimeFrame = keyof typeof GraphTimeFramePack;
export const GraphTimeFramePack = { 
    'All Time': 1576800000,
    '1 Year': 31556952,
    '6 Months': 15778476,
    '3 Months': 7889238,
    '1 Month': 2629746,
    '1 Week': 604800,
    '1 Day': 86400,
    '8 Hours': 28800,
    '1 Hour': 3600,
    '15 Minutes': 900,
}

export const GraphTimeFramePackLowercased = { 
    'all-time': 1576800000,
    '1-year': 31556952,
    '6-months': 15778476,
    '3-months': 7889238,
    '1-month': 2629746,
    '1-week': 604800,
    '1-day': 86400,
    '8-hours': 28800,
    '1-hour': 3600,
    '15-minutes': 900,
}

export type LockedStakeBucket = keyof typeof LockedStakeBucketPack;
export const LockedStakeBucketPack = { 
    'Unlocked': { idx: 0, min: 0, max: 1 },
    '≤ 15 days': { idx: 1, min: 1, max: 1296000 },
    '15 - 30 Days': { idx: 2, min: 1296001, max: 2592000 },
    '30 - 60 Days': { idx: 3, min: 2592001, max: 5184000 },
    '60 - 90 Days': { idx: 4, min: 5184001, max: 7776000 },
    '90 Days - 180 Days': { idx: 5, min: 7776001, max: 15552000 },
    '180 Days - 1 Year': { idx: 6, min: 15552001, max: 31536000 },
    '1 Year - 2 Years': { idx: 7, min: 31536001, max: 63113904 },
    '2 Years - 3 Years': { idx: 8, min: 63113905, max: 94608000 },
    '3 Years - 4 Years': { idx: 9, min: 94608001, max: 900000000 }, // includes 9999 day locks
}

export type GraphTimeNumPoints = keyof typeof GraphTimeNumPointsPack;
export const GraphTimeNumPointsPack = { 
    'all-time': 1095,  // Assuming 3 years, each day
    '1-year': 365, // One point per day
    '6-months': 180, // One point per day
    '3-months': 180, // One point per half day
    '1-month': 120, // One point per 6 hrs
    '1-week': 126, // One point per 2 hrs
    '1-day': 96, // One point per 15 min
    '8-hours': 96, // One point per 5 min
    '1-hour': 120, // One point per 30 sec
    '15-minutes': 90, // One point per block (~15 seconds)
}

// Used to limit the return size of the data to it is faster
export type GraphTimeModulusPoints = keyof typeof GraphTimeNumPointsPack;
export const GraphTimeModulusPointsPack = { 
    'all-time': 20,
    '1-year': 10,
    '6-months': 10,
    '3-months': 5,
    '1-month': 4,
    '1-week': 3,
    '1-day': 2,
    '8-hours': 1,
    '1-hour': 1,
    '15-minutes': 1,
}

export const CollateralDetailsPack = { 
    'yUSD': {
        name: 'LP-yCurve',
		    dd_name: 'yCRV DAI+USDC+USDT+TUSD',
		    decimals: 18
    },
    'USDC': {
        name: 'USDC',
		    dd_name: 'USDC',
		    decimals: 18
    },
    'USDT': {
        name: 'USDT',
		    dd_name: 'USDT',
		    decimals: 18
    },
};

export const COLLATERAL_TYPES = Object.keys(CollateralDetailsPack);

export const StakeChoices = {
  'Curve FRAX3CRV-f-2': {
      logo: 'curve',
      name: 'Curve FRAX3CRV-f-2',
      label: 'Curve FRAX3CRV-f V2 (Metapool)',
      oracle: 'CURVE_FRAX_DAI_USDC_USDT',
      info_link: 'https://curve.fi/frax/stats',
      add_liq_link: 'https://curve.fi/frax/deposit',
      trade_link: 'https://curve.fi/frax/',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: true,
      dual_rewards: false,
      token1_symbol: 'CRV',
      token1_coingecko_ticker: 'curve-dao-token',
      chain: 'ethereum',
      version: 2
  },
  'PancakeSwap FRAX/FXS': {
    logo: 'pancakeswap',
    name: 'PancakeSwap FRAX/FXS',
    label: 'PancakeSwap FRAX/FXS',
    oracle: 'PANCAKESWAP_FRAX_FXS',
    info_link: 'https://pancakeswap.info/pair/0x444be928a0091affe2be000f3ff904bc51b0172c',
    add_liq_link: 'https://exchange.pancakeswap.finance/#/add/0x29ced01c447166958605519f10dcf8b0255fb379/0xde2f075f6f14eb9d96755b24e416a53e736ca363',
    trade_link: 'https://exchange.pancakeswap.finance/#/swap?inputCurrency=0x29ced01c447166958605519f10dcf8b0255fb379&outputCurrency=0xde2f075f6f14eb9d96755b24e416a53e736ca363',
    precision_to_show: 6,
    staking_enabled: true,
    fxs_rewards: true,
    dual_rewards: false,
    token1_symbol: 'CAKE',
    token1_coingecko_ticker: 'pancakeswap-token',
    chain: 'bsc',
    version: 2
  },
  'Sushi FRAX/FXS': {
      logo: 'sushiswap',
      name: 'Sushi FRAX/FXS',
      label: 'SushiSwap FRAX/FXS',
      oracle: 'FRAX_FXS', // Should move to Sushi oracle later?
      info_link: 'https://analytics.sushiswap.fi/pairs/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
      add_liq_link: 'https://app.sushiswap.fi/pair/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
      trade_link: 'https://app.sushiswap.fi/pair/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: false,
      dual_rewards: true,
      token1_symbol: 'SUSHI',
      token1_coingecko_ticker: 'sushi',
      chain: 'ethereum',
      version: 1
  },
  'Sushi FXS/WETH': {
      logo: 'sushiswap',
      name: 'Sushi FXS/WETH',
      label: 'SushiSwap FXS/WETH',
      oracle: 'FXS_WETH', // Should move to Sushi oracle later?
      info_link: 'https://analytics.sushiswap.fi/pairs/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
      add_liq_link: 'https://app.sushiswap.fi/pair/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
      trade_link: 'https://app.sushiswap.fi/pair/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: false,
      dual_rewards: true,
      token1_symbol: 'SUSHI',
      token1_coingecko_ticker: 'sushi',
      chain: 'ethereum',
      version: 1
  },
  'Uniswap FRAX/USDC': {
      logo: 'uniswap',
      name: 'Uniswap FRAX/USDC',
      label: 'Uniswap FRAX/USDC',
      oracle: 'FRAX_USDC',
      info_link: "https://v2.info.uniswap.org/pair/0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d",
      add_liq_link: 'https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: true,
      dual_rewards: false,
      chain: 'ethereum',
      version: 1
  },
  'Uniswap FRAX/WETH': {
      logo: 'uniswap',
      name: 'Uniswap FRAX/WETH',
      label: 'Uniswap FRAX/WETH',
      oracle: 'FRAX_WETH',
      info_link: "https://v2.info.uniswap.org/pair/0xfd0a40bc83c5fae4203dec7e5929b446b07d1c76",
      add_liq_link: 'https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/ETH',
      trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=ETH',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: true,
      dual_rewards: false,
      chain: 'ethereum',
      version: 1
  },
  'Uniswap FRAX/FXS': {
      logo: 'uniswap',
      name: 'Uniswap FRAX/FXS',
      label: 'Uniswap FRAX/FXS',
      oracle: 'FRAX_FXS',
      info_link: "https://v2.info.uniswap.org/pair/0xe1573b9d29e2183b1af0e743dc2754979a40d237",
      add_liq_link: 'https://app.uniswap.org/#/add/0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0/0x853d955acef822db058eb8505911ed77f175b99e',
      trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0&outputCurrency=0x853d955acef822db058eb8505911ed77f175b99e',
      precision_to_show: 6,
      staking_enabled: true,
      fxs_rewards: true,
      dual_rewards: false,
      chain: 'ethereum',
      version: 1
  },
  'Uniswap FXS/WETH': {
      logo: 'uniswap',
      name: 'Uniswap FXS/WETH',
      label: 'Uniswap FXS/WETH [Deprecated]',
      oracle: 'FXS_WETH',
      info_link: "https://v2.info.uniswap.org/pair/0xecba967d84fcf0405f6b32bc45f4d36bfdbb2e81",
      add_liq_link: 'https://app.uniswap.org/#/add/0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0/ETH',
      trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0&outputCurrency=ETH',
      precision_to_show: 6,
      staking_enabled: false,
      fxs_rewards: true,
      dual_rewards: false,
      chain: 'ethereum',
      version: 1
  },
  'Uniswap FRAX/IQ': {
    logo: 'uniswap',
    name: 'Uniswap FRAX/IQ',
    label: 'Uniswap FRAX/IQ',
    oracle: 'FRAX_FXS',
    info_link: "https://v2.info.uniswap.org/pair/0xd6c783b257e662ca949b441a4fcb08a53fc49914",
    add_liq_link: 'https://app.uniswap.org/#/add/v2/0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0/0x579cea1889991f68acc35ff5c3dd0621ff29b0c9',
    trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0&outputCurrency=0x579cea1889991f68acc35ff5c3dd0621ff29b0c9',
    precision_to_show: 6,
    staking_enabled: true,
    fxs_rewards: true,
    dual_rewards: true,
    token1_symbol: 'IQ',
    token1_coingecko_ticker: 'everipedia',
    token1_logo: 'everipedia',
    chain: 'mainnet',
    external_contract: false,
    version: 3
  },
  'Uniswap FRAX/OHM': {
    logo: 'uniswap',
    name: 'Uniswap FRAX/OHM',
    label: 'Uniswap FRAX/OHM',
    oracle: 'FRAX_FXS',
    info_link: "https://v2.info.uniswap.org/pair/0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877",
    add_liq_link: 'https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0x383518188c0c6d7730d91b2c03a03c837814a899',
    trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x383518188c0c6d7730d91b2c03a03c837814a899',
    precision_to_show: 9,
    staking_enabled: true,
    fxs_rewards: true,
    dual_rewards: true,
    token1_symbol: 'OHM',
    token1_coingecko_ticker: 'olympus',
    token1_logo: 'olympus',
    chain: 'mainnet',
    external_contract: false,
    version: 4
  },
  'Curve FRAX-DAI-USDC-USDT': {
    logo: 'curve',
    name: 'Curve FRAX-DAI-USDC-USDT',
    label: 'Curve FRAX-DAI-USDC-USDT V1 [Deprecated]',
    oracle: 'CURVE_FRAX_DAI_USDC_USDT',
    info_link: 'https://crv.finance/',
    add_liq_link: 'https://crv.to/pool',
    trade_link: 'https://crv.to/swap',
    precision_to_show: 6,
    staking_enabled: true,
    fxs_rewards: true,
    dual_rewards: false,
    token1_symbol: 'CRV',
    token1_coingecko_ticker: 'curve-dao-token',
    chain: 'ethereum',
    version: 1
  },
};

export const GovernanceHistoryCodes = { 
    "Created": 0,
    "Active": 1,
    "Rejected": 2,
    "Succeeded": 3,
    "Queued": 4,
    "Executed": 5
}

export const govHistStringFromCode = (code: number) => {
    const theKeys = Object.keys(GovernanceHistoryCodes);
    for (let i = 0; i < theKeys.length; i++){
        const key = theKeys[i];
        if (GovernanceHistoryCodes[key] == code) return key;
    }
    return null;
}

export const INVESTOR_ALLOCATIONS = {
  'Investor_V1': [
      { title: "Unallocated", big_base: BIG6, symbol: 'USDC' },
      { title: "yearn", big_base: BIG6, symbol: 'USDC' },
      { title: "AAVE", big_base: BIG6, symbol: 'USDC' },
      { title: "Compound", big_base: BIG6, symbol: 'USDC' },
      { title: "Total", big_base: BIG6, symbol: 'USDC' }
  ],
  'Investor_V2': [
    { title: "Unallocated", big_base: BIG6, symbol: 'USDC' },
    { title: "yearn", big_base: BIG6, symbol: 'USDC' },
    { title: "AAVE", big_base: BIG6, symbol: 'USDC' },
    { title: "Compound", big_base: BIG6, symbol: 'USDC' },
    { title: "Total", big_base: BIG6, symbol: 'USDC' }
  ],
  'LendingAMO_V1': [
      { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "crFRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "Staked FPT-FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "Free FPT-FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "Unwinding CFNX", big_base: BIG18, symbol: 'CFNX' },
      { title: "Claimable Unwound FNX", big_base: BIG18, symbol: 'FNX' },
      { title: "Free FNX", big_base: BIG18, symbol: 'FNX' },
      { title: "FNX Total", big_base: BIG18, symbol: 'FNX' },
      { title: "FRAX Total", big_base: BIG18, symbol: 'FRAX' },
      { title: "CollatDollarBalance", big_base: BIG18, symbol: 'USD' },
  ],
  'CurveAMO_V1': [
      { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: 'FRAX' },
      { title: "Total FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "Free Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: 'USDC' },
      { title: "Subtotal Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "Total Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: 'FRAX3CRV' },
      { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: 'FRAX3CRV' },
      { title: "3CRV Withdrawable", big_base: BIG18, symbol: '3CRV' },
  ],
  'CurveAMO_V2': [
      { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: 'FRAX' },
      { title: "Total FRAX", big_base: BIG18, symbol: 'FRAX' },
      { title: "Free Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: 'USDC' },
      { title: "Subtotal Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "Total Collateral", big_base: BIG6, symbol: 'USDC' },
      { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: 'FRAX3CRV' },
      { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: 'FRAX3CRV' },
      { title: "3CRV Withdrawable", big_base: BIG18, symbol: '3CRV' },
      { title: "FRAX3CRV-2-f in Gauge", big_base: BIG18, symbol: 'FRAX3CRV' },
      { title: "FRAX3CRV-2-f lent to Voter", big_base: BIG18, symbol: 'FRAX3CRV' },
  ],
  'CurveAMO_V3': [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
    { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: 'FRAX' },
    { title: "Total FRAX", big_base: BIG18, symbol: 'FRAX' },
    { title: "Free Collateral", big_base: BIG6, symbol: 'USDC' },
    { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: 'USDC' },
    { title: "Subtotal Collateral", big_base: BIG6, symbol: 'USDC' },
    { title: "Total Collateral", big_base: BIG6, symbol: 'USDC' },
    { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: 'FRAX3CRV' },
    { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: 'FRAX3CRV' },
    { title: "3CRV Withdrawable", big_base: BIG18, symbol: '3CRV' },
    { title: "USD Value in Vault", big_base: BIG18, symbol: 'USD' },
]
};

export const INVESTOR_REWARDS = {
  'Investor_V1': [
    { title: "COMP", big_base: BIG18, symbol: 'COMP' }
  ],
  'Investor_V2': [
    { title: "COMP", big_base: BIG18, symbol: 'COMP' },
    { title: "stkAAVE", big_base: BIG18, symbol: 'stkAAVE' },
    { title: "AAVE", big_base: BIG18, symbol: 'AAVE' }
  ],
  'LendingAMO_V1': [
    { title: "FNX", big_base: BIG18, symbol: 'FNX' }
  ],
  'CurveAMO_V1': [
    { title: "CRV", big_base: BIG18, symbol: 'CRV' }
  ]
};


export const CONTRACT_ADDRESSES = {
  mainnet: {
    main: {
      FRAX: '0x853d955aCEf822Db058eb8505911ED77F175b99e',
      FXS: '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
      FXB: '',
      vesting: 'NOT_DEPLOYED_YET',
      veFXS: '0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0', // Old: '0xcb75A1655c84589652D0f3A4605e5dDA8431F0a6'
    },
    weth: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    oracles: {
      FRAX_WETH: '0x9b1A56A2E7164c43384448d82253781c1318A77E',  // V1: 0xD18660Ab8d4eF5bE062652133fe4348e0cB996DA
      // FRAX_USDC: '0x2E45C589A9F301A2061f6567B9F432690368E3C6',  // V1: 0x2AD064cEBA948A2B062ba9AfF91c98B9F0a1f608
      // FRAX_FXS: '0x4b85bD29f71b364ae6183C9721Ae5f596E7Bfd3d',  // V1: 0xD0435BF68dF2B516C6382caE8847Ab5cdC5c3Ea7
      FXS_WETH: '0x3B11DA52030420c663d263Ad4415a8A02E5f8cf8', // V1: '0x9e483C76D7a66F7E1feeBEAb54c349Df2F00eBdE'
      // FXS_USDC: '0x1F70Af31D041f9C183E23EC6809c04eb8CA006a4', //V1: 0x28fdA30a6Cf71d5fC7Ce17D6d20c788D98Ff2c46
      USDC_WETH: '0x69B9E922ecA72Cda644a8e32B8427000059388c6', // V1: '0x5e48C34f1005a514DaF0E1aEc53Dbb70fdC2C9F9'
      FRAX_USDC: '0x2E45C589A9F301A2061f6567B9F432690368E3C6',  // V1: 0x2AD064cEBA948A2B062ba9AfF91c98B9F0a1f608
    },
    oracles_other: {
      FRAX_FXS: '0x4b85bD29f71b364ae6183C9721Ae5f596E7Bfd3d',  // V1: 0xD0435BF68dF2B516C6382caE8847Ab5cdC5c3Ea7
      FXS_USDC: '0x1F70Af31D041f9C183E23EC6809c04eb8CA006a4', //V1: 0x28fdA30a6Cf71d5fC7Ce17D6d20c788D98Ff2c46
      FXS_USDC_PAIR: '0x9BAC32D4f3322bC7588BB119283bAd7073145355'
    },
    pid_related: {
      pid_controller: "0x6de667F424E2b1b8fD39fC2e1b9a14c0103E9879", // V1: "0x60A315E04419290449dB4866481cb33d39df03A3",
      reserve_tracker: "0x7215F84FE2f2F1726fFb42da923f3F04A72CF5E8" // V1: "0xF96882Dd0a4c8b2469084d2Db48768AA83B4a2f5"
    },
    investments: {
      "yearn_yUSDC_V2": '0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9',
      "aave_aUSDC_Pool": '0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9',
      "aave_aUSDC_Token": '0xBcca60bB61934080951369a648Fb03DF4F96263C',
      "compound_cUSDC": '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
      "compound_Controller": '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
      "cream_crFRAX": '0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5',
      "fnx_FPT_FRAX": '0x39ad661bA8a7C9D3A7E4808fb9f9D5223E22F763',
      "fnx_FPT_B": '0x7E605Fb638983A448096D82fFD2958ba012F30Cd', // B = FNX
      'fnx_IntegratedStake': '0x23e54F9bBe26eD55F93F19541bC30AAc2D5569b2',
      'fnx_MinePool': '0x4e6005396F80a737cE80d50B2162C0a7296c9620',
      'fnx_TokenConverter': '0x955282b82440F8F69E901380BeF2b603Fba96F3b',
      'fnx_ManagerProxy': '0xa2904Fd151C9d9D634dFA8ECd856E6B9517F9785',
      'fnx_CFNX': '0x9d7beb4265817a4923FAD9Ca9EF8af138499615d',
      // "bzx_iUSDC_Fulcrum": '0x32e4c68b3a4a813b710595aeba7f6b7604ab9c15',
      // "keeper_Pool_V2": '0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E',
      // "keeper_kUSDC_Token": '0xac826952bc30504359a099c3a486d44E97415c77',
      // "harvest_fUSDC": '0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE',
      // "harvest_DepositHelper": '0xF8ce90c2710713552fb564869694B2505Bfc0846',
      // "harvest_NoMintRewardPool": '0x4F7c28cCb0F1Dbd1388209C67eEc234273C878Bd'
    },
    collateral: {
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 
      USDC_V2: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7'
    },
    governance: '0xd74034C6109A23B6c7657144cAcBbBB82BDCB00E',
    bond_issuers: {
      issuer_v1: ''
    },
    pools: {
      USDC: '0x3C2982CA260e870eee70c423818010DfeF212659',
      USDC_V2: '0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d',
      USDT: '0x7d3FCd3825AE54E8E8FFD3d0ce95882330d54968'
    },
    uniswap_other: {
      router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
      factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
      v3_positions_NFT: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'
    },
    pricing: { 
      swap_to_price: '0xa61cBe7E326B13A8dbA11D00f42531BE704DF51B', 
      chainlink_eth_usd: '0xBa6C6EaC41a24F9D39032513f66D738B3559f15a',
      chainlink_fxs_usd: '0x679a15fe8B2108fdA30f292C92abCDE3a1246324'
      
    },
    bridges: {
      eth_side: {
        frax: {
          avalanche: "",
          bsc: "0x533e3c0e6b48010873B947bddC4721b1bDFF9648",
          fantom: "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE",
          polygon: "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf",
          xdai: "0x88ad09518695c6c3712ac10a214be5109a655671"
        },
        fxs: {
          avalanche: "",
          bsc: "",
          fantom: "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE",
          polygon: "0x40ec5B33f54e0E8A33A975908C5BA1c14e5BbbDf"
        }
      },
      other_side: {
        frax: {
          avalanche: "0xDC42728B0eA910349ed3c6e1c9Dc06b5FB591f98",
          bsc: "0x29cED01C447166958605519F10DcF8b0255fB379",
          fantom: "0xaf319E5789945197e365E7f7fbFc56B130523B33",
          polygon: "0x104592a158490a9228070E0A8e5343B499e125D0"
        },
        fxs: {
          avalanche: "0xD67de0e0a0Fd7b15dC8348Bb9BE742F3c5850454",
          bsc: "0xDE2F075f6F14EB9D96755b24E416A53E736Ca363",
          fantom: "0x82F8Cb20c14F134fe6Ebf7aC3B903B2117aAfa62",
          polygon: "0x3e121107F6F22DA4911079845a470757aF4e1A1b"
        }
      }
    },
    misc: {
      timelock: '0x8412ebf45bAC1B340BbE8F318b928C466c4E39CA',
      migration_helper: '0xe16723A08Ae054a8F20BDc0395389569011e78D6',
      mint_utilities: '0xE054C1ab5D548E0144ab3F89a8f5809137819906',
      staking_utilities: '0xE4de6E1DF1FE135D6462554d0Fd36A14d787f689',
      investor_amo_V1: '0xEE5825d5185a1D512706f9068E69146A54B6e076',
      investor_amo: '0xB8315Af919729c823B2d996B1A6DDE381E7444f1', // Old proxy: 0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4
      // investor_amo_impl: '0xde3c8aa7f53a69c595b7720045000a68cb9cb341', // Old V3: 0xEccA5a27B4f8f92a2bFFd006F20168A7188C0A0C, Old V2: '0xEE5825d5185a1D512706f9068E69146A54B6e076', // Old: 0xe09394AE14d7c3b1798e4dbEa4c280973B2689A4
      // investor_amo_admin: '0x069c24600c2A03147D4E1D9b04d193151676F577',
      lending_amo: '0x9507189f5B6D820cd93d970d67893006968825ef', // Old: 0xDA9d06166c2085988920Fb35EB2d322B4aaDF1EE
      curve_amo_V1: '0xbd061885260F176e05699fED9C5a4604fc7F2BDC',
      curve_amo_V2: '0xD103FEf74D05FbC20B5184FE85c7187735355DB3', //0xeF8c0b4902b985bF64B8cfF6BbCD0AC1FDc8d5d3', // Proxy: '0x7e983e4f98b16cee76f8f9a6a1e87b5861de8769'
      curve_amo: '0x72170Cdc48C33a6AE6B3E83CD387ca3Fb9105da2', // Impl: 0xC3204838aF4CE0597476aDF367B4C9a3cf9a1B51
      // curve_amo_impl: '0x5840db064e17480f8e8e74fd6714c9c316f7ddfe', // Old2: 0xbd061885260F176e05699fED9C5a4604fc7F2BDC', Old1: 0x77746DC37Deae008c7149EDc1b1A8D6d63e08Be5, Old2: 0x25e9702359bAf56E505F0BA981eeBFA23ceB030A, Old3: 0x19a47F38D39692617C9D9012eC0176C9ead00a5e
      curve_amo_admin: '0x900909C07c2761d84C5d863FF5905102916DF69C',
      fxs_1559_amo: '0x9C6a04871D11b33645ab592f68C41bb2B41F51EE', // Old1: '0xaf02be5968D8Fe9536e24E4c7e888C59A58Bc077'
      fxs_1559_amo_v2: '0xC80C48862E4254F37047235298eDb6AA35717C24', // Proxy
      // fxs_1559_amo_v2_impl: '0xCDe9A4e885B87a893b8817D136FD2F404B54294f'.
      fxs_1559_amo_v2_admin: '0xCaa487D113ad1C34Ce128c4f3a2A437614C6a692', // Proxy admin
      frax_gauge_v2: '0x72e158d38dbd50a483501c24f792bdaaa3e7d55c',
      crvFRAX_vault: '0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139',
      multisig: '0xFa27873EA2F0eA9DcD2052848C4A7F8ADE8a3936',
      vefxs_yield_distributor: "0x19a0a70a68fbC604Bf20A03b787df8f7AC1d50f0",
      vefxs_yield_distributor_v2: "0x62C4cf364078C98fA08AfDB4D3d8D87e780Ebd45",
      frax3crv_curve_fxs_distributor: "0xBBbAf1adf4d39B2843928CCa1E65564e5ce99ccC"
    
    },
    libraries: {
      UniswapV2OracleLibrary: '0xeB85Dd2374a44F80342AcF8010d585Bda32B77a0',
      UniswapV2Library: '0xC805D4126C3Ac9d0AD7bb94c3D5cD72E3CbCd6f6',
      FraxPoolLibrary: '0xA11B9C88e4Bf89aD9A70f5d408ffB5A6d5FEb6A4',
      FraxPoolLibrary_V2: '0xe1C3218134E7c69f3443bbd96A5851d193224f78',
    },
    reward_tokens: {
      sushi: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
      curve_dao: '0xd533a949740bb3306d119cc777fa900ba034cd52',
      comp: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
      fnx: '0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B',
      iq: '0x579CEa1889991f68aCc35Ff5c3dd0621fF29b0C9',
      ohm: '0x383518188C0C6d7730D91b2c03a03C837814a899'
      // rook: '0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a',
      // farm: '0xa0246c9032bC3A600820415aE600c6388619A14D',
      // idle: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e'
    },
    pair_tokens: {
      'Uniswap FRAX/WETH': '0xFD0A40Bc83C5faE4203DEc7e5929B446b07d1C76',
      'Uniswap FRAX/USDC': '0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D',
      'Uniswap FRAX/FXS': '0xE1573B9D29e2183B1AF0e743Dc2754979A40D237',
      'Uniswap FXS/WETH': '0xecBa967D84fCF0405F6b32Bc45F4d36BfDBB2E81',
      'Uniswap FRAX/IQ': '0xd6c783b257e662ca949b441a4fcb08a53fc49914',
      'Uniswap FRAX/OHM': '0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877',
      'Sushi FRAX/FXS': '0xc218001e3D102e3d1De9bf2c0F7D9626d76C6f30',
      'Sushi FXS/WETH': '0x61eB53ee427aB4E007d78A9134AaCb3101A2DC23',
      // 'Curve FRAX-DAI-USDC-USDT': '0x83D2944d5fC10A064451Dc5852f4F47759F249B6', // Proxied Implementation: https://etherscan.io/address/0x2c7796c0590cc100d70af473993890d457cb2ac9#code
      'Curve FRAX3CRV-f-2': '0xd632f22692fac7611d2aa1c0d552930d43caed3b', // Proxied For: https://etherscan.io/address/0x5f890841f657d90e081babdb532a05996af79fe6

    },
    staking_contracts: {
      'Uniswap FRAX/WETH': '0xD875628B942f8970De3CcEaf6417005F68540d4f',
      'Uniswap FRAX/USDC': '0xa29367a3f057F3191b62bd4055845a33411892b6',
      'Uniswap FRAX/FXS': '0xda2c338350a0E59Ce71CDCED9679A3A590Dd9BEC',
      'Uniswap FXS/WETH': '0xDc65f3514725206Dd83A8843AAE2aC3D99771C88',
      'Uniswap FRAX/IQ': '0xF37057823910653a554d996B49E3399DC87fAE1b', // V1: '0x35fc5Fd90e06c47c0D9dEBfEDB1daF55bCE14E6d',
      'Uniswap FRAX/OHM': '0xfC77A420f56Dec53e3b91D7FC936902e132335FF',
      'Sushi FRAX/FXS': '0x35302f77E5Bd7A93cbec05d585e414e14B2A84a8',
      'Sushi FXS/WETH': '0x74C370990C1181303D20e9f0252437a97518B95B',
      // 'Curve FRAX-DAI-USDC-USDT': '0xB88107bFB7aa9b6A5eC8784374018073e76d4DF0',
      'Curve FRAX3CRV-f-2': '0xdFb6ef63eA2753C6598fcA1b220358F17E4d137e'
    }
  },
  bsc: {
    main: {
      FRAX: '0x29ced01c447166958605519f10dcf8b0255fb379',
      FXS: '0xde2f075f6f14eb9d96755b24e416a53e736ca363',
    },
    reward_tokens: {
      cake: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
    },
    pair_tokens: {
      'PancakeSwap FRAX/FXS': '0x444be928a0091affe2be000f3ff904bc51b0172c',
      // 'PancakeSwap FRAX/BUSD': '0x5C2c4df29748144A7177B4185828693FE375AF00',
    },
    staking_contracts: {
      'PancakeSwap FRAX/FXS': '0x0ab7aCDce918FbA1B17a9c8B086C8981F094909d',
    }
  }
  // ropsten: {
  //   main: {
  //     FRAX: '0x5cD30EC40b6da67B65cFCd7A6C8c692AE70232a4',
  //     FXS: '0xd7145834f0d3D2F47f441F9302A095bd607C408d',
  //     vesting: 'NOT_DEPLOYED_YET'
  //   },
  //   weth: '0x9533696FdAd12ed1FC7917e9b56A8d549Df5d2b9',
  //   oracles: {
  //     FRAX_WETH: '0x6B1cA4438cb8f5E2797A4FC4F6F26CC9FF36C322',
  //     FRAX_USDC: '0x0d28d4330fDC8eE043B4336edA75Ae0A6c5dEE20',
  //     FRAX_USDT: '0x2c4C60255019334f1D73EEf25894248e0F419b50',
  //     FRAX_FXS: '0xBca2ADab420BB3928eEc843fa2039384Bfb19FD4',
  //     FXS_WETH: '0x87634e2b8e326925d8375995681808D754e56481',
  //     FXS_USDC: '0xdAf03fB7A1440Bfc724b3C7F4CF047C3aA4510A9',
  //     FXS_USDT: '0xDB0eD8ba93bcae27b624FFD0673FA75db11b4082',
  //     USDC_WETH: '0x0E6ad3EB50Fdd0EBcd45506dbF950b7d145128cc',
  //     USDT_WETH: '0x18390B775fd488c31a29c4E413ea04814554cFad'
  //   },
  //   collateral: {
  //     USDC: '0x62463ed90eE009fbea795D1049D44992a3612c7A',
  //     USDT: '0xBdD17dE7975765bC79C15F76967e2B7981887DbF'
  //   },
  //   governance: '0x4a8368662339D69377FF5bA77560DC6B907bCD85',
  //   pools: {
  //     USDC: '0xE0Df8E66BaE4aDdb8ec53C351cEC99e8A7240759',
  //     USDT: '0x4e61CF85ec7Aef00d3Fc02784C40Ff07283c2ceC'
  //   },
  //   uniswap_other: {
  //     router: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
  //     factory: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f'
  //   },
  //   pricing: { swap_to_price: '0xfE421F7abb81Fc6D1E092a60139a12a3b6be8ba8' },
  //   misc: {
  //     timelock: '0x6648307DFA2604B78595a1711118f92b04028eB4',
  //     migration_helper: '0xe13822b795EC5c5dD248a1CdC7B923B7d8c701D0'
  //   },
  //   libraries: {
  //     UniswapV2OracleLibrary: '0x8A0C94E55d574C0652757C879BC89C9698076EF8',
  //     UniswapV2Library: '0x0E207C1332B7B9108417dE9134bd621CF212Db72',
  //     FraxPoolLibrary: '0x144E03F0eA54b67EB26C0CF5a06028E99670d0FB'
  //   },
  //   pair_tokens: {
  //     'Uniswap FRAX/WETH': '0x9A0b2d1C641561949f5f770711C3B05F86AB684e',
  //     'Uniswap FRAX/USDC': '0x2Fa9D5bd5B04f12bD5e7be02a59C281Df66c817f',
  //     'Uniswap FRAX/FXS': '0xC8b9A764d895E88F8D3383AeB599fE6F38503ef8',
  //     'Uniswap FXS/WETH': '0x02F823CDc4C1adE61C51346CEDFE0bB242f554C0'
  //   },
  //   staking_contracts: {
  //     'Uniswap FRAX/WETH': '0xE970806d91699eB59F08D849b248fc294302C05c',
  //     'Uniswap FRAX/USDC': '0xF02f75ffdA683fe98784E1CA048D779d5cE68174',
  //     'Uniswap FRAX/FXS': '0x7a646162bE361c2ae96d57920a06200544cf0c4F',
  //     'Uniswap FXS/WETH': '0x5B05E43546534f81CcBcb10D33B03Ac02fab1201'
  //   }
  // },
  // ganache: {
  //   main: {
  //     FRAX: '0x4c2a7b591668988C6db9184d9df9394846Bc492d',
  //     FXS: '0xc2Bb9a3ae435AC36cC1eD2c4F64910B0CF8d8ec6',
  //     vesting: '0x68565D3dDDEe130152536d39eeD3c22A6653E584'
  //   },
  //   weth: '0x9970c452f919b117b9A5dDa473Cf205B6446f104',
  //   oracles: {
  //     FRAX_WETH: '0xB6F388B031C74936c53d51Cd850b0a8A8879c136',
  //     FRAX_USDC: '0x3013CeBaF374D838426bb2f3EEF6DA86D2552c27',
  //     FRAX_USDT: '0x1a6B2699FE1E833C28C1c9CF69bc55b2aa4a821B',
  //     FRAX_6DEC: '0x0037b9708901674243F823bbCE425b455e1C7825',
  //     FRAX_FXS: '0xeb3d1033E0B1ADE4f122A0174142dD2827A29eFd',
  //     FXS_WETH: '0xD48FeeDBb2f79bCc61c1661Bb5C550dE5c03b052',
  //     FXS_USDC: '0xD234BD8098cECB9CcbFf4Bf997f9B77408EC7C78',
  //     FXS_USDT: '0x279dB552A0f507DCd6F073b8d687eF0927959DcF',
  //     FXS_6DEC: '0x687e2a83f24FA1584f7aC272Ef8f5F510ea8F0A9',
  //     USDC_WETH: '0x8564DA758dcb6577F87C6d9c1b53f13777018602',
  //     USDT_WETH: '0xeC5C28352B0e8F9Eaf12239c86996e964298d60c',
  //     '6DEC_WETH': '0x12711D46063C413dA53d079e88c757b003b3513e'
  //   },
  //   collateral: {
  //     USDC: '0xff0B79ff7E0d0f5530dbb7Fa351cF9914Ab3f4E9',
  //     USDT: '0xD2A6475d9434CdE3Be7cD36debDC51C187be7dbD',
  //     '6DEC': '0x24ce4B5c5209678452fe236BD58A2e64F1d970b6'
  //   },
  //   governance: '0xB6D19571bDC969673b7fA8080D5D80CD80b2D312',
  //   pools: {
  //     USDC: '0xeF6981031cCaFfc9B4761A1dc6C5adAa495438c1',
  //     USDT: '0x8c2B93A83D1f60329df986e4f4219830f8f0bE9d',
  //     '6DEC': '0xd32fE8cc271214d911003c0011dB1f9AD796602c'
  //   },
  //   uniswap_other: {
  //     router: '0x8Be085050e221bd8Db17489bD853800e600f6f58',
  //     factory: '0xF70bB588d44509a214Ad260C84BA0cfB031c29c5'
  //   },
  //   pricing: { swap_to_price: '0xeF2c3d7D30d2893b787c0546f9A97084b4A8F10b' },
  //   misc: {
  //     timelock: '0xaD98E1e5fe7B9e79783373faE69632390f7825A0',
  //     migration_helper: '0xe40a86Fb20E497B423ff88c8deA4aa9994D4dC62'
  //   },
  //   libraries: {
  //     UniswapV2OracleLibrary: '0xF9814413328Cc3B8B92Fd3B251461b34552f7f42',
  //     UniswapV2Library: '0x43098B53277892e7eb9Be480Ef7054124591cE16',
  //     FraxPoolLibrary: '0x992A40bfF600fd2A1B7C214F61904Db6931403af'
  //   },
  //   pair_tokens: {
  //     'Uniswap FRAX/WETH': '0x3483F272aba04b5dd819A4CdB3c4007dF909913c',
  //     'Uniswap FRAX/USDC': '0xfBf1D205ADC586ad469A5a1a2a9451B2b4Bf1243',
  //     'Uniswap FRAX/FXS': '0x7D6AD49359D3f9d0DCd7482FfD86B9C3b5a5a12D',
  //     // 'Uniswap FXS/WETH': '0x185c0F6A6e1D0998A22f3DA95BCc1F74b0A08Dd2'
  //   },
  //   staking_contracts: {
  //     'Uniswap FRAX/WETH': '0x13c9aE42c43DF2FB46218DF80b6Abad7D52a82C5',
  //     'Uniswap FRAX/USDC': '0x3b9c2b598589578e640627d8975De51ea7928918',
  //     'Uniswap FRAX/FXS': '0xd4119c5057237373c629eD9F83B79635a3e2e90b',
  //     // 'Uniswap FXS/WETH': '0x6135f354e143fbEB5fB159A76EB2590cf4f086b6'
  //   }
  // }
}








export { }; // Force this file to be a module