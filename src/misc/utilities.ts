import { CONTRACT_ADDRESSES, INVESTOR_ALLOCATIONS, INVESTOR_REWARDS, TOKEN_BALANCES, StakeChoices, ONE_E18, BIG6, BIG18 }  from '../types/constants';
import { Pool, Position, FeeAmount, TickMath, encodeSqrtRatioX96, tickToPrice } from '@uniswap/v3-sdk';
import { Token, Price } from '@uniswap/sdk-core';
const BigNumber = require('bignumber.js');
const axios = require('axios').default;
const chalk = require('chalk');

export const printAllocations = (key: string, allocations: number[], old_allocations?: number[]) => {

    console.log(chalk.bold.blue(`----ALLOCATIONS [${key}]----`));
    allocations.forEach((val, idx) => {
        const the_alloc = INVESTOR_ALLOCATIONS[key][idx];
        if (the_alloc){  
            let new_value = new BigNumber(val).div(the_alloc.big_base);
            let old_value = old_allocations ? new BigNumber(old_allocations[idx]).div(the_alloc.big_base) : null;
            let change_string = "";
            if (old_value) {
                if (old_value.isEqualTo(new_value)) {
                    // Do nothing
                }
                else if (old_value.isGreaterThan(new_value)) {
                    change_string = chalk.hex('#F03D3D')(` [-${old_value.minus(new_value).toPrecision(9)}]`);
                }
                else {
                    change_string = chalk.hex('#41c344')(` [+${new_value.minus(old_value).toPrecision(9)}]`);
                }
            }
            console.log(`${the_alloc.title}: `, chalk.yellow(`${new_value.toPrecision(9)} ${the_alloc.symbol}${change_string}`));
        };
    })
    console.log(chalk.bold.blue(`-------------------`));
    
}

export const printTokenBalances = (key: string, tkn_bals: number[], old_tkn_bals?: number[]) => {

    console.log(chalk.bold.blue(`----TOKEN BALANCES [${key}]----`));
    tkn_bals.forEach((val, idx) => {
        const the_bal = TOKEN_BALANCES[key][idx];
        if (the_bal){  
            let new_value = new BigNumber(val).div(the_bal.big_base);
            let old_value = old_tkn_bals ? new BigNumber(old_tkn_bals[idx]).div(the_bal.big_base) : null;
            let change_string = "";
            if (old_value) {
                if (old_value.isEqualTo(new_value)) {
                    // Do nothing
                }
                else if (old_value.isGreaterThan(new_value)) {
                    change_string = chalk.hex('#F03D3D')(` [-${old_value.minus(new_value).toPrecision(9)}]`);
                }
                else {
                    change_string = chalk.hex('#41c344')(` [+${new_value.minus(old_value).toPrecision(9)}]`);
                }
            }
            console.log(`${the_bal.title}: `, chalk.yellow(`${new_value.toPrecision(9)} ${the_bal.symbol}${change_string}`));
        };
    })
    console.log(chalk.bold.blue(`-------------------`));
}

export const printRewards = (key: string, rewards: number[], old_rewards?: number[]) => {

    console.log(chalk.bold.blue(`----REWARDS [${key}]----`));
    rewards.forEach((val, idx) => {
        const the_reward = INVESTOR_REWARDS[key][idx];
        if (the_reward){  
            let new_value = new BigNumber(val).div(the_reward.big_base);
            let old_value = old_rewards ? new BigNumber(old_rewards[idx]).div(the_reward.big_base) : null;
            let change_string = "";
            if (old_value) {
                if (old_value.isEqualTo(new_value)) {
                    // Do nothing
                }
                else if (old_value.isGreaterThan(new_value)) {
                    change_string = chalk.hex('#F03D3D')(` [-${old_value.minus(new_value).toPrecision(9)}]`);
                }
                else {
                    change_string = chalk.hex('#41c344')(` [+${new_value.minus(old_value).toPrecision(9)}]`);
                }
            }
            console.log(`${the_reward.title}: `, chalk.yellow(`${new_value.toPrecision(9)} ${the_reward.symbol}${change_string}`));
        };
    })
    console.log(chalk.bold.blue(`-------------------`));
}

export const getTokenPriceFromCoinGecko = async (ticker: string): Promise<number> => {
    // Don't forget the ?x_cg_pro_api_key=YOUR_API_KEY here
    const resp: Response = await axios.get(`https://pro-api.coingecko.com/api/v3/coins/${ticker}?x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
    const coingecko_response = (resp as any).data ? (resp as any).data : null;
	return coingecko_response.market_data.current_price.usd;
};

export const printVeFXS_Points = async (vefxs_instance: any, epoch: any, addr: any) => {
    // Global Point
    const point = await vefxs_instance.point_history(epoch);
    const converted_point = {
        bias: new BigNumber(point.bias).toNumber(),
        slope: new BigNumber(point.slope).toNumber(),
        ts: new BigNumber(point.ts).toNumber(),
        blk: new BigNumber(point.blk).toNumber(),
        fxs_amt: (new BigNumber(point.fxs_amt)).div(BIG18).toNumber(),
    }
    console.log("Point: ", converted_point);

    // User Point
    const user_point = await vefxs_instance.user_point_history(addr, epoch);
    const converted_user_point = {
        bias: new BigNumber(user_point.bias).toNumber(),
        slope: new BigNumber(user_point.slope).toNumber(),
        ts: new BigNumber(user_point.ts).toNumber(),
        blk: new BigNumber(user_point.blk).toNumber(),
        fxs_amt: (new BigNumber(user_point.fxs_amt)).div(BIG18).toNumber(),
    }
    console.log(`User Point ${addr}: `, converted_user_point);
}

export const cleanLockedStake = (locked_stake_info: any) => {
    return {
        kek_id: locked_stake_info.kek_id,
        start_timestamp: new BigNumber(locked_stake_info.start_timestamp).toString(),
        liquidity: new BigNumber(locked_stake_info.liquidity).toString(),
        ending_timestamp: new BigNumber(locked_stake_info.ending_timestamp).toString(),
        lock_multiplier: (new BigNumber(locked_stake_info.lock_multiplier)).div(BIG18).toString(),
    }
}

export const getLockedNFTInfoFromArr = (locked_nfts: any[], token_id: number) => {
    for (let i = 0; i < locked_nfts.length; i++) {
        const the_nft = locked_nfts[i];
        console.log("the_nft.token_id: ", the_nft.token_id)
        if (the_nft.token_id == token_id){
            return cleanLockedNFT(the_nft);
        }
    }
    return null;
}

export const cleanLockedNFT = (locked_nft_info: any) => {
    return {
        token_id: locked_nft_info.token_id,
        liquidity: new BigNumber(locked_nft_info.liquidity).toString(),
        start_timestamp: new BigNumber(locked_nft_info.start_timestamp).toString(),
        ending_timestamp: new BigNumber(locked_nft_info.ending_timestamp).toString(),
        lock_multiplier: (new BigNumber(locked_nft_info.lock_multiplier)).div(BIG18).toString(),
        tick_lower: (new BigNumber(locked_nft_info.tick_lower)).toString(),
        tick_upper: (new BigNumber(locked_nft_info.tick_lower)).toString(),
    }
}

export const printCollateralInfo = async (pool_multicollateral_contract: any, collateral_address: string) => {
    // Collateral Info
    const pack = await pool_multicollateral_contract.collateral_information(collateral_address);
    const { index, symbol, col_addr, is_enabled, missing_decs, price, price_dec_multiplier, pool_ceiling, mint_paused, redeem_paused, recollat_paused, buyback_paused, minting_fee, redemption_fee, buyback_fee, recollat_fee } = pack;
    
    const collateral_info = {
        index,
        symbol,
        col_addr,
        is_enabled,
        missing_decs: (new BigNumber(pack.missing_decs)).toNumber(),
        price: (new BigNumber(pack.price)).div(BIG6).toNumber(),
        pool_ceiling: (new BigNumber(pack.pool_ceiling)).toNumber(),
        mint_paused,
        redeem_paused,
        recollat_paused,
        buyback_paused,
        minting_fee: (new BigNumber(pack.minting_fee)).toNumber(),
        redemption_fee: (new BigNumber(pack.redemption_fee)).toNumber(),
        buyback_fee: (new BigNumber(pack.buyback_fee)).toNumber(),
        recollat_fee: (new BigNumber(pack.recollat_fee)).toNumber(),
    }
    console.log("Collateral Info: ", collateral_info);
}

export const printCalcCurCombinedWeight = async (contract: any, addr: any) => {
    const pack = await contract.calcCurCombinedWeight(addr);
    const converted_pack = {
        old_combined_weight: (new BigNumber(pack[0])).div(BIG18).toNumber(),
        new_vefxs_multiplier: (new BigNumber(pack[1])).div(BIG18).toNumber(),
        new_combined_weight: (new BigNumber(pack[2])).div(BIG18).toNumber(),
    }
    console.log(`CalcCurCombinedWeight [${addr}]: `, converted_pack);
}

export const printCalcCurCombinedWeightNoVeFXS = async (contract: any, addr: any) => {
    const pack = await contract.calcCurCombinedWeight(addr);
    const converted_pack = {
        old_combined_weight: (new BigNumber(pack[0])).div(BIG18).toNumber(),
        new_combined_weight: (new BigNumber(pack[1])).div(BIG18).toNumber(),
    }
    console.log(`CalcCurCombinedWeight [${addr}]: `, converted_pack);
}

export const lpTokenBalance = async (contract: any, wallet_address: string, version: number) => {
    try {
        if (!wallet_address || wallet_address == "") return 0;
        if (version >= 1000) return 0; // UniV3 or NFT-based. This will get tallied later
        return await (contract.methods.balanceOf(wallet_address).call()
            .then(res => {
                return contract.methods.decimals().call()
                    .then(decs => {
                        return res / (10**decs);
                    })
            }));
    }
    catch (err) {
        throw `lpTokenBalance error: ${err}`;
    }
}

export const rewardBalances = async (contract: any, wallet_address: string, reward_token_decimals: number[]) => {
    try {
        if (!wallet_address || wallet_address == "") return 0;

        // You have to use earned() here instead of rewards() because of the order in which the contract executes 
        return await (contract.methods.earned(wallet_address).call()
            .then(res => {
                if (Array.isArray(res)){
                    try {
                        return res.map((rwd_amt, idx) => {
                            const numerator = new BigNumber(rwd_amt);
                            const denominator = new BigNumber((10 ** reward_token_decimals[idx]));
                            return (numerator).div(denominator).toNumber();
                        })
                    }
                    catch {
                        return Array(reward_token_decimals.length).fill(0);
                    }
                }
                else if (typeof res === 'object' && res !== null){
                    // This is for tuple-d results
                    try {
                        const keys = Object.keys(res);
                        return keys.map((key, idx) => {
                            return res[key] / (10 ** reward_token_decimals[idx]);
                        })
                    }
                    catch {
                        return Array(reward_token_decimals.length).fill(0);
                    }
                }
                else {
                    try {
                        return [res / (10 ** reward_token_decimals[0])];
                    }
                    catch {
                        return [0];
                    }
                }
            }));
    }
    catch (err) {
        throw `rewardBalances error: ${err}`;
    }
}

export const rewardRates = async (
    contract: any, 
    chain: any,
    reward_tokens: string[], 
    version: number
) => {
    try {
        const reward_rates: number[] = [];
        if (version >= 1000){
            reward_rates.push(await contract.methods.rewardRate0().call());
        }
        else if (version >= 100 && version < 200)  {
            for (let i = 0; i < reward_tokens.length; i++) {
                const rwd_amt = await contract.methods.rewardRates(i).call();
                reward_rates.push(rwd_amt);
            };
        }
        else if (reward_tokens.length == 2 || chain != 'ethereum'){
            reward_rates.push(await contract.methods.rewardRate0().call());
            reward_rates.push(await contract.methods.rewardRate1().call());
        }
        else if (reward_tokens.length == 1){
            reward_rates.push(await contract.methods.rewardRate().call());
        }
        return reward_rates
    }
    catch (err) {
        throw `rewardRates error: ${err}`;
    }
}

export const tokenBalanceStakingUnlocked = async (contract: any, wallet_address: string, version: number) => {
    if (!wallet_address || wallet_address == "") return 0;
    if (version > 2) return 0;

    return await (contract.methods.unlockedBalanceOf(wallet_address).call()
        .then(res => {
            return contract.methods.stakingDecimals().call()
                .then(decs => {
                    return res / (10**decs);
                })
        }));
}

export const tokenBalanceStakingLocked = async (contract: any, wallet_address: string, version: number) => {
    if (!wallet_address || wallet_address == "") return 0;
    if (version > 2) {
        return await (contract.methods.lockedLiquidityOf(wallet_address).call()
            .then(res => {
                return res / (10**18);
            }));
    }
    else {
        return await (contract.methods.lockedBalanceOf(wallet_address).call()
            .then(res => {
                return contract.methods.stakingDecimals().call()
                    .then(decs => {
                        return res / (10**decs);
                    })
            }));
    }
}

export const stakingBalanceBoosted = async (contract: any, wallet_address: string, version: number) => {
    if (!wallet_address || wallet_address == "") return 0;
    if (version > 2) {
        return await (contract.methods.combinedWeightOf(wallet_address).call()
            .then(res => {
                return res / (10**18);
            }));
    }
    else {
        return await (contract.methods.boostedBalanceOf(wallet_address).call()
            .then(res => {
                return contract.methods.stakingDecimals().call()
                    .then(decs => {
                        return res / (10**decs);
                    })
            }));
    }
}

export const tokenBalanceStakingLockedStakes = async (
    contract: any, 
    wallet_address: string, 
    version: number,
    uni_v3_required_position?: UniV3RequiredPosition, 
    token0_obj?: Token,
    token1_obj?: Token,
    token0_decimals?: number, 
    token1_decimals?: number, 
): Promise<LockedStake[]> => {
    if (!wallet_address || wallet_address == "" || version == null) return [];
    if (version >= 1000 && token0_decimals && token1_decimals) {
        let stakes: LockedStake[] = (await (contract.methods.lockedNFTsOf(wallet_address).call()));
        stakes = stakes.filter(s => (s.amount > 0 || s.liquidity > 0) );

        const sqrt_ratio_start = encodeSqrtRatioX96(10 ** token1_decimals, 10 ** token0_decimals ); // Token1 comes first here
        const tick_current = TickMath.getTickAtSqrtRatio(sqrt_ratio_start);

        let enum_fee;
        switch(uni_v3_required_position.uni_required_fee){
            case 500: {
                enum_fee = FeeAmount.LOW;
                break;
            }
            case 3000: {
                enum_fee = FeeAmount.MEDIUM;
                break;
            }
            case 10000: {
                enum_fee = FeeAmount.HIGH;
                break;
            }
        }

        stakes = stakes.map((stk, idx) => {
            const the_pool = new Pool(token0_obj, token1_obj, enum_fee, sqrt_ratio_start, stk.liquidity, tick_current);
            const the_position = new Position({ pool: the_pool, liquidity: stk.liquidity, tickLower: parseInt(stk.tick_lower as any), tickUpper: parseInt(stk.tick_upper as any) });
            const amt_0_float = parseFloat(the_position.amount0.toFixed(6));
            const amt_1_float = parseFloat(the_position.amount1.toFixed(6));
            const dollar_value = amt_0_float + amt_1_float;

            const new_stake = {
                token_id: parseInt(stk.token_id as any),
                ending_timestamp: parseInt(stk.ending_timestamp as any),
                liquidity: (new BigNumber(stk.liquidity)).div(BIG18).toNumber(),
                lock_multiplier: parseInt(stk.lock_multiplier as any),
                start_timestamp: parseInt(stk.start_timestamp as any),
                tick_lower: parseInt(stk.tick_lower as any),
                tick_upper: parseInt(stk.tick_upper as any),
                dollar_value
            }
            return new_stake;
        })

        return stakes;
    }
    else if (version < 1000){
        let stakes: LockedStake[] = (await (contract.methods.lockedStakesOf(wallet_address).call()));

        // Format differs based on the version
        if (version <= 2){
            stakes = stakes.map(stk => {
                return {
                    kek_id: stk[0],
                    start_timestamp: stk[1],
                    amount: stk[2],
                    ending_timestamp: stk[3],
                    multiplier: stk[4]
                }
            })
        }
        else {
            stakes = stakes.map(stk => {
                return {
                    kek_id: stk[0],
                    start_timestamp: stk[1],
                    liquidity: stk[2],
                    ending_timestamp: stk[3],
                    lock_multiplier: stk[4]
                }
            })
        }
        stakes = stakes.filter(s => (s.amount > 0 || s.liquidity > 0) );
        return stakes;
    }
    else return [];
}

export const tokenBalance = async (contract: any, wallet_address: string) => {
    if (!wallet_address || wallet_address === "") return 0;
    return await (contract.methods.balanceOf(wallet_address).call()
        .then(res => {
            return contract.methods.decimals().call()
                .then(decs => {
                    return res / (10**decs);
                })
        }));
}

export const ethBalance = async (the_web3: any, wallet_address: string) => {
    if (!wallet_address || wallet_address === "") return 0;
    return (new BigNumber(await the_web3.eth.getBalance(wallet_address)).div(BIG18).toNumber())
}

export const stakingNameFromAddress = (staking_address: string): string => {
    let found_name;

    // Search ethereum first
    const ethereum_farm_obj = CONTRACT_ADDRESSES.ethereum.staking_contracts;
    const ethereum_farm_keys = Object.keys(ethereum_farm_obj);
    for (let k = 0; k < ethereum_farm_keys.length; k++){
        const test_key = ethereum_farm_keys[k];
        if (ethereum_farm_obj[test_key] == staking_address) {
            found_name = test_key;
            break;
        }
    }
    if (found_name) return found_name;

    // Search Middleman Gauges next
    const middleman_gauge_obj = CONTRACT_ADDRESSES.ethereum.middleman_gauges;
    const middleman_gauge_keys = Object.keys(middleman_gauge_obj);
    for (let k = 0; k < middleman_gauge_keys.length; k++){
        const test_key = middleman_gauge_keys[k];
        if (middleman_gauge_obj[test_key] == staking_address) {
            found_name = test_key;
            break;
        }
    }

    // Search BSC next
    const bsc_farm_obj = CONTRACT_ADDRESSES.bsc.staking_contracts;
    const bsc_farm_keys = Object.keys(bsc_farm_obj);
    for (let k = 0; k < bsc_farm_keys.length; k++){
        const test_key = bsc_farm_keys[k];
        if (bsc_farm_obj[test_key] == staking_address) {
            found_name = test_key;
            break;
        }
    }


    if (found_name) return found_name;

    return null;
}

export const rewardTokenSymbolFromAddress = (rew_tkn_addr: string): string => {
    let found_name;

    // Search Ethereum mains first
    const ethereum_main_obj = CONTRACT_ADDRESSES.ethereum.main;
    const ethereum_main_keys = Object.keys(ethereum_main_obj);
    for (let k = 0; k < ethereum_main_keys.length; k++){
        const test_key = ethereum_main_keys[k];
        if (ethereum_main_obj[test_key].toLowerCase() == rew_tkn_addr.toLowerCase()) {
            found_name = test_key.toUpperCase();
            break;
        }
    }
    if (found_name) return found_name;

    // Search Ethereum collaterals next
    const ethereum_collat_obj = CONTRACT_ADDRESSES.ethereum.collaterals;
    const ethereum_collat_keys = Object.keys(ethereum_collat_obj);
    for (let k = 0; k < ethereum_collat_keys.length; k++){
        const test_key = ethereum_collat_keys[k];
        if (ethereum_collat_obj[test_key].toLowerCase() == rew_tkn_addr.toLowerCase()) {
            found_name = test_key.toUpperCase();
            break;
        }
    }
    if (found_name) return found_name;

    // Search Ethereum reward tokens next
    const ethereum_rew_obj = CONTRACT_ADDRESSES.ethereum.reward_tokens;
    const ethereum_rew_keys = Object.keys(ethereum_rew_obj);
    for (let k = 0; k < ethereum_rew_keys.length; k++){
        const test_key = ethereum_rew_keys[k];
        if (ethereum_rew_obj[test_key].toLowerCase() == rew_tkn_addr.toLowerCase()) {
            found_name = test_key.toUpperCase();
            break;
        }
    }
    if (found_name) return found_name;

    // Search BSC next
    const bsc_rew_obj = CONTRACT_ADDRESSES.bsc.reward_tokens;
    const bsc_rew_keys = Object.keys(bsc_rew_obj);
    for (let k = 0; k < bsc_rew_keys.length; k++){
        const test_key = bsc_rew_keys[k];
        if (bsc_rew_obj[test_key].toLowerCase() == rew_tkn_addr.toLowerCase()) {
            found_name = test_key.toUpperCase();
            break;
        }
    }

    if (found_name) return found_name;

    return null;
}

export const EMPTY_USER_STAKE_INFO = (choice?: string): UserStakeInfo => {
    let reward_arr: RewardInfo[] = [];

    if (choice != null){
        const LP_TOKEN_INFO = StakeChoices[choice];

        for (let i = 0; i < LP_TOKEN_INFO.reward_tokens.length; i++){
            reward_arr.push({
                token: LP_TOKEN_INFO.reward_tokens[i],
                chain: LP_TOKEN_INFO.chain,
                coingecko_slug: LP_TOKEN_INFO.reward_token_coingecko_slugs[i],
                price: 0,
                reward_balance: 0,
                reward_usd_value: 0,
                reward_rate: 0,
            })
        }
    }

    return {
        lp_token_balance: 0,
        lp_token_bal_usd: 0,
        combined_weight: 0,
        rewards: reward_arr,
        rewards_total_usd_value: 0,
        unlocked_total: 0,
        unlocked_total_usd_value: 0,
        locked_total: 0,
        locked_total_usd_value: 0,
        locked_stakes: []
    }
}

export const jsonKeySwap = (json) => {
    let ret = {};
    for(let key in json){
      ret[json[key]] = key;
    }
    return ret;
}

export const sortUnique = (arr)  => {
    if (arr.length === 0) return arr;
    arr = arr.sort(function (a, b) { return a*1 - b*1; });
    var ret = [arr[0]];
    for (var i = 1; i < arr.length; i++) { //Start loop at 1: arr[0] can never be a duplicate
      if (arr[i-1] !== arr[i]) {
        ret.push(arr[i]);
      }
    }
    return ret;
}

// From https://gist.github.com/sterlu/4b44f59ea665819974ae684d7f564d9b

const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60
const BLOCKS_IN_A_YEAR = SECONDS_PER_YEAR / 14

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apy {Number} APY as percentage (ie. 6)
 * @param frequency {Number} Compounding frequency (times a year)
 * @returns {Number} APR as percentage (ie. 5.82 for APY of 6%)
 */
export const apyToApr = (apy, frequency = BLOCKS_IN_A_YEAR) =>
  ((1 + apy / 100) ** (1 / frequency) - 1) * frequency * 100

/**
 * Formula source: http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies
 *
 * @param apr {Number} APR as percentage (ie. 5.82)
 * @param frequency {Number} Compounding frequency (times a year)
 * @returns {Number} APY as percentage (ie. 6 for APR of 5.82%)
 */
export const aprToApy = (apr, frequency = BLOCKS_IN_A_YEAR) => ((1 + apr / 100 / frequency) ** frequency - 1) * 100

export const EMPTY_LENDING_AMOS_DATA = (): LendingAMOsData => {
    return {
        aave_minted: 0,
        aave_frax_free: 0,
        aave_frax_total: 0,
        cream_frax_free: 0,
		cream_minted: 0,
        cream_frax_total: 0,
        hundred_minted: 0,
        hundred_frax_total: 0,
        rari_frax_free: 0,
        rari_minted: 0,
        rari_frax_total: 0,
        rari_pool_breakdown: [],
        scream_minted: 0,
        scream_frax_total: 0,
        spirit_ola_minted: 0,
        spirit_ola_frax_total: 0,
        total_frax_free: 0,
        total_minted: 0,
        total_frax: 0,
		total_profit: 0,
	};
}