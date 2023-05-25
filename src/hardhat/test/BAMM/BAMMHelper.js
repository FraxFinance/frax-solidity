const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BAMMHelper", function () {
	var PRECISION = BigInt(1e18);

	it("setupContracts", async function () {
		var contracts = await setupContracts(9970);
	});

	it("estimateGas for some functions", async function () {
		console.log("=======================================");
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		
		// Randomize the reserve, token swap/add amounts, and fee
		var RES_A = BigInt("50000000000000");
		var RES_B = BigInt("100000000000000000000000000");
		var TKN_A_AMT = BigInt("8000000000000");
		var TKN_B_AMT = BigInt("700000000000000000000000000000");
		var fee = BigInt("9908");

		if ((RES_A + TKN_A_AMT < BigInt(2.1923E33)) && (RES_B + TKN_B_AMT < BigInt(2.1923E33))) {
			console.log("RES_A: " + RES_A + "\nRES_B: " + RES_B + "\nTKN_A_AMT: " + TKN_A_AMT + "\nTKN_B_AMT: " + TKN_B_AMT + "\nfee: " + fee);
			
			// Setup the contracts and mint some LP to the owner	
			var contracts = await setupContracts(fee);
			await contracts.token0.transfer(contracts.pair.address, RES_A);
			await contracts.token1.transfer(contracts.pair.address, RES_B);
			await contracts.pair.mint(owner.address);

			// Calculate which token, and how much of it, need to be swapped to balance the pool
			// Also estimate gas
			console.log("estimateGas getSwapAmount: " + (await contracts.bammHelper.estimateGas.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee)));
			console.log("estimateGas getSwapAmountSolve: " + (await contracts.bammHelper.estimateGas.getSwapAmountSolve(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee)));
			var swapAmount = BigInt(await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));
			var getSwapAmountSolve = BigInt(await contracts.bammHelper.getSwapAmountSolve(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));
			console.log("getSwapAmount: " + swapAmount);
			console.log("getSwapAmountSolve: " + getSwapAmountSolve);

			// Give user1 some A and B tokens. User1 also approves them to the BAMM Helper.
			await contracts.token0.connect(user1).approve(contracts.bammHelper.address, TKN_A_AMT);
			await contracts.token1.connect(user1).approve(contracts.bammHelper.address, TKN_B_AMT);
			await contracts.token0.transfer(user1.address, TKN_A_AMT);
			await contracts.token1.transfer(user1.address, TKN_B_AMT);

			// Estimate gas for adding the unbalanced liquidity
			console.log("estimateGas estimateLiquidityUnbalanced: " + (await contracts.bammHelper.estimateGas.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true)));
			var [estimateLiquidity, swappedAmt] = await contracts.bammHelper.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true);
			console.log("estimateGas addLiquidityUnbalanced: " + (await contracts.bammHelper.connect(user1).estimateGas.addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true)));
			await contracts.bammHelper.connect(user1).addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true);
			var liquidity = await contracts.pair.balanceOf(user1.address);
			expect(liquidity).to.equal(estimateLiquidity);
			PRECISION = PRECISION * BigInt(10);
		}
	});

	it("Test getSwapAmount, estimateLiquidityUnbalanced and addLiquidityUnbalanced", async function () {
		console.log("=======================================");
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		
		// Randomize the reserve, token swap/add amounts, and fee
		var RES_A = BigInt("800000000000");
		var RES_B = BigInt("4000000000000000000000000");
		var TKN_A_AMT = BigInt("80000000000000");
		var TKN_B_AMT = BigInt("400000000000000000000000000");
		var fee = BigInt("9985");

		if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
			console.log("RES_A: " + RES_A + "\nRES_B: " + RES_B + "\nTKN_A_AMT: " + TKN_A_AMT + "\nTKN_B_AMT: " + TKN_B_AMT + "\nfee: " + fee);
			
			// Setup the contracts and mint some LP to the owner
			var contracts = await setupContracts(fee);
			await contracts.token0.transfer(contracts.pair.address, RES_A);
			await contracts.token1.transfer(contracts.pair.address, RES_B);
			await contracts.pair.mint(owner.address);

			// Calculate which token, and how much of it, need to be swapped to balance the pool
			var swapAmount = BigInt(await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));
			console.log("swapAmount: " + swapAmount);

			// Give user1 some A and B tokens. User1 also approves them to the BAMM Helper.
			await contracts.token0.connect(user1).approve(contracts.bammHelper.address, TKN_A_AMT);
			await contracts.token1.connect(user1).approve(contracts.bammHelper.address, TKN_B_AMT);
			await contracts.token0.transfer(user1.address, TKN_A_AMT);
			await contracts.token1.transfer(user1.address, TKN_B_AMT);

			// Test adding the liquidity
			var [estimateLiquidity, swappedAmt] = await contracts.bammHelper.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true);
			console.log("estimateLiquidity: " + estimateLiquidity);
			console.log("swappedAmt: " + swappedAmt);
			await contracts.bammHelper.connect(user1).addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true);
			var liquidity = await contracts.pair.balanceOf(user1.address);
			console.log("liquidity: " + liquidity);
			expect(liquidity).to.equal(estimateLiquidity);
			PRECISION = PRECISION * BigInt(10);
		}
	});

	it("Test getSwapAmount and direct swap more deeply", async function () {
		console.log("=======================================");
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		
		// Randomize the reserve, token swap/add amounts, and fee
		var RES_A = BigInt("800000000000000000000000000");
		var RES_B = BigInt("40000000000000000000000000000");
		var TKN_A_AMT = BigInt("1000000000000000000000000000000000");
		var TKN_B_AMT = BigInt("40000000000000000000000");
		var fee = BigInt("9906");


		if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
			console.log("RES_A: " + RES_A + "\nRES_B: " + RES_B + "\nTKN_A_AMT: " + TKN_A_AMT + "\nTKN_B_AMT: " + TKN_B_AMT + "\nfee: " + fee);
			
			// Setup the contracts and mint some LP to the owner
			var contracts = await setupContracts(fee);
			await contracts.token0.transfer(contracts.pair.address, RES_A);
			await contracts.token1.transfer(contracts.pair.address, RES_B);
			await contracts.pair.mint(owner.address);

			// Calculate which token, and how much of it, need to be swapped to balance the pool
			var swapAmount = BigInt(await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));
			console.log("swapAmount: " + swapAmount);

			// Positive = tokenA is swapped out, Negative = tokenB is swapped out
			if (swapAmount >= 0) {
				// Calculate the estimated amount of tokenB that will be generated
				var amountOut = getAmountOut(RES_A, RES_B, fee, BigInt(swapAmount));
				//console.log("amountOut: " + amountOut);

				// Give some token0 (tokenA) to the LP and swap with it. Should give token1 (tokenB) to the sender
				await contracts.token0.transfer(contracts.pair.address, swapAmount);
				if (amountOut > 0) await contracts.pair.swap(0, amountOut, owner.address, []);

				// Print the reserves and balances
				var reserves = await contracts.pair.getReserves();
				console.log("reserve0 (A): ", reserves._reserve0);
				console.log("reserve1 (B): ", reserves._reserve1);
				console.log("balance tkn0 (A): ", TKN_A_AMT - swapAmount);
				console.log("balance tkn1 (B): ", TKN_B_AMT + amountOut);

				// Make sure the expected amount of token1 (B) matches the actual
				var expectedTknB = ((TKN_A_AMT - swapAmount) * BigInt(reserves._reserve1)) / BigInt(reserves._reserve0);
				console.log("expectedTknB : " + expectedTknB);
				console.log("TKN_B_AMT + amountOut: " + (TKN_B_AMT + amountOut));
				var PRECISION = minBigInt(BigInt(10000000), BigInt(reserves._reserve0), BigInt(reserves._reserve1), (TKN_A_AMT - swapAmount), (TKN_B_AMT + amountOut)) / BigInt(10);
				var diff = ((expectedTknB - (TKN_B_AMT + amountOut)) * PRECISION) / expectedTknB; // Truncate to PRECISION
				expect(diff).to.equal(BigInt(0));
			} else {
				// Calculate the estimated amount of tokenA that will be generated
				swapAmount = -swapAmount;
				var amountOut = getAmountOut(RES_B, RES_A, fee, BigInt(swapAmount));
				//console.log("amountOut: " + amountOut);

				// Give some token1 (tokenB) to the LP and swap with it. Should give token0 (tokenA) to the sender
				await contracts.token1.transfer(contracts.pair.address, swapAmount);
				if (amountOut > 0) await contracts.pair.swap(amountOut,0, owner.address, []);

				// Print the reserves and balances
				var reserves = await contracts.pair.getReserves();
				console.log("reserve0 (A): ", reserves._reserve0);
				console.log("reserve1 (B): ", reserves._reserve1);
				console.log("balance tkn0 (A): ", TKN_A_AMT + amountOut);
				console.log("balance tkn1 (B): ", TKN_B_AMT - swapAmount);

				// Make sure the expected amount of token1 (B) matches the actual
				var expectedTknB = ((TKN_A_AMT + amountOut) * BigInt(reserves._reserve1)) / BigInt(reserves._reserve0);
				console.log("expectedTknB  : " + expectedTknB);
				console.log("TKN_B_AMT - swapAmount: " + (TKN_B_AMT - swapAmount));
				var PRECISION = minBigInt(BigInt(10000000), BigInt(reserves._reserve0), BigInt(reserves._reserve1), (TKN_A_AMT + amountOut), (TKN_B_AMT - swapAmount)) / BigInt(10);
				var diff = ((expectedTknB - (TKN_B_AMT - swapAmount)) * PRECISION) / expectedTknB; // Truncate to PRECISION
				expect(diff).to.equal(BigInt(0));
			}
		}
	});

	it("Fuzz getSwapAmount", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();

		// Generate a bunch of multipliers to be used in the fuzzing
		var PRECISION = BigInt(1e6);
		var pow10 = [BigInt(1)];
		for (var i = 1; i < 100; i++) {
			pow10[i] = pow10[i - 1] * BigInt(10);
		}

		// Fuzz 100 times
		for (var i = 0; i < 100; i++) {
			// Randomize the reserve, token swap/add amounts, and fee
			var RES_A = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var RES_B = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var TKN_A_AMT = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var TKN_B_AMT = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var fee = BigInt(9999) - BigInt(rnd(100));

			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33) && RES_A * RES_B > 1000000) {
				// Setup the contracts and mint some LP to the owner
				var contracts = await setupContracts(fee);
				console.log(`------ [Fuzz GtSwpAmt ${i}] ------`);
				console.log("RES_A: " + RES_A + "\nRES_B: " + RES_B + "\nTKN_A_AMT: " + TKN_A_AMT + "\nTKN_B_AMT: " + TKN_B_AMT + "\nfee: " + fee + "\ngas: " + (await contracts.bammHelper.estimateGas.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee)));
				await contracts.token0.transfer(contracts.pair.address, RES_A);
				await contracts.token1.transfer(contracts.pair.address, RES_B);
				await contracts.pair.mint(owner.address);

				// Calculate which token, and how much of it, need to be swapped to balance the pool
				var swapAmount = BigInt(await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));

				// Positive = tokenA is swapped out, Negative = tokenB is swapped out
				if (swapAmount >= 0) {
					// Calculate the estimated amount of tokenB that will be generated
					var amountOut = getAmountOut(RES_A, RES_B, fee, BigInt(swapAmount));
					//console.log("amountOut: " + amountOut);

					// Give some token0 (tokenA) to the LP and swap with it. Should give token1 (tokenB) to the sender
					await contracts.token0.transfer(contracts.pair.address, swapAmount);
					if (amountOut > 0) await contracts.pair.swap(0, amountOut, owner.address, []);

					// Check reserves and balances
					var reserves = await contracts.pair.getReserves();
					//console.log("reserves: " + reserves._reserve0 + ", " + reserves._reserve1);
					//console.log("balance: " + (TKN_A_AMT - swapAmount) + ", " + (TKN_B_AMT + amountOut));
					var expectedTknB = (TKN_A_AMT - swapAmount) * BigInt(reserves._reserve1) / BigInt(reserves._reserve0);
					var PRECISION = minBigInt(BigInt(10000000), BigInt(reserves._reserve0), BigInt(reserves._reserve1), (TKN_A_AMT - swapAmount), (TKN_B_AMT + amountOut)) / BigInt(10);
					var diff = (expectedTknB - (TKN_B_AMT + amountOut)) * PRECISION / expectedTknB;
					expect(diff).to.equal(BigInt(0));
				} else {
					// Calculate the estimated amount of tokenA that will be generated
					swapAmount = -swapAmount;
					var amountOut = getAmountOut(RES_B, RES_A, fee, swapAmount);
					//console.log("amountOut: " + amountOut);

					// Give some token1 (tokenB) to the LP and swap with it. Should give token0 (tokenA) to the sender
					await contracts.token1.transfer(contracts.pair.address, swapAmount);
					if (amountOut > 0) await contracts.pair.swap(amountOut,0, owner.address, []);

					// Check reserves and balances
					var reserves = await contracts.pair.getReserves();
					//console.log("reserves: " + reserves._reserve0 + ", " + reserves._reserve1);
					//console.log("balance: " + (TKN_A_AMT + amountOut) + ", " + (TKN_B_AMT - swapAmount));
					var expectedTknB = (TKN_A_AMT + amountOut) * BigInt(reserves._reserve1) / BigInt(reserves._reserve0);
					var PRECISION = minBigInt(BigInt(10000000), BigInt(reserves._reserve0), BigInt(reserves._reserve1), (TKN_A_AMT + amountOut),(TKN_B_AMT - swapAmount))/BigInt(10);
					var diff = (expectedTknB - (TKN_B_AMT - swapAmount)) * PRECISION / expectedTknB;
					expect(diff).to.equal(BigInt(0));
			   }
			}
		}
	}).timeout(10000000);

	it("Fuzz estimateLiquidity", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();

		// Generate a bunch of multipliers to be used in the fuzzing
		var PRECISION = BigInt(1e6);
		var pow10 = [BigInt(1)];
		for (var i = 1; i < 100; i++) {
			pow10[i] = pow10[i - 1] * BigInt(10);
		}

		// Fuzz 100 times
		for (var i = 0; i < 100; i++) {
			// Randomize the reserve, token swap/add amounts, and fee.
			var RES_A = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var RES_B = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var TKN_A_AMT = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var TKN_B_AMT = BigInt(rnd(9) + 1) * pow10[rnd(33) + 1];
			var fee = BigInt(9999) - BigInt(rnd(100));


			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33) && RES_A * RES_B > 1000000) {
				// Setup the contracts and mint some LP to the owner
				console.log(`------ [Fuzz EstLiq ${i}] ------`);
				console.log("RES_A: " + RES_A + "\nRES_B: " + RES_B + "\nTKN_A_AMT: " + TKN_A_AMT + "\nTKN_B_AMT: " + TKN_B_AMT + "\nfee: " + fee);
				var contracts = await setupContracts(fee);
				await contracts.token0.transfer(contracts.pair.address, RES_A);
				await contracts.token1.transfer(contracts.pair.address, RES_B);
				await contracts.pair.mint(owner.address);

				// Give user1 some A and B tokens. User1 also approves them to the BAMM Helper.
				await contracts.token0.connect(user1).approve(contracts.bammHelper.address, TKN_A_AMT);
				await contracts.token1.connect(user1).approve(contracts.bammHelper.address, TKN_B_AMT);

				await contracts.token0.transfer(user1.address, TKN_A_AMT);
				await contracts.token1.transfer(user1.address, TKN_B_AMT);

				// Add liquidity
				var [estimateLiquidity, swappedAmt] = await contracts.bammHelper.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true);
				await contracts.bammHelper.connect(user1).addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true);
				var liquidity = await contracts.pair.balanceOf(user1.address);
				// console.log("liquidity: " + liquidity);
				// console.log("estimateLiquidity: " + estimateLiquidity);
				expect(liquidity).to.equal(estimateLiquidity);
				PRECISION = PRECISION * BigInt(10);
			}
		}
	}).timeout(10000000);
	return;











	it("getSwapAmount 1", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970);
		var PRECISION = BigInt(1e6);
		for (var i=0;i<32;i++) {
			var RES_A = BigInt(1000)*PRECISION;
			var RES_B = BigInt(1000)*PRECISION;
			var TKN_A_AMT = BigInt(51)*PRECISION;
			var TKN_B_AMT = BigInt(50)*PRECISION;
			var fee = BigInt(9970);
			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
				//console.log("RES_A: " + RES_A + " RES_B: " + RES_B + " TKN_A_AMT: " + TKN_A_AMT + " TKN_B_AMT: " + TKN_B_AMT + " fee: " + fee);
				var swapAmount = await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee);
				console.log("swapAmount: " + swapAmount);
				expect(BigInt(swapAmount) * BigInt(1e5)/PRECISION).to.equal(BigInt(47679));
				PRECISION = PRECISION * BigInt(10);
		   }
	   }
	});


	//return;

	it("getSwapAmount 2", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970);
		var PRECISION = BigInt(1e6);
		for (var i=0;i<32;i++) {

			var RES_A = BigInt(1000)*PRECISION;
			var RES_B = BigInt(1000)*PRECISION;
			var TKN_A_AMT = BigInt(50)*PRECISION;
			var TKN_B_AMT = BigInt(51)*PRECISION;
			var fee = BigInt(9970);
			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
				var swapAmount = await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee);
				console.log("swapAmount: " + swapAmount);
				expect(BigInt(swapAmount) * BigInt(1e5)/PRECISION).to.equal(BigInt(-47679));
				PRECISION = PRECISION * BigInt(10);
			}
		}
	});

	it("getSwapAmount 3", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var PRECISION = BigInt(1e6);
		for (var i=0;i<32;i++) {
			var RES_A = BigInt(1000)*PRECISION;
			var RES_B = BigInt(1000)*PRECISION;
			var TKN_A_AMT = BigInt(51)*PRECISION;
			var TKN_B_AMT = BigInt(50)*PRECISION;
			var fee = BigInt(9970);
			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
				var contracts = await setupContracts(f);
				await contracts.token0.transfer(contracts.pair.address, RES_A);
				await contracts.token1.transfer(contracts.pair.address, RES_B);
				await contracts.pair.mint(owner.address);
				var swapAmount = BigInt(await contracts.bammHelper.getSwapAmount(RES_A, RES_B, TKN_A_AMT, TKN_B_AMT, fee));
				var amountOut = getAmountOut(RES_A, RES_B, fee, BigInt(swapAmount));
				await contracts.token0.transfer(contracts.pair.address, swapAmount);
				await contracts.pair.swap(0, amountOut, owner.address, []);
				var reserves = await contracts.pair.getReserves();
				var expectedBy = (TKN_A_AMT - swapAmount) * BigInt(reserves._reserve1) / BigInt(reserves._reserve0);
				var diff = (expectedBy - (TKN_B_AMT + amountOut))*BigInt(10000000)/expectedBy;
				expect(diff).to.equal(BigInt(0));
				PRECISION = PRECISION * BigInt(10);
   		}
	   }
	});
	it("addLiquidityUnbalanced 1", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var PRECISION = BigInt(1e6);
		for (var i=0;i<32;i++) {
			var RES_A = BigInt(1000)*PRECISION;
			var RES_B = BigInt(1000)*PRECISION;
			var TKN_A_AMT = BigInt(51)*PRECISION;
			var TKN_B_AMT = BigInt(50)*PRECISION;
			var fee = BigInt(9970);
			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
				var contracts = await setupContracts(f);
				await contracts.token0.transfer(contracts.pair.address, RES_A);
				await contracts.token1.transfer(contracts.pair.address, RES_B);
				await contracts.pair.mint(owner.address);

				await contracts.token0.connect(user1).approve(contracts.bammHelper.address, TKN_A_AMT);
				await contracts.token1.connect(user1).approve(contracts.bammHelper.address, TKN_B_AMT);
				await contracts.token0.transfer(user1.address, TKN_A_AMT);
				await contracts.token1.transfer(user1.address, TKN_B_AMT);

				var [estimateLiquidity, swappedAmt] = await contracts.bammHelper.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true);
				console.log("estimateLiquidity: " + estimateLiquidity);
				await contracts.bammHelper.connect(user1).addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true);
				var liquidity = await contracts.pair.balanceOf(user1.address);
				console.log("liquidity: " + liquidity);
				expect(liquidity).to.equal(estimateLiquidity);
				PRECISION = PRECISION * BigInt(10);
			}
		}
	});
	it("addLiquidityUnbalanced 2", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var PRECISION = BigInt(1e6);
		for (var i=0;i<32;i++) {
			var RES_A = BigInt(1000)*PRECISION;
			var RES_B = BigInt(1000)*PRECISION;
			var TKN_A_AMT = BigInt(50)*PRECISION;
			var TKN_B_AMT = BigInt(51)*PRECISION;
			var fee = BigInt(9970);
			if (RES_A + TKN_A_AMT < BigInt(2.1923E33) && RES_B + TKN_B_AMT < BigInt(2.1923E33)) {
				var contracts = await setupContracts(f);
				await contracts.token0.transfer(contracts.pair.address, RES_A);
				await contracts.token1.transfer(contracts.pair.address, RES_B);
				await contracts.pair.mint(owner.address);

				await contracts.token0.connect(user1).approve(contracts.bammHelper.address, TKN_A_AMT);
				await contracts.token1.connect(user1).approve(contracts.bammHelper.address, TKN_B_AMT);
				await contracts.token0.transfer(user1.address, TKN_A_AMT);
				await contracts.token1.transfer(user1.address, TKN_B_AMT);

				var [estimateLiquidity, swappedAmt] = await contracts.bammHelper.estimateLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, contracts.pair.address, fee, true);
				console.log("estimateLiquidity: " + estimateLiquidity);
				await contracts.bammHelper.connect(user1).addLiquidityUnbalanced(TKN_A_AMT, TKN_B_AMT, 0, contracts.pair.address, fee, true);
				var liquidity = await contracts.pair.balanceOf(user1.address);
				console.log("liquidity: " + liquidity);
				expect(liquidity).to.equal(estimateLiquidity);
				PRECISION = PRECISION * BigInt(10);
			}
		}
	});
});

function rnd(noValues) {
	return Math.floor(Math.random() * noValues);
}

function minBigInt(a,b,c,d,e) {
	var result = a;
	if (b < result) result = b;
	if (c < result) result = c;
	if (d < result) result = d;
	if (e < result) result = e;
	return result;
}

function getAmountOut(reserveIn, reserveOut,fee,amountIn) {
	var amountInWithFee = amountIn * fee;
	var numerator = amountInWithFee * reserveOut;
	var denominator = (reserveIn * BigInt(10000)) + amountInWithFee;
	return numerator / denominator;
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

async function setupContracts(fee) {
	const [owner, user1, user2, user3, user4] = await ethers.getSigners();

	// Deploy token0/token1 token and distribute
	const DummyToken = await ethers.getContractFactory("ERC20PeriTest");
	var token0 = await DummyToken.deploy(ethers.constants.MaxUint256);
	var token1 = await DummyToken.deploy(ethers.constants.MaxUint256);
	const weth9 = await (await ethers.getContractFactory("WETH9")).deploy();
	if (token1.address.toUpperCase()<token0.address.toUpperCase()) {
		var temp=token1;
		token1=token0;
		token0=temp;
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

	await factory["createPair(address,address,uint256)"](token0.address, token1.address,BigInt(10000)-BigInt(fee));
	const pairAddress = await factory.getPair(token0.address, token1.address);
	const FraxswapPair = await ethers.getContractFactory("FraxswapPair");
	var pair = FraxswapPair.attach(pairAddress);

	// Deploy BAMMHelper
	const BAMMHelper = await ethers.getContractFactory("BAMMHelper");
	var bammHelper = await BAMMHelper.deploy();

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.pair = pair;
    result.bammHelper = bammHelper;
    result.weth = weth9;
    return result;
}
