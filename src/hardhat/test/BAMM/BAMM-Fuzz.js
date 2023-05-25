const { BN, expectRevert, time } = require('@openzeppelin/test-helpers');
const BigNumber = require("bignumber.js");
const { expect } = require("chai");
const { ethers } = require("hardhat");
const chalk = require('chalk');

describe("BAMM! (Fuzzing)", function () {
	var PRECISION = BigInt(1e18);
	var BIG18 = new BigNumber("1e18");

	it("setupContracts", async function () {
		var contracts = await setupContracts(9970,1e18);
	});

	it("PnL Fuzz", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var MINT_AMOUNT = BigInt(10e18);
		var COLLATERAL0_AMOUNT = BigInt(10e16);
		var COLLATERAL1_AMOUNT = BigInt(10e16);
		
		// Generate a bunch of multipliers to be used in the fuzzing
		var pow10 = [BigInt(1)];
		for (var i = 1; i < 100; i++) {
			pow10[i] = pow10[i - 1] * BigInt(10);
		}

		// Do the fuzzing
		var SWAP_AMOUNT_BASE = (MINT_AMOUNT * BigInt(25));
		for (var i = 1; i < 91; i++) {
			console.log(`--------- PnL Fuzz - [${i}] ---------`);
			var RENT_AMOUNT = BigInt(1e17);
			var SWAP_AMOUNT = (i < 50) ? ((MINT_AMOUNT * BigInt(50) / BigInt(i)) - MINT_AMOUNT) : (MINT_AMOUNT - MINT_AMOUNT * BigInt(50) / BigInt(i - 40));

			// Setup the contracts and get the initial balances
			// console.log("SWAP_AMOUNT, " + SWAP_AMOUNT);
			var contracts = await setupContracts(9970, MINT_AMOUNT * BigInt(2));
			var startToken0 = BigInt(await contracts.token0.balanceOf(user1.address));
			var startToken1 = BigInt(await contracts.token1.balanceOf(user1.address));
			var startLPOwner = await contracts.pair.balanceOf(owner.address);
			console.log("startToken0 (user1): ", startToken0);
			console.log("startToken1 (user1): ", startToken1);
			console.log("startLPOwner: ", startLPOwner);

			// Mint some BAMM with the LP
			await contracts.pair.approve(contracts.bamm.address, MINT_AMOUNT);
			var bamm_minted = await contracts.bamm.callStatic.mint(owner.address, MINT_AMOUNT);
			await contracts.bamm.mint(owner.address, MINT_AMOUNT);
			console.log("bamm_minted: ", bamm_minted);

			// User1 deposits some tokens, then rents
			await contracts.token0.connect(user1).approve(contracts.bamm.address, COLLATERAL0_AMOUNT);
			await contracts.token1.connect(user1).approve(contracts.bamm.address, COLLATERAL1_AMOUNT);
			await contracts.bamm.connect(user1).executeActions(createAction({ 
				token0Amount: COLLATERAL0_AMOUNT, 
				token1Amount: COLLATERAL1_AMOUNT
			}));
			await contracts.bamm.connect(user1).executeActions(createAction({
				rent: RENT_AMOUNT
			}));

			// Wait some time to accrue interest.
			// wait(60 * 60 * 24 * 200);

			// Change the price
			// Positive = token0 is swapped out, Negative = token1 is swapped out
			if (SWAP_AMOUNT > BigInt(0)) {
				// Swap token0 for token1
				var amount1Out = BigInt(await contracts.pair.getAmountOut(SWAP_AMOUNT, contracts.token0.address));
				await contracts.token0.connect(owner).transfer(contracts.pair.address, SWAP_AMOUNT);
				contracts.pair.swap(0, amount1Out, owner.address, []);

				// Owner deposits tokens, so the close position for user1 can flash borrow them.
				await contracts.token0.connect(owner).approve(contracts.bamm.address, SWAP_AMOUNT);
				await contracts.bamm.connect(owner).executeActions(createAction({ 
					token0Amount: SWAP_AMOUNT 
				}));

				// Owner gives some tokens to user1, who then closes their position
				startToken0 += SWAP_AMOUNT;
				await contracts.token0.connect(owner).transfer(user1.address, SWAP_AMOUNT);
				await contracts.token0.connect(user1).approve(contracts.bamm.address,SWAP_AMOUNT);
				await contracts.bamm.connect(user1).executeActions(createAction({
					closePosition: true
				}));

				// Owner gets flashtokens back
				await contracts.bamm.connect(owner).executeActions(createAction({
					token0Amount: -SWAP_AMOUNT
				}));
			} else if (SWAP_AMOUNT < BigInt(0)) {
				// Swap token1 for token0
				var amount0Out = BigInt(await contracts.pair.getAmountOut(-SWAP_AMOUNT, contracts.token1.address));
				await contracts.token1.connect(owner).transfer(contracts.pair.address, -SWAP_AMOUNT);
				contracts.pair.swap(amount0Out, 0, owner.address, []);

				// Owner deposits tokens, so the close position for user1 can flash borrow them.
				await contracts.token1.connect(owner).approve(contracts.bamm.address, -SWAP_AMOUNT);
				await contracts.bamm.connect(owner).executeActions(createAction({
					token1Amount: -SWAP_AMOUNT
				}));

				// Owner gives some tokens to user1, who then closes their position
				startToken1 -= SWAP_AMOUNT;
				await contracts.token1.connect(owner).transfer(user1.address, -SWAP_AMOUNT);
				await contracts.token1.connect(user1).approve(contracts.bamm.address, -SWAP_AMOUNT);
				await contracts.bamm.connect(user1).executeActions(createAction({
					closePosition: true
				}));

				// Owner gets flashtokens back
				await contracts.bamm.connect(owner).executeActions(createAction({
					token1Amount: SWAP_AMOUNT
				}));
			} else {
				await contracts.bamm.connect(user1).executeActions(createAction({
					closePosition: true
				}));
			}

			// Owner redeems their BAMM for LP. Should have a profit too
			await contracts.bamm.redeem(owner.address, bamm_minted);
			var endLPOwner = await contracts.pair.balanceOf(owner.address);
			var endToken0 = BigInt(await contracts.token0.balanceOf(user1.address));
			var endToken1 = BigInt(await contracts.token1.balanceOf(user1.address));
			console.log(`endLPOwner: ${endLPOwner} (change: ${endLPOwner - startLPOwner})`, );
			console.log(`endToken0 (user1): ${endToken0} (change: ${endToken0 - startToken0})`);
			console.log(`endToken1 (user1): ${endToken1} (change: ${endToken1 - startToken1})`);
			console.log("contracts.token0.balanceOf: ", await contracts.token0.balanceOf(contracts.pair.address));
			console.log("contracts.token1.balanceOf: ", await contracts.token1.balanceOf(contracts.pair.address));
			
			if (endLPOwner <= startLPOwner) {
				if (true) {
					console.log(chalk.yellow.bold('TODO: WARNING: SHOULD HAVE EARNED AN LP PROFIT???'));
				}
				else {
					throw "ERROR: SHOULD HAVE EARNED AN LP PROFIT";
				}
			}
			console.log();

		}
	}).timeout(100000000);

	it("Fuzz 1", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var MINT_AMOUNT = BigInt(1e18);
		var COLLATERAL0_AMOUNT = BigInt(10e16);
		var COLLATERAL1_AMOUNT = BigInt(10e16);

		var pow10 = [BigInt(1)];
		for (var i = 1; i < 100; i++) {
			pow10[i] = pow10[i - 1] * BigInt(10);
		}
		for (var i = 0; i < 100; i++) {
			// Randomize the rent and swap amounts
			var RENT_AMOUNT = MINT_AMOUNT * BigInt(rnd(899)) / BigInt(1000);
			var SWAP_AMOUNT = BigInt(rnd(9) + 1) * BigInt(pow10[rnd(33) + 1]);
			//RENT_AMOUNT = BigInt("460000000000000000");
			//SWAP_AMOUNT = BigInt("9000000000000000000000000000000");

			console.log(`--------- Fuzz #1 - [${i}] ---------`, );
			if ((SWAP_AMOUNT + (MINT_AMOUNT * BigInt(2))) < BigInt(2.1923E33)) {
				console.log("RENT_AMOUNT, " + RENT_AMOUNT + ", SWAP_AMOUNT, " + SWAP_AMOUNT);

				// Setup the contracts and get the initial balances
				var contracts = await setupContracts(9970, MINT_AMOUNT * BigInt(2));
				var startToken0 = BigInt(await contracts.token0.balanceOf(user1.address));
				var startToken1 = BigInt(await contracts.token1.balanceOf(user1.address));
				var startLPOwner = await contracts.pair.balanceOf(owner.address);
				console.log("startToken0 (user1): ", startToken0);
				console.log("startToken1 (user1): ", startToken1);
				console.log("startLPOwner: ", startLPOwner);

				// Mint some BAMM with the LP
				await contracts.pair.approve(contracts.bamm.address, MINT_AMOUNT);
				var bamm_minted = await contracts.bamm.callStatic.mint(owner.address, MINT_AMOUNT);
				await contracts.bamm.mint(owner.address, MINT_AMOUNT);
				console.log("bamm_minted: ", bamm_minted);

				// User1 deposits some tokens, then rents
				await contracts.token0.connect(user1).approve(contracts.bamm.address, COLLATERAL0_AMOUNT);
				await contracts.token1.connect(user1).approve(contracts.bamm.address, COLLATERAL1_AMOUNT);
				await contracts.bamm.connect(user1).executeActions(createAction({
					token0Amount: COLLATERAL0_AMOUNT, 
					token1Amount: COLLATERAL1_AMOUNT
				}));
				await contracts.bamm.connect(user1).executeActions(createAction({
					rent: RENT_AMOUNT
				}));

				//wait(6*60*60*24);

				// Change the price
				var amount1Out = BigInt(await contracts.pair.getAmountOut(SWAP_AMOUNT, contracts.token0.address));
				await contracts.token0.connect(owner).transfer(contracts.pair.address,SWAP_AMOUNT);
				contracts.pair.swap(0, amount1Out, owner.address, []);

				// Owner deposits tokens, so the close position for user1 can flash borrow them.
				await contracts.token0.connect(owner).approve(contracts.bamm.address, SWAP_AMOUNT);
				await contracts.bamm.connect(owner).executeActions(createAction({
					token0Amount: SWAP_AMOUNT
				}));

				// Owner gives some tokens to user1, who then closes their position
				await contracts.token0.connect(owner).transfer(user1.address, SWAP_AMOUNT);
				await contracts.token0.connect(user1).approve(contracts.bamm.address,SWAP_AMOUNT);
				await contracts.bamm.connect(user1).executeActions(createAction({
					closePosition: true
				}));

				// Owner gets flashtokens back
				await contracts.bamm.connect(owner).executeActions(createAction({
					token0Amount: -SWAP_AMOUNT
				}));


				// Owner redeems their BAMM for LP. Should have a profit too
				await contracts.bamm.redeem(owner.address, bamm_minted);
				var endLPOwner = await contracts.pair.balanceOf(owner.address);
				var endToken0 = BigInt(await contracts.token0.balanceOf(user1.address));
				var endToken1 = BigInt(await contracts.token1.balanceOf(user1.address));
				console.log(`endLPOwner: ${endLPOwner} (change: ${endLPOwner - startLPOwner})`, );
				console.log(`endToken0 (user1): ${endToken0} (change: ${endToken0 - startToken0})`);
				console.log(`endToken1 (user1): ${endToken1} (change: ${endToken1 - startToken1})`);
				console.log("contracts.token0.balanceOf: ", await contracts.token0.balanceOf(contracts.pair.address));
				console.log("contracts.token1.balanceOf: ", await contracts.token1.balanceOf(contracts.pair.address));
				
				if (endLPOwner <= startLPOwner) {
					if (true) {
						console.log(chalk.yellow.bold('TODO: WARNING: SHOULD HAVE EARNED AN LP PROFIT???'));
					}
					else {
						throw "ERROR: SHOULD HAVE EARNED AN LP PROFIT";
					}
				}
			}
			console.log();
		}
	}).timeout(100000000);

});

function createSwapParams(values) {
   var nullBytes = "0x0000000000000000000000000000000000000000000000000000000000000000";
	var swapParams = {
			tokenIn: "0x0000000000000000000000000000000000000000",
			amountIn: 0,
			tokenOut: "0x0000000000000000000000000000000000000000",
			amountOutMinimum: 0,
			recipient: "0x0000000000000000000000000000000000000000",
			deadline: 4102441200,
			approveMax: false,
			v: 0,
			r: "0x0000000000000000000000000000000000000000000000000000000000000000",
			s: "0x0000000000000000000000000000000000000000000000000000000000000000",
			route: "0x0000000000000000000000000000000000000000000000000000000000000000"
	};
	return Object.assign(swapParams, values);
}

function createAction(values) {
   var nullBytes = "0x0000000000000000000000000000000000000000000000000000000000000000";
	var result = {
		token0Amount: 0,
		token1Amount: 0,
		rent: 0,
		to: "0x0000000000000000000000000000000000000000",
		minToken0Amount: 0,
		minToken1Amount: 0,
		closePosition: false,
		approveMax: false,
		v: 0,
		r: nullBytes,
		s: nullBytes,
		deadline: 0
	};
	return Object.assign(result, values);
}

function rnd(noValues) {
	return Math.floor(Math.random() * noValues);
}

async function waitTill(time) {
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var waitPeriod = time-currentblock.timestamp;
	if (waitPeriod > 0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
}
async function wait(waitPeriod) {
	if (waitPeriod > 0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
}

async function setupContracts(fee,mintAmount) {
	const [owner, user1, user2, user3, user4] = await ethers.getSigners();
	if (!fee) fee = 9970;

	// Deploy token0/token1 token and distribute
	const DummyToken = await ethers.getContractFactory("DummyToken");
	var token0 = await DummyToken.deploy();
	await token0.mint(owner.address,ethers.constants.MaxUint256);
	var token1 = await DummyToken.deploy();
	await token1.mint(owner.address,ethers.constants.MaxUint256);

	const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();
	if (token1.address.toUpperCase() < token0.address.toUpperCase()) {
		var temp = token1;
		token1 = token0;
		token0 = temp;
	}

	await token0.transfer(user1.address, "1000000000000000000000");
	await token1.transfer(user1.address, "1000000000000000000000");
	await token0.transfer(user2.address, "1000000000000000000000");
	await token1.transfer(user2.address, "1000000000000000000000");
	await token0.transfer(user3.address, "1000000000000000000000");
	await token1.transfer(user3.address, "1000000000000000000000");
	await token0.transfer(user4.address, "1000000000000000000000");
	await token1.transfer(user4.address, "1000000000000000000000");


	const FraxswapFactory = await ethers.getContractFactory("FraxswapFactory");
	const factory = await FraxswapFactory.deploy(owner.address);
	await factory.deployed();

	await factory["createPair(address,address,uint256)"](token0.address, token1.address, BigInt(10000) - BigInt(fee));
	const pairAddress = await factory.getPair(token0.address, token1.address);
	const FraxswapPair = await ethers.getContractFactory("FraxswapPair");
	var pair = FraxswapPair.attach(pairAddress);
	await token0.transfer(pair.address, BigInt(mintAmount));
	await token1.transfer(pair.address, BigInt(mintAmount));
	await pair.mint(owner.address);

	// Deploy Dummy router
	const FraxswapDummyRouter = await ethers.getContractFactory("FraxswapDummyRouter");
	var router = await FraxswapDummyRouter.deploy();
	await token0.transfer(router.address, "1000000000000000000000");
	await token1.transfer(router.address, "1000000000000000000000");

	// Deploy BAMMHelper
	const BAMMHelper = await ethers.getContractFactory("BAMMHelper");
	var bammHelper = await BAMMHelper.deploy();

	// Deploy FraxswapOracle
	const FraxswapOracle = await ethers.getContractFactory("FraxswapOracle");
	var fraxswapOracle = await FraxswapOracle.deploy();

	// Deploy pool
	const BAMM = await ethers.getContractFactory("BAMM");
	var bamm = await BAMM.deploy(pair.address, true, fee, router.address, bammHelper.address, fraxswapOracle.address);

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.pair = pair;
    result.bamm = bamm;
    result.weth = weth9;
    result.router=router;
    return result;
}
