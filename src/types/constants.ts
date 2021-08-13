const BigNumber = require('bignumber.js');

export const BIG6 = new BigNumber("1e6");
export const BIG12 = new BigNumber("1e12");
export const BIG18 = new BigNumber("1e18");
export const ONE_E18 = 10**18;

// For getPastLogs
export const PAST_LOGS_BATCH_SIZE = 10000;
export const PAST_LOGS_BATCH_SIZE_BSC = 5000;
export const PAST_LOGS_BATCH_SIZE_POLYGON = 10000;

// FXS contract created in block 11465584
export const LAST_GOOD_FXS_BURNED_SYNC_BLOCK = 12474737; // 12340690
export const LAST_GOOD_LOCKED_STAKES_SYNC_BLOCK = 11465581; // Frax started around 11465581
export const LAST_GOOD_LOCKED_VEFXS_SYNC_BLOCK = 12377613; // Contract created at 12377613

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

export const StakeChoices: StakeChoices = {
	'Snowball S3F (FRAX + TUSD + USDT)': {
		lp_logo: 'snowball',
		label: 'Snowball S3F (FRAX + TUSD + USDT)',
		chain: 'avalanche',
		external_contract: true,
		farming_link: 'https://app.snowball.network/earn_v2/',
    staking_enabled: true,
		pool_tokens: ["FRAX", "TUSD", "USDT"],
		reward_tokens: ["SNOB"]
	},
	'SpiritSwap FRAX/FTM': {
		lp_logo: 'spiritswap',
		label: 'SpiritSwap FRAX/FTM',
		chain: 'fantom',
		external_contract: true,
		farming_link: 'https://app.spiritswap.finance/#/farms',
    staking_enabled: true,
		pool_tokens: ["FRAX", "FTM"],
		reward_tokens: ["SPIRIT"]
	},
	'SpiritSwap FRAX/FXS': {
		lp_logo: 'spiritswap',
		label: 'SpiritSwap FRAX/FXS',
		chain: 'fantom',
		external_contract: true,
		farming_link: 'https://app.spiritswap.finance/#/farms',
    staking_enabled: true,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["SPIRIT"]
	},
	'PancakeSwap FRAX/FXS': {
		lp_logo: 'pancakeswap',
		slug: "PancakeSwap_FRAX_FXS",
		label: 'PancakeSwap FRAX/FXS [Deprecated]',
		chain: 'bsc',
		info_link: 'https://pancakeswap.info/pair/0x444be928a0091affe2be000f3ff904bc51b0172c',
		add_liq_link: 'https://v1exchange.pancakeswap.finance/#/add/0x29ced01c447166958605519f10dcf8b0255fb379/0xde2f075f6f14eb9d96755b24e416a53e736ca363',
		trade_link: 'https://v1exchange.pancakeswap.finance/#/swap?inputCurrency=0x29ced01c447166958605519f10dcf8b0255fb379&outputCurrency=0xde2f075f6f14eb9d96755b24e416a53e736ca363',
		farming_link: 'https://app.frax.finance/staking#PancakeSwap_FRAX_FXS',
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS", "CAKE"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "pancakeswap-token"],
		version: 2
	},
	'QuickSwap FRAX/QUICK': {
		lp_logo: 'quickswap',
		label: 'QuickSwap FRAX/QUICK',
		chain: 'polygon',
		external_contract: true,
		farming_link: 'https://quickswap.exchange/#/quick',
    staking_enabled: true,
		pool_tokens: ["FRAX", "QUICK"],
		reward_tokens: ["QUICK"]
	},
	'QuickSwap FRAX/FXS': {
		lp_logo: 'quickswap',
		label: 'QuickSwap FRAX/FXS',
		chain: 'polygon',
		external_contract: true,
		farming_link: 'https://quickswap.exchange/#/quick',
    staking_enabled: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["QUICK"]
	},
	'Cream FRAX Lending': {
		lp_logo: 'cream',
		label: 'Cream FRAX Lending',
		chain: 'mainnet',
		external_contract: true,
		farming_link: 'https://app.cream.finance/',
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"]
	},
	'Yearn crvFRAX Vault (V2)': {
		lp_logo: 'yearn',
		label: 'Yearn crvFRAX Vault (V2)',
		chain: 'mainnet',
		external_contract: true,
		farming_link: 'https://yearn.finance/vaults/0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139',
    staking_enabled: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FRAX3CRV-f"]
	},
	'Curve FRAX3CRV-f-2': {
		lp_logo: 'curve',
		slug: "Curve_FRAX3CRV_F_2",
		label: 'Curve FRAX3CRV-f V2 (Metapool)',
		chain: 'mainnet',
		info_link: 'https://curve.fi/frax/stats',
		add_liq_link: 'https://curve.fi/frax/deposit',
		trade_link: 'https://curve.fi/frax/',
		farming_link: 'https://curve.fi/frax/deposit',
		staking_enabled: true,
		external_contract: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FXS", "CRV"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "curve-dao-token"],
		version: 2
	},
	'StakeDAO FRAX3CRV-f': {
		lp_logo: 'stakedao',
		label: 'StakeDAO FRAX3CRV-f',
		chain: 'mainnet',
		external_contract: true,
		farming_link: 'https://stakedao.org/0x0000000000000000000000000000000000000000/strategies',
    staking_enabled: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FRAX3CRV-f"]
	},
	'Convex FRAX3CRV-f': {
		lp_logo: 'convex',
		label: 'Convex FRAX3CRV-f',
		chain: 'mainnet',
		external_contract: true,
		farming_link: 'https://www.convexfinance.com/stake',
    staking_enabled: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FXS", "CRV", "CVX"]
	},
  'mStable FRAX/mUSD': {
		lp_logo: 'mstable',
		slug: "mStable_FRAX_mUSD",
		label: 'mStable FRAX/mUSD [Polygon]',
		chain: 'polygon',
		info_link: 'https://app.mstable.org/#/musd/pools',
		add_liq_link: 'https://app.mstable.org/#/musd/save',
		trade_link: 'https://app.mstable.org/#/musd/exchange/swap',
		farming_link: 'https://app.frax.finance/staking#mStable_FRAX_mUSD',
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "mUSD"],
		reward_tokens: ["FXS", "MTA"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "meta"],
		version: 5
	},
	'Saddle alUSD/FEI/FRAX/LUSD': {
		lp_logo: 'saddle',
		slug: "Saddle_alUSD_FEI_FRAX_LUSD",
		label: 'Saddle alUSD/FEI/FRAX/LUSD',
		chain: 'mainnet',
		info_link: 'https://saddle.exchange/#/pools',
		add_liq_link: 'https://saddle.exchange/#/pools/d4/deposit',
		trade_link: 'https://saddle.exchange/#/',
		farming_link: 'https://app.frax.finance/staking#Saddle_alUSD_FEI_FRAX_LUSD',
		staking_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "alUSD", "FEI", "LUSD"],
		reward_tokens: ["FXS", "TRIBE", "ALCX", "LQTY" ],
    reward_token_decimals: [18, 18, 18, 18],
		reward_token_coingecko_slugs: ["frax-share", "tribe-2", "alchemix", "liquity"],
		version: 100
	},
  'Saber wFRAX/USDC': {
		lp_logo: 'saber',
		label: 'Saber wFRAX/USDC',
		chain: 'solana',
		external_contract: true,
		farming_link: 'https://saber.so/#/farms/frax/stake',
		staking_enabled: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["SBR"]
	},
	'Sushi FRAX/FXS [Polygon]': {
		lp_logo: 'sushiswap',
		label: 'Sushi FRAX/FXS [Polygon]',
		chain: 'polygon',
		external_contract: true,
		farming_link: 'https://app.sushi.com/yield',
    staking_enabled: true,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["SUSHI", "MATIC"]
	},
	'Sushi FRAX/USDC [Polygon]': {
		lp_logo: 'sushiswap',
		label: 'Sushi FRAX/USDC [Polygon]',
		chain: 'polygon',
		external_contract: true,
		farming_link: 'https://app.sushi.com/yield',
    staking_enabled: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["SUSHI", "MATIC"]
	},
	'Sushi FRAX/FXS': {
		lp_logo: 'sushiswap',
		slug: "Sushi_FRAX_FXS",
		label: 'SushiSwap FRAX/FXS [Deprecated]',
		chain: 'mainnet',
		info_link: 'https://analytics.sushiswap.fi/pairs/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
		add_liq_link: 'https://app.sushiswap.fi/pair/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
		trade_link: 'https://app.sushiswap.fi/pair/0xc218001e3d102e3d1de9bf2c0f7d9626d76c6f30',
		farming_link: 'https://app.frax.finance/staking#Sushi_FRAX_FXS',
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS", "SUSHI"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "sushi"],
		version: 1,
	},
	'Sushi FXS/WETH': {
		lp_logo: 'sushiswap',
		slug: "Sushi_FXS_WETH",
		label: 'SushiSwap FXS/WETH [Deprecated]',
		chain: 'mainnet',
		info_link: 'https://analytics.sushiswap.fi/pairs/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
		add_liq_link: 'https://app.sushiswap.fi/pair/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
		trade_link: 'https://app.sushiswap.fi/pair/0x61eb53ee427ab4e007d78a9134aacb3101a2dc23',
		farming_link: 'https://app.frax.finance/staking#Sushi_FXS_WETH',
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FXS", "WETH"],
		reward_tokens: ["FXS", "SUSHI"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "sushi"],
		version: 1
	},
	'Uniswap FRAX/USDC': {
		lp_logo: 'uniswap',
		slug: "Uniswap_FRAX_USDC",
		label: 'Uniswap FRAX/USDC',
		chain: 'mainnet',
		info_link: "https://v2.info.uniswap.org/pair/0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d",
		add_liq_link: 'https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		farming_link: 'https://app.frax.finance/staking#Uniswap_FRAX_USDC',
		staking_enabled: true,
		external_contract: false,
		is_migratable_to_v3: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["FXS"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
	'Uniswap V3 FRAX/USDC': {
		lp_logo: 'uniswap',
		slug: "Uniswap_V3_FRAX_USDC",
		label: 'Uniswap V3 FRAX/USDC',
		chain: 'mainnet',
		info_link: "https://info.uniswap.org/#/pools/0xc63b0708e2f7e69cb8a1df0e1389a98c35a76d52",
		add_liq_link: 'https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/500',
		trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
		farming_link: 'https://app.frax.finance/staking#Uniswap_V3_FRAX_USDC',
		staking_enabled: true,
		external_contract: false,
    vefxs_enabled: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 6,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["FXS", "FRAX", "USDC"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "usd-coin"],
		version: 1000
	},
  'Uniswap V3 FRAX/DAI': {
		lp_logo: 'uniswap',
		slug: "Uniswap_V3_FRAX_DAI",
		label: 'Uniswap V3 FRAX/DAI',
		chain: 'mainnet',
		info_link: "https://info.uniswap.org/#/pools/0x97e7d56A0408570bA1a7852De36350f7713906ec",
		add_liq_link: 'https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0x6B175474E89094C44Da98b954EedeAC495271d0F/500',
		trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x6B175474E89094C44Da98b954EedeAC495271d0F',
		farming_link: 'https://app.frax.finance/staking#Uniswap_V3_FRAX_DAI',
		staking_enabled: true,
		external_contract: false,
    vefxs_enabled: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 18,
		pool_tokens: ["FRAX", "DAI"],
		reward_tokens: ["FXS", "FRAX", "DAI"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "dai"],
		version: 1000
	},
  'Uniswap V3 FRAX/WETH': {
		lp_logo: 'uniswap',
		slug: "Uniswap_V3_FRAX_WETH",
		label: 'Uniswap V3 FRAX/WETH',
		chain: 'mainnet',
		info_link: "https://info.uniswap.org/#/pools/0x92c7b5ce4cb0e5483f3365c1449f21578ee9f21a",
		add_liq_link: 'https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2/3000',
		trade_link: 'https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
		farming_link: 'https://app.frax.finance/staking#Uniswap_V3_FRAX_WETH',
		staking_enabled: true,
		external_contract: false,
    vefxs_enabled: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 18,
		pool_tokens: ["FRAX", "WETH"],
		reward_tokens: ["FXS", "FRAX", "WETH"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "weth"],
		version: 1000
	},
	'Uniswap FRAX/WETH': {
		lp_logo: 'uniswap',
		slug: "Uniswap_FRAX_WETH",
		label: 'Uniswap FRAX/WETH',
		chain: 'mainnet',
		info_link: "https://v2.info.uniswap.org/pair/0xfd0a40bc83c5fae4203dec7e5929b446b07d1c76",
		add_liq_link: 'https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/ETH',
		trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=ETH',
		farming_link: 'https://app.frax.finance/staking#Uniswap_FRAX_WETH',
		staking_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "WETH"],
		reward_tokens: ["FXS"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
	'Uniswap FRAX/FXS': {
		lp_logo: 'uniswap',
		slug: "Uniswap_FRAX_FXS",
		label: 'Uniswap FRAX/FXS',
		chain: 'mainnet',
		info_link: "https://v2.info.uniswap.org/pair/0xe1573b9d29e2183b1af0e743dc2754979a40d237",
		add_liq_link: 'https://app.uniswap.org/#/add/v2/0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0/0x853d955acef822db058eb8505911ed77f175b99e',
		trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0&outputCurrency=0x853d955acef822db058eb8505911ed77f175b99e',
		farming_link: 'https://app.frax.finance/staking#Uniswap_FRAX_FXS',
		staking_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
	'Uniswap FRAX/IQ': {
		lp_logo: 'uniswap',
		slug: "Uniswap_FRAX_IQ",
		label: 'Uniswap FRAX/IQ',
		chain: 'mainnet',
		info_link: "https://v2.info.uniswap.org/pair/0xd6c783b257e662ca949b441a4fcb08a53fc49914",
		add_liq_link: 'https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0x579cea1889991f68acc35ff5c3dd0621ff29b0c9',
		trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x579cea1889991f68acc35ff5c3dd0621ff29b0c9',
		farming_link: 'https://app.frax.finance/staking#Uniswap_FRAX_IQ',
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "IQ"],
		reward_tokens: ["FXS", "IQ"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "everipedia"],
		version: 3
	},
	'Uniswap FRAX/OHM': {
		lp_logo: 'uniswap',
		slug: "Uniswap_FRAX_OHM",
		label: 'Uniswap FRAX/OHM',
		chain: 'mainnet',
		info_link: "https://v2.info.uniswap.org/pair/0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877",
		add_liq_link: 'https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0x383518188c0c6d7730d91b2c03a03c837814a899',
		trade_link: 'https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x383518188c0c6d7730d91b2c03a03c837814a899',
		farming_link: 'https://app.frax.finance/staking#Uniswap_FRAX_OHM',
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "OHM"],
		reward_tokens: ["FXS", "OHM"],
    reward_token_decimals: [18, 9],
		reward_token_coingecko_slugs: ["frax-share", "olympus"],
		version: 4
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
    { title: "FRAX3CRV in Vault", big_base: BIG18, symbol: 'USD' },
  ],
  'CurveAMO_V4': [
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
    { title: "FRAX3CRV in Vault", big_base: BIG18, symbol: 'USD' },
  ],
  'StakeDAO_AMO': [
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
    { title: "FRAX3CRV in Vault", big_base: BIG18, symbol: 'USD' },
  ],
  'OHM_AMO': [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
    { title: "OHM Value", big_base: BIG18, symbol: 'FRAX' },
    { title: "sOHM Value", big_base: BIG18, symbol: 'FRAX' },
    { title: "Bonded OHM Value", big_base: BIG18, symbol: 'FRAX' },
    { title: "Total USD Value", big_base: BIG18, symbol: 'FRAX' },
  ],
  'RARI_AMO': [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: 'FRAX' },
    { title: "FRAX in Pools", big_base: BIG18, symbol: 'FRAX' },
    { title: "Total FRAX", big_base: BIG18, symbol: 'FRAX' },
  ],
  'Convex_AMO': [
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
    { title: "FRAX3CRV in Vault", big_base: BIG18, symbol: 'USD' },
  ],
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
  ],
  'Convex_AMO': [
    // { title: "CRV in contract", big_base: BIG18, symbol: 'CRV' },
    { title: "CRV claimable", big_base: BIG18, symbol: 'CRV' },
    // { title: "CVX in contract", big_base: BIG18, symbol: 'CVX' },
    { title: "CVX claimable", big_base: BIG18, symbol: 'CVX' },
    // { title: "cvxCRV in contract", big_base: BIG18, symbol: 'cvxCRV' },
    { title: "cvxCRV claimable", big_base: BIG18, symbol: 'cvxCRV' },
    // { title: "FXS in contract", big_base: BIG18, symbol: 'FXS' },
    { title: "FXS claimable", big_base: BIG18, symbol: 'FXS' },
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
      veFXS_whitelist_checker: ''
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
      'aave_incentives_controller': '0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5',
      "compound_cUSDC": '0x39AA39c021dfbaE8faC545936693aC917d5E7563',
      "compound_controller": '0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B',
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
    rari_pools: {
      "Tetranode's Locker (#6)": '0x1531C1a63A169aC75A2dAAe399080745fa51dE44',
      "ChainLinkGod's / Tetranode's Up Only Pool (#7)": '0x6313c160b329db59086df28ed2bf172a82f0d9d1',
      "Frax & Reflexer Stable Asset Pool (#9)": '0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb',
      "Olympus Pool Party Frax (#18)": '0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d',
      "Harvest FARMstead (#24)": '0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A'
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
      stakedao_amo: '0x375278D3C65f29C1A90E8550888f1439cFeFe465', // Impl: 0xcf1e6926b2167f83ec3300bed04a672abd93e646 
      ohm_amo: '0x5699d20732a2EFa9A895EF04bb210aa751C4dB96', // Impl: 0x89a5CeC88598c0CE4d4E331D0b027499edd3dfFa
      ohm_amo_admin: "0xE53d45ABe10Ce20427D20c5a1b6360Fa5BA0cE0A",
      convex_amo: '0x49ee75278820f409ecd67063D8D717B38d66bd71', // Impl: 0x49f77ddd4d57636ab4c98d8f18ca5f4b5210983d
      convex_amo_admin: "0xE53d45ABe10Ce20427D20c5a1b6360Fa5BA0cE0A",
      rari_amo: "0x96665d63c1B53f8335e3c9287Ee255f306C93c45",
      // fxs_1559_amo_v2_impl: '0xCDe9A4e885B87a893b8817D136FD2F404B54294f'.
      fxs_1559_amo_v2_admin: '0xCaa487D113ad1C34Ce128c4f3a2A437614C6a692', // Proxy admin
      frax_gauge_v2: '0x72e158d38dbd50a483501c24f792bdaaa3e7d55c',
      crvFRAX_vault: '0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139',
      multisig: '0xFa27873EA2F0eA9DcD2052848C4A7F8ADE8a3936',
      vefxs_yield_distributor: "0x19a0a70a68fbC604Bf20A03b787df8f7AC1d50f0",
      vefxs_yield_distributor_v2: "0x62C4cf364078C98fA08AfDB4D3d8D87e780Ebd45",
      vefxs_yield_distributor_v3: "0xed2647Bbf875b2936AAF95a3F5bbc82819e3d3FE",
      frax3crv_curve_rewards_distributor_eoa: "0x73f9f84b04584227b4f0baffd8b37d6d0c11a23c",
      frax3crv_curve_fxs_distributor: "0xBBbAf1adf4d39B2843928CCa1E65564e5ce99ccC", // MAY NEED TO CALL APPROVE FIRST
      uniV2_to_uniV3_migrator_address: "0x7b50137E8996A1717a6D97a0527e4c5D2D133405",
      migration_bundle_utils: '0x239c957d42343B3d91FABc7c16E7F1e30Bc32E5B', // same bytecode: 0x2fFFFbA4F562569bec2D4FC1c36F7797ffb173Cd
      bundle_utils: '0xD1a7b80a954e56bfd7bd889aF6e2BE8674719F5d', 
      vefxs_smart_wallet_checker: '0x53c13BA8834a1567474b19822aAD85c6F90D9f9F',
      frax_gauge_controller: '0x44ade9AA409B0C29463fF7fcf07c9d3c939166ce',
      frax_gauge_rewards_distributor: "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34"
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
      ohm: '0x383518188C0C6d7730D91b2c03a03C837814a899',
      // rook: '0xfA5047c9c78B8877af97BDcb85Db743fD7313d4a',
      // farm: '0xa0246c9032bC3A600820415aE600c6388619A14D',
      // idle: '0x875773784Af8135eA0ef43b5a374AaD105c5D39e'
    },
    saddle_pools: {
      'Saddle alUSD/FEI/FRAX/LUSD': '0xC69DDcd4DFeF25D8a793241834d4cc4b3668EAD6'
    },
    uni_v3_pools: {
      NOTE: "Call getPool here (Factory) to find it: 0x1F98431c8aD98523631AE4a59f267346ea31F984",
      NOTE2: "Do hardhat verify with the v1.0.0 uniswap-v3-core fork",
      'Uniswap V3 FRAX/USDC': '0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52',
      'Uniswap V3 FRAX/DAI': '0x97e7d56A0408570bA1a7852De36350f7713906ec',
      'Uniswap V3 FRAX/WETH': '0x92c7b5ce4cb0e5483f3365c1449f21578ee9f21a',
    },
    pair_tokens: {
      'Uniswap FRAX/WETH': '0xFD0A40Bc83C5faE4203DEc7e5929B446b07d1C76',
      'Uniswap FRAX/USDC': '0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D',
      'Uniswap V3 FRAX/USDC': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Uniswap V3 Positions NFT
      'Uniswap V3 FRAX/DAI': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Uniswap V3 Positions NFT
      'Uniswap V3 FRAX/WETH': '0xC36442b4a4522E871399CD717aBDD847Ab11FE88', // Uniswap V3 Positions NFT
      'Uniswap FRAX/FXS': '0xE1573B9D29e2183B1AF0e743Dc2754979A40D237',
      'Uniswap FXS/WETH': '0xecBa967D84fCF0405F6b32Bc45F4d36BfDBB2E81',
      'Uniswap FRAX/IQ': '0xd6c783b257e662ca949b441a4fcb08a53fc49914',
      'Uniswap FRAX/OHM': '0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877',
      'Sushi FRAX/FXS': '0xc218001e3D102e3d1De9bf2c0F7D9626d76C6f30',
      'Sushi FXS/WETH': '0x61eB53ee427aB4E007d78A9134AaCb3101A2DC23',
      // 'Curve FRAX-DAI-USDC-USDT': '0x83D2944d5fC10A064451Dc5852f4F47759F249B6', // Proxied Implementation: https://etherscan.io/address/0x2c7796c0590cc100d70af473993890d457cb2ac9#code
      'Curve FRAX3CRV-f-2': '0xd632f22692fac7611d2aa1c0d552930d43caed3b', // Proxied For: https://etherscan.io/address/0x5f890841f657d90e081babdb532a05996af79fe6
      'Saddle alUSD/FEI/FRAX/LUSD': '0xd48cF4D7FB0824CC8bAe055dF3092584d0a1726A'
    },
    staking_contracts: {
      'Uniswap FRAX/WETH': '0xD875628B942f8970De3CcEaf6417005F68540d4f',
      'Uniswap FRAX/USDC': '0xa29367a3f057F3191b62bd4055845a33411892b6',
      'Uniswap V3 FRAX/USDC': "0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", // Old4: "0x1e1356Eb81a56daEcfAdA456E007b26C86c56670", // Old3: '0xCbe6ea4725e4ba34aa215B95239DfA6E8854B49a', // Old2: '0x1C21Dd0cE3bA89375Fc39F1B134AD15671022660', // Old1: '0xF397Abd7495EB6FE4697F45b5BA17166f03533b9'
      'Uniswap V3 FRAX/DAI': "0xF22471AC2156B489CC4a59092c56713F813ff53e", // "0xD922cD347eb367FC4FB4bbcb68A84C6CDD3bA4ba",
      'Uniswap V3 FRAX/WETH': "",
      'Uniswap FRAX/FXS': '0xda2c338350a0E59Ce71CDCED9679A3A590Dd9BEC',
      'Uniswap FXS/WETH': '0xDc65f3514725206Dd83A8843AAE2aC3D99771C88',
      'Uniswap FRAX/IQ': '0xF37057823910653a554d996B49E3399DC87fAE1b', // V1: '0x35fc5Fd90e06c47c0D9dEBfEDB1daF55bCE14E6d',
      'Uniswap FRAX/OHM': '0xfC77A420f56Dec53e3b91D7FC936902e132335FF',
      'Sushi FRAX/FXS': '0x35302f77E5Bd7A93cbec05d585e414e14B2A84a8',
      'Sushi FXS/WETH': '0x74C370990C1181303D20e9f0252437a97518B95B',
      // 'Curve FRAX-DAI-USDC-USDT': '0xB88107bFB7aa9b6A5eC8784374018073e76d4DF0',
      // 'Curve FRAX3CRV-f-2': '0xdFb6ef63eA2753C6598fcA1b220358F17E4d137e'
      'Saddle alUSD/FEI/FRAX/LUSD': "0x0639076265e9f88542C91DCdEda65127974A5CA5"
    },
    external_farm_tokens: {
      "Snowball S3F (FRAX + TUSD + USDT)": "",
      "SpiritSwap FRAX/FTM": "0x0eC0E1629E776272FA3E55548D4A656BE0EEdcF4", // MasterChef Pool #14
      "SpiritSwap FRAX/FXS": "0x100FcF27C87D1cc7b8D6c28b69b84A359e4fd377", // MasterChef Pool #16
      "QuickSwap FRAX/FXS": "0x4756ff6a714ab0a2c69a566e548b59c72eb26725",
      "QuickSwap FRAX/QUICK": "0x2aa7a18ceabf2ef893d2f7c0145cc45e6f10b223",
      "Saber wFRAX/USDC": "", // FRAXXvt2ucEsxYPK4nufDy5zKhb2xysieqRBE1dQTqnK
      "Cream FRAX Lending": "",
      "Curve FRAX3CRV-f-2": "",
      "StakeDAO FRAX3CRV-f": "",
      "Convex FRAX3CRV-f": "",
      "Yearn crvFRAX Vault (V2)": "",
      "Sushi FRAX/FXS [Polygon]": "0xd53a56ae0f48c9a03660cd36c2e4ae20493a1eca",
      "Sushi FRAX/USDC [Polygon]": "0x9e20a8d3501bf96eda8e69b96dd84840058a1cb0",
    },
    middleman_gauges: {
      'mStable FRAX/mUSD' : "0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC"
    }
  },
  bsc: {
    main: {
      FRAX: '0x29ced01c447166958605519f10dcf8b0255fb379',
      FXS: '0xde2f075f6f14eb9d96755b24e416a53e736ca363',
    },
    reward_tokens: {
      cake: '0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82',
      impossible_finance: '0xB0e1fc65C1a741b4662B813eB787d369b8614Af1',
    },
    pair_tokens: {
      'PancakeSwap FRAX/FXS': '0x444be928a0091affe2be000f3ff904bc51b0172c',
      // 'PancakeSwap FRAX/BUSD': '0x5C2c4df29748144A7177B4185828693FE375AF00',
      // 'Impossible FRAX/IF': '0x9CA691841f1F5A0AE1B5A1eb125dE3c215f0b747',
      // 'Impossible FXS/IF': '0x725aFC77770e023E18C1a07Cc7E2d1a42bA5F123',
    },
    staking_contracts: {
      'PancakeSwap FRAX/FXS': '0x0ab7aCDce918FbA1B17a9c8B086C8981F094909d',
      // 'Impossible FRAX/IF': '0x45dD6e5f65A5a526c09A50D612e3516ed6AB47d2',
    }
  },
  polygon: {
    main: {
      FRAX: '0x104592a158490a9228070E0A8e5343B499e125D0',
      FXS: '0x3e121107F6F22DA4911079845a470757aF4e1A1b',
    },
    reward_tokens: {
      mta: '0xF501dd45a1198C2E1b5aEF5314A68B9006D842E0',
    },
    pair_tokens: {
      'mStable FRAX/mUSD': '0xB30a907084AC8a0d25dDDAB4E364827406Fd09f0',
    },
    staking_contracts: {
      'mStable FRAX/mUSD': '0x9FAf14fc9DE04aE53F710AA4f7C5b0EB753bE188', 
    }
  }
}








export { }; // Force this file to be a module