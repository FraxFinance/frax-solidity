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

export type GraphTimeNumPoints = keyof typeof GraphTimeNumPointsPack;
export const GraphTimeNumPointsPack = { 
    'all-time': 1095,  // Assuming 3 years, each day
    '1-year': 365, // One point per day
    '6-months': 180, // One point per day
    '3-months': 90, // One point per day
    '1-month': 30, // One point per day
    '1-week': 42, // One point per 6 hrs
    '1-day': 48, // One point per half hour
    '8-hours': 48, // One point per 10 min
    '1-hour': 60, // One point per min
    '15-minutes': 90, // One point per block (~15 seconds)
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
    'Uniswap FRAX/WETH': {
        name: 'Uniswap FRAX/WETH',
        label: 'Uniswap FRAX/WETH'
    },
    'Uniswap FRAX/USDC': {
        name: 'Uniswap FRAX/USDC',
        label: 'Uniswap FRAX/USDC'
    },
    'Uniswap FRAX/USDT': {
        name: 'Uniswap FRAX/USDT',
        label: 'Uniswap FRAX/USDT'
    },
    'Uniswap FXS/WETH': {
        name: 'Uniswap FXS/WETH',
        label: 'Uniswap FXS/WETH'
    },
    'Uniswap FXS/USDC': {
        name: 'Uniswap FXS/USDC',
        label: 'Uniswap FXS/USDC'
    },
    'Uniswap FXS/USDT': {
        name: 'Uniswap FXS/USDT',
        label: 'Uniswap FXS/USDT'
    }
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

export const CONTRACT_ADDRESSES = {
  ropsten: {
    main: {
      FRAX: '0x868034EF400b0950F3B1921a6d33D6d9c35634D2',
      FXS: '0xBA1C7EC75BfBe1EAD2E570D0B4F32fdc7A73dF27',
      vesting: '0x2fA7A5B9593D46C7F9edBa3bD063a97166497285'
    },
    weth: '0xB749a51eD46C69154B4c7986AFd81A147F80990b',
    oracles: {
      FRAX_WETH: '0xC05DE1CB258bAdc152d8EAd3F573CA9A2E812B2a',
      FRAX_USDC: '0x128E530Ad258742C25E536eb8EB53dC79B5EcbBF',
      FRAX_USDT: '0x4C05334Ad0745e5b63497ab1c57780A3f368629f',
      FRAX_FXS: '0x244f5da28e6b669a7e0A69D3CBd44fc5D8f8a1C7',
      FXS_WETH: '0x7C1EcB2Ac0f77936Db770067A170ADfFb5176817',
      FXS_USDC: '0x8Bf7Af56bB721BC3d015111508593Fcb301546F0',
      FXS_USDT: '0x8fE4C7F2eF79AEDd8A6e40398a17ed4DaE18Ee25',
      USDC_WETH: '0xfbf1d253FcAA3cE13187dBD5B8610C15Cc8241c7',
      USDT_WETH: '0xd80c208B5A3585A07160E58925Df1c5FDe0a73b6'
    },
    collateral: {
      USDC: '0xCf813898D10DCFb50FDbDa74cD2FAd0Ff0a55Ef0',
      USDT: '0x67c6A8A715fc726ffD0A40588701813d9eC04d9C'
    },
    governance: '0xeB9466d107165fF837FdE7C4a50F9de0faabBF64',
    pools: {
      USDC: '0xccBDA9e34720a0cdE38E805861454d76a4104dCE',
      USDT: '0xE3f4e2b79f1a8bf3b14d9100323Fca24D923f796'
    },
    uniswap_other: {
      router: '0x3e185642eaa0423509DFC99D0B56684BE83043Bb',
      factory: '0xEcf63fd1A839fF54949eB786693237bEEC59C6e7'
    },
    pricing: { swap_to_price: '0x82b570ed41cAbB28d73281f9afE14b22460bA0c4' },
    misc: {
      timelock: '0x6034Ec7f1b5e7c0DFFdE022706823e3D453a71F0',
      migration_helper: '0xcD3A040f05769d7628582B403063e61B7D212F91'
    },
    libraries: {
      UniswapV2OracleLibrary: '',
      UniswapV2Library: '',
      FraxPoolLibrary: ''
    },
    stake_tokens: {
      'Uniswap FRAX/WETH': '0x22517075D1C195b4DFc5fCFdF8A8DfF9f7243820',
      'Uniswap FRAX/USDC': '0x12E4Db0A8A0b6eFaDf7396D9912022992811DC66',
      'Uniswap FRAX/FXS': '0x9364b7d063027FFD1527e5790baDddc09dac5d96',
      'Uniswap FXS/WETH': '0xde6cAC598e7C91Fdd77E744feCCf9aDFefE0a7d0'
    },
    staking_contracts_for_tokens: {
      'Uniswap FRAX/WETH': '0x1279B47f6be95Df8BA7Ac61C1f1DFce3Ad9e51FB',
      'Uniswap FRAX/USDC': '0xe4D0b8a29F4b76843fAFBa44F3AaE15136Ea51A3',
      'Uniswap FRAX/FXS': '0xBe6b91F0dC951C143dc592709B18159988e6397F',
      'Uniswap FXS/WETH': '0x08Be8BaAb62fB0A363f38C82Ee2320A36b72f2DB'
    }
  },
  ganache: {
    main: {
      FRAX: '0x4c2a7b591668988C6db9184d9df9394846Bc492d',
      FXS: '0xc2Bb9a3ae435AC36cC1eD2c4F64910B0CF8d8ec6',
      vesting: '0x12711D46063C413dA53d079e88c757b003b3513e'
    },
    weth: '0x9970c452f919b117b9A5dDa473Cf205B6446f104',
    oracles: {
      FRAX_WETH: '0xd4119c5057237373c629eD9F83B79635a3e2e90b',
      FRAX_USDC: '0x8f2A143304FA40E99cE8B79Eaf7e045898ebe4E4',
      FRAX_USDT: '0xB6F388B031C74936c53d51Cd850b0a8A8879c136',
      FRAX_FXS: '0x3013CeBaF374D838426bb2f3EEF6DA86D2552c27',
      FXS_WETH: '0x1a6B2699FE1E833C28C1c9CF69bc55b2aa4a821B',
      FXS_USDC: '0x0037b9708901674243F823bbCE425b455e1C7825',
      FXS_USDT: '0xeb3d1033E0B1ADE4f122A0174142dD2827A29eFd',
      USDC_WETH: '0xD234BD8098cECB9CcbFf4Bf997f9B77408EC7C78',
      USDT_WETH: '0xD48FeeDBb2f79bCc61c1661Bb5C550dE5c03b052',
      '6DEC_WETH': '0x279dB552A0f507DCd6F073b8d687eF0927959DcF'
    },
    collateral: {
      USDC: '0xff0B79ff7E0d0f5530dbb7Fa351cF9914Ab3f4E9',
      USDT: '0xD2A6475d9434CdE3Be7cD36debDC51C187be7dbD',
      '6DEC': '0x24ce4B5c5209678452fe236BD58A2e64F1d970b6'
    },
    governance: '0xB6D19571bDC969673b7fA8080D5D80CD80b2D312',
    pools: {
      USDC: '0x687e2a83f24FA1584f7aC272Ef8f5F510ea8F0A9',
      USDT: '0xeC5C28352B0e8F9Eaf12239c86996e964298d60c',
      '6DEC': '0x8564DA758dcb6577F87C6d9c1b53f13777018602'
    },
    uniswap_other: {
      router: '0x4De95C9d773FCc63C1bcFDA21c3B7d9c9798c17B',
      factory: '0xF70bB588d44509a214Ad260C84BA0cfB031c29c5'
    },
    pricing: { swap_to_price: '0x8Be085050e221bd8Db17489bD853800e600f6f58' },
    misc: {
      timelock: '0xaD98E1e5fe7B9e79783373faE69632390f7825A0',
      migration_helper: '0xe40a86Fb20E497B423ff88c8deA4aa9994D4dC62'
    },
    libraries: {
      UniswapV2OracleLibrary: '',
      UniswapV2Library: '',
      FraxPoolLibrary: ''
    },
    stake_tokens: {
      'Uniswap FRAX/WETH': '0x3483F272aba04b5dd819A4CdB3c4007dF909913c',
      'Uniswap FRAX/USDC': '0xfBf1D205ADC586ad469A5a1a2a9451B2b4Bf1243',
      'Uniswap FRAX/FXS': '0x7D6AD49359D3f9d0DCd7482FfD86B9C3b5a5a12D',
      'Uniswap FXS/WETH': '0x185c0F6A6e1D0998A22f3DA95BCc1F74b0A08Dd2'
    },
    staking_contracts_for_tokens: {
      'Uniswap FRAX/WETH': '0xeF2c3d7D30d2893b787c0546f9A97084b4A8F10b',
      'Uniswap FRAX/USDC': '0x13c9aE42c43DF2FB46218DF80b6Abad7D52a82C5',
      'Uniswap FRAX/FXS': '0x6135f354e143fbEB5fB159A76EB2590cf4f086b6',
      'Uniswap FXS/WETH': '0x3b9c2b598589578e640627d8975De51ea7928918'
    }
  }
}









export { }; // Force this file to be a module