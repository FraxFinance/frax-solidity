import { INVESTOR_ALLOCATIONS, INVESTOR_REWARDS }  from '../types/constants';
const BigNumber = require('bignumber.js');
const fetch = require('node-fetch');
const chalk = require('chalk');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");

export const printAllocations = (key: string, allocations: number[]) => {

    console.log(chalk.bold.blue(`----ALLOCATIONS----`));
    allocations.forEach((val, idx) => {
        const the_alloc = INVESTOR_ALLOCATIONS[key][idx];
        if (the_alloc){  
            console.log(`${the_alloc.title}: `, chalk.yellow(`${new BigNumber(val).div(the_alloc.big_base)} ${the_alloc.symbol}`));
        };
    })
    console.log(chalk.bold.blue(`-------------------`));
    
}

export const printRewards = (key: string, rewards: number[]) => {

    console.log(chalk.bold.blue(`----REWARDS----`));
    rewards.forEach((val, idx) => {
        const the_reward = INVESTOR_REWARDS[key][idx];
        if (the_reward){  
            console.log(`${the_reward.title}: `, chalk.yellow(`${new BigNumber(val).div(the_reward.big_base)} ${the_reward.symbol}`));
        };
    })
    console.log(chalk.bold.blue(`-------------------`));
    
}

export const getTokenPriceFromCoinGecko = async (ticker: string): Promise<number> => {
    // Don't forget the ?x_cg_pro_api_key=YOUR_API_KEY here
    const resp: Response = await fetch(`https://pro-api.coingecko.com/api/v3/coins/${ticker}?x_cg_pro_api_key=${process.env.COINGECKO_API_KEY}&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, {
        method: 'GET',
    });
    const coingecko_response = resp.ok ? await resp.json() : null;
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

export const printCalcCurCombinedWeight = async (contract: any, addr: any) => {
    const pack = await contract.calcCurCombinedWeight(addr);
    const converted_pack = {
        old_combined_weight: (new BigNumber(pack[0])).div(BIG18).toNumber(),
        new_vefxs_multiplier: (new BigNumber(pack[1])).div(BIG18).toNumber(),
        new_combined_weight: (new BigNumber(pack[2])).div(BIG18).toNumber(),
    }
    console.log(`CalcCurCombinedWeight [${addr}]: `, converted_pack);
}