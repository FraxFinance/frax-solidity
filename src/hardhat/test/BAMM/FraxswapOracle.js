const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FraxswapOracle", function () {
	var PRECISION=BigInt(1e18);

	it("setupContracts", async function () {
		var contracts = await setupContracts(9970, 1e18);
	});

	// Compare directly observed prices with oracle averages. Swap amount is fixed
	it("getPrice fixed: fixed swap input amount and direction", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9999, 100e18);
		var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
		var time = currentblock.timestamp;
		var pricesDirect0 = [];
		var pricesDirect1 = [];

		// Sleep, do swaps with a fixed input amount, note the prices, then repeat
		for (var i = 0; i < 101; i++) {
			// Sleep
			waitTill((time += 100000));

			// Swap
			await swap(contracts,owner, BigInt(1e18));

			// See what the new reserves and prices are
			var reserves = await contracts.pair.getReserves();
			
			// Save the prices for later. They will be compared with the oracle's averages
			var price0 = BigInt(reserves._reserve1) * BigInt(1e18) / BigInt(reserves._reserve0);
			var price1 = BigInt(reserves._reserve0) * BigInt(1e18) / BigInt(reserves._reserve1);
			//console.log(price0+","+price1);
			pricesDirect0.push(price0);
			pricesDirect1.push(price1);
		}

		// Sleep
		wait(100000);

		// Compare oracle-derived historic prices with the actual prices obtained above
		for (var i = 0; i <= 100; i++) {
			console.log(`------ getPrice fixed [i${i}] ------`)

			// Get a historic price using the oracle
			var pricesOracle = await contracts.fraxswapOracle.getPrice(contracts.pair.address, i * 100002 + 10, 10, 10000);
			var sum0 = BigInt(0);
			var sum1 = BigInt(0);

			// Get the average prices using the direct prices you stored
			for (var j = 0; j <= i; j++) {
				sum0 += pricesDirect0[pricesDirect0.length - 1 - j];
				sum1 += pricesDirect1[pricesDirect1.length - 1 - j];
			}
			var average0 = sum0 / BigInt(i + 1);
			var average1 = sum1 / BigInt(i + 1);

			// Print the prices obtained via both methods
			console.log(`[i${i}] result0: ${pricesOracle.result0} | result1: ${pricesOracle.result1}` );
			console.log(`[i${i}] average0: ${average0} | average1: ${average1}` );

			// Make sure the oracle's historic prices are close to the directly recorded prices that you got earlier.
			expect(Number(BigInt(average0) - BigInt(pricesOracle.result0))).to.be.closeTo(0, 1e13);
			expect(Number(BigInt(average1) - BigInt(pricesOracle.result1))).to.be.closeTo(0, 1e13);
	   }
	});
	it("getPrice fuzz: different swap input amounts and directions", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		
		// Generate a bunch of multipliers to be used in the fuzzing
		var pow10 = [BigInt(1)];
		for (var i = 1; i < 100; i++) {
			pow10[i] = pow10[i - 1] * BigInt(10);
		}

		// Do 100 swaps with different input amounts
		for (var t = 0; t < 100; t++) {
			console.log(`************** getPrice fuzz [t${t}] **************`)
			var contracts = await setupContracts(9999, 100e18);
			var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
			var time = currentblock.timestamp;
			var pricesDirect0 = [];
			var pricesDirect1 = [];
			var swapAmounts = [];

			for (var i = 0; i < 101; i++) {
				// Sleep
				waitTill((time += 100000));

				// Randomize the swap amount and direction
				var SWAP_AMOUNT = BigInt(rnd(9) + 1) * pow10[rnd(19) + 1];
				if (rnd(2) == 0) SWAP_AMOUNT =- SWAP_AMOUNT;
				await swap(contracts, owner, SWAP_AMOUNT);
				// console.log(`[t${t}-i${i}] swap amount: ${SWAP_AMOUNT}` );
				swapAmounts.push(SWAP_AMOUNT);

				// See what the new reserves and prices are
				var reserves = await contracts.pair.getReserves();
				
				// Save the prices for later. They will be compared with the oracle's averages
				var price0 = BigInt(reserves._reserve1) * BigInt(1e18) / BigInt(reserves._reserve0);
				var price1 = BigInt(reserves._reserve0) * BigInt(1e18) / BigInt(reserves._reserve1);
				//console.log(price0+","+price1);
				pricesDirect0.push(price0);
				pricesDirect1.push(price1);
			}

			// Sleep
			wait(100000);

			// Compare oracle-derived historic prices with the actual prices obtained above
			for (var i = 0; i <= 100; i++) {
				// Get a historic price using the oracle
				var pricesOracle = await contracts.fraxswapOracle.getPrice(contracts.pair.address, i * 100002 + 10, 10, 10000);
				var sum0 = BigInt(0);
				var sum1 = BigInt(0);

				// Get the average prices using the direct prices you stored
				for (var j = 0; j <= i; j++) {
					sum0 += pricesDirect0[pricesDirect0.length - 1 - j];
					sum1 += pricesDirect1[pricesDirect1.length - 1 - j];
				}
				var average0 = sum0 / BigInt(i + 1);
				var average1 = sum1 / BigInt(i + 1);

				// Print the prices obtained via both methods
				console.log(`---- [t${t}-i${i}] ----` );
				console.log(`[t${t}-i${i}] result0: ${pricesOracle.result0} | result1: ${pricesOracle.result1}` );
				console.log(`[t${t}-i${i}] average0: ${average0} | average1: ${average1}` );
				console.log(`[t${t}-i${i}] swapAmount: ${swapAmounts[i]}` );

				// Make sure the oracle's historic prices are close to the directly recorded prices that you got earlier.
				expect(Number(BigInt(average0)-BigInt(pricesOracle.result0))).to.be.closeTo(0,1e14);
				expect(Number(BigInt(average1)-BigInt(pricesOracle.result1))).to.be.closeTo(0,1e14);
			}
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

async function simulateSwaps(contracts,no,amount,waitPeriod) {
	const [owner, user1, user2, user3, user4] = await ethers.getSigners();
	for (var i = 0; i < no; i++) {
		wait(waitPeriod);
		await swap(contracts, owner, BigInt(amount));
	}
}

async function swap(contracts,user,swapAmount) {
	if (swapAmount > 0) {
		var amount1Out = BigInt(await contracts.pair.getAmountOut(swapAmount, contracts.token0.address));
		if (amount1Out > BigInt(0)) {
			//console.log("amount1Out:"+amount1Out);
			await contracts.token0.connect(user).transfer(contracts.pair.address, swapAmount);
			await contracts.pair.swap(0, amount1Out, user.address, []);
	   }
	} else if (swapAmount < 0) {
		var amount0Out = BigInt(await contracts.pair.getAmountOut(-swapAmount, contracts.token1.address));
		if (amount0Out > BigInt(0)) {
			//console.log("amount0Out:"+amount0Out);
			await contracts.token1.connect(user).transfer(contracts.pair.address, -swapAmount);
			await contracts.pair.swap(amount0Out, 0, user.address, []);
		}
	}
}

function rnd(noValues) {
	return Math.floor(Math.random() * noValues);
}

async function waitTill(time) {
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var waitPeriod = time - currentblock.timestamp;
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
	await token0.mint(owner.address, ethers.constants.MaxUint256);
	var token1 = await DummyToken.deploy();
	await token1.mint(owner.address, ethers.constants.MaxUint256);

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

	await factory["createPair(address,address,uint256)"](token0.address, token1.address,BigInt(10000) - BigInt(fee));
	const pairAddress = await factory.getPair(token0.address, token1.address);
	const FraxswapPair = await ethers.getContractFactory("FraxswapPair");
	var pair = FraxswapPair.attach(pairAddress);
	await token0.transfer(pair.address, BigInt(mintAmount));
	await token1.transfer(pair.address, BigInt(mintAmount));
	await pair.mint(owner.address);

	// Deploy FraxswapOracle
	const FraxswapOracle = await ethers.getContractFactory("FraxswapOracle");
	var fraxswapOracle = await FraxswapOracle.deploy();

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.pair = pair;
    result.fraxswapOracle = fraxswapOracle;
    return result;
}
