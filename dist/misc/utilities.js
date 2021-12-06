"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printCalcCurCombinedWeightNoVeFXS = exports.printCalcCurCombinedWeight = exports.printVeFXS_Points = exports.getTokenPriceFromCoinGecko = exports.printRewards = exports.printAllocations = void 0;
const tslib_1 = require("tslib");
const constants_1 = require("../types/constants");
const BigNumber = require('bignumber.js');
const fetch = require('node-fetch');
const chalk = require('chalk');
const BIG6 = new BigNumber("1e6");
const BIG18 = new BigNumber("1e18");
const printAllocations = (key, allocations) => {
    console.log(chalk.bold.blue(`----ALLOCATIONS----`));
    allocations.forEach((val, idx) => {
        const the_alloc = constants_1.INVESTOR_ALLOCATIONS[key][idx];
        if (the_alloc) {
            console.log(`${the_alloc.title}: `, chalk.yellow(`${new BigNumber(val).div(the_alloc.big_base).toPrecision(9)} ${the_alloc.symbol}`));
        }
        ;
    });
    console.log(chalk.bold.blue(`-------------------`));
};
exports.printAllocations = printAllocations;
const printRewards = (key, rewards) => {
    console.log(chalk.bold.blue(`----REWARDS----`));
    rewards.forEach((val, idx) => {
        const the_reward = constants_1.INVESTOR_REWARDS[key][idx];
        if (the_reward) {
            console.log(`${the_reward.title}: `, chalk.yellow(`${new BigNumber(val).div(the_reward.big_base).toPrecision(9)} ${the_reward.symbol}`));
        }
        ;
    });
    console.log(chalk.bold.blue(`-------------------`));
};
exports.printRewards = printRewards;
const getTokenPriceFromCoinGecko = (ticker) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const resp = yield fetch(`https://api.coingecko.com/api/v3/coins/${ticker}?tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`, {
        method: 'GET',
    });
    const coingecko_response = resp.ok ? yield resp.json() : null;
    return coingecko_response.market_data.current_price.usd;
});
exports.getTokenPriceFromCoinGecko = getTokenPriceFromCoinGecko;
const printVeFXS_Points = (vefxs_instance, epoch, addr) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const point = yield vefxs_instance.point_history(epoch);
    const converted_point = {
        bias: new BigNumber(point.bias).toNumber(),
        slope: new BigNumber(point.slope).toNumber(),
        ts: new BigNumber(point.ts).toNumber(),
        blk: new BigNumber(point.blk).toNumber(),
        fxs_amt: (new BigNumber(point.fxs_amt)).div(BIG18).toNumber(),
    };
    console.log("Point: ", converted_point);
    const user_point = yield vefxs_instance.user_point_history(addr, epoch);
    const converted_user_point = {
        bias: new BigNumber(user_point.bias).toNumber(),
        slope: new BigNumber(user_point.slope).toNumber(),
        ts: new BigNumber(user_point.ts).toNumber(),
        blk: new BigNumber(user_point.blk).toNumber(),
        fxs_amt: (new BigNumber(user_point.fxs_amt)).div(BIG18).toNumber(),
    };
    console.log(`User Point ${addr}: `, converted_user_point);
});
exports.printVeFXS_Points = printVeFXS_Points;
const printCalcCurCombinedWeight = (contract, addr) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const pack = yield contract.calcCurCombinedWeight(addr);
    const converted_pack = {
        old_combined_weight: (new BigNumber(pack[0])).div(BIG18).toNumber(),
        new_vefxs_multiplier: (new BigNumber(pack[1])).div(BIG18).toNumber(),
        new_combined_weight: (new BigNumber(pack[2])).div(BIG18).toNumber(),
    };
    console.log(`CalcCurCombinedWeight [${addr}]: `, converted_pack);
});
exports.printCalcCurCombinedWeight = printCalcCurCombinedWeight;
const printCalcCurCombinedWeightNoVeFXS = (contract, addr) => tslib_1.__awaiter(void 0, void 0, void 0, function* () {
    const pack = yield contract.calcCurCombinedWeight(addr);
    const converted_pack = {
        old_combined_weight: (new BigNumber(pack[0])).div(BIG18).toNumber(),
        new_combined_weight: (new BigNumber(pack[1])).div(BIG18).toNumber(),
    };
    console.log(`CalcCurCombinedWeight [${addr}]: `, converted_pack);
});
exports.printCalcCurCombinedWeightNoVeFXS = printCalcCurCombinedWeightNoVeFXS;
//# sourceMappingURL=utilities.js.map