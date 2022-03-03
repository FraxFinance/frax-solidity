const BigNumber = require("bignumber.js");

export const BIG6 = new BigNumber("1e6");
export const BIG8 = new BigNumber("1e8");
export const BIG12 = new BigNumber("1e12");
export const BIG18 = new BigNumber("1e18");
export const ONE_E18 = 10**18;

// For getPastLogs
export const PAST_LOGS_BATCH_SIZE_ARBITRUM = 2500;
export const PAST_LOGS_BATCH_SIZE_AURORA = 2500;
export const PAST_LOGS_BATCH_SIZE_AVALANCHE = 2500;
export const PAST_LOGS_BATCH_SIZE_BOBA = 2500;
export const PAST_LOGS_BATCH_SIZE_BSC = 2000;
export const PAST_LOGS_BATCH_SIZE = 2500;
export const PAST_LOGS_BATCH_SIZE_FANTOM = 2000;
export const PAST_LOGS_BATCH_SIZE_HARMONY = 2500;
export const PAST_LOGS_BATCH_SIZE_MOONRIVER = 2500;
export const PAST_LOGS_BATCH_SIZE_OPTIMISM = 2500;
export const PAST_LOGS_BATCH_SIZE_POLYGON = 2500;

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
    "All Time": 1576800000,
    "1 Year": 31556952,
    "6 Months": 15778476,
    "3 Months": 7889238,
    "1 Month": 2629746,
    "1 Week": 604800,
    "1 Day": 86400,
    "8 Hours": 28800,
    "1 Hour": 3600,
    "15 Minutes": 900,
}

export const GraphTimeFramePackLowercased = { 
    "all-time": 1576800000,
    "1-year": 31556952,
    "6-months": 15778476,
    "3-months": 7889238,
    "1-month": 2629746,
    "1-week": 604800,
    "1-day": 86400,
    "8-hours": 28800,
    "1-hour": 3600,
    "15-minutes": 900,
}

export type LockedStakeBucket = keyof typeof LockedStakeBucketPack;
export const LockedStakeBucketPack = { 
    "Unlocked": { idx: 0, min: 0, max: 1 },
    "≤ 15 days": { idx: 1, min: 1, max: 1296000 },
    "15 - 30 Days": { idx: 2, min: 1296001, max: 2592000 },
    "30 - 60 Days": { idx: 3, min: 2592001, max: 5184000 },
    "60 - 90 Days": { idx: 4, min: 5184001, max: 7776000 },
    "90 Days - 180 Days": { idx: 5, min: 7776001, max: 15552000 },
    "180 Days - 1 Year": { idx: 6, min: 15552001, max: 31536000 },
    "1 Year - 2 Years": { idx: 7, min: 31536001, max: 63113904 },
    "2 Years - 3 Years": { idx: 8, min: 63113905, max: 94608000 },
    "3 Years - 4 Years": { idx: 9, min: 94608001, max: 900000000 }, // includes 9999 day locks
}

export type GraphTimeNumPoints = keyof typeof GraphTimeNumPointsPack;
export const GraphTimeNumPointsPack = { 
    "all-time": 1095,  // Assuming 3 years, each day
    "1-year": 365, // One point per day
    "6-months": 180, // One point per day
    "3-months": 180, // One point per half day
    "1-month": 120, // One point per 6 hrs
    "1-week": 126, // One point per 2 hrs
    "1-day": 96, // One point per 15 min
    "8-hours": 96, // One point per 5 min
    "1-hour": 120, // One point per 30 sec
    "15-minutes": 90, // One point per block (~15 seconds)
}

// Used to limit the return size of the data to it is faster
export type GraphTimeModulusPoints = keyof typeof GraphTimeNumPointsPack;
export const GraphTimeModulusPointsPack = { 
    "all-time": 20,
    "1-year": 10,
    "6-months": 10,
    "3-months": 5,
    "1-month": 4,
    "1-week": 3,
    "1-day": 2,
    "8-hours": 1,
    "1-hour": 1,
    "15-minutes": 1,
}

export const CollateralDetailsPack = { 
    "yUSD": {
        name: "LP-yCurve",
		    dd_name: "yCRV DAI+USDC+USDT+TUSD",
		    decimals: 18
    },
    "USDC": {
        name: "USDC",
		    dd_name: "USDC",
		    decimals: 18
    },
    "USDT": {
        name: "USDT",
		    dd_name: "USDT",
		    decimals: 18
    },
};

export const COLLATERAL_TYPES = Object.keys(CollateralDetailsPack);

export const StakeChoices: StakeChoices = {
  "1Swap FRAX/1S3P": {
		lp_logo: "1swap",
		label: "1Swap FRAX/1S3P",
		chain: "moonriver",
		external_contract: true,
		farming_link: "https://1swap.fi/farms",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["1SWAP"]
	},
	'Angle FRAX/agEUR Staking': {
		lp_logo: 'angle',
		label: 'Angle FRAX/agEUR Staking',
		chain: 'ethereum',
		external_contract: true,
		farming_link:
		  'https://app.angle.money/#/slp',
		staking_enabled: true,
		pool_tokens: ['FRAX'],
		reward_tokens: ['FRAX', 'ANGLE'],
	},
	'Angle FRAX/agEUR Perpetuals': {
		lp_logo: 'angle',
		label: 'Angle FRAX/agEUR Perpetuals',
		chain: 'ethereum',
		external_contract: true,
		farming_link:
		  'https://app.angle.money/#/perpetuals/open/0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8/0x853d955aCEf822Db058eb8505911ED77F175b99e',
		staking_enabled: true,
		pool_tokens: ['FRAX'],
		reward_tokens: ['FRAX', 'ANGLE'],
		has_varied_apy: true,
	},
	"Aave FRAX Lending": {
		lp_logo: "aave",
		label: "Aave FRAX Lending",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://app.aave.com/reserve-overview/FRAX-0x853d955acef822db058eb8505911ed77f175b99e0xb53c1a33016b2dc2ff3653530bff1848a515c8c5",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"]
	},
  "ApeSwap canFRAX/BUSD": {
		lp_logo: "apeswap",
		label: "ApeSwap FRAX/BUSD",
		chain: "bsc",
		external_contract: true,
		farming_link: "https://apeswap.finance/farms",
    staking_enabled: true,
		pool_tokens: ["FRAX", "BUSD"],
		reward_tokens: ["BANANA"],
	},
  "ApeSwap canFXS/WBNB": {
		lp_logo: "apeswap",
		label: "ApeSwap FXS/BNB",
		chain: "bsc",
		external_contract: true,
		farming_link: "https://apeswap.finance/farms",
    staking_enabled: true,
		pool_tokens: ["FXS", "BNB"],
		reward_tokens: ["BANANA"],
	},
  "APY.Finance Curve FRAX": {
		lp_logo: "apyfinance",
		label: "APY.Finance Curve FRAX",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://dashboard.apy.finance/dashboard/portfolio",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
		has_varied_apy: true
	},
	"Axial AC4D TSD/MIM/FRAX/DAI.e": {
		lp_logo: "axial",
		label: "Axial AC4D TSD/MIM/FRAX/DAI.e",
		chain: "avalanche",
		external_contract: true,
		farming_link: "https://app.axial.exchange/#/rewards/ac4d/deposit",
    staking_enabled: true,
		pool_tokens: ["TSD", "MIM", "FRAX", "DAI.e"],
		reward_tokens: ["FRAX", "AXIAL"],
		reward_token_bridge_types: ["canonical"],
	},
  "Beefy Finance [Avalanche]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "avalanche",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/avax",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
  "Beefy Finance [BSC]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "bsc",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/bsc",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["BANANA"],
		has_varied_apy: true
	},
  "Beefy Finance [Fantom]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/fantom",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
  "Beefy Finance [Harmony]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "harmony",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/harmony",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
  "Beefy Finance [Moonriver]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "moonriver",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/moonriver",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
	"Beefy Finance [Polygon]": {
		lp_logo: "beefy_finance",
		label: "Beefy Finance",
		chain: "polygon",
		external_contract: true,
		farming_link: "https://app.beefy.finance/#/polygon",
    staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
	"Convex cvxFXS/FXS": {
		lp_logo: "convex",
		label: "Convex cvxFXS",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://frax.convexfinance.com",
		staking_enabled: true,
		pool_tokens: ["FXS"],
		reward_tokens: ["FXS"],
	  },
	"Convex d3pool": {
		lp_logo: "convex",
		label: "Convex d3pool",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://www.convexfinance.com/stake",
		staking_enabled: true,
		pool_tokens: ["FRAX", "FEI", "alUSD"],
		reward_tokens: ["CRV", "CVX"]
	},
	"Convex FRAX3CRV-f": {
		lp_logo: "convex",
		label: "Convex FRAX3CRV-f",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://www.convexfinance.com/stake",
		staking_enabled: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["CRV", "CVX"]
	},
	// "Cream FRAX Lending": {
	// 	lp_logo: "cream",
	// 	label: "Cream FRAX Lending",
	// 	chain: "ethereum",
	// 	external_contract: true,
	// 	farming_link: "https://app.cream.finance/",
	// 	staking_enabled: true,
	// 	pool_tokens: ["FRAX"],
	// 	reward_tokens: ["FRAX"]
	// },
  'Curve VSTFRAX-f': {
    lp_logo: 'curve_arbi_vstfrax',
    slug: 'Curve_VSTFRAX_F',
    label: 'Curve VSTFRAX-f',
    chain: 'arbitrum',
    info_link: 'https://arbitrum.curve.fi/factory/19',
    add_liq_link: 'https://arbitrum.curve.fi/factory/19/deposit',
    trade_link: 'https://arbitrum.curve.fi/factory/19',
    farming_link: 'https://app.frax.finance/staking#Curve_VSTFRAX_F',
    starting_block: 5752224,
    staking_enabled: true,
    external_contract: false,
    is_gauged: true,
    pool_tokens: ['FRAX', 'VST'],
    reward_tokens: ['FXS', 'VSTA'],
    reward_token_decimals: [18, 18],
    reward_token_coingecko_slugs: ['frax-share', 'vesta-finance'],
    version: 5,
  },
	"Curve FRAX3CRV-f-2": {
		lp_logo: "curve",
		slug: "Curve_FRAX3CRV_F_2",
		label: "Curve FRAX3CRV-f V2 (Metapool)",
		chain: "ethereum",
		info_link: "https://curve.fi/frax/stats",
		add_liq_link: "https://curve.fi/frax/deposit",
		trade_link: "https://curve.fi/frax/",
		farming_link: "https://curve.fi/frax/deposit",
		staking_enabled: true,
		external_contract: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["CRV"],
		reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["curve-dao-token"],
		version: 2
	},
	"dForce FRAX Lending": {
		lp_logo: 'dforce',
		label: 'dForce FRAX Lending',
		chain: 'ethereum',
		external_contract: true,
		farming_link: 'https://app.dforce.network',
		staking_enabled: true,
		pool_tokens: ['FRAX'],
		reward_tokens: ['FRAX','DFORCE'],
		has_varied_apy: true,
	},
	"FXS": {
		lp_logo: "frax",
		label: "Frax Shares Staking (veFXS)",
		chain: "ethereum",
		external_contract: false,
		farming_link: "https://app.frax.finance/vefxs",
		staking_enabled: true,
		pool_tokens: ["FXS"],
		reward_tokens: ["FXS"],
	},
	"Gelato Uniswap FRAX/DAI": {
		lp_logo: "gelato",
		slug: "Gelato_Uniswap_FRAX_DAI",
		label: "Gelato Uniswap FRAX/DAI",
		chain: "ethereum",
		info_link: "https://www.sorbet.finance/#/pools/0xb1Cfdc7370550f5e421E1bf0BF3CADFaDF3C4141",
		add_liq_link: "https://www.sorbet.finance/#/pools/0xb1Cfdc7370550f5e421E1bf0BF3CADFaDF3C4141/add",
		trade_link: "https://www.sorbet.finance/#/limit-order?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x6b175474e89094c44da98b954eedeac495271d0f",
		farming_link: "https://app.frax.finance/staking#Gelato_Uniswap_FRAX_DAI",
    starting_block: 13388815,
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		is_gauged: true,
		pool_tokens: ["FRAX", "DAI"],
		reward_tokens: ["FXS"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 101
	},
  "Hundred FRAX Lending [Arbitrum]": {
		lp_logo: "hundred",
		label: "Hundred FRAX Lending",
		chain: "arbitrum",
		external_contract: true,
		farming_link: "https://hundred.finance/",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX", "HND"],
    reward_token_bridge_types: ["canonical"],
	},
  "Hundred FRAX Lending [Fantom]": {
		lp_logo: "hundred",
		label: "Hundred FRAX Lending",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://hundred.finance/",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX", "HND"],
    reward_token_bridge_types: ["canonical"],
	},
	"Impossible FRAX/IF": {
		lp_logo: "impossible",
		slug: "Impossible_FRAX_IF",
		label: "Impossible FRAX/IF",
		chain: "bsc",
		info_link: "https://info.impossible.finance/pair/0x5316e743816223b335764738021f3df7a17a25da",
		add_liq_link: "https://swap.impossible.finance/#/add/0x29cED01C447166958605519F10DcF8b0255fB379/0xB0e1fc65C1a741b4662B813eB787d369b8614Af1",
		trade_link: "https://swap.impossible.finance/#/swap?inputCurrency=0x29cED01C447166958605519F10DcF8b0255fB379&outputCurrency=0xB0e1fc65C1a741b4662B813eB787d369b8614Af1",
		farming_link: "https://app.frax.finance/staking#Impossible_FRAX_IF",
    starting_block: 10073446,
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "IF"],
		reward_tokens: ["FXS", "IF"],
    	reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "impossible-finance"],
		reward_token_bridge_types: ["anyFXS", null],
		version: 5
	},
	"Impossible FRAX/FXS": {
		lp_logo: "impossible",
		slug: "Impossible_FRAX_FXS",
		label: "Impossible FRAX/FXS",
		chain: "bsc",
		info_link: "https://info.impossible.finance/pair/0x13d80efd9f4ec6ef7279fe10124cebf58c0d07c2",
		add_liq_link: "https://swap.impossible.finance/#/add/0x29cED01C447166958605519F10DcF8b0255fB379/0xDE2F075f6F14EB9D96755b24E416A53E736Ca363",
		trade_link: "https://swap.impossible.finance/#/swap?inputCurrency=0x29cED01C447166958605519F10DcF8b0255fB379&outputCurrency=0xDE2F075f6F14EB9D96755b24E416A53E736Ca363",
		farming_link: "https://app.frax.finance/staking#Impossible_FRAX_FXS",
    starting_block: 10064339,
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS", "IF"],
    	reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "impossible-finance"],
		reward_token_bridge_types: ["anyFXS", null],
		version: 5
	},
	"Liquid Driver FRAX/FTM": {
		lp_logo: "liquiddriver",
		label: "Liquid Driver FRAX/FTM",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://www.liquiddriver.finance/farms",
		staking_enabled: true,
		pool_tokens: ["FRAX", "FTM"],
		reward_tokens: ["LQDR"]
	},
	"Lobis FXS Bonds": {
		lp_logo: "lobis",
		label: "Lobis FXS Bonds",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://app.lobis.finance/#/mints/fxs",
		staking_enabled: true,
		pool_tokens: ["FXS"],
		reward_tokens: ["LOBI"],
		has_varied_apy: true
	},
  "Market.xyz FRAX Lending": {
		lp_logo: "marketxyz",
		label: "Market.xyz FRAX Lending",
		chain: "polygon",
		external_contract: true,
		farming_link: "https://polygon.market.xyz/?filter=frax",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    	reward_token_bridge_types: ["canonical"],
		has_varied_apy: true
	},
	"mStable FRAX/mUSD": {
		lp_logo: "mstable",
		slug: "mStable_FRAX_mUSD",
		label: "mStable FRAX/mUSD",
		chain: "polygon",
		info_link: "https://app.mstable.org/#/musd/pools",
		add_liq_link: "https://app.mstable.org/#/musd/pools/0xb30a907084ac8a0d25dddab4e364827406fd09f0?network=polygon",
		trade_link: "https://app.mstable.org/#/musd/exchange/swap",
		farming_link: "https://app.frax.finance/staking#mStable_FRAX_mUSD",
    starting_block: 17439000,
		staking_enabled: true,
		external_contract: false,
		is_gauged: true,
		pool_tokens: ["FRAX", "mUSD"],
		reward_tokens: ["FXS", "MTA"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "meta"],
		reward_token_bridge_types: ["polyFXS", null],
		version: 5
	},
	"OolongSwap aCYBER-FRAX": {
		lp_logo: "oolong-swap",
		label: "OolongSwap aCYBER-FRAX",
		chain: "boba",
		external_contract: true,
		farming_link: "https://oolongswap.com/#/farm",
		staking_enabled: true,
		pool_tokens: ["aCYBER", "FRAX"],
		reward_tokens: ["OLO", "aCYBER"],
		has_varied_apy: true,
	  },
	"OlympusDAO FRAX Bonds": {
		lp_logo: "olympus",
		label: "OlympusDAO FRAX Bonds",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://app.olympusdao.finance/#/bonds",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
		has_varied_apy: true
	},
	"Olympus Pro FRAX/WETH SLP": {
		lp_logo: "olympus",
		label: "Olympus Pro FRAX/WETH SLP",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://pro.olympusdao.finance/#/bond/frax_eth_sushi",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
		has_varied_apy: true
	},
	"Olympus Pro FRAX Bond [Arbitrum]": {
		lp_logo: "olympus",
		label: "Olympus Pro FRAX Bond",
		chain: "arbitrum",
		external_contract: true,
		farming_link: "https://pro.olympusdao.finance/#/bond/iq_frax_bond",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["IQ"],
		has_varied_apy: true,
	  },
	"Pangolin FRAX/AVAX": {
		lp_logo: "pangolin",
		label: "Pangolin FRAX/AVAX",
		chain: "avalanche",
		external_contract: true,
		farming_link: "https://app.pangolin.exchange/#/png/AVAX/0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64/1",
    staking_enabled: true,
		pool_tokens: ["FRAX", "AVAX"],
		reward_tokens: ["PNG"]
	},
	'Planet Finance FRAX Lending': {
		lp_logo: 'planetfinance',
		label: 'Planet Finance FRAX Lending',
		chain: 'bsc',
		external_contract: true,
		farming_link: 'https://blue.planetfinance.io',
		staking_enabled: true,
		pool_tokens: ['FRAX'],
		reward_tokens: ['FRAX', 'GAMMA'],
	  },
	// "SmartCredit FRAX Lending": {
	// 	lp_logo: "smartcredit",
	// 	label: "SmartCredit FRAX Lending",
	// 	chain: "ethereum",
	// 	external_contract: true,
	// 	farming_link: "https://smartcredit.io/",
	// 	staking_enabled: true,
	// 	pool_tokens: ["FRAX"],
	// 	reward_tokens: ["FRAX"]
	// },
	// "SmartCredit FXS Lending": {
	// 	lp_logo: "smartcredit",
	// 	label: "SmartCredit FXS Lending",
	// 	chain: "ethereum",
	// 	external_contract: true,
	// 	farming_link: "https://smartcredit.io/",
	// 	staking_enabled: true,
	// 	pool_tokens: ["FXS"],
	// 	reward_tokens: ["FXS"]
	// },

	"Rari FRAX Lending": {
		lp_logo: "rari",
		label: "Rari FRAX Lending",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://app.rari.capital/fuse?filter=frax",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    has_varied_apy: true
	},
  "Saber wFRAX/USDC": {
		lp_logo: "saber",
		label: "Saber wFRAX/USDC",
		chain: "solana",
		external_contract: true,
		farming_link: "https://app.saber.so/#/farms/frax/stake",
		staking_enabled: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["SBR"]
	},
  "Saddle alUSD/FEI/FRAX/LUSD": {
		lp_logo: "saddle",
		slug: "Saddle_alUSD_FEI_FRAX_LUSD",
		label: "Saddle alUSD/FEI/FRAX/LUSD",
		chain: "ethereum",
		info_link: "https://saddle.exchange/#/pools",
		add_liq_link: "https://saddle.exchange/#/pools/d4/deposit",
		trade_link: "https://saddle.exchange/#/",
		farming_link: "https://app.frax.finance/staking#Saddle_alUSD_FEI_FRAX_LUSD",
    starting_block: 1278245,
		staking_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "alUSD", "FEI", "LUSD"],
		reward_tokens: ["FXS", "TRIBE", "ALCX", "LQTY" ],
		reward_token_decimals: [18, 18, 18, 18],
		reward_token_coingecko_slugs: ["frax-share", "tribe-2", "alchemix", "liquity"],
		version: 100
	},
  "Scream FRAX Lending": {
		lp_logo: "scream",
		label: "Scream FRAX Lending",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://scream.sh/lend",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
	},
	"Solarbeam FRAX/ROME": {
		lp_logo: "solarbeam",
		label: "Solarbeam FRAX/ROME",
		chain: "moonriver",
		external_contract: true,
		farming_link: "https://app.solarbeam.io/farm",
    staking_enabled: true,
		pool_tokens: ["FRAX", "ROME"],
		reward_tokens: ["SOLAR"],
	},
  "Solarbeam FRAX/MOVR": {
		lp_logo: "solarbeam",
		label: "Solarbeam FRAX/MOVR",
		chain: "moonriver",
		external_contract: true,
		farming_link: "https://app.solarbeam.io/farm",
    staking_enabled: true,
		pool_tokens: ["FRAX", "MOVR"],
		reward_tokens: ["SOLAR"],
	},
	"SpiritSwap FRAX/FTM": {
		lp_logo: "spiritswap",
		label: "SpiritSwap FRAX/FTM",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://app.spiritswap.finance/#/allfarms",
		staking_enabled: true,
		pool_tokens: ["FRAX", "FTM"],
		reward_tokens: ["SPIRIT"]
	},
	"SpiritSwap FRAX/USDC": {
		lp_logo: "spiritswap",
		label: "SpiritSwap FRAX/USDC",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://app.spiritswap.finance/#/allfarms",
		staking_enabled: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["SPIRIT"]
	},
  "SpiritSwap FRAX/FXS": {
		lp_logo: "spiritswap",
		slug: "SpiritSwap_FRAX_FXS",
		label: "SpiritSwap FRAX/FXS",
		chain: "fantom",
		info_link: "https://info.spiritswap.finance/pair/0x100fcf27c87d1cc7b8d6c28b69b84a359e4fd377",
		add_liq_link: "https://swap.spiritswap.finance/#/add/0x82f8cb20c14f134fe6ebf7ac3b903b2117aafa62/0xaf319e5789945197e365e7f7fbfc56b130523b33",
		trade_link: "https://swap.spiritswap.finance/#/swap/0x5Cc61A78F164885776AA610fb0FE1257df78E59B",
		farming_link: "https://app.frax.finance/staking#SpiritSwap_FRAX_FXS",
    starting_block: 14456599,
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		reward_token_bridge_types: ["anyFXS"],
		version: 5,
		is_soon: false
	},
	"SpiritSwap/Ola FRAX Lending": {
		lp_logo: "spiritswap",
		label: "SpiritSwap/Ola FRAX Lending",
		chain: "fantom",
		external_contract: true,
		farming_link: "https://app.ola.finance/networks/0x892701d128d63c9856A9Eb5d967982F78FD3F2AE/markets",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FRAX"],
    reward_token_bridge_types: ["canonical"],
	},
  "StakeDAO sdETH-FraxPut": {
		lp_logo: "stakedao",
		slug: "StakeDAO_sdETH-FraxPut",
		label: "StakeDAO sdETH-FraxPut",
		chain: "ethereum",
		info_link: "https://stakedao.org/0x0000000000000000000000000000000000000000/strategies/option",
		add_liq_link: "https://curve.fi/frax/deposit",
		trade_link: "https://stakedao.org/0x0000000000000000000000000000000000000000/strategies/option",
		farming_link: "https://app.frax.finance/staking#StakeDAO_sdETH-FraxPut",
    starting_block: 13574614,
		staking_enabled: true,
		external_contract: false,
    vefxs_enabled: true,
		is_gauged: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FXS", "SDT"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "stake-dao"],
		version: 101
	},
	"StakeDAO sdFRAX3CRV-f": {
		lp_logo: "stakedao",
		slug: "StakeDAO_sdFRAX3CRV-f",
		label: "StakeDAO sdFRAX3CRV-f",
		chain: "ethereum",
		info_link: "https://stakedao.org/0x0000000000000000000000000000000000000000/strategies",
		add_liq_link: "https://curve.fi/frax/deposit",
		trade_link: "https://stakedao.org/0x0000000000000000000000000000000000000000/strategies",
		farming_link: "https://app.frax.finance/staking#StakeDAO_sdFRAX3CRV-f",
    starting_block: 13225432,
		staking_enabled: true,
		external_contract: false,
    vefxs_enabled: true,
		is_gauged: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FXS", "SDT"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "stake-dao"],
		version: 101
	},
  "Sushi FRAX/ETH": {
		lp_logo: "sushiswap",
		label: "Sushi FRAX/ETH",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://app.sushi.com/farm",
		staking_enabled: true,
		pool_tokens: ["FRAX", "ETH"],
		reward_tokens: ["SUSHI"]
	},
	"Sushi FRAX/ETH [Harmony]": {
		lp_logo: "sushiswap",
		label: "Sushi FRAX/ETH",
		chain: "harmony",
		external_contract: true,
		farming_link: "https://app.sushi.com/farm",
		staking_enabled: true,
		pool_tokens: ["FRAX", "ETH"],
		reward_tokens: ["SUSHI", "ONE"]
	},
	"Sushi FRAX/FXS [Polygon]": {
		lp_logo: "sushiswap",
		label: "Sushi FRAX/FXS",
		chain: "polygon",
		external_contract: true,
		farming_link: "https://app.sushi.com/farm",
		staking_enabled: true,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["SUSHI", "MATIC"]
	},
	// "Sushi FRAX/USDC [Polygon]": {
	// 	lp_logo: "sushiswap",
	// 	label: "Sushi FRAX/USDC",
	// 	chain: "polygon",
	// 	external_contract: true,
	// 	farming_link: "https://app.sushi.com/farm",
	// 	staking_enabled: true,
	// 	pool_tokens: ["FRAX", "USDC"],
	// 	reward_tokens: ["SUSHI", "MATIC"]
	// },
  "Sushi FRAX/USDC [Moonriver]": {
		lp_logo: "sushiswap",
		label: "Sushi FRAX/USDC",
		chain: "moonriver",
		external_contract: true,
		farming_link: "https://app.sushi.com/farm",
		staking_enabled: true,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["SUSHI", "MOVR"]
	},
  "Sushi FRAX/SUSHI": {
		lp_logo: "sushiswap",
		slug: "Sushi_FRAX_SUSHI",
		label: "Sushi FRAX/SUSHI",
		chain: "ethereum",
		info_link: "https://analytics.sushi.com/pairs/0xe06f8d30ac334c857fc8c380c85969c150f38a6a",
		add_liq_link: "https://app.sushi.com/swap#/add/0x6b3595068778dd592e39a122f4f5a5cf09c90fe2/0x853d955acef822db058eb8505911ed77f175b99e",
		trade_link: "https://app.sushi.com/swap#/swap?inputCurrency=0x6b3595068778dd592e39a122f4f5a5cf09c90fe2&outputCurrency=0x853d955acef822db058eb8505911ed77f175b99e",
		farming_link: "https://app.frax.finance/staking#Sushi_FRAX_SUSHI",
    starting_block: 13013617,
		staking_enabled: true,
		external_contract: false,
		vefxs_enabled: true,
		is_gauged: true,
		pool_tokens: ["FRAX", "SUSHI"],
		reward_tokens: ["FXS", "SUSHI"],
    	reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "sushi"],
		version: 101,
		is_soon: false
	},
  "Temple FRAX/TEMPLE": {
    lp_logo: "templedao",
		slug: "Temple_FRAX_TEMPLE",
		label: "Temple FRAX/TEMPLE",
		chain: "ethereum",
		info_link: "https://templedao.link/",
		add_liq_link: "https://templedao.link/",
		trade_link: "https://templedao.link/",
		farming_link: "https://app.frax.finance/staking#Temple_FRAX_TEMPLE",
    starting_block: 14123565,
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		is_gauged: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FXS", "TEMPLE"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "temple"],
		version: 102
	},
	"Tokemak FRAX Staking": {
		lp_logo: "tokemak",
		label: "Tokemak FRAX Staking",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://www.tokemak.xyz/",
		staking_enabled: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["TOKE"],
	},
	"Tokemak FXS Staking": {
		lp_logo: "tokemak",
		label: "Tokemak FXS Staking",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://www.tokemak.xyz/",
    staking_enabled: true,
		pool_tokens: ["FXS"],
		reward_tokens: ["TOKE"],
	},
	'Trader Joe FRAX/AVAX': {
		lp_logo: 'traderjoe',
		label: 'Trader Joe FRAX/AVAX',
		chain: 'avalanche',
		external_contract: true,
		farming_link: 'https://traderjoexyz.com/#/farm/0x862905a82382Db9405a40DCAa8Ee9e8F4af52C89-0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00?fm=fm',
		staking_enabled: true,
		pool_tokens: ['FRAX', 'AVAX'],
		reward_tokens: ['FXS'],
	},
	'Trader Joe FRAX/gOHM': {
		lp_logo: 'traderjoe',
		label: 'Trader Joe FRAX/gOHM',
		chain: 'avalanche',
		external_contract: true,
		farming_link: 'https://traderjoexyz.com/#/farm/0x3E6Be71dE004363379d864006AAC37C9F55F8329-0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00',
		staking_enabled: true,
		pool_tokens: ['FRAX', 'gOHM'],
		reward_tokens: ['gOHM'],
	},
	'Trader Joe FXS/AVAX': {
		lp_logo: 'traderjoe',
		label: 'Trader Joe FXS/AVAX',
		chain: 'avalanche',
		external_contract: true,
		farming_link: 'https://traderjoexyz.com/#/farm/0x53942Dcce5087f56cF1D68F4e017Ca3A793F59a2-0x188bED1968b795d5c9022F6a0bb5931Ac4c18F00',
		staking_enabled: true,
		pool_tokens: ['FXS', 'AVAX'],
		reward_tokens: ['JOE'],
	},
	"Uniswap FRAX/USDC": {
		lp_logo: "uniswap",
		slug: "Uniswap_FRAX_USDC",
		label: "Uniswap FRAX/USDC",
		chain: "ethereum",
		info_link: "https://v2.info.uniswap.org/pair/0x97c4adc5d28a86f9470c70dd91dc6cc2f20d2d4d",
		add_liq_link: "https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		trade_link: "https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		farming_link: "https://app.frax.finance/staking#Uniswap_FRAX_USDC",
    starting_block: 11465735,
		staking_enabled: false,
		external_contract: false,
		is_migratable_to_v3: false,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["FXS"],
		reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
  "Uniswap V3 FRAX/agEUR": {
		lp_logo: "uniswap_v3",
		slug: "Uniswap_V3_FRAX_agEUR",
		label: "Uniswap V3 FRAX/agEUR",
		chain: "ethereum",
		info_link: "https://info.uniswap.org/#/pools/0x8ce5796ef6b0c5918025bcf4f9ca908201b030b3",
		add_liq_link: "https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8/500",
		trade_link: "https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8",
		farming_link: "https://app.frax.finance/staking#Uniswap_V3_FRAX_agEUR",
    starting_block: 13715882,
		staking_enabled: true,
		external_contract: false,
		vefxs_enabled: true,
		is_gauged: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 18,
		pool_tokens: ["FRAX", "agEUR"],
		reward_tokens: ["FXS", "FRAX", "agEUR"],
    reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "ageur"],
		version: 1000,
	},
  "Uniswap V3 FRAX/DAI": {
		lp_logo: "uniswap_v3",
		slug: "Uniswap_V3_FRAX_DAI",
		label: "Uniswap V3 FRAX/DAI",
		chain: "ethereum",
		info_link: "https://info.uniswap.org/#/pools/0x97e7d56a0408570ba1a7852de36350f7713906ec",
		add_liq_link: "https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0x6B175474E89094C44Da98b954EedeAC495271d0F/500",
		trade_link: "https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x6B175474E89094C44Da98b954EedeAC495271d0F",
		farming_link: "https://app.frax.finance/staking#Uniswap_V3_FRAX_DAI",
    starting_block: 12934415,
		staking_enabled: true,
		external_contract: false,
		vefxs_enabled: true,
		is_gauged: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 18,
		pool_tokens: ["FRAX", "DAI"],
		reward_tokens: ["FXS", "FRAX", "DAI"],
    	reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "dai"],
		version: 1000,
	},
	"Uniswap V3 FRAX/USDC": {
		lp_logo: "uniswap_v3",
		slug: "Uniswap_V3_FRAX_USDC",
		label: "Uniswap V3 FRAX/USDC",
		chain: "ethereum",
		info_link: "https://info.uniswap.org/#/pools/0xc63b0708e2f7e69cb8a1df0e1389a98c35a76d52",
		add_liq_link: "https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48/500",
		trade_link: "https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
		farming_link: "https://app.frax.finance/staking#Uniswap_V3_FRAX_USDC",
    starting_block: 12829216,
		staking_enabled: true,
		external_contract: false,
		vefxs_enabled: true,
		is_gauged: true,
		pair_token0_decimals: 18,
		pair_token1_decimals: 6,
		pool_tokens: ["FRAX", "USDC"],
		reward_tokens: ["FXS", "FRAX", "USDC"],
		reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share", "frax", "usd-coin"],
		version: 1000,
		is_soon: false
	},
  // "Uniswap V3 FRAX/WETH": {
	// 	lp_logo: "uniswap",
	// 	slug: "Uniswap_V3_FRAX_WETH",
	// 	label: "Uniswap V3 FRAX/WETH",
	// 	chain: "ethereum",
	// 	info_link: "https://info.uniswap.org/#/pools/0x92c7b5ce4cb0e5483f3365c1449f21578ee9f21a",
	// 	add_liq_link: "https://app.uniswap.org/#/add/0x853d955acef822db058eb8505911ed77f175b99e/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2/3000",
	// 	trade_link: "https://app.uniswap.org/#/swap?inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
	// 	farming_link: "https://app.frax.finance/staking#Uniswap_V3_FRAX_WETH",
  //   starting_block: 6666666666,
	// 	staking_enabled: true,
	// 	external_contract: false,
  //   vefxs_enabled: true,
	// 	pair_token0_decimals: 18,
	// 	pair_token1_decimals: 18,
	// 	pool_tokens: ["FRAX", "WETH"],
	// 	reward_tokens: ["FXS", "FRAX", "WETH"],
  //   reward_token_decimals: [18],
	// 	reward_token_coingecko_slugs: ["frax-share", "frax", "weth"],
	// 	version: 1000
	// },
	"Uniswap FRAX/WETH": {
		lp_logo: "uniswap",
		slug: "Uniswap_FRAX_WETH",
		label: "Uniswap FRAX/WETH",
		chain: "ethereum",
		info_link: "https://v2.info.uniswap.org/pair/0xfd0a40bc83c5fae4203dec7e5929b446b07d1c76",
		add_liq_link: "https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/ETH",
		trade_link: "https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=ETH",
		farming_link: "https://app.frax.finance/staking#Uniswap_FRAX_WETH",
    starting_block: 11465735,
		staking_enabled: false,
		external_contract: false,
		pool_tokens: ["FRAX", "WETH"],
		reward_tokens: ["FXS"],
		reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
	"Uniswap FRAX/FXS": {
		lp_logo: "uniswap",
		slug: "Uniswap_FRAX_FXS",
		label: "Uniswap FRAX/FXS",
		chain: "ethereum",
		info_link: "https://v2.info.uniswap.org/pair/0xe1573b9d29e2183b1af0e743dc2754979a40d237",
		add_liq_link: "https://app.uniswap.org/#/add/v2/0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0/0x853d955acef822db058eb8505911ed77f175b99e",
		trade_link: "https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x3432b6a60d23ca0dfca7761b7ab56459d9c964d0&outputCurrency=0x853d955acef822db058eb8505911ed77f175b99e",
		farming_link: "https://app.frax.finance/staking#Uniswap_FRAX_FXS",
    starting_block: 11465739,
		staking_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["FXS"],
    	reward_token_decimals: [18],
		reward_token_coingecko_slugs: ["frax-share"],
		version: 1
	},
	"Uniswap FRAX/IQ": {
		lp_logo: "uniswap",
		slug: "Uniswap_FRAX_IQ",
		label: "Uniswap FRAX/IQ",
		chain: "ethereum",
		info_link: "https://v2.info.uniswap.org/pair/0xd6c783b257e662ca949b441a4fcb08a53fc49914",
		add_liq_link: "https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0x579cea1889991f68acc35ff5c3dd0621ff29b0c9",
		trade_link: "https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x579cea1889991f68acc35ff5c3dd0621ff29b0c9",
		farming_link: "https://app.frax.finance/staking#Uniswap_FRAX_IQ",
    starting_block: 12512549,
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "IQ"],
		reward_tokens: ["FXS", "IQ"],
		reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "everipedia"],
		version: 3
	},
	"Uniswap FRAX/OHM": {
		lp_logo: "uniswap",
		slug: "Uniswap_FRAX_OHM",
		label: "Uniswap FRAX/OHM",
		chain: "ethereum",
		info_link: "https://v2.info.uniswap.org/pair/0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877",
		add_liq_link: "https://app.uniswap.org/#/add/v2/0x853d955acef822db058eb8505911ed77f175b99e/0x383518188c0c6d7730d91b2c03a03c837814a899",
		trade_link: "https://app.uniswap.org/#/swap?use=V2&inputCurrency=0x853d955acef822db058eb8505911ed77f175b99e&outputCurrency=0x383518188c0c6d7730d91b2c03a03c837814a899",
		farming_link: "https://app.frax.finance/staking#Uniswap_FRAX_OHM",
    starting_block: 12563575,
		staking_enabled: false,
		vefxs_enabled: true,
		external_contract: false,
		pool_tokens: ["FRAX", "OHM"],
		reward_tokens: ["FXS", "OHM"],
		reward_token_decimals: [18, 9],
		reward_token_coingecko_slugs: ["frax-share", "olympus"],
		version: 4
	},
	'veDAO FRAX': {
		lp_logo: 'vedao',
		label: 'veDAO FRAX',
		chain: 'fantom',
		external_contract: true,
		farming_link: 'https://www.vedao.io/#/farms/frax',
		staking_enabled: true,
		pool_tokens: ['FRAX'],
		reward_tokens: ['WEVE'],
	  },
	"Vesper Orbit FRAX": {
    lp_logo: "vesper",
		slug: "Vesper_Orbit_FRAX",
		label: "Vesper Orbit FRAX",
		chain: "ethereum",
		info_link: "https://orbit.vesper.finance/eth/pools/0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5",
		add_liq_link: "https://orbit.vesper.finance/eth/pools/0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5",
		trade_link: "https://orbit.vesper.finance/eth/pools/0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5",
		farming_link: "https://app.frax.finance/staking#Vesper_Orbit_FRAX",
    starting_block: 14134745,
		staking_enabled: true,
		vefxs_enabled: true,
		external_contract: false,
		is_gauged: true,
		pool_tokens: ["FRAX"],
		reward_tokens: ["FXS", "VSP"],
    reward_token_decimals: [18, 18],
		reward_token_coingecko_slugs: ["frax-share", "vesper-finance"],
		version: 102
	},
	"Yearn crvFRAX Vault (V3)": {
		lp_logo: "yearn",
		label: "Yearn crvFRAX Vault (V3)",
		chain: "ethereum",
		external_contract: true,
		farming_link: "https://yearn.finance/#/vault/0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139",
		staking_enabled: true,
		pool_tokens: ["FRAX", "DAI", "USDC", "USDT"],
		reward_tokens: ["FRAX3CRV-f"]
	},
  "Zenlink FRAX/GLMR": {
		lp_logo: "zenlink",
		label: "Zenlink FRAX/GLMR",
		chain: "moonbeam",
		external_contract: true,
		farming_link: "https://dex.zenlink.pro/#/earn/stake",
		staking_enabled: true,
		pool_tokens: ["FRAX", "GLMR"],
		reward_tokens: ["ZLK", "WGLMR"]
	},
  "Zenlink FRAX/FXS": {
		lp_logo: "zenlink",
		label: "Zenlink FRAX/FXS",
		chain: "moonbeam",
		external_contract: true,
		farming_link: "https://dex.zenlink.pro/#/earn/stake",
		staking_enabled: true,
		pool_tokens: ["FRAX", "FXS"],
		reward_tokens: ["ZLK", "WGLMR"]
	},
};

export const StakeChoiceKeys = Object.keys(StakeChoices);
export const StakeChoiceSlugToKey = (passed_slug) => {
	const the_dict = {};
	StakeChoiceKeys.forEach((key, idx) => {
			const the_obj = StakeChoices[key];
			if (the_obj != undefined) the_dict[the_obj.slug] = key;
	});
	return the_dict[passed_slug];
}

export const GovernanceHistoryCodes = { 
		"Created": 0,
		"Active": 1,
		"Rejected": 2,
		"Succeeded": 3,
		"Queued": 4,
		"Executed": 5
	
	// SHOULD ACTUALLY BE, PER THE SMART CONTRACT: 
	// Pending,
	// Active,
	// Canceled,
	// Defeated,
	// Succeeded,
	// Queued,
	// Expired,
	// Executed
}

export const govHistStringFromCode = (code: number) => {
    const theKeys = Object.keys(GovernanceHistoryCodes);
    for (let i = 0; i < theKeys.length; i++){
        const key = theKeys[i];
        if (GovernanceHistoryCodes[key] == code) return key;
    }
    return null;
}

export const CONTRACT_ADDRESSES = {
  ethereum: {
    main: {
      FRAX: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
      FXS: "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
      FXB: "",
      FPI: "0x76c8ceF5B18994a85bC2bE1991E5B9C716626767",
      FPIS: "0xDB68c6264e9D0f8a6Df1fA5a89F205Da38698D15",
      vesting: "NOT_DEPLOYED_YET",
      veFXS: "0xc8418aF6358FFddA74e09Ca9CC3Fe03Ca6aDC5b0", // Old: "0xcb75A1655c84589652D0f3A4605e5dDA8431F0a6"
      veFXS_whitelist_checker: "",
      veFXS_boost: "0x59e132164Ec2e48b0714EB6abdb10225Df44dA0e",
      veFXS_boost_delegation_proxy: "0xb4EB45443D525149410Ee69400c0956A7e89b82e"
    },
    canonicals: {
      // Added here for helping out the ABI
      FRAX: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
      FXS: "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0"
    },

    oracles: {
      // SDT_WETH: "0xfbe43821dd397afF3341d90211B71C60149DC6D9", 
    },
    oracles_other: {
      combo_oracle: "0x878f2059435a19C79c20318ee57657bF4543B6d4", // "0xbdCB57c9d35e8D41babCBcA67416ee6622274caf",
      combo_oracle_univ2_univ3: "0x1cBE07F3b3bf3BDe44d363cecAecfe9a98EC2dff", // "0xD13c9a29eF6c5ADc7b43BBd5854B07bB9b099862", 
      cpi_tracker: "0x90E7eFdcA79de10F1713c59BC3AE9B076e753490"
    },
    retired_oracles: {
      FXS_USDC: "0x1F70Af31D041f9C183E23EC6809c04eb8CA006a4", //V1: 0x28fdA30a6Cf71d5fC7Ce17D6d20c788D98Ff2c46
      FXS_WETH: "0x3B11DA52030420c663d263Ad4415a8A02E5f8cf8", // V1: "0x9e483C76D7a66F7E1feeBEAb54c349Df2F00eBdE"
      FRAX_FXS: "0x4b85bD29f71b364ae6183C9721Ae5f596E7Bfd3d",  // V1: 0xD0435BF68dF2B516C6382caE8847Ab5cdC5c3Ea7
      FRAX_USDC: "0x2E45C589A9F301A2061f6567B9F432690368E3C6",  // V1: 0x2AD064cEBA948A2B062ba9AfF91c98B9F0a1f608
      FRAX_WETH: "0x9b1A56A2E7164c43384448d82253781c1318A77E",  // V1: 0xD18660Ab8d4eF5bE062652133fe4348e0cB996DA
      USDC_WETH: "0x69B9E922ecA72Cda644a8e32B8427000059388c6", // V1: "0x5e48C34f1005a514DaF0E1aEc53Dbb70fdC2C9F9"
    },
    pid_related: {
      pid_controller: "0x6de667F424E2b1b8fD39fC2e1b9a14c0103E9879", // V1: "0x60A315E04419290449dB4866481cb33d39df03A3",
      reserve_tracker: "0x7215F84FE2f2F1726fFb42da923f3F04A72CF5E8", // V1: "0xF96882Dd0a4c8b2469084d2Db48768AA83B4a2f5"
    },
    investments: {
      yearn_yUSDC_V2: "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9",
      aave_aUSDC_Pool: "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9",
      aave_aUSDC_Token: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
      aave_aFRAX_Token: "0xd4937682df3C8aEF4FE912A96A74121C0829E664",
      aave_incentives_controller: "0xd784927Ff2f95ba542BfC824c8a8a98F3495f6b5",
      compound_cUSDC: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
      compound_controller: "0x3d9819210A31b4961b30EF54bE2aeD79B9c9Cd3B",
      cream_crFRAX: "0xb092b4601850E23903A42EaCBc9D8A0EeC26A4d5",
      fnx_FPT_FRAX: "0x39ad661bA8a7C9D3A7E4808fb9f9D5223E22F763",
      fnx_FPT_B: "0x7E605Fb638983A448096D82fFD2958ba012F30Cd", // B = FNX
      fnx_IntegratedStake: "0x23e54F9bBe26eD55F93F19541bC30AAc2D5569b2",
      fnx_MinePool: "0x4e6005396F80a737cE80d50B2162C0a7296c9620",
      fnx_TokenConverter: "0x955282b82440F8F69E901380BeF2b603Fba96F3b",
      fnx_ManagerProxy: "0xa2904Fd151C9d9D634dFA8ECd856E6B9517F9785",
      fnx_CFNX: "0x9d7beb4265817a4923FAD9Ca9EF8af138499615d",
      // "bzx_iUSDC_Fulcrum": "0x32e4c68b3a4a813b710595aeba7f6b7604ab9c15",
      // "keeper_Pool_V2": "0x53463cd0b074E5FDafc55DcE7B1C82ADF1a43B2E",
      // "keeper_kUSDC_Token": "0xac826952bc30504359a099c3a486d44E97415c77",
      // "harvest_fUSDC": "0xf0358e8c3CD5Fa238a29301d0bEa3D63A17bEdBE",
      // "harvest_DepositHelper": "0xF8ce90c2710713552fb564869694B2505Bfc0846",
      // "harvest_NoMintRewardPool": "0x4F7c28cCb0F1Dbd1388209C67eEc234273C878Bd"
    },
    collaterals: {
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      FEI: "0x956F47F50A910163D8BF957Cf5846D573E7f87CA",
      GUSD: "0x056Fd409E1d7A124BD7017459dFEa2F387b6d5Cd",
      LUSD: "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0",
      RAI: "0x03ab458634910AaD20eF5f1C8ee96F1D6ac54919",
      sUSD: "0x57ab1ec28d129707052df4df418d58a2d46d5f51",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDC_V2: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      USDP: "0x1456688345527bE1f37E9e627DA0837D6f08C925",
      USDT: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      wUST: "0xa47c8bf37f92abed4a126bda807a7b7498661acd",
    },
    governance: "0xd74034C6109A23B6c7657144cAcBbBB82BDCB00E",
    bond_issuers: {
      issuer_v1: "",
    },
    pools: {
      USDC: "0x3C2982CA260e870eee70c423818010DfeF212659",
      USDC_V2: "0x1864Ca3d47AaB98Ee78D11fc9DCC5E7bADdA1c0d",
      USDT: "0x7d3FCd3825AE54E8E8FFD3d0ce95882330d54968",
      V3: "0x2fE065e6FFEf9ac95ab39E5042744d695F560729",
    },
    rari_pools: {
      "Tetranode's Locker (#6)": "0x1531C1a63A169aC75A2dAAe399080745fa51dE44",
      "ChainLinkGod's / Tetranode's Up Only Pool (#7)": "0x6313c160b329db59086df28ed2bf172a82f0d9d1",
      "Frax & Reflexer Stable Asset Pool (#9)": "0x0f43a7e3f7b529015B0517D0D9Aa9b95701fd2Cb",
      "Olympus Pool Party Frax (#18)": "0x3e5c122ffa75a9fe16ec0c69f7e9149203ea1a5d",
      "IndexCoop Pool (#19)": "0x64E6aF978138732aef99C0648c195B12A6bc2A38",
      "Harvest FARMstead (#24)": "0x0A6eAfaA84188A146749D7864bB20E63bD16ea2A",
      "Token Mass Injection Pool (#26)": "0x2e818c80844d35c8e1667ceca03f31074ef6bb46",
      "Stake DAO Pool (#27)": "0x9de558FCE4F289b305E38ABe2169b75C626c114e",
      "NFTX Pool (#31)": "0x1BA12ae1FCFadd08FA37Db849Ef4b6e11e435357",
      "Fraximalist Money Market (#36)": "0x5e116a4521c99324f344eb7c7bfe1f78e3226493",
      "Float Protocol Pool (#90)": "0x182b177541fd35A6cEE5Cda1a5B2456586c799B6",
      "0xb1s Kitchen Sink (#127)": "0x8922C1147E141C055fdDfc0ED5a119f3378c8ef8",
    },
    uniswap_other: {
      router: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
      factory: "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
    },
    uniswap_v3 : {
      UniswapV3Factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      NonfungiblePositionManager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      SwapRouter: "0xE592427A0AEce92De3Edee1F18E0157C05861564"
    },
    pricing: { 
      swap_to_price: "0xa61cBe7E326B13A8dbA11D00f42531BE704DF51B", 
      frax_oracle_wrapper: "0x2A6ddD9401B14d0443d0738B8a78fd5B99829A80",
      fxs_oracle_wrapper: "0xeE0F15e5Ffc105EBb3d1368cf84F43b40caB3480",
      chainlink_eth_usd: "0xBa6C6EaC41a24F9D39032513f66D738B3559f15a",
      chainlink_fxs_usd: "0x679a15fe8B2108fdA30f292C92abCDE3a1246324"

    },
    bridges: {
      frax: {
        arbitrum: "0x183D0dC5867c01bFB1dbBc41d6a9d3dE6e044626", // anySwap: Dump into bridge
        aurora: "0x23Ddd3e3692d1861Ed57EDE224608875809e127f", // Rainbow Bridge: lockToken
        avalanche: "0x820A9eb227BF770A9dd28829380d53B76eAf1209", // anySwap: Dump into bridge
        boba: "0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00", // bobaGateway: depositERC20
        bsc: "0x533e3c0e6b48010873B947bddC4721b1bDFF9648", // anySwap: Dump into bridge
        ethereum: "0x4f60a160D8C2DDdaAfe16FCC57566dB84D674BD6", // Mainnet anyFRAX (for the router)
        evmos: "",
        fantom: "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE", // anySwap: Dump into bridge
        fuse: "",
        harmony: "0xB37D31b2A74029B5951a2778F959282E2D518595", // Celer: IOriginalTokenVault deposit
        moonbeam: "0x88A69B4E698A4B090DF6CF5Bd7B2D47325Ad30A3", // Nomad Bridge: send
        moonriver: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
        optimism: "0xB37D31b2A74029B5951a2778F959282E2D518595",
        polygon: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
        solana: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
        zksync: "",
      },
      fxs: {
        arbitrum: "0x183D0dC5867c01bFB1dbBc41d6a9d3dE6e044626", // anySwap: Dump into bridge
        aurora: "0x23Ddd3e3692d1861Ed57EDE224608875809e127f", // Rainbow Bridge: lockToken
        avalanche: "0x820A9eb227BF770A9dd28829380d53B76eAf1209", // anySwap: Dump into bridge
        boba: "0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00", // bobaGateway: depositERC20
        bsc: "0x533e3c0e6b48010873B947bddC4721b1bDFF9648", // anySwap: Dump into bridge
        ethereum: "0x685b63CFE0179b3EFb70A01dCb1D648549AA192d", // Mainnet anyFXS (for the router)
        evmos: "",
        fantom: "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE", // anySwap: Dump into bridge
        fuse: "",
        harmony: "0xB37D31b2A74029B5951a2778F959282E2D518595", // Celer: IOriginalTokenVault deposit
        moonbeam: "0x88A69B4E698A4B090DF6CF5Bd7B2D47325Ad30A3", // Nomad Bridge: send
        moonriver: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
        optimism: "0xB37D31b2A74029B5951a2778F959282E2D518595",
        polygon: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
        solana: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
        zksync: "",
      },
      collateral: {
        arbitrum: "0xcEe284F754E854890e311e3280b767F80797180d", // Arbitrum One Bridge: outboundTransfer
        aurora: "0x23Ddd3e3692d1861Ed57EDE224608875809e127f", // Rainbow Bridge: lockToken
        avalanche: "0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0", // anySwap: Dump into bridge
        boba: "0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00", // bobaGateway: depositERC20
        bsc: "0x533e3c0e6b48010873B947bddC4721b1bDFF9648", // Not used
        evmos: "",
        fantom: "0xC564EE9f21Ed8A2d8E7e76c085740d5e4c5FaFbE", // anySwap: Dump into bridge
        fuse: "",
        harmony: "0xB37D31b2A74029B5951a2778F959282E2D518595",  // Not used
        moonbeam: "0x88A69B4E698A4B090DF6CF5Bd7B2D47325Ad30A3", // Nomad Bridge: send
        moonriver: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
        optimism: "0x99C9fc46f92E8a1c0deC1b1747d010903E884bE1",
        polygon: "0xA0c68C638235ee32657e8f720a23ceC1bFc77C77",
        solana: "0x3ee18B2214AFF97000D974cf647E7C347E8fa585",
        zksync: "",
      },
      liquidity_bridgers: {
        arbitrum: {
          anySwap: "0xddf6b5B2BA110a0267BffB86AeAbFe2637cb8375"
        },
        aurora: {
          rainbow: "0xD4f638819Ed2c349E9Cfb6b5168d9e810a9D4f85"
        },
        avalanche: {
          anySwap: "0xBA5478A712b5EA898AF03206ab4c7E0608C3e69D" // Old: 0x1c2eFc27f7E892c2A36B7dE78958F83a231b52f1
        },
        boba: {
          anySwap: "0x4828D4496Ff8dA2f5c1E7217Dc282b5C69B83263",
        },
        bsc: {
          anySwap: "0x4572B68296A23B4C66696FAd177c50CBc35c532F"
        },
        evmos: {

        },
        fantom: {
          anySwap: "0x8575FFE80b94fe58c8e0c735E11658A760109f53"
        },
        harmony: {
          celer: "0x8D0A8f07F5Ea7F0982Ed116993200C331E4cdD27"
        },
        moonbeam: {
          nomad: "0xa5924D9baA4fed0fbd100CB47CBCb61eA5E33219"
        },
        moonriver: {
          anySwap: "0xc7F48Fb6Dbb6F8A3Eed90553017cDf5725Dc44ac"
        },
        optimism: {
          celer: "0x7F35dc487A5422D6946aAD733C6018F163084ed0"
        },
        polygon: {
          maticBridge: "0x6e1A844AFff1aa2a8ba3127dB83088e196187110"
        },
        solana: {
          wormhole_v2: "0xF3a21b5d9E11eECA3a50BEb654276987164AbC8d"
        }
      }
    },
    misc: {
      timelock: "0x8412ebf45bAC1B340BbE8F318b928C466c4E39CA",
      migration_helper: "0xe16723A08Ae054a8F20BDc0395389569011e78D6",
      mint_utilities: "0xE054C1ab5D548E0144ab3F89a8f5809137819906",
      staking_utilities: "0xE4de6E1DF1FE135D6462554d0Fd36A14d787f689",
      investor_amo_V1: "0xEE5825d5185a1D512706f9068E69146A54B6e076",
      investor_amo: "0xB8315Af919729c823B2d996B1A6DDE381E7444f1", // Old proxy: 0x2B4d259a8f6E765AD881C4C1D04045D629dA01b4
      // investor_amo_impl: "0xde3c8aa7f53a69c595b7720045000a68cb9cb341", // Old V3: 0xEccA5a27B4f8f92a2bFFd006F20168A7188C0A0C, Old V2: "0xEE5825d5185a1D512706f9068E69146A54B6e076", // Old: 0xe09394AE14d7c3b1798e4dbEa4c280973B2689A4
      // investor_amo_admin: "0x069c24600c2A03147D4E1D9b04d193151676F577",
      lending_amo: "0x9507189f5B6D820cd93d970d67893006968825ef", // Old: 0xDA9d06166c2085988920Fb35EB2d322B4aaDF1EE
      curve_amo_V1: "0xbd061885260F176e05699fED9C5a4604fc7F2BDC",
      curve_amo_V2: "0xD103FEf74D05FbC20B5184FE85c7187735355DB3", //0xeF8c0b4902b985bF64B8cfF6BbCD0AC1FDc8d5d3", // Proxy: "0x7e983e4f98b16cee76f8f9a6a1e87b5861de8769"
      curve_amo: "0x72170Cdc48C33a6AE6B3E83CD387ca3Fb9105da2", // Impl: 0xC3204838aF4CE0597476aDF367B4C9a3cf9a1B51
      // curve_amo_impl: "0x5840db064e17480f8e8e74fd6714c9c316f7ddfe", // Old2: 0xbd061885260F176e05699fED9C5a4604fc7F2BDC", Old1: 0x77746DC37Deae008c7149EDc1b1A8D6d63e08Be5, Old2: 0x25e9702359bAf56E505F0BA981eeBFA23ceB030A, Old3: 0x19a47F38D39692617C9D9012eC0176C9ead00a5e
      curve_amo_admin: "0x900909C07c2761d84C5d863FF5905102916DF69C",
      fxs_1559_amo: "0x9C6a04871D11b33645ab592f68C41bb2B41F51EE", // Old1: "0xaf02be5968D8Fe9536e24E4c7e888C59A58Bc077"
      fxs_1559_amo_v2: "0xC80C48862E4254F37047235298eDb6AA35717C24", // Proxy
      fxs_1559_amo_v3: "0xb524622901b3f7b5DeA6501E9830700C847C7DC5", // Old: "0x7301BB959ee286D8ABC46f341144afE443CEdAe5",
      stakedao_amo: "0x375278D3C65f29C1A90E8550888f1439cFeFe465", // Impl: 0xcf1e6926b2167f83ec3300bed04a672abd93e646 
      ohm_amo: "0x5699d20732a2EFa9A895EF04bb210aa751C4dB96", // Impl: 0x89a5CeC88598c0CE4d4E331D0b027499edd3dfFa
      ohm_amo_admin: "0xE53d45ABe10Ce20427D20c5a1b6360Fa5BA0cE0A",
      convex_amo: "0x49ee75278820f409ecd67063D8D717B38d66bd71", // Impl: 0x49f77ddd4d57636ab4c98d8f18ca5f4b5210983d
      convex_amo_admin: "0xE53d45ABe10Ce20427D20c5a1b6360Fa5BA0cE0A",
      rari_amo: "0x96665d63c1B53f8335e3c9287Ee255f306C93c45",
      // fxs_1559_amo_v2_impl: "0xCDe9A4e885B87a893b8817D136FD2F404B54294f".
      fxs_1559_amo_v2_admin: "0xCaa487D113ad1C34Ce128c4f3a2A437614C6a692", // Proxy admin
      frax_gauge_v2: "0x72e158d38dbd50a483501c24f792bdaaa3e7d55c",
      crvFRAX_vault: "0xB4AdA607B9d6b2c9Ee07A275e9616B84AC560139",
      multisig: "0xFa27873EA2F0eA9DcD2052848C4A7F8ADE8a3936",
      vefxs_yield_distributor: "0x19a0a70a68fbC604Bf20A03b787df8f7AC1d50f0",
      vefxs_yield_distributor_v2: "0x62C4cf364078C98fA08AfDB4D3d8D87e780Ebd45",
      vefxs_yield_distributor_v3: "0xed2647Bbf875b2936AAF95a3F5bbc82819e3d3FE",
      vefxs_yield_distributor_v4: "0xc6764e58b36e26b08Fd1d2AeD4538c02171fA872",
      frax3crv_curve_rewards_distributor_eoa: "0x73f9f84b04584227b4f0baffd8b37d6d0c11a23c",
      frax3crv_curve_fxs_distributor: "0xBBbAf1adf4d39B2843928CCa1E65564e5ce99ccC", // MAY NEED TO CALL APPROVE FIRST
      uniV2_to_uniV3_migrator_address: "0x7b50137E8996A1717a6D97a0527e4c5D2D133405",
      migration_bundle_utils: "0x239c957d42343B3d91FABc7c16E7F1e30Bc32E5B", // same bytecode: 0x2fFFFbA4F562569bec2D4FC1c36F7797ffb173Cd
      bundle_utils: "0xD1a7b80a954e56bfd7bd889aF6e2BE8674719F5d", 
      vefxs_smart_wallet_checker: "0x53c13BA8834a1567474b19822aAD85c6F90D9f9F",
      frax_gauge_controller: "0x44ade9AA409B0C29463fF7fcf07c9d3c939166ce",
      frax_gauge_controller_v2: "0x3669C421b77340B2979d1A00a792CC2ee0FcE737",
      frax_gauge_rewards_distributor: "0x278dC748edA1d8eFEf1aDFB518542612b49Fcd34",
      uniV3_liquidity_amo: "0x3814307b86b54b1d8e7B2Ac34662De9125F8f4E6", // Old: "0xef2b0895f986Afd7Eb7939B65E2883C5e199751f",
      amo_minter_old: "0x36a0B6a5F7b318A2B4Af75FFFb1b51a5C78dEB8C", 
      amo_minter: "0xcf37B62109b537fa0Cb9A90Af4CA72f6fb85E241", // Old: 0xF9931973fCc0c37908687Eec2CCB28fC3B94B086
      curve_metapool_locker: "0x70F55767B11c047C8397285E852919F5f6c8DC60", 
      curve_metapool_locker_2: "0xE4BD0461AE7fdc76c61CE286a80c9B55d83B204a", 
      aave_amo: "0x66635DC1EdEfF19e839f152a67278151Aa6e1B61",
      cvx_locker_amo: "0x7038C406e7e2C9F81571557190d26704bB39B8f3",
      token_tracker_amo: "0x3F702a8F6c9f9F7ABdfEA67f89d33F18e0368600",
      token_tracker_v2: "0x37336AD1F3A145C710247E6a14C9AcC7f34D09eE",
      manual_token_tracker_amo: "0xEc8672dd770D59FaD9a811591a5Edd40e8F6A413",
      msig_helper: "0x977eaDb6fa9b8E1a2A950CcDE1A75a7b527a8cBB",
      mim_convex_amo: "0x31183a2CCe8d1BFBBFE140Ea1A1264A454Fc821E",
      crosschain_liquidity_tracker: "", 
    },
    libraries: {
      UniswapV2OracleLibrary: "0xeB85Dd2374a44F80342AcF8010d585Bda32B77a0",
      UniswapV2Library: "0xC805D4126C3Ac9d0AD7bb94c3D5cD72E3CbCd6f6",
      FraxPoolLibrary: "0xA11B9C88e4Bf89aD9A70f5d408ffB5A6d5FEb6A4",
      FraxPoolLibrary_V2: "0xe1C3218134E7c69f3443bbd96A5851d193224f78",
    },
    reward_tokens: {
      aave: "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
      anyswap: "0xf99d58e463A2E07e5692127302C20A191861b4D6",
      comp: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
      curve_dao: "0xd533a949740bb3306d119cc777fa900ba034cd52",
      cvx: "0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b",
      cvxCRV: "0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7",
      ens: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
      flx: "0x6243d8CEA23066d098a15582d81a598b4e8391F4",
      fnx: "0xeF9Cd7882c067686691B6fF49e650b43AFBBCC6B",
      fxs: "0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0",
      gel: "0x15b7c0c907e4C6b9AdaAaabC300C08991D6CEA05",
      iq: "0x579CEa1889991f68aCc35Ff5c3dd0621fF29b0C9",
      mta: "0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2",
      ohm: "0x383518188C0C6d7730D91b2c03a03C837814a899",
      ohm_v2: "0x64aa3364F17a4D01c6f1751Fd97C2BD3D7e7f1D5",
      sdt: "0x73968b9a57c6e53d41345fd57a6e6ae27d6cdb2f",
      sushi: "0x6b3595068778dd592e39a122f4f5a5cf09c90fe2",
      temple: "0x470EBf5f030Ed85Fc1ed4C2d36B9DD02e77CF1b7",
      tribe: "0xc7283b66eb1eb5fb86327f08e1b5816b0720212b",
      vsp: "0x1b40183EFB4Dd766f11bDa7A7c3AD8982e998421",
      weth: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    },
    bearer_tokens: {
      "3CRV_ERC20": "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490",
      "3CRV_Pool": "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
      aFRAX: "0xd4937682df3C8aEF4FE912A96A74121C0829E664",
      aUSDC: "0xBcca60bB61934080951369a648Fb03DF4F96263C",
      cAAVE: "0xe65cdB6479BaC1e22340E4E755fAE7E509EcD06c",
      cUSDC: "0x39AA39c021dfbaE8faC545936693aC917d5E7563",
      cvxgusd3CRV_free: "0x15c2471ef46Fa721990730cfa526BcFb45574576",
      // cvxgusd3CRV_deposited: "0x7A7bBf95C44b144979360C3300B54A7D34b44985",
      d3pool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
      "FRAX3CRV-f": "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
      "fTRIBE-8": "0xFd3300A9a74b3250F1b2AbC12B47611171910b07",
      "fUSDC-18": "0x6f95d4d251053483f41c8718C30F4F3C404A8cf2",
      gusd3CRV: "0xd2967f45c4f384deea880f807be904762a3dea07",
      saddleD4: "0xd48cF4D7FB0824CC8bAe055dF3092584d0a1726A",
      saddleD4_Pool: "0xC69DDcd4DFeF25D8a793241834d4cc4b3668EAD6",
      "sdFRAX3CRV-f": "0x5af15DA84A4a6EDf2d9FA6720De921E1026E37b7",
      gOHM: "0x0ab87046fBb341D058F17CBC4c1133F25a20a52f",
      sOHM: "0x04F2694C8fcee23e8Fd0dfEA1d4f5Bb8c352111F",
      stkAAVE: "0x4da27a545c0c5b758a6ba100e3a049001de870f5",
      stkMTA: "0x8f2326316eC696F6d023E37A9931c2b2C177a3D7",
      tFRAX: "0x94671a3cee8c7a12ea72602978d1bb84e920efb2",
      tFXS: "0xadf15ec41689fc5b6dca0db7c53c9bfe7981e655",
      veCRV: "0x5f3b5DfEb7B28CDbD7FAba78963EE202a494e2A2",
      vlCVX: "0xD18140b4B819b895A3dba5442F959fA44994AF50",
      xSDT: "0xaC14864ce5A98aF3248Ffbf549441b04421247D3",
      yvUSDC: "0xa354f35829ae975e850e23e9615b11da1b3dc4de", // V2: "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9"
    },
    saddle_pools: {
      "Saddle alUSD/FEI/FRAX/LUSD": "0xC69DDcd4DFeF25D8a793241834d4cc4b3668EAD6",
    },
    uni_v3_pools: {
      NOTE: "Call getPool here (Factory) to find it: 0x1F98431c8aD98523631AE4a59f267346ea31F984",
      NOTE2: "Do hardhat verify with the v1.0.0 uniswap-v3-core fork",
      "Uniswap V3 FRAX/agEUR": "0x8ce5796ef6B0c5918025bCf4f9CA908201B030b3",
      "Uniswap V3 FRAX/DAI": "0x97e7d56A0408570bA1a7852De36350f7713906ec",
      "Uniswap V3 FRAX/USDC": "0xc63B0708E2F7e69CB8A1df0e1389A98C35A76D52",
      "Uniswap V3 FRAX/WETH": "0x92c7b5ce4cb0e5483f3365c1449f21578ee9f21a",
    },
    investor_custodian: "0x5180db0237291A6449DdA9ed33aD90a38787621c",
    multisigs: {
      Community: "0x63278bF9AcdFC9fA65CFa2940b89A34ADfbCb4A1",
      Team: "0x8D4392F55bC76A046E443eb3bab99887F4366BB0",
      Investors: "0xa95f86fE0409030136D6b82491822B3D70F890b3",
      Treasury: "0x9AA7Db8E488eE3ffCC9CdFD4f2EaECC8ABeDCB48",
      Advisors: "0x874a873e4891fB760EdFDae0D26cA2c00922C404",
      Comptrollers: "0xB1748C79709f4Ba2Dd82834B8c82D4a505003f27",
    },
    vamms: {},
    pair_tokens: {
      "Gelato Uniswap FRAX/DAI": "0xb1Cfdc7370550f5e421E1bf0BF3CADFaDF3C4141",
      "Uniswap FRAX/WETH": "0xFD0A40Bc83C5faE4203DEc7e5929B446b07d1C76",
      "Uniswap FRAX/USDC": "0x97C4adc5d28A86f9470C70DD91Dc6CC2f20d2d4D",
      "Uniswap V3 FRAX/USDC": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap V3 Positions NFT
      "Uniswap V3 FRAX/agEUR": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap V3 Positions NFT
      "Uniswap V3 FRAX/DAI": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap V3 Positions NFT
      "Uniswap V3 FRAX/WETH": "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", // Uniswap V3 Positions NFT
      "Uniswap FEI/TRIBE": "0x9928e4046d7c6513326cCeA028cD3e7a91c7590A",
      "Uniswap FRAX/FXS": "0xE1573B9D29e2183B1AF0e743Dc2754979A40D237",
      "Uniswap FXS/WETH": "0xecBa967D84fCF0405F6b32Bc45F4d36BfDBB2E81",
      "Uniswap FRAX/IQ": "0xd6c783b257e662ca949b441a4fcb08a53fc49914",
      "Uniswap FRAX/TEMPLE": "0x6021444f1706f15465bEe85463BCc7d7cC17Fc03", // THEIR CUSTOM AMM, NOT EXACT
      "Uniswap FRAX/OHM": "0x2dce0dda1c2f98e0f171de8333c3c6fe1bbf4877",
      "StakeDAO sdETH-FraxPut": "0x839A989bE40f2D60f00beEB648903732c041CBd7",
      "StakeDAO sdFRAX3CRV-f": "0x5af15DA84A4a6EDf2d9FA6720De921E1026E37b7",
      "Sushi FRAX/SUSHI": "0xe06F8d30AC334c857Fc8c380C85969C150f38A6A",
      "Sushi FXS/WETH": "0xeC8C342bc3E07F05B9a782bc34e7f04fB9B44502",
      // "Sushi FRAX/FXS": "0xc218001e3D102e3d1De9bf2c0F7D9626d76C6f30",
      // "Sushi FXS/WETH": "0x61eB53ee427aB4E007d78A9134AaCb3101A2DC23",
      // "Curve FRAX-DAI-USDC-USDT": "0x83D2944d5fC10A064451Dc5852f4F47759F249B6", // Proxied Implementation: https://etherscan.io/address/0x2c7796c0590cc100d70af473993890d457cb2ac9#code
      "Curve d3pool": "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
      "Curve FRAX3CRV-f-2": "0xd632f22692fac7611d2aa1c0d552930d43caed3b", // Proxied For: https://etherscan.io/address/0x5f890841f657d90e081babdb532a05996af79fe6
      "Curve MIM3CRV": "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
      "Saddle alUSD/FEI/FRAX/LUSD": "0xd48cF4D7FB0824CC8bAe055dF3092584d0a1726A",
      "Temple FRAX/TEMPLE": "0x6021444f1706f15465bEe85463BCc7d7cC17Fc03",
      "Vesper Orbit FRAX": "0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5",      
    },
    staking_contracts: {
      "Gelato Uniswap FRAX/DAI": "0xcdfc491804A420b677f8e788B5157856910E2F6f",
      "Uniswap FRAX/WETH": "0xD875628B942f8970De3CcEaf6417005F68540d4f",
      "Uniswap FRAX/USDC": "0xa29367a3f057F3191b62bd4055845a33411892b6",
      "Uniswap V3 FRAX/agEUR": "0xf8caEd1943B15B877D7105B9906a618c154f69E8",
      "Uniswap V3 FRAX/DAI": "0xF22471AC2156B489CC4a59092c56713F813ff53e", // "0xD922cD347eb367FC4FB4bbcb68A84C6CDD3bA4ba",
      "Uniswap V3 FRAX/USDC": "0x3EF26504dbc8Dd7B7aa3E97Bc9f3813a9FC0B4B0", // Old4: "0x1e1356Eb81a56daEcfAdA456E007b26C86c56670", // Old3: "0xCbe6ea4725e4ba34aa215B95239DfA6E8854B49a", // Old2: "0x1C21Dd0cE3bA89375Fc39F1B134AD15671022660", // Old1: "0xF397Abd7495EB6FE4697F45b5BA17166f03533b9"
      "Uniswap FEI/TRIBE": "0x9928e4046d7c6513326cCeA028cD3e7a91c7590A",
      "Uniswap FRAX/FXS": "0xda2c338350a0E59Ce71CDCED9679A3A590Dd9BEC",
      "Uniswap FXS/WETH": "0xDc65f3514725206Dd83A8843AAE2aC3D99771C88",
      "Uniswap FRAX/IQ": "0xF37057823910653a554d996B49E3399DC87fAE1b", // V1: "0x35fc5Fd90e06c47c0D9dEBfEDB1daF55bCE14E6d",
      "Uniswap FRAX/OHM": "0xfC77A420f56Dec53e3b91D7FC936902e132335FF",
      "StakeDAO sdETH-FraxPut": "0x0A53544b2194Dd8Ebc62c779043fc0624705BB56",
      "StakeDAO sdFRAX3CRV-f": "0xEB81b86248d3C2b618CcB071ADB122109DA96Da2",
      "Sushi FRAX/SUSHI": "0xb4Ab0dE6581FBD3A02cF8f9f265138691c3A7d5D",
      "Sushi FXS/WETH": "", // Pre-gauge: "0x74C370990C1181303D20e9f0252437a97518B95B",
      "Saddle alUSD/FEI/FRAX/LUSD": "0x0639076265e9f88542C91DCdEda65127974A5CA5",
      "Temple FRAX/TEMPLE": "0x10460d02226d6ef7B2419aE150E6377BdbB7Ef16", // Old1: "0x016563F5EB22cF84fA0Ff8B593DdC5343ca15856",
      "Vesper Orbit FRAX": "0x698137C473bc1F0Ea9b85adE45Caf64ef2DF48d6",
    },
    external_farm_tokens: {
      "1Swap FRAX/1S3P": "",
      "Angle FRAX/agEUR Staking": "",
      "Angle FRAX/agEUR Perpetuals": "",
      "Aave FRAX Lending": "",
      "APY.Finance Curve FRAX": "",
      "Axial AC4D TSD/MIM/FRAX/DAI.e": "0x4da067E13974A4d32D342d86fBBbE4fb0f95f382",
      "Beefy Finance [Avalanche]": "",
      "Beefy Finance [BSC]": "",
      "Beefy Finance [Fantom]": "",
      "Beefy Finance [Harmony]": "",
      "Beefy Finance [Polygon]": "",
      "Beefy Finance [Moonriver]": "",
      "Convex cvxFXS/FXS": "",
      "Convex FRAX3CRV-f": "",
      "Convex d3pool": "",
      "Curve FRAX3CRV-f-2": "",
      "dForce FRAX Lending": "",
      "Hundred FRAX Lending [Arbitrum]": "0xb1c4426C86082D91a6c097fC588E5D5d8dD1f5a8",
      "Hundred FRAX Lending [Fantom]": "0xb4300e088a3AE4e624EE5C71Bc1822F68BB5f2bc",
      "Liquid Driver FRAX/FTM": "",
      "Lobis FXS Bonds": "",
      "Market.xyz FRAX Lending": "",
      "OlympusDAO FRAX Bonds": "",
      "Olympus Pro FRAX/WETH SLP": "",
      "Pangolin FRAX/AVAX": "0x55152E05202AE58fDab26b20c6Fd762F5BCA797c", // Old: "0xfd0824dF1E598D34C3495e1C2a339E2FA23Af40D",
      "Planet Finance FRAX Lending": "0x6022bA7e5A70E1bAA98d47a566F3495A26511b25",
      "Rari FRAX Lending": "",
      "Saber wFRAX/USDC": "", // FRAXXvt2ucEsxYPK4nufDy5zKhb2xysieqRBE1dQTqnK
      "Scream FRAX Lending": "",
      // "SmartCredit FRAX Lending": "",
      // "SmartCredit FXS Lending": "",
      "Solarbeam FRAX/ROME": "",
      "Solarbeam FRAX/MOVR": "",
      "SpiritSwap FRAX/FTM": "0x7ed0cdDB9BB6c6dfEa6fB63E117c8305479B8D7D", // MasterChef Pool #14
      "SpiritSwap FRAX/USDC": "0x1478AEC7896e40aE5fB858C77D389F0B3e6CbC5d",
      // "SpiritSwap FRAX/FXS": "0x100FcF27C87D1cc7b8D6c28b69b84A359e4fd377", // MasterChef Pool #16
      "SpiritSwap/Ola FRAX Lending": "0x88c05534566f3bd6b6d704c9259408ff1f1a3f00",
      "Sushi FRAX/ETH": "0xeC8C342bc3E07F05B9a782bc34e7f04fB9B44502",
      "Sushi FRAX/ETH [Harmony]": "",
      "Sushi FRAX/FXS [Polygon]": "0xdf45b5b68d9dc84173dd963c763aea8cad3e24a6",
      "Sushi FRAX/USDC [Moonriver]": "0x310C4d18640aF4878567c4A31cB9cBde7Cd234A3",
      "Tokemak FRAX Staking": "",
      "Tokemak FXS Staking": "",
      "Trader Joe FRAX/AVAX": "0x862905a82382db9405a40dcaa8ee9e8f4af52c89",
      "Trader Joe FRAX/gOHM": "0x3E6Be71dE004363379d864006AAC37C9F55F8329",
      "Trader Joe FXS/AVAX": "0x53942Dcce5087f56cF1D68F4e017Ca3A793F59a2",
      "veDAO FRAX": "0xE04C26444d37fE103B9cc8033c99b09D47056f51",
      "Vesper Orbit FRAX": "0xc14900dFB1Aa54e7674e1eCf9ce02b3b35157ba5",
      "Yearn crvFRAX Vault (V3)": "",
    },
    middleman_gauges: {
      "Curve VSTFRAX-f": "0x127963A74c07f72D862F2Bdc225226c3251BD117", // Arbitrum
      "mStable FRAX/mUSD": "0x3e14f6EEDCC5Bc1d0Fc7B20B45eAE7B1F74a6AeC", // Polygon
      "Sushi FRAX/FXS": "", // Polygon
      // "Snowball S4D": "0x66fD216bCBeb566EF038A116B7270f241005e186", // Avalanche
      "SpiritSwap FRAX/FXS": "0xebF993690F65B23862E10F489656529ac06A27B8", // Fantom
    },
  },
  arbitrum: {
    chain_id: 42161,
    main: {
      FRAX: "0x667fd83e24ca1d935d36717d305d54fa0cac991c",
      FXS: "0xc19281f22a075e0f10351cd5d6ea9f0ac63d4327",
    },
    canonicals: {
      FRAX: "0x17FC002b466eEc40DaE837Fc4bE5c67993ddBd6F",
      FXS: "0x9d2F299715D94d8A7E6F5eaa8E654E8c74a988A7",
    },
    bridge_tokens: {
      anyFRAX: "0x667fd83e24ca1d935d36717d305d54fa0cac991c",
      anyFXS: "0xc19281f22a075e0f10351cd5d6ea9f0ac63d4327",
      arbiFRAX: "0x7468a5d8e02245b00e8c0217fce021c70bc51305",
      celrFRAX: "0x330066cf308Cea289f74585e85fA001048E8A5C0",
      celrFXS: "0x1215107d442d70D43DC5EAd1Bfd2268525015c4f",
      synFRAX: "0x85662fd123280827e11C59973Ac9fcBE838dC3B4",
    },
    collaterals: {
      arbiUSDC: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      arbiUSDT: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    },
    bridges: {
      anyFRAX: "0x667fd83e24ca1d935d36717d305d54fa0cac991c",
      anyFXS: "0xc19281f22a075e0f10351cd5d6ea9f0ac63d4327",
      arbiFRAX: "0x09e9222E96E7B4AE2a407B98d48e330053351EEe", // Arbitrum: L2 ERC20 Gateway
      arbiUSDC: "0x5288c571Fd7aD117beA99bF60FE0846C4E84F933",
    },
    bridge_backers: {
      anySwap: "0xddf6b5B2BA110a0267BffB86AeAbFe2637cb8375",
    },
    multisigs: {
      Comptrollers: "0xe61D9ed1e5Dc261D1e90a99304fADCef2c76FD10",
    },
    oracles: {
      single_assets: {
        FXS: "0x6a0Fc220D129F4D21e40764ed0BeA4ec777f3D03", // Old: "0xdb9e3464a27fd3A36C0DedD8A1841dEC7cd0151D"
      },
      cross_chain_oracle: "0xe5fd90e47EF7CbBD92139a22a7041071E2B9a474",
    },
    oracles_other: {
      combo_oracle: "0xfD9FA9b80BFEc955bB042ea4D75A50537D8d54fe", // "0xd85884908F6477c90147936AAa130Aa3B284Efd6",
      combo_oracle_univ2_univ3: "0xdcC922886e9F6FeCE599d94c82e9d0B52893350d", // "0x37F7865568d9cb30791583cA404E0B23eF05CF21",
    },
    uniswap: {
      v2_router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      v3_factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      v3_nft_manager: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
      v3_router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    amos: {
      curve: "0x62544Bd5da87F51934C09cD6464757ACecaf8e49",
      hundred_lending: "0xE19671022a3972084bF0E842fCEC6043dDda25e3",
      sushiswap_liquidity: "0x5D83f657959F916D72a33DDF53BFb7EcD7Ef1507", // Old: "0xFB5Bb0AE6f9f0a153E59d7EB7C993eb293b7d713"
    },
    reward_tokens: {
      weth: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      SPELL: "0x3E6648C5a70A150A88bCE65F4aD4d506Fe15d2AF",
      SDL: "0x75c9bc761d88f70156daf83aa010e84680baf131",
      VSTA: "0xa684cd057951541187f288294a1e1C2646aA2d24"
    },
    bearer_tokens: {
      FRAX2pool: "0xf07d553B195080F84F582e88ecdD54bAa122b279",
      hFRAX: "0xb1c4426C86082D91a6c097fC588E5D5d8dD1f5a8",
      saddleArbUSDv2: "0x0a20c2FFa10cD43F67D06170422505b7D6fC0953",
    },
    vamms: {},
    pair_tokens: {
      "Curve VSTFRAX-f": "0x59bF0545FCa0E5Ad48E13DA269faCD2E8C886Ba4",
      "Sushi canFRAX/canFXS": "0xfb5DB4f55Bb97A608f6EE50864104457FA04DA4f",
      "Sushi canFRAX/WETH": "0xaebfda10b251d650126830b952ee74b4a599f71f",
      "Sushi canFRAX/arbiUSDC": "0x8286a9881CEe20E71ac1215f8D39De6853Dd9A8F",
      "Sushi canFXS/arbiUSDC": "0xC1C8136A948e6332db36E90aDD6fb004871176A2",
    },
    staking_contracts: {
      "Curve VSTFRAX-f": "0x127963A74c07f72D862F2Bdc225226c3251BD117",
      "Olympus Pro FRAX Bond [Arbitrum]": "",
    },
  },
  aurora: {
    chain_id: 1313161554,
    main: {
      FRAX: "0xDA2585430fEf327aD8ee44Af8F1f989a2A91A3d2",
      FXS: "0xc8fdD32E0bf33F0396a18209188bb8C6Fb8747d2",
    },
    canonicals: {
      FRAX: "0xE4B9e004389d91e4134a28F19BD833cBA1d994B6",
      FXS: "0xBb8831701E68B99616bF940b7DafBeb4CDb23e0b",
    },
    bridge_tokens: {
      anyFRAX: "0xb12c13e66AdE1F72f71834f2FC5082Db8C091358",
      anyFXS: "0x735aBE48e8782948a37C7765ECb76b98CdE97B0F",
      celrFRAX: "0x22953AF8b73f4f876FC09e836a14a1f64B209FEF",
      celrFXS: "0xAB0C1da69e383edB087D09b1eFD333321e5d6493",
      rnbwFRAX: "0xDA2585430fEf327aD8ee44Af8F1f989a2A91A3d2",
      rnbwFXS: "0xc8fdD32E0bf33F0396a18209188bb8C6Fb8747d2",
      rnbwUSDC: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
    },
    collaterals: {
      rnbwUSDC: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
      USDC: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802",
    },
    bridges: {
      rnbwFRAX: "0xDA2585430fEf327aD8ee44Af8F1f989a2A91A3d2", // ???
      rnbwFXS: "0xc8fdD32E0bf33F0396a18209188bb8C6Fb8747d2", // ???
      rnbwUSDC: "0xB12BFcA5A55806AaF64E99521918A4bf0fC40802", // ???
    },
    bridge_backers: {
      rainbow: "0xD4f638819Ed2c349E9Cfb6b5168d9e810a9D4f85",
    },
    multisigs: {
      Comptrollers: "",
      Address1: "0x1D50A8c3295798fCebdDD0C720BeC4FBEdc3D178",
    },
    reward_tokens: {
      WETH: "0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB",
    },
    oracles: {
      single_assets: {
        FRAX: "0x68610670f1A7e4B9565011598756E046f226bC9A",
        FXS: "0x77eEB1D0958E65A5CB707bDd4B8Bea19512A3bbe",
        USDC: "0x1F853fFe53b340194656Bc2FDBBe10C0832E0ae4",
        WETH: "0xa1ba72e6Bb18f934c5Ea31e795FE48a5cD3a6b79",
      },
      cross_chain_oracle: "0x7330bFdB544D465d9AD5ea2fC2C2716df4bCFb62",
    },
    oracles_other: {
      combo_oracle: "0x14F6C7bd72eff955878370cF9e57107544BfC406",
      combo_oracle_univ2_univ3: "0x4Ea683676c25eB7EB477c8d1993fDdB6Ff7DA7de",
    },
    uniswap: {
      v2_router: "0xBaE0d7DFcd03C90EBCe003C58332c1346A72836A",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {},
    bearer_tokens: {
      "Saddle FRAX/USDC": "0x35Aba9B269Af8261B797f48b74195f61a68d9F45",
    },
    vamms: {
      USDC: "0x962f8Ee7189e6b77d798BeF941951F5c65DB001E", // Saddle FRAX/USDC
    },
    pair_tokens: {
      "NearPad canFRAX/canFXS": "0x120160EF80BA3a5D06d14497886dBd0F032Efa7F",
      "NearPad canFRAX/WETH": "0x8561a678682E937cc7F778559613033B3a1Ae41e",
    },
    staking_contracts: {},
  },
  avalanche: {
    chain_id: 43114,
    main: {
      FRAX: "0xDC42728B0eA910349ed3c6e1c9Dc06b5FB591f98",
      FXS: "0xD67de0e0a0Fd7b15dC8348Bb9BE742F3c5850454",
    },
    canonicals: {
      FRAX: "0xD24C2Ad096400B6FBcd2ad8B24E7acBc21A1da64", // Old: "0x2809004266F5194A9bE81EC3F0962C7E16e1A623",
      FXS: "0x214DB107654fF987AD859F34125307783fC8e387", // Old: "0x0882a168d6c966E4679E288368C2A8d8bc8B3f8a"
    },
    bridge_tokens: {
      anyFRAX: "0xDC42728B0eA910349ed3c6e1c9Dc06b5FB591f98", // Swapout
      anyFXS: "0xD67de0e0a0Fd7b15dC8348Bb9BE742F3c5850454", // Swapout
      celrFRAX: "0x693B47a7fC3d33AE9eBec15e5F42f2dB480066f3",
      celrFXS: "0xdb84EA36FcddfE5febae7da8b2806EffE9C8B353",
      synFRAX: "0xcc5672600B948dF4b665d9979357bEF3af56B300",
    },
    collaterals: {
      DAI: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
      MIM: "0x130966628846BFd36ff31a822705796e8cb8C18D",
      TSD: "0x4fbf0429599460D327BD5F55625E30E4fC066095",
      "USDC.e": "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    },
    bridges: {
      anyFRAX: "0xDC42728B0eA910349ed3c6e1c9Dc06b5FB591f98", // Swapout
      anyFXS: "0xD67de0e0a0Fd7b15dC8348Bb9BE742F3c5850454", // Swapout
      "USDC.e": "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664", // AEB
    },
    bridge_backers: {
      anySwap: "0xBA5478A712b5EA898AF03206ab4c7E0608C3e69D",
    },
    multisigs: {
      Comptrollers: "0xc036Caff65c1A31eAa53e60F6E17f1E6689937AA",
    },
    oracles: {
      single_assets: {
        FRAX: "0x83379BF945B02787784b8C2a464BB4874b4D8dF4", // "0xbcD78D895c01d206e692B56Eb0415f6ADF2a8Dc3",
        FXS: "0xfe08cf7C1e478AA3069ef367e8EA18Cac5e46870", // "0x1c16d93514bE03D433aF16Bc05821D89118fb8A8"
      },
      cross_chain_oracle: "0x4E8211823087Bd498277E10178fB0FE5C0e24d87",
    },
    oracles_other: {
      combo_oracle: "0xf22460b939F1490b485005C0fe4643951724f822", // 0x06EC24263cd9c626e34b1f05E1e07a6aCa5fBe67",
      combo_oracle_univ2_univ3: "0xfD1a5eD9FaE84f06Ab2e846851F256D4d07B1A17", // "0xdB016dF0FCeCEFbef7D3Ff0a853265d04a6F5B30",
    },
    uniswap: {
      v2_router: "0xE54Ca86531e17Ef3616d22Ca28b0D458b6C89106",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {
      axial: "0x81C9e3327e620e74e41cF14b2FD7319084E6a246",
      pangolin_liquidity: "0x4c1D334d18b8EDD15d45E241aa165aB835c5Fe5e", // Old: "0x96F8A7bDcb5a6F7FfC44FB9952c29296c0c31Acf"
    },
    reward_tokens: {
      snob: "0xC38f41A296A4493Ff429F1238e030924A1542e50",
      wavax: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    },
    bearer_tokens: {
      "Axial AC4D TSD/MIM/FRAX/DAI.e": "0x4da067E13974A4d32D342d86fBBbE4fb0f95f382",
      "FRAX3CRV-f": "0xE013593CEA239E445d2271106836b00C9E7356ae",
      gOHM: "0x321E7092a180BB43555132ec53AaA65a5bF84251",
    },
    cross_chain_rewarders: {
      //"Snowball S4D": "0x66fD216bCBeb566EF038A116B7270f241005e186",
    },
    misc_pools: {
      snowball_s4d_swapflashloan: "0xA0bE4f05E37617138Ec212D4fB0cD2A8778a535F",
    },
    vamms: {},
    pair_tokens: {
      "Pangolin canFRAX/canFXS": "0xe0CC7ed0666B29e60a21aF8636bBC69b21eDc434",
      "Pangolin canFRAX/WAVAX": "0x0ce543c0f81ac9aaa665ccaae5eec70861a6b559",
      "Pangolin canFRAX/USDC.e": "0x0c8249757b8d66cB2b6155281A5e4f8F53C94c05",
      "Pangolin canFXS/USDC.e": "0x8614F7ca1f4b08Ef2C158a3027EA55fAA8384aC8",
      "Pangolin FRAX/AVAX": "0x0ce543c0f81ac9aaa665ccaae5eec70861a6b559",
      "Pangolin FXS/AVAX": "0xd538a741c6782cf4e21e951cda39327c50c51087",
      //"Snowball S4D": "0xB91124eCEF333f17354ADD2A8b944C76979fE3EC",
      "Trader Joe FXS/AVAX": "0x53942Dcce5087f56cF1D68F4e017Ca3A793F59a2",
      "Trader Joe FRAX/gOHM": "0x3E6Be71dE004363379d864006AAC37C9F55F8329",
      "Trader Joe FRAX/AVAX": "0x862905a82382db9405a40dcaa8ee9e8f4af52c89",
      // "Trader Joe FRAX/WAVAX": "0x0d84595e8638dbc631076c51000b2d31120d8aa1", // Old FRAX
    },
    staking_contracts: {
      "Pangolin FRAX/AVAX": "0x1f806f7C8dED893fd3caE279191ad7Aa3798E928", // Old2: "0x55152E05202AE58fDab26b20c6Fd762F5BCA797c", // Old: "0xfd0824dF1E598D34C3495e1C2a339E2FA23Af40D",
      // "Pangolin FXS/AVAX": "0x76Ad5c64Fe6B26b6aD9aaAA19eBa00e9eCa31FE1",
      //"Snowball S4D": "0x0bd7964E2E03bdb9703658A1e88F4Dc786FfA551",
      "Trader Joe FXS/AVAX": "0x53942Dcce5087f56cF1D68F4e017Ca3A793F59a2",
      "Trader Joe FRAX/gOHM": "0x3E6Be71dE004363379d864006AAC37C9F55F8329",
      "Trader Joe FRAX/AVAX": "0x862905a82382db9405a40dcaa8ee9e8f4af52c89",
    },
  },
  boba: {
    chain_id: 288,
    main: {
      FRAX: "0xAb2AF3A98D229b7dAeD7305Bb88aD0BA2c42f9cA",
      FXS: "0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00",
    },
    canonicals: {
      FRAX: "0x7562F525106F5d54E891e005867Bf489B5988CD9",
      FXS: "0xae8871A949F255B12704A98c00C2293354a36013",
    },
    bridge_tokens: {
      anyFRAX: "0x0dCb0CB0120d355CdE1ce56040be57Add0185BAa", // Router anyFRAX
      anyFXS: "0xABd380327Fe66724FFDa91A87c772FB8D00bE488", // Router anyFXS
      bobaFRAX: "0xAb2AF3A98D229b7dAeD7305Bb88aD0BA2c42f9cA",
      bobaFXS: "0xdc1664458d2f0B6090bEa60A8793A4E66c2F1c00",
      celrFRAX: "0xB0d8cF9560EF31B8Fe6D9727708D19b31F7C90Dc",
      celrFXS: "0x5803457E3074E727FA7F9aED60454bf2F127853b",
    },
    multisigs: {
      Address1: "0xEEF54910b5200F94e91e4A9A891ca95797B6fbf8",
    },
    collaterals: {
      bobaUSDC: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc",
      USDC: "0x66a2A913e447d6b4BF33EFbec43aAeF87890FBbc",
    },
    bridges: {
      anyFRAX: "0x0dCb0CB0120d355CdE1ce56040be57Add0185BAa",
      anyFXS: "0xABd380327Fe66724FFDa91A87c772FB8D00bE488",
      bobaFRAX: "0x3256bd6fc8b5fa48db95914d0df314465f3f7879", // burnAndWithdraw
      bobaFXS: "0x3256bd6fc8b5fa48db95914d0df314465f3f7879", // burnAndWithdraw
      bobaUSDC: "0x3256bd6fc8b5fa48db95914d0df314465f3f7879", // burnAndWithdraw
    },
    bridge_backers: {
      bobaGateway: "0x4828D4496Ff8dA2f5c1E7217Dc282b5C69B83263",
    },
    oracles: {
      single_assets: {
        FRAX: "0xa6e4F91618012427f4C86F0EC7e38C7cB617eb81",
        FXS: "0xa6CACC65d0d8125009972cCFF668AAc48AD0FF1b",
        USDC: "0xEfCf59d9B41248B682F26Bb570e3f6eaB896EBB0",
        WETH: "0x11d3cfDf4692A9249945aEAA21Ade906E68E9724",
      },
      cross_chain_oracle: "0xA8303990D90919da61CbAcACcaBb0D1b2EFe75a1",
    },
    oracles_other: {
      combo_oracle: "0xA0e15F1cf14059989E0D1AefeC3cD09310450448",
      combo_oracle_univ2_univ3: "0x7953b1fd417113E82AC66266ec4B7327eE67283A",
    },
    uniswap: {
      v2_router: "0x17C83E2B96ACfb5190d63F5E46d93c107eC0b514",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {
      oolongswap_liquidity: "0x7bF8C4FBEFB2Ea482ad04D956b92CfD2322608CF",
    },
    bearer_tokens: {
      "Saddle FRAX/USDC": "0x19Fe1996fB62610E36b366254A658089774Fe826",
    },
    vamms: {
      USDC: "0x614580e411b6C8E2E21b4bb40b68910CCE802049", // Saddle FRAX/USDC
    },
    reward_tokens: {
      WETH: "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000",
    },
    pair_tokens: {
      "OolongSwap canFRAX/canFXS": "0x32ae2FB6312A02ca8eEF2A183514aAc11Ee6F195",
      "OolongSwap canFRAX/WETH": "0xB0BC608946EbB5D0cdF9e54e387FA20656577dd6",
      "OolongSwap canFRAX/USDC": "0x0355206EF12935669dD7Ce793B642A0488C67e87",
    },
    staking_contracts: {
      "OolongSwap aCYBER-FRAX": "",
    },
  },
  bsc: {
    chain_id: 56,
    main: {
      FRAX: "0x29cED01C447166958605519F10DcF8b0255fB379",
      FXS: "0xDE2F075f6F14EB9D96755b24E416A53E736Ca363",
    },
    canonicals: {
      FRAX: "0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40",
      FXS: "0xe48A3d7d0Bc88d552f730B62c006bC925eadB9eE",
    },
    bridge_tokens: {
      anyFRAX_V5: "0xdd03dbed9abdb125f1bdd465caadbefdff4f7524", // Router anyFRAX
      anyFRAX: "0x29cED01C447166958605519F10DcF8b0255fB379",
      anyFXS: "0x70523d78a74f5533768075283bcb473ca01a8a4b",
      binFXS: "0xDE2F075f6F14EB9D96755b24E416A53E736Ca363",
      celrFRAX: "0xB5df797468E6e8f2Cb293Cd6e32939366e0F8733",
      celrFXS: "0xFC27e5d3fBdFcE33fE3226d368b75E59e9CdcA7E",
    },
    multisigs: {
      Comptrollers: "0x8811Da0385cCf1848B21475A42eA4D07Fc5d964a",
    },
    collaterals: {
      BUSD: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56",
      USDC: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
    },
    bridges: {
      anyFRAX_V5: "0xdd03dbed9abdb125f1bdd465caadbefdff4f7524", // Router anyFRAX
      anyFRAX: "0x29cED01C447166958605519F10DcF8b0255fB379", // Swapout
      anyFXS: "0x70523d78a74f5533768075283bcb473ca01a8a4b", // Swapout
    },
    bridge_backers: {
      anySwap: "0x4572B68296A23B4C66696FAd177c50CBc35c532F",
    },
    oracles: {
      single_assets: {
        FXS: "0x0F838b82E71AeBC35Ae507AB6598fBcD299f3920", // "0x8BED357875b881290004fFA49561e8833d288A90"
      },
      cross_chain_oracle: "0xdB7Ee361784756947C529BFA8f54c7e5D8B43F3e",
    },
    oracles_other: {
      combo_oracle: "0x1B3C6BdEACdc4DD9B0C8E3e2Fd222b4581a52A1A", // "0x86eB739D27A5cCfBE6d41a38FBd8B6923fAe3213",
      combo_oracle_univ2_univ3: "0x8159D9CD28B7A140Fd92311C1E5c667d97176727", // "0xEC0C58b7d8d19858d4a0099a4850B1cC61EBa0F3",
    },
    uniswap: {
      v2_router: "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {
      apeswap_liquidity: "0xD900397B25Cb25043C9d850c3ECfaEe1884de470",
      planet_finance_lending: "",
    },
    bearer_tokens: {
      gFRAX: "0x6022bA7e5A70E1bAA98d47a566F3495A26511b25",
      "Saddle FRAX/BUSD": "0xBD0091CC77Fd3bDb620985a1dD8D3f94E071CCE3",
    },
    reward_tokens: {
      BANANA: "0x603c7f932ed1fc6575303d8fb018fdcbb0f39a95",
      CAKE: "0x0e09fabb73bd3ade0a17ecc321fd13a19e81ce82",
      IF: "0xB0e1fc65C1a741b4662B813eB787d369b8614Af1",
      WBNB: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
    },
    vamms: {
      BUSD: "0xf2B9155E3C9756a18EF6572fC99B39F88a9fFf25", // Saddle FRAX/BUSD SwapFlashLoan
    },
    pair_tokens: {
      "Saddle FRAX/BUSD": "0xBD0091CC77Fd3bDb620985a1dD8D3f94E071CCE3",
      "Impossible FRAX/IF": "0x5316e743816223b335764738021f3df7a17a25da",
      "Impossible FRAX/FXS": "0x13d80efd9f4ec6ef7279fe10124cebf58c0d07c2",
      "ApeSwap canFRAX/canFXS": "0x489c8fF79245f14AEEE9520d28209844790cB979",
      "ApeSwap canFRAX/WBNB": "0x16BDb03E6074759943149eBB1526DDfD1AA5fc56",
      "ApeSwap canFRAX/BUSD": "0x5292600758A090490D34367d4864ed6291D254fe",
      "ApeSwap canFRAX/USDC": "0x885BE9bCbCdcB70c59F56A78ae64A820e0448589",
      "ApeSwap canFXS/USDC": "0x84f2781E4E60f97D2963260A7b20D883F04F0d20",
      "ApeSwap canFXS/WBNB": "0x8210D92a8951d50de3D46AC0ee39cb5E2C14e18A",
    },
    staking_contracts: {
      "ApeSwap canFRAX/BUSD": "0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9", // MasterApe
      "ApeSwap canFXS/WBNB": "0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9", // MasterApe
      "Impossible FRAX/IF": "0x5e1F728C0123f7e8B237F61D0105bf9CBd8867B5",
      "Impossible FRAX/FXS": "0x5BE579e5fFF39a958E6269C6D011cd5f21e2cc32",
      "Planet Finance FRAX Lending": "0x6022bA7e5A70E1bAA98d47a566F3495A26511b25",
    },
  },
  evmos: {
    chain_id: 9001,
    main: {
      FRAX: "",
      FXS: "",
    },
    canonicals: {
      FRAX: "",
      FXS: "",
    },
    bridge_tokens: {},
    collaterals: {
      USDC: "",
    },
    bridges: {},
    bridge_backers: {},
    oracles: {
      single_assets: {
        FRAX: "",
        FXS: "",
        USDC: "",
      },
      cross_chain_oracle: "",
    },
    oracles_other: {
      combo_oracle: "",
      combo_oracle_univ2_univ3: "",
    },
    multisigs: {
      Comptrollers: "",
    },
    uniswap: {
      v2_router: "",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {},
    reward_tokens: {
      WETH: "",
    },
    vamms: {},
    pair_tokens: {},
    staking_contracts: {},
  },
  fantom: {
    chain_id: 250,
    main: {
      FRAX: "0xaf319E5789945197e365E7f7fbFc56B130523B33",
      FXS: "0x82F8Cb20c14F134fe6Ebf7aC3B903B2117aAfa62",
    },
    canonicals: {
      FRAX: "0xdc301622e621166BD8E82f2cA0A26c13Ad0BE355",
      FXS: "0x7d016eec9c25232b01F23EF992D98ca97fc2AF5a",
    },
    bridge_tokens: {
      anyFRAX_V5: "0xBDba76fA2659c33ffCc2B0bc134c3A2c8a3Aa94d", // Router anyFRAX
      anyFRAX: "0xaf319E5789945197e365E7f7fbFc56B130523B33", // Swapout
      anyFXS_V5: "0x410A7bf502414B2f0cAAd204de5782077AC6478F", // Router anyFXS
      anyFXS: "0x82F8Cb20c14F134fe6Ebf7aC3B903B2117aAfa62", // Swapout
      anyUSDC: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", // Swapout
      celrFRAX: "0xB0d8cF9560EF31B8Fe6D9727708D19b31F7C90Dc",
      celrFXS: "0x153A59d48AcEAbedbDCf7a13F67Ae52b434B810B",
      synFRAX: "0x1852F70512298d56e9c8FDd905e02581E04ddb2a",
    },
    collaterals: {
      DAI: "0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E",
      anyUSDC: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75",
    },
    bridges: {
      anyFRAX_V5: "0xBDba76fA2659c33ffCc2B0bc134c3A2c8a3Aa94d", // Router anyFRAX
      anyFRAX: "0xaf319E5789945197e365E7f7fbFc56B130523B33", // Swapout
      anyFXS_V5: "0x410A7bf502414B2f0cAAd204de5782077AC6478F", // Router anyFXS
      anyFXS: "0x82F8Cb20c14F134fe6Ebf7aC3B903B2117aAfa62", // Swapout
      anyUSDC: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", // Swapout
    },
    bridge_backers: {
      anySwap: "0x8575FFE80b94fe58c8e0c735E11658A760109f53",
    },
    oracles: {
      single_assets: {
        FXS: "0xfb4Aaf21733273fFD9cf9F4f70e42dA4DBB5e1E3", // "0x2C37fb628b35dfdFD515d41B0cAAe11B542773C3"
      },
      cross_chain_oracle: "0xD41c352bcF599C4C3C7b516eA005ADb2dB219f2c",
    },
    oracles_other: {
      combo_oracle: "0x496E5c8F169C2930Dd67B821d8DdDDC78542f290", // "0xde606CB6Ff5d897Ad8396C6fd9C830D1B81Aca13",
      combo_oracle_univ2_univ3: "0x689C5BC12B0A80a8aa33dc38dfDFB7E858A49601", // "0x4aF1C4dFe82C20481EA07755b200c29dD285E175",
    },
    multisigs: {
      Comptrollers: "0xE838c61635dd1D41952c68E47159329443283d90",
    },
    uniswap: {
      v2_router: "0x16327E3FbDaCA3bcF7E38F5Af2599D2DDc33aE52",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    amos: {
      curve: "0x442A3c0B86981e33b28011428d6A752eD983b81a",
      scream: "0x51E6D09d5A1EcF8BE035BBCa82F77BfeC3c7672A",
      spirit_ola_lending: "0x8dbc48743a05A6e615D9C39aEBf8C2b157aa31eA",
      spiritswap_liquidity: "0x48F0856e0E2D06fBCed5FDA10DD69092a500646B", // Old: "0x4392d664656ef434d451fd8d99B5DfC834D0c794"
    },
    reward_tokens: {
      curve: "0x442A3c0B86981e33b28011428d6A752eD983b81a",
      scream: "0xe0654C8e6fd4D733349ac7E09f6f23DA256bF475",
      spirit: "0x5Cc61A78F164885776AA610fb0FE1257df78E59B",
      inspirit: "0x2FBFf41a9efAEAE77538bd63f1ea489494acdc08",
      wftm: "0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83",
    },
    bearer_tokens: {
      FRAX2pool: "0x7a656B342E14F745e2B164890E88017e27AE7320",
      hFRAX: "0xb4300e088a3AE4e624EE5C71Bc1822F68BB5f2bc",
      oFRAX: "0x88c05534566f3bD6b6D704c9259408fF1F1a3F00",
      scFRAX: "0x4E6854EA84884330207fB557D1555961D85Fc17E",
      "Saddle FRAX/USDC": "0xc969dD0A7AB0F8a0C5A69C0839dB39b6C928bC08",
    },
    vamms: {
      USDC: "0xBea9F78090bDB9e662d8CB301A00ad09A5b756e9", // Saddle FRAX/USDC SwapFlashLoan
    },
    cross_chain_rewarders: {
      "SpiritSwap FRAX/FXS": "0xebF993690F65B23862E10F489656529ac06A27B8",
    },
    pair_tokens: {
      "Liquid Driver FRAX/FTM": "0x7ed0cdDB9BB6c6dfEa6fB63E117c8305479B8D7D", // Same as SpiritSwap FRAX/FTM
      "SpiritSwap canFRAX/canFXS": "0x7a2aD237e389De505DE7a89768143337E516C6Ce",
      "SpiritSwap canFRAX/FTM": "0x7ed0cddb9bb6c6dfea6fb63e117c8305479b8d7d",
      "SpiritSwap canFRAX/anyUSDC": "0x1478aec7896e40ae5fb858c77d389f0b3e6cbc5d",
      "SpiritSwap canFXS/anyUSDC": "0xb269a9969a437e778a8bfdb48a720ad366742554",
      "SpiritSwap FRAX/FXS": "0x100FcF27C87D1cc7b8D6c28b69b84A359e4fd377", // old anyFRAX/anyFXS
      "SpiritSwap FRAX/FTM": "0x7ed0cdDB9BB6c6dfEa6fB63E117c8305479B8D7D",
      "SpiritSwap FRAX/USDC": "0x1478AEC7896e40aE5fB858C77D389F0B3e6CbC5d",
    },
    staking_contracts: {
      "Liquid Driver FRAX/FTM": "0x6e2ad6527901c9664f016466b8DA1357a004db0f",
      "SpiritSwap FRAX/FXS": "0x21cE9F4bCe3Ec48f34cE9073a5102bEEd965f381",
      "SpiritSwap FRAX/FTM": "0x7ed0cdDB9BB6c6dfEa6fB63E117c8305479B8D7D",
      "SpiritSwap FRAX/USDC": "0x1478AEC7896e40aE5fB858C77D389F0B3e6CbC5d",
      "veDAO FRAX": "0xE04C26444d37fE103B9cc8033c99b09D47056f51",
    },
  },
  fuse: {
    chain_id: 122,
    main: {
      FRAX: '',
      FXS: '',
    },
    canonicals: {
      FRAX: '',
      FXS: '',
    },
    bridge_tokens: {},
    collaterals: {
      USDC: '',
    },
    bridges: {},
    bridge_backers: {},
    oracles: {
      single_assets: {
        FRAX: '',
        FXS: '',
        USDC: '',
      },
      cross_chain_oracle: '',
    },
    oracles_other: {
      combo_oracle: '',
      combo_oracle_univ2_univ3: '',
    },
    multisigs: {
      Comptrollers: '',
    },
    uniswap: {
      v2_router: '',
      v3_factory: '0x0000000000000000000000000000000000000000',
      v3_nft_manager: '0x0000000000000000000000000000000000000000',
      v3_router: '0x0000000000000000000000000000000000000000',
    },
    amos: {},
    reward_tokens: {
      WETH: '',
    },
    vamms: {},
    pair_tokens: {},
    staking_contracts: {},
  },
  harmony: {
    chain_id: 1666600000,
    main: {
      FRAX: "0xeb6c08ccb4421b6088e581ce04fcfbed15893ac3",
      FXS: "0x775d7816afbef935ea9c21a3ac9972f269a39004",
    },
    canonicals: {
      FRAX: "0xFa7191D292d5633f702B0bd7E3E3BcCC0e633200",
      FXS: "0x0767D8E1b05eFA8d6A301a65b324B6b66A1CC14c",
    },
    bridge_tokens: {
      anyFRAX: "0xb2c22a9fb4fc02eb9d1d337655ce079a04a526c7",
      anyFXS: "0x95bf7e307bc1ab0ba38ae10fc27084bc36fcd605",
      "1FRAX": "0xeb6c08ccb4421b6088e581ce04fcfbed15893ac3",
      "1FXS": "0x775d7816afbef935ea9c21a3ac9972f269a39004",
      celrFRAX: "0xa8961be06550c09c1bc14c483f3932b969eff5e0",
      celrFXS: "0x194Ad4574808D3E840221BeedF2209dfBc10b6ea",
      synFRAX: "0x1852F70512298d56e9c8FDd905e02581E04ddb2a",
    },
    collaterals: {
      "1DAI": "0xEf977d2f931C1978Db5F6747666fa1eACB0d0339",
      "1USDC": "0x985458E523dB3d53125813eD68c274899e9DfAb4",
      "1USDT": "0x3C2B8Be99c50593081EAA2A724F0B8285F5aba8f",
    },
    bridges: {
      celrFRAX: "0xdd90e5e87a2081dcf0391920868ebc2ffb81a1af", // Celer PeggedTokenBridge
      celrFXS: "0xdd90e5e87a2081dcf0391920868ebc2ffb81a1af", // Celer PeggedTokenBridge
      "1FRAX": "0x2fbbcef71544c461edfc311f42e3583d5f9675d1", // Horizon Bridge
      "1FXS": "0x2fbbcef71544c461edfc311f42e3583d5f9675d1", // Horizon Bridge
      "1USDC": "0x2fbbcef71544c461edfc311f42e3583d5f9675d1", // Horizon Bridge
    },
    bridge_backers: {
      celer_bridge: "0x8D0A8f07F5Ea7F0982Ed116993200C331E4cdD27",
      harmony_bridge: "0x2D334F9Ea82e04A60De15228f9169eBbCd8eeA72", // old1: 0xF3A60f85CB6C560188A434e8F2a134f3E967d8b8, old2: 0x419C766c8953E49F87fA565A7cFc9A193e93877c
    },
    oracles: {
      single_assets: {
        FRAX: "0xd6D513Cff4F1fAcDD32c0A0B0dd39857Ec91cC88", // "0x840ce205c638A5f62C9B62ca6fad792d3BdcB4bf",
        FXS: "0xfB104453Cb0b746594e7e7a773fD1847cC0d6020", // "0xaba2941c12F0b920d772681A3995fe851Ac21701"
      },
      cross_chain_oracle: "0x564C2244eE788054570386294A920133E0605d02",
    },
    oracles_other: {
      combo_oracle: "0xcc75336d664ABC4fD6f08AFf07fBf6988fD5b377", // "0x81FA3Af21e3EF42050eceC643cceC05d0f286680", // Old: "0x2E98E02B43f1EBcCe36a44A512FbCD5ea1e2e8E2",
      combo_oracle_univ2_univ3: "0x0671Ef4aD095d3ad9E4492cE3DEfB4f97b3e45a3", // "0x37E6E21E8B09B53DA8732b8b521d6F494795a5AB",
    },
    multisigs: {
      Comptrollers: "0x5D91bA85cfbC0A3673F312f3FD0BA75a85AD73e6",
    },
    uniswap: {
      v2_router: "0x1b02da8cb0d097eb8d57a175b88c7d8b47997506",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    reward_tokens: {
      sushi: "0xbec775cb42abfa4288de81f387a9b1a3c4bc552a",
      wone: "0xcf664087a5bb0237a0bad6742852ec6c8d69a27a", // Wrapped ONE
    },
    cross_chain_rewarders: {},
    bearer_tokens: {
      "Saddle FRAX/1USDC": "0x12DeAE3b87863B9bf8FDB499F16A0E3b656Ac721",
    },
    vamms: {
      "1USDC": "0x8040cDF4bd3aF8BA96e710150BDfE0B79c0321D3", // Saddle FRAX/1USDC
    },
    pair_tokens: {
      "Sushi FRAX/FXS [Harmony]": "0x944e4e8bbd2877678a0c8ffe3dd82d7ecee72f4f",
      "Sushi canFRAX/canFXS": "0x9eee8923c021c6d40e8643b1abc2ec316602cecc",
      "Sushi canFRAX/1USDC": "0x29fc6e830ca8586a68dff325f6d2349fb58be951",
      "Sushi canFRAX/WONE": "0xc7cb6f2135a4910cc204ef6e8cfc60085f1240e6",
      "Sushi canFXS/1USDC": "0x08a96238149a0baf6afafe7af57c2359c9bb8a73",
    },
    staking_contracts: {
      "Sushi FRAX/FXS [Harmony]": "",
    },
  },
  moonbeam: {
    chain_id: 1284,
    main: {
      FRAX: "0x8D6e233106733c7cc1bA962f8De9E4dCd3b0308E",
      FXS: "0x21a8DaCA6a56434bdB6F39e7616C0f9891829Aec",
    },
    canonicals: {
      FRAX: "0x322E86852e492a7Ee17f28a78c663da38FB33bfb",
      FXS: "0x2CC0A9D8047A5011dEfe85328a6f26968C8aaA1C",
    },
    bridge_tokens: {
      anyFRAX: "0x1CcCA1cE62c62F7Be95d4A67722a8fDbed6EEcb4",
      anyFXS: "0x264c1383EA520f73dd837F915ef3a732e204a493",
      celrFRAX: "0xC5Ef662b833De914B9bA7a3532C6BB008a9b23a6",
      celrFXS: "0x54f2980A851376CcBC561Ab4631dF2556Ad03386",
      madFRAX: "0x8D6e233106733c7cc1bA962f8De9E4dCd3b0308E",
      madFXS: "0x21a8DaCA6a56434bdB6F39e7616C0f9891829Aec",
      madUSDC: "0x8f552a71efe5eefc207bf75485b356a0b3f01ec9",
    },
    collaterals: {
      madUSDC: "0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9", // Nomad
      USDC: "0x8f552a71EFE5eeFc207Bf75485b356A0b3f01eC9", // Nomad
    },
    bridges: {
      madFRAX: "0xD3dfD3eDe74E0DCEBC1AA685e151332857efCe2d", // Nomad Bridge
      madFXS: "0xD3dfD3eDe74E0DCEBC1AA685e151332857efCe2d", // Nomad Bridge
      madUSDC: "0xD3dfD3eDe74E0DCEBC1AA685e151332857efCe2d", // Nomad Bridge
    }, // https://app.nomad.xyz/
    bridge_backers: {
      nomad: "0xa5924D9baA4fed0fbd100CB47CBCb61eA5E33219"
    },
    oracles: {
      single_assets: {
        FRAX: "0x973771645a89DDB6A956E3a4D92409bcC013cDDc",
        FXS: "0xc4d1f40e87B835daAd27dD05C7039E51b15dA6Fa",
        USDC: "0xB61f706c2C1BEfb4F870AeF056595d04047A7947",
        WGLMR: "0xB2d7367643Ca6eF2AF562A6C3B288adFcE68Ba8f",
      },
      cross_chain_oracle: "0xd4A2c3AbBf2d80E38dBe29F45Bde3834a31E06fC",
    },
    oracles_other: {
      combo_oracle: "0x247A323DAA63cC97c2BAD61b4D6f1E0120B5c9e2",
      combo_oracle_univ2_univ3: "0x4A40198373dE481741bdf629B44Dc98f12f18161",
    },
    multisigs: {
      Comptrollers: "0x343e4f06BF240d22FbdFd4a2Fe5858BC66e79F12",
      Address1: "0x104E5d38a2d646FFaf936d0a4Af876e56B5B14B3",
    },
    uniswap: {
      v2_router: "0x7a3909C7996EFE42d425cD932fc44E3840fCAB71", // Zenlink
      v3_factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      v3_nft_manager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
      v3_router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    amos: {},
    reward_tokens: {
      WGLMR: "0xAcc15dC74880C9944775448304B263D191c6077F",
    },
    bearer_tokens: {
      "Saddle FRAX/USDC": "0x3a054b77DB7a4facc7fc718519B5A7294d6Ef0f1",
    },
    vamms: {
      USDC: "0x247b71D57Ac80883364599ad5c9D74ea5EDc8660", // Saddle FRAX/USDC
    },
    pair_tokens: {
      "Zenlink canFRAX/canFXS": "0x8ca030649720b94b16e8C3B551cc2ab88c681C0F",
      "Zenlink canFRAX/WGLMR": "0xd341D2191bb0F84E5c29cB301deF5753Dab1ac04",
    },
    staking_contracts: {},
  },
  moonriver: {
    chain_id: 1285,
    main: {
      FRAX: "0x965f84D915a9eFa2dD81b653e3AE736555d945f4",
      FXS: "0x338726dd694dB9e2230eC2bB8624a2d7F566C96d",
    },
    canonicals: {
      FRAX: "0x1A93B23281CC1CDE4C4741353F3064709A16197d",
      FXS: "0x6f1D1Ee50846Fcbc3de91723E61cb68CFa6D0E98",
    },
    bridge_tokens: {
      anyFRAX: "0x965f84D915a9eFa2dD81b653e3AE736555d945f4",
      anyFXS: "0x338726dd694dB9e2230eC2bB8624a2d7F566C96d",
      celrFRAX: "0x8c75adB1D9f38F6C2AF54BE8120F598b9dba446C",
      celrFXS: "0xC1d6E421a062Fdbb26C31Db4a2113dF0F678CD04",
      synFRAX: "0xE96AC70907ffF3Efee79f502C985A7A21Bce407d"
    },
    collaterals: {
      // MIM: "0x0caE51e1032e8461f4806e26332c030E34De3aDb",
      anyUSDC: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
      USDC: "0xE3F5a90F9cb311505cd691a46596599aA1A0AD7D",
      USDT: "0xB44a9B6905aF7c801311e8F4E76932ee959c663C"
    },
    bridges: {
      anyFRAX: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
      anyFXS: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
      anyUSDC: "0x10c6b61DbF44a083Aec3780aCF769C77BE747E23",
    },
    bridge_backers: {
      anySwap: "0xc7F48Fb6Dbb6F8A3Eed90553017cDf5725Dc44ac",
    },
    oracles: {
      single_assets: {
        FXS: "0xcbd0D3C8bb0EDD9a542D22b4A0de3228AfFeBA9a", // "0x1BeF261C4718D0dcCBA707bF191B821067231a53"
      },
      cross_chain_oracle: "0xBCe6f81b8D154B8DF09D287d05826F2B34b71bE4",
    },
    oracles_other: {
      combo_oracle: "0x3B56E2DD29e4976B639BAd95044A0852BeeEBF02", // "0xAB3d2a00c6FaCB1cdB3f39Aa9E6519e808808F41",
      combo_oracle_univ2_univ3: "0x212ae4B6e93a735840A431845833261CA9cA76ED", // "0x02d03DA641DD18FD9A0624CB2b4377e6Ebedee83",
    },
    uniswap: {
      v2_router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      v3_factory: "0x0000000000000000000000000000000000000000",
      v3_nft_manager: "0x0000000000000000000000000000000000000000",
      v3_router: "0x0000000000000000000000000000000000000000",
    },
    multisigs: {
      Comptrollers: "0x2bBbE751E8C36CD6c92767776067f8Dd3A21941f",
    },
    amos: {
      one_to_one_amm: "0x915BCaA2D1DE2a65aeeF66F4dDf20E3C48B01705",
      sushiswap_liquidity: "0xB63E6D5143bba8F2CEe95308c3CE4791B4d280f9",
    },
    reward_tokens: {
      wmovr: "0x98878B06940aE243284CA214f92Bb71a2b032B8A",
    },
    bearer_tokens: {
      "Saddle FRAX/MIM": "0xe60AbDBD3fF7A486ADd69763A7c5dEAA53E86b1d",
      "Saddle FRAX/USDC": "0x7BA574cf7f40d4df1a7b2DdeF8106557490976fA",
    },
    vamms: {
      MIM: "0x32319D63083B0e7c64a45c3951C7fa1ae84eBFd9", // Saddle FRAX/MIM
      USDC: "0x7bE2D3fee573fE1A865799e746fE1ceb93301fe6", // Saddle FRAX/USDC
    },
    pair_tokens: {
      "Solarbeam FRAX/ROME": "0x069c2065100b4d3d982383f7ef3ecd1b95c05894",
      "Solarbeam FRAX/MOVR": "0x2cc54b4A3878e36E1C754871438113C1117a3ad7",
      "Sushi FRAX/USDC [Moonriver]": "0x310C4d18640aF4878567c4A31cB9cBde7Cd234A3", // Same as Sushi canFRAX/anyUSDC
      "Sushi canFRAX/canFXS": "0xC5147A6E773343aFE527249a26EF16AFc6a0013F",
      "Sushi canFRAX/anyUSDC": "0x310C4d18640aF4878567c4A31cB9cBde7Cd234A3", // Same as Sushi FRAX/USDC
      "Sushi canFRAX/WMOVR": "0x756057872D1Ad41C703B68e12701D27874fbe533",
      "Sushi canFXS/anyUSDC": "0xc0EAB66DaDC825c95cA1951A2B02BC56073Fc7B2",
    },
    staking_contracts: {},
  },
  optimism: {
    chain_id: 10,
    main: {
      FRAX: "",
      FXS: "",
    },
    canonicals: {
      FRAX: "0x2E3D870790dC77A83DD1d18184Acc7439A53f475",
      FXS: "0x67CCEA5bb16181E7b4109c9c2143c24a1c2205Be",
    },
    bridge_tokens: {
      celrFRAX: "0xea129aE043C4cB73DcB241AAA074F9E667641BA0",
      celrFXS: "0x1619DE6B6B20eD217a58d00f37B9d47C7663feca",
    },
    collaterals: {
      USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
      optiUSDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"
    },
    bridges: {
      celrFRAX: "0x61f85fF2a2f4289Be4bb9B72Fc7010B3142B5f41", // IPeggedTokenBridge burn
      celrFXS: "0x61f85fF2a2f4289Be4bb9B72Fc7010B3142B5f41", // IPeggedTokenBridge burn
      USDC: "0x4200000000000000000000000000000000000010", // IL2StandardBridge withdraw
      optiUSDC: "0x4200000000000000000000000000000000000010", // IL2StandardBridge withdraw
    },
    bridge_backers: {
      celer: "0x7F35dc487A5422D6946aAD733C6018F163084ed0"
    },
    oracles: {
      single_assets: {
        FRAX: "0x7655a3dC27ae8df961939373E1df80875E23d502",
        FXS: "0xc55a7F215a18713015570ECb18bbcf8C82F83071",
        USDC: "0x35c6962c221E4E8c17E2b4D59c8De79457EA66DE",
      },
      cross_chain_oracle: "0x31aA22d69270148Ec63Baf53fde846b45dB86509",
    },
    oracles_other: {
      combo_oracle: "0x7ef2a9AA33AB926a42F0e4F259Da225a5BEBdA73",
      combo_oracle_univ2_univ3: "0xD3cEa6c44F745eAA584b836f92FAF15FAfe826a0",
    },
    multisigs: {
      Comptrollers: "0x0dF840dCbf1229262A4125C1fc559bd338eC9491",
      Address1: "0x11978D32619cFefC2E7C75A70ef8BeB077b503Ca",
    },
    uniswap: {
      v2_router: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
      v3_factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      v3_nft_manager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
      v3_router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    amos: {},
    reward_tokens: {
      WETH: "0x4200000000000000000000000000000000000006",
    },
    bearer_tokens: {
      "Saddle FRAX/USDC": "0x1C8FBaBDAE03B43e04dE5f86275e4cB148002530",
    },
    vamms: {
      USDC: "0xF47b8b1daF12c3058b757A1446dADfa8E4B33535", // Saddle FRAX/USDC
    },
    pair_tokens: {},
    staking_contracts: {},
  },
  polygon: {
    chain_id: 137,
    main: {
      FRAX: "0x104592a158490a9228070E0A8e5343B499e125D0",
      FXS: "0x3e121107F6F22DA4911079845a470757aF4e1A1b",
    },
    canonicals: {
      FRAX: "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89",
      FXS: "0x1a3acf6D19267E2d3e7f898f42803e90C9219062",
    },
    bridge_tokens: {
      anyFRAX: "0xfE952465773bE3802eAc343C89aD351C77c00ab1", // Router anyFRAX
      anyFXS: "0x0452DD4d9B5b0Be57b9E98b825051833f20271ac", // Router anyFXS
      celrFRAX: "0x5427FEFA711Eff984124bFBB1AB6fbf5E3DA1820",
      celrFXS: "0x2A98D03d1A593F0f3E0AA7c17B24fca68302051e",
      polyFRAX: "0x104592a158490a9228070E0A8e5343B499e125D0",
      polyFXS: "0x3e121107F6F22DA4911079845a470757aF4e1A1b",
      synFRAX: "0x48A34796653aFdAA1647986b33544C911578e767",
    },
    collaterals: {
      polyDAI: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      polyUSDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      polyUSDT: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
      MAI: "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1"
    },
    bridges: {
      anyFRAX: "0xfE952465773bE3802eAc343C89aD351C77c00ab1", // Router anyFRAX
      polyFRAX: "0x104592a158490a9228070E0A8e5343B499e125D0", // UChildERC20 withdraw
      anyFXS: "0x0452DD4d9B5b0Be57b9E98b825051833f20271ac", // Router anyFXS
      polyFXS: "0x3e121107F6F22DA4911079845a470757aF4e1A1b", // UChildERC20 withdraw
      polyUSDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", // UChildERC20 withdraw
    },
    bridge_backers: {
      matic_bridge: "0x6e1A844AFff1aa2a8ba3127dB83088e196187110",
    },
    oracles: {
      single_assets: {
        MAI: "0x12b7a1eeB4ed8350D40b1827aa45f10D840961B4",
      },
      cross_chain_oracle: "0x2ED4af887CD65F17079D3989a3Fb5414f92b9e57",
    },
    oracles_other: {
      combo_oracle: "0xAfe0C8318B67Ea8461350ABf7Bc82E5ce9Cf11D3", // "0x932aac463081dA5b2D5904E55c1F984bDC884048",
      combo_oracle_univ2_univ3: "0x86Cffe1fE0C09A0815Fe4Fd21956D24Af5ba4020", // "0x0D6EeBE86bF972Cb3e18A3D9126dF0Bfb52e7C66",
    },
    multisigs: {
      Comptrollers: "0xDCB5A4b6Ee39447D700F4FA3303B1d1c25Ea9cA7",
    },
    uniswap: {
      v2_router: "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
      v3_factory: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
      v3_nft_manager: "0xc36442b4a4522e871399cd717abdd847ab11fe88",
      v3_router: "0xE592427A0AEce92De3Edee1F18E0157C05861564",
    },
    rari_pools: {
      "Index Coop Pool (#2)": "0x164835016E1590EE91Eb479c4Eeb1249779856aa",
      "Green Leverage Locker (#5)": "0xdc546C7CDEbCef7C2123500328feeE15f67F330e",
    },
    amos: {
      curve: "0x0eBA9254301B972f8a6A6bB2D576b2B1e0017C18",
      market_xyz_liquidity: "0x2182d5Bcc9110594d49530CA3EDAaBFd3C302E6e",
      sushiswap_liquidity: "0xBF667807Ff4d431E2aa77c50497434646F190Bfa", // Old: "0x6800EEdB4cEb7bBc092791C9C5B9b480B6950f09"
    },
    reward_tokens: {
      mta: "0xF501dd45a1198C2E1b5aEF5314A68B9006D842E0",
      sushi: "0x0b3f868e0be5597d5db7feb59e1cadbb0fdda50a",
      wmatic: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
    },
    bearer_tokens: {
      FRAX3pool: "0x5e5A23b52Cb48F5E70271Be83079cA5bC9c9e9ac",
    },
    vamms: {},
    pair_tokens: {
      "mStable FRAX/mUSD": "0xB30a907084AC8a0d25dDDAB4E364827406Fd09f0",
      // "Sushi FRAX/FXS": "0xd53a56ae0f48c9a03660cd36c2e4ae20493a1eca"
      "Sushi canFRAX/canFXS": "0xDf45B5B68d9dC84173DD963c763AeA8CAD3E24A6",
      "Sushi canFRAX/WMATIC": "0xe7c714dd3dd70ee04eb69a856655765454e77c88",
      "Sushi canFRAX/polyUSDC": "0x82D5BcC22856a3316f993340662D6253b3bC3f76",
      "Sushi canFXS/polyUSDC": "0xF850c261AdC576E6713D14af590a40d55936a982",
    },
    staking_contracts: {
      "mStable FRAX/mUSD": "0xc425Fd9Ed3C892d849C9E1a971516da1C1B29696",
      // "Sushi FRAX/FXS": "0x6386a4d52966D864698BF9AdA2cd081ab2F487c4"
    },
  },
  solana: {
    chain_id: 0,
    canonicals: {
      FRAX: "CTvtF8nqinnAN9peAErqMwuy3Z5TzpE5gzc8sbEDm9xt",
      FXS: "9PeoydLMMh6Zwj1H3uKsUw6oqAjVrKA1MwnycsmqYuZs",
    },
    bridge_tokens: {
      wFRAX_V1: "8L8pDf3jutdpdr4m3np68CL9ZroLActrqwxi6s9Ah5xU",
      wFRAX: "FR87nWEUxVgerFGhZM8Y4AggKGLnaXswr1Pd8wZ4kZcp",
      wFXS_V1: "",
      wFXS: "6LX8BhMQ4Sy2otmAWj7Y5sKd9YTVVUgfMsBzT6B9W7ct",
    },
    wallets: {
      utility: {
        address: "8j9SUvwDE4gXjgJuooVNcNB5aZV3w7JiL6YALa5CYF1U",
        assoc_token_acct: {
          FRAX: "ByNKo79zN7eNXaaA6eWRTLo3WSFtmhCKQmpsjgU62XoX",
          FXS: "97diyVeE1FkudjdudgvQiQzxNnxVv7vQRiDNZAyT2n2H",
          wFRAX: "FVsEDz8aesnfX6i4jAY1m738uPZzmLWhCQkyZwfToydY",
          wFXS: "5czoF2yzeAbFzNBGpAdrT76XWG1EQjdo7WatSfhX4etD",
          "Saber wFRAX/USDC": "Cm5319Jj9XgeBwX8VCVut6xZxKnN1W63UumDq9HE9yt9",
        },
      },
    },
    vamms: {},
    pair_tokens: {
      "Saber wFRAX/USDC": "FRXsjEv4jF3r72FgbCXu8uLbPoZGLmCmg3EN1S3cfC4x",
    },
  },
  zksync: {
    chain_id: 122,
    main: {
      FRAX: '',
      FXS: '',
    },
    canonicals: {
      FRAX: '',
      FXS: '',
    },
    bridge_tokens: {},
    collaterals: {
      USDC: '',
    },
    bridges: {},
    bridge_backers: {},
    oracles: {
      single_assets: {
        FRAX: '',
        FXS: '',
        USDC: '',
      },
      cross_chain_oracle: '',
    },
    oracles_other: {
      combo_oracle: '',
      combo_oracle_univ2_univ3: '',
    },
    multisigs: {
      Comptrollers: '',
    },
    uniswap: {
      v2_router: '',
      v3_factory: '0x0000000000000000000000000000000000000000',
      v3_nft_manager: '0x0000000000000000000000000000000000000000',
      v3_router: '0x0000000000000000000000000000000000000000',
    },
    amos: {},
    reward_tokens: {
      WETH: '',
    },
    vamms: {},
    pair_tokens: {},
    staking_contracts: {},
  },
}


export const INVESTOR_ALLOCATIONS = {
  "Aave_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "aFRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
  ],
  "AxialAMO": [
    { title: "TSD", big_base: BIG18, symbol: "TSD" },
    { title: "MIM", big_base: BIG18, symbol: "MIM" },
    { title: "FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "DAI", big_base: BIG18, symbol: "DAI" },
    { title: "Free AC4D", big_base: BIG18, symbol: "AC4D" },
    { title: "Deposited AC4D", big_base: BIG18, symbol: "AC4D" },
    { title: "Total AC4D USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD value", big_base: BIG18, symbol: "USD" },
  ],
  "Convex_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: "USDC" },
    { title: "Subtotal Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Total Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "3CRV Withdrawable", big_base: BIG18, symbol: "3CRV" },
    { title: "FRAX3CRV Value in Vault", big_base: BIG18, symbol: "USD" },
  ],
  "CROSS_CHAIN_BRIDGE_BACKER": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Lent FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Lent FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS [USD VALUE]", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
    { title: "Lent Collateral", big_base: BIG6, symbol: "Collat" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collat" },
    { title: "Total Collateral [USD VALUE]", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value", big_base: BIG18, symbol: "USD" },
  ],
  "CCFrax1to1AMM": [
    { title: "Free FRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free collat, native precision", big_base: BIG6, symbol: "Collat" },
    { title: "Free collat, E18", big_base: BIG18, symbol: "Collat" },
    { title: "Total USD Value", big_base: BIG18, symbol: "USD" },
  ],
  "Curve_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: "USDC" },
    { title: "Subtotal Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Total Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "3CRV Withdrawable", big_base: BIG18, symbol: "3CRV" },
    { title: "FRAX3CRV Value in Vault", big_base: BIG18, symbol: "USD" },
  ],
  "CurveAMO_ARBI": [
    { title: "FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "USDC", big_base: BIG6, symbol: "USDC" },
    { title: "USDC USD value", big_base: BIG18, symbol: "USD" },
    { title: "USDT", big_base: BIG6, symbol: "USDT" },
    { title: "USDT USD value", big_base: BIG18, symbol: "USD" },
    { title: "2pool gauge", big_base: BIG18, symbol: "2pool gauge" },
    { title: "2pool gauge USD value", big_base: BIG18, symbol: "USD" },
    { title: "2pool", big_base: BIG18, symbol: "2pool" },
    { title: "2pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "FRAX2pool", big_base: BIG18, symbol: "FRAX2pool" },
    { title: "FRAX2pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD value", big_base: BIG18, symbol: "USD" },
  ],
  "CurveAMO_FTM": [
    { title: "FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "DAI", big_base: BIG18, symbol: "DAI" },
    { title: "USDC", big_base: BIG6, symbol: "USDC" },
    { title: "USDC USD value", big_base: BIG18, symbol: "USD" },
    { title: "2pool gauge", big_base: BIG18, symbol: "2pool gauge" },
    { title: "2pool gauge USD value", big_base: BIG18, symbol: "USD" },
    { title: "2pool", big_base: BIG18, symbol: "2pool" },
    { title: "2pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "FRAX2pool", big_base: BIG18, symbol: "FRAX2pool" },
    { title: "FRAX2pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD value", big_base: BIG18, symbol: "USD" },
  ],
  "CurveAMO_POLY": [
    { title: "FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "DAI", big_base: BIG18, symbol: "DAI" },
    { title: "DAI USD value", big_base: BIG18, symbol: "USD" },
    { title: "USDC", big_base: BIG6, symbol: "USDC" },
    { title: "USDC USD value", big_base: BIG18, symbol: "USD" },
    { title: "USDT", big_base: BIG6, symbol: "USDT" },
    { title: "USDT USD value", big_base: BIG18, symbol: "USD" },
    { title: "3pool gauge", big_base: BIG18, symbol: "3pool gauge" },
    { title: "3pool gauge USD value", big_base: BIG18, symbol: "USD" },
    { title: "3pool", big_base: BIG18, symbol: "3pool" },
    { title: "3pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "FRAX3pool", big_base: BIG18, symbol: "FRAX3pool" },
    { title: "FRAX3pool USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD value", big_base: BIG18, symbol: "USD" },
  ],
  "CurveMetapoolLockerAMO": [
    { title: "Free LP", big_base: BIG18, symbol: "LP" },
    { title: "Staked LP in the vault", big_base: BIG18, symbol: "LP" },
    { title: "Free + Staked LP", big_base: BIG18, symbol: "LP" },
    { title: "Free Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Free Collateral, in E18", big_base: BIG18, symbol: "USDC" },
    { title: "Total USD Value", big_base: BIG18, symbol: "USD" },
  ],
  "Investor_V1": [
      { title: "Unallocated", big_base: BIG6, symbol: "USDC" },
      { title: "yearn", big_base: BIG6, symbol: "USDC" },
      { title: "AAVE", big_base: BIG6, symbol: "USDC" },
      { title: "Compound", big_base: BIG6, symbol: "USDC" },
      { title: "Total", big_base: BIG6, symbol: "USDC" }
  ],
  "Investor_AMO_V3": [
    { title: "Unallocated", big_base: BIG6, symbol: "USDC" },
    { title: "yearn", big_base: BIG6, symbol: "USDC" },
    { title: "AAVE", big_base: BIG6, symbol: "USDC" },
    { title: "Compound", big_base: BIG6, symbol: "USDC" },
    { title: "Total", big_base: BIG6, symbol: "USDC" }
  ],
  "Lending_AMO": [
      { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
      { title: "crFRAX", big_base: BIG18, symbol: "FRAX" },
      { title: "FRAX Total", big_base: BIG18, symbol: "FRAX" },
  ],
  "MIM_Convex_AMO": [
    { title: "Unallocated MIM", big_base: BIG18, symbol: "MIM" },
    { title: "MIM withdrawable from LP", big_base: BIG18, symbol: "MIM" },
    { title: "Total MIM", big_base: BIG18, symbol: "MIM" },
    { title: "Free Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: "USDC" },
    { title: "Total Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "MIM3CRV Free and Owned", big_base: BIG18, symbol: "MIM3CRV" },
    { title: "MIM3CRV Total Supply", big_base: BIG18, symbol: "MIM3CRV" },
    { title: "3CRV Withdrawable", big_base: BIG18, symbol: "3CRV" },
    { title: "MIM3CRV Value in Vault", big_base: BIG18, symbol: "USD" },
  ],
  "RARI_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in Pools", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
  ],
  "OHM_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "OHM Value", big_base: BIG18, symbol: "FRAX" },
    { title: "sOHM Value", big_base: BIG18, symbol: "FRAX" },
    { title: "Bonded OHM Value", big_base: BIG18, symbol: "FRAX" },
    { title: "Total USD Value", big_base: BIG18, symbol: "FRAX" },
  ],
  "PangolinLiquidityAMO": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free FXS USD value", big_base: BIG18, symbol: "USD" },
    { title: "FXS in LP", big_base: BIG18, symbol: "FXS" },
    { title: "FXS in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Free Collateral USD value", big_base: BIG18, symbol: "USD" },
    { title: "Collateral in LP", big_base: BIG6, symbol: "Collateral" },
    { title: "Collateral in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Total Collateral USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in all LPs", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in entire AMO", big_base: BIG18, symbol: "USD" },
  ],
  "LIQUIDITY_BRIDGER": [
    { title: "Unbridged FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Bridged FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Unbridged FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Bridged FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Unbridged Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Bridged Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Total Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Total USD Value", big_base: BIG18, symbol: "USD" },
  ],
  "MSIG_HELPER": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Lent FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Lent FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Lent Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Total Collateral", big_base: BIG18, symbol: "Collat" },
    { title: "Total USD Value", big_base: BIG18, symbol: "USD" },
  ],
  "ScreamAMO": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free scFRAX", big_base: BIG8, symbol: "scFRAX" },
    { title: "Free scFRAX, E18", big_base: BIG18, symbol: "scFRAX" },
    { title: "scFRAX USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value", big_base: BIG18, symbol: "FRAX" },
  ],
  "SpiritSwapLiquidityAMO": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free FXS USD value", big_base: BIG18, symbol: "USD" },
    { title: "FXS in LP", big_base: BIG18, symbol: "FXS" },
    { title: "FXS in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Free Collateral USD value", big_base: BIG18, symbol: "USD" },
    { title: "Collateral in LP", big_base: BIG6, symbol: "Collateral" },
    { title: "Collateral in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Total Collateral USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in all LPs", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in entire AMO", big_base: BIG18, symbol: "USD" },
  ],
  "StakeDAO_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX withdrawable from LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Collateral withdrawable from LP", big_base: BIG6, symbol: "USDC" },
    { title: "Subtotal Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "Total Collateral", big_base: BIG6, symbol: "USDC" },
    { title: "FRAX3CRV-2-f Free and Owned", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "FRAX3CRV-2-f Total Supply", big_base: BIG18, symbol: "FRAX3CRV" },
    { title: "3CRV Withdrawable", big_base: BIG18, symbol: "3CRV" },
    { title: "FRAX3CRV Value in Vault", big_base: BIG18, symbol: "USD" },
  ],
  "SushiSwapLiquidityAMO_HARM": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free FXS USD value", big_base: BIG18, symbol: "USD" },
    { title: "FXS in LP", big_base: BIG18, symbol: "FXS" },
    { title: "FXS in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Free Collateral USD value", big_base: BIG18, symbol: "USD" },
    { title: "Collateral in LP", big_base: BIG6, symbol: "Collateral" },
    { title: "Collateral in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Total Collateral USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in all LPs", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in entire AMO", big_base: BIG18, symbol: "USD" },
  ],
  "SushiSwapLiquidityAMO_ARBI": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free FXS USD value", big_base: BIG18, symbol: "USD" },
    { title: "FXS in LP", big_base: BIG18, symbol: "FXS" },
    { title: "FXS in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Free Collateral USD value", big_base: BIG18, symbol: "USD" },
    { title: "Collateral in LP", big_base: BIG6, symbol: "Collateral" },
    { title: "Collateral in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Total Collateral USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in all LPs", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in entire AMO", big_base: BIG18, symbol: "USD" },
  ],
  "SushiSwapLiquidityAMO_POLY": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "FRAX in LP", big_base: BIG18, symbol: "FRAX" },
    { title: "Total FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free FXS USD value", big_base: BIG18, symbol: "USD" },
    { title: "FXS in LP", big_base: BIG18, symbol: "FXS" },
    { title: "FXS in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Total FXS USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Free Collateral USD value", big_base: BIG18, symbol: "USD" },
    { title: "Collateral in LP", big_base: BIG6, symbol: "Collateral" },
    { title: "Collateral in LP USD value", big_base: BIG18, symbol: "USD" },
    { title: "Total Collateral", big_base: BIG6, symbol: "Collateral" },
    { title: "Total Collateral USD Value", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in all LPs", big_base: BIG18, symbol: "USD" },
    { title: "Total USD Value in entire AMO", big_base: BIG18, symbol: "USD" },
  ],
  "UniV3_Liquidity_AMO": [
    { title: "Unallocated FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Unallocated Collateral E18", big_base: BIG18, symbol: "USD" },
    { title: "Total FRAX as Liquidity", big_base: BIG18, symbol: "FRAX" },
    { title: "Total Value", big_base: BIG18, symbol: "USD" },
  ],
};

export const INVESTOR_REWARDS = {
  "Convex_AMO": [
    // { title: "CRV in contract", big_base: BIG18, symbol: "CRV" },
    { title: "CRV claimable", big_base: BIG18, symbol: "CRV" },
    // { title: "CVX in contract", big_base: BIG18, symbol: "CVX" },
    { title: "CVX claimable", big_base: BIG18, symbol: "CVX" },
    // { title: "cvxCRV in contract", big_base: BIG18, symbol: "cvxCRV" },
    { title: "cvxCRV claimable", big_base: BIG18, symbol: "cvxCRV" },
    // { title: "FXS in contract", big_base: BIG18, symbol: "FXS" },
    { title: "FXS claimable", big_base: BIG18, symbol: "FXS" },
  ],
  "Curve_AMO": [
    { title: "CRV", big_base: BIG18, symbol: "CRV" }
  ],
  "Investor_V1": [
    { title: "COMP", big_base: BIG18, symbol: "COMP" }
  ],
  "Investor_AMO_V3": [
    { title: "COMP", big_base: BIG18, symbol: "COMP" },
    { title: "stkAAVE", big_base: BIG18, symbol: "stkAAVE" },
    { title: "AAVE", big_base: BIG18, symbol: "AAVE" }
  ],
  "MIM_Convex_AMO": [
    // { title: "CRV in contract", big_base: BIG18, symbol: "CRV" },
    { title: "CRV claimable", big_base: BIG18, symbol: "CRV" },
    // { title: "CVX in contract", big_base: BIG18, symbol: "CVX" },
    { title: "CVX claimable", big_base: BIG18, symbol: "CVX" },
    // { title: "cvxCRV in contract", big_base: BIG18, symbol: "cvxCRV" },
    { title: "cvxCRV claimable", big_base: BIG18, symbol: "cvxCRV" },
    // { title: "FXS in contract", big_base: BIG18, symbol: "FXS" },
    { title: "SPELL claimable", big_base: BIG18, symbol: "SPELL" },
  ],
  "Lending_AMO": [
    { title: "FNX", big_base: BIG18, symbol: "FNX" }
  ],
  "ScreamAMO": [
    { title: "Free SCREAM", big_base: BIG18, symbol: "SCREAM" },
    { title: "Unclaimed SCREAM", big_base: BIG18, symbol: "SCREAM" },
    { title: "Free xSCREAM", big_base: BIG18, symbol: "xSCREAM" },
    { title: "SCREAM value of xSCREAM", big_base: BIG18, symbol: "xSCREAM" },
    { title: "Total SCREAM equivalents", big_base: BIG18, symbol: "SCREAM" }
  ],
};

export const TOKEN_BALANCES = {
  "CROSS_CHAIN_BRIDGE_BACKER": [
    { title: "Free anyFRAX", big_base: BIG18, symbol: "anyFRAX" },
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free anyFXS", big_base: BIG18, symbol: "anyFXS" },
    { title: "Free canFXS", big_base: BIG18, symbol: "canFXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "ScreamAMO": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free scFRAX", big_base: BIG8, symbol: "scFRAX" },
  ],
  "PangolinLiquidityAMO": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free canFXS", big_base: BIG18, symbol: "canFXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "SpiritSwapLiquidityAMO": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free canFXS", big_base: BIG18, symbol: "canFXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "SushiSwapLiquidityAMO_HARM": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free canFXS", big_base: BIG18, symbol: "canFXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "SushiSwapLiquidityAMO_POLY": [
    { title: "Free canFRAX", big_base: BIG18, symbol: "canFRAX" },
    { title: "Free canFXS", big_base: BIG18, symbol: "canFXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "LIQUIDITY_BRIDGER": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
  "MSIG_HELPER": [
    { title: "Free FRAX", big_base: BIG18, symbol: "FRAX" },
    { title: "Free FXS", big_base: BIG18, symbol: "FXS" },
    { title: "Free Collateral", big_base: BIG6, symbol: "Collat" },
  ],
}

export { }; // Force this file to be a module