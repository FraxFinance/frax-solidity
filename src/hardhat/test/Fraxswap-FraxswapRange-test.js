const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FraxswapRange AMM", function () {
	var PRECISION=BigInt(1e18);
	it("setupContracts", async function () {
		var contracts = await setupContracts(PRECISION,PRECISION/BigInt(2),30);
	});

	it("initial mint", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);
		expect(await contracts.token0.balanceOf(contracts.rangePair.address)).to.equal("100000000000000000000");
		expect(await contracts.token1.balanceOf(contracts.rangePair.address)).to.equal("100000000000000000000");

		var reserves = await contracts.rangePair.getReserves();
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);
		expect(await contracts.rangePair.balanceOf(owner.address)).to.equal(BigInt("200000000000000000000")-BigInt(1000));
	});

	it("mint", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		// Add extra liquiidty
		await contracts.token0.connect(user1).transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.connect(user1).transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.connect(user1).mint(user1.address);
		expect(await contracts.token0.balanceOf(contracts.rangePair.address)).to.equal("200000000000000000000");
		expect(await contracts.token1.balanceOf(contracts.rangePair.address)).to.equal("200000000000000000000");
		expect(await contracts.rangePair.balanceOf(user1.address)).to.equal(BigInt("200000000000000000000"));
	});

	it("burn", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		// Remove liquidity
		var balance0Before = await contracts.token0.balanceOf(owner.address);
		var balance1Before = await contracts.token1.balanceOf(owner.address);
		await contracts.rangePair.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.burn(owner.address);
		expect(await contracts.token0.balanceOf(contracts.rangePair.address)).to.equal("50000000000000000000");
		expect(await contracts.token1.balanceOf(contracts.rangePair.address)).to.equal("50000000000000000000");
		expect(await contracts.rangePair.balanceOf(owner.address)).to.equal(BigInt("100000000000000000000")-BigInt(1000));
		expect(await contracts.token0.balanceOf(owner.address)).to.equal(BigInt(balance0Before) + BigInt("50000000000000000000"));
		expect(await contracts.token1.balanceOf(owner.address)).to.equal(BigInt(balance1Before) + BigInt("50000000000000000000"));
	});

	it("protocol fees", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Set feeTo parameter so the protocol will earn 1/6th of the trading fees
		await contracts.factory.setFeeTo(user3.address);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = BigInt("10000000000000000");
		var reserves = await contracts.rangePair.getReserves();
		var rootKStart = sqrt(BigInt(reserves._reserve0)*BigInt(reserves._reserve1));
		var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
		await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);
		await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);

		expect(await contracts.rangePair.balanceOf(user3.address)).to.equal(BigInt("0"));

		await contracts.rangePair.sync(); // Call sync to update virtual reserves so we can calculate earned fees

		var reservesEnd = await contracts.rangePair.getReserves();
		var totalSupply = BigInt(await contracts.rangePair.totalSupply());

		// Add more liquidity to trigger protocol fees
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var rootKEnd = sqrt(BigInt(reservesEnd._reserve0)*BigInt(reservesEnd._reserve1));
		console.log("rootKStart:"+rootKStart);
		console.log("rootKEnd  :"+rootKEnd);
		var numerator = totalSupply*(rootKEnd-rootKStart);
		var denominator = rootKEnd*BigInt(5)+rootKStart;
		var expectedEarnedFeeTokens = numerator / denominator;
		var earnedFeeTokens = await contracts.rangePair.balanceOf(user3.address);
		console.log("expectedEarnedFeeTokens:"+expectedEarnedFeeTokens);
		console.log("earnedFeeTokens        :"+earnedFeeTokens);
		expect(BigInt(expectedEarnedFeeTokens).toString()).to.equal(BigInt(earnedFeeTokens).toString());
		var approximateFeeValue = BigInt(earnedFeeTokens)*BigInt("200000000000000000000")/totalSupply;
		var expectedFeeValue = tradeAmount*BigInt(5)/BigInt(10000);
		console.log("expectedFeeValue   :"+expectedFeeValue);
		console.log("approximateFeeValue:"+approximateFeeValue);
		expect(Number(expectedFeeValue)).to.be.closeTo(Number(approximateFeeValue),10000000000);
	});



	it("swap at edge", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"0");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = BigInt("1000000");
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);

		console.log("virtualReserve0:"+virtualReserve0);
		console.log("actualBalances0:"+actualBalances0);
		console.log("_reserve0      :"+reserves._reserve0);
		console.log("virtualReserve1:"+virtualReserve1);
		console.log("actualBalances1:"+actualBalances1);
		console.log("_reserve1      :"+reserves._reserve1);
		console.log("tradeAmount    :"+tradeAmount);
		console.log("expectedOutput :"+expectedOutput);


		var balanceBefore = await contracts.token1.balanceOf(user1.address);
		await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

		// Swap fails if you ask for too much
		await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

		// Swap succeeds
		await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
		var balanceAfter = await contracts.token1.balanceOf(user1.address);
		var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
		expect(balanceDiff.toString()).to.equal(expectedOutput.toString());
	});
	it("swap over the edge", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION*BigInt(3),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = BigInt("200000000000000000000")*BigInt(1004)/BigInt(1000);
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
		await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

		// Swap fails if you go over the edge
		await expect(contracts.rangePair.swap(0,"100000000000000000001",user1.address,[])).to.be.revertedWith("UniswapV2: INSUFFICIENT_LIQUIDITY");

		// Swap succes if you stay within boundaries
		await contracts.rangePair.swap(0,"100000000000000000000",user1.address,[]);
	});

	it("swap fee", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		for (var fee=0;fee<=100;fee=fee>=10?fee+10:fee+1) {
			var contracts = await setupContracts(PRECISION,PRECISION,fee);

			// Add initial liquidity
			await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
			await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
			await contracts.rangePair.mint(owner.address);

			var tradeAmount = BigInt("1000000000");
			var reserves = await contracts.rangePair.getReserves();
			var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,fee);
			var virtualReserve0 = await contracts.rangePair.virtualReserve0();
			var virtualReserve1 = await contracts.rangePair.virtualReserve1();
			var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
			var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);

			console.log("fee            :"+fee);
			console.log("expectedOutput :"+expectedOutput);

			var balanceBefore = await contracts.token1.balanceOf(user1.address);
			await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

			// Swap fails if you ask for too much
			await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

			// Swap succeeds
			await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
			var balanceAfter = await contracts.token1.balanceOf(user1.address);
			var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
			expect(balanceDiff.toString()).to.equal(expectedOutput.toString());
		}
	});

	it("update virtualReserves", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var fee=1;
		var contracts = await setupContracts(PRECISION,PRECISION,fee);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var initialQ = 0
		var resetCount=0;
		var tradeAmount = BigInt("10000000000000000000");
		for (var i=0;i<100;i++) {
			var reserves = await contracts.rangePair.getReserves();
			var virtualReserve0 = await contracts.rangePair.virtualReserve0();
			var virtualReserve1 = await contracts.rangePair.virtualReserve1();
			var K = BigInt(reserves._reserve0)*BigInt(reserves._reserve1);
			var Q = K*BigInt(1000000)/(BigInt(virtualReserve0)*BigInt(virtualReserve1));
			if (initialQ==0) initialQ=Q;
			else if (Number(Q)==initialQ) resetCount++;
			//console.log("Q:"+Q);
			var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,fee);
			await contracts.token0.connect(user1).transfer(contracts.rangePair.address,tradeAmount);
			await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);

			reserves = await contracts.rangePair.getReserves();
			virtualReserve0 = await contracts.rangePair.virtualReserve0();
			virtualReserve1 = await contracts.rangePair.virtualReserve1();
			K = BigInt(reserves._reserve0)*BigInt(reserves._reserve1);
			Q = K*BigInt(1000000)/(BigInt(virtualReserve0)*BigInt(virtualReserve1));
			if (Number(Q)==initialQ) resetCount++;
			//console.log("Q:"+Q);
			var expectedOutput = getExpectedOutput(reserves._reserve1,reserves._reserve0,tradeAmount,fee);
			await contracts.token1.connect(user1).transfer(contracts.rangePair.address,tradeAmount);
			await contracts.rangePair.swap(expectedOutput,0,user1.address,[]);
		}
		//console.log("resetCount:"+resetCount);
		expect(resetCount).to.be.above(1);
	});

	it("swap token0 -> token1", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION,30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = BigInt("1000");
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);

		console.log("virtualReserve0:"+virtualReserve0);
		console.log("actualBalances0:"+actualBalances0);
		console.log("_reserve0      :"+reserves._reserve0);
		console.log("virtualReserve1:"+virtualReserve1);
		console.log("actualBalances1:"+actualBalances1);
		console.log("_reserve1      :"+reserves._reserve1);
		console.log("tradeAmount    :"+tradeAmount);
		console.log("expectedOutput :"+expectedOutput);


		var balanceBefore = await contracts.token1.balanceOf(user1.address);
		await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

		// Swap fails if you ask for too much
		await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

		// Swap succeeds
		await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
		var balanceAfter = await contracts.token1.balanceOf(user1.address);
		var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
		expect(balanceDiff.toString()).to.equal(expectedOutput.toString());
	});

	it("swap token1 -> token0", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION,30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = BigInt("1000");
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = getExpectedOutput(reserves._reserve1,reserves._reserve0,tradeAmount,30);
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);

		console.log("virtualReserve0:"+virtualReserve0);
		console.log("actualBalances0:"+actualBalances0);
		console.log("_reserve0      :"+reserves._reserve0);
		console.log("virtualReserve1:"+virtualReserve1);
		console.log("actualBalances1:"+actualBalances1);
		console.log("_reserve1      :"+reserves._reserve1);
		console.log("tradeAmount    :"+tradeAmount);
		console.log("expectedOutput :"+expectedOutput);


		var balanceBefore = await contracts.token0.balanceOf(user1.address);
		await contracts.token1.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

		// Swap fails if you ask for too much
		await expect(contracts.rangePair.swap(expectedOutput+BigInt(1),0,user1.address,[])).to.be.revertedWith("UniswapV2: K");

		// Swap succeeds
		await contracts.rangePair.swap(expectedOutput,0,user1.address,[]);
		var balanceAfter = await contracts.token0.balanceOf(user1.address);
		var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
		expect(balanceDiff.toString()).to.equal(expectedOutput.toString());
	});

	it("different decimals", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var precision0 = PRECISION;
		var precision1 = BigInt(1000000);
		var range = PRECISION/BigInt(100);
		var contracts = await setupContracts(PRECISION*precision1/precision0,range,30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,precision0*BigInt(200));
		await contracts.token1.transfer(contracts.rangePair.address,precision1*BigInt(200));
		await contracts.rangePair.mint(owner.address);

		var tradeAmount = precision0;
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);
		console.log("virtualReserve0:"+virtualReserve0);
		console.log("actualBalances0:"+actualBalances0);
		console.log("_reserve0      :"+reserves._reserve0);
		console.log("virtualReserve1:"+virtualReserve1);
		console.log("actualBalances1:"+actualBalances1);
		console.log("_reserve1      :"+reserves._reserve1);
		console.log("tradeAmount    :"+tradeAmount);
		console.log("expectedOutput :"+expectedOutput);

		var balanceBefore = await contracts.token1.balanceOf(user1.address);
		await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

		// Swap fails if you ask for too much
		await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

		// Swap succeeds
		await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
		var balanceAfter = await contracts.token1.balanceOf(user1.address);
		var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
		expect(balanceDiff.toString()).to.equal(expectedOutput.toString());

		range = range/BigInt(2);
	});

	it("Concentrated liquidity", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var range = PRECISION;
		for (var i=0;i<20;i++) {
			var contracts = await setupContracts(PRECISION,range,30);

			// Add initial liquidity
			await contracts.token0.transfer(contracts.rangePair.address,"200000000000000000000");
			await contracts.token1.transfer(contracts.rangePair.address,"200000000000000000000");
			await contracts.rangePair.mint(owner.address);

			var tradeAmount = BigInt("100000000000000000000");
			var reserves = await contracts.rangePair.getReserves();
			var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
			var virtualReserve0 = await contracts.rangePair.virtualReserve0();
			var virtualReserve1 = await contracts.rangePair.virtualReserve1();
			var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
			var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);
			console.log("range         :"+range);
			console.log("expectedOutput:"+expectedOutput);

			var balanceBefore = await contracts.token1.balanceOf(user1.address);
			await contracts.token0.connect(user2).transfer(contracts.rangePair.address,tradeAmount);

			// Swap fails if you ask for too much
			await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

			// Swap succeeds
			await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
			var balanceAfter = await contracts.token1.balanceOf(user1.address);
			var balanceDiff = BigInt(balanceAfter)-BigInt(balanceBefore);
			expect(balanceDiff.toString()).to.equal(expectedOutput.toString());

			range = range/BigInt(2);
		}
	});

	it("virtualReserve donate check", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts(PRECISION,PRECISION/BigInt(2),30);

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.mint(owner.address);
		var donation = BigInt("10000000000");
		var reserves = await contracts.rangePair.getReserves();
		var virtualReserve0 = await contracts.rangePair.virtualReserve0();
		var virtualReserve1 = await contracts.rangePair.virtualReserve1();
		var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address);
		var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address);
		var K = reserves._reserve0*reserves._reserve1;
		var Q0 = K/(virtualReserve0*virtualReserve0);
		var Q1 = K/(virtualReserve1*virtualReserve1);

		console.log("virtualReserve0:"+virtualReserve0);
		console.log("actualBalances0:"+actualBalances0);
		console.log("_reserve0      :"+reserves._reserve0);
		console.log("virtualReserve1:"+virtualReserve1);
		console.log("actualBalances1:"+actualBalances1);
		console.log("_reserve1      :"+reserves._reserve1);
		console.log("K              :"+K);
		console.log("Q0             :"+Q0);
		console.log("Q1             :"+Q1);
		console.log("donation       :"+donation);

		await contracts.token1.connect(user2).transfer(contracts.rangePair.address,donation);

		await contracts.rangePair.sync();

		var reserves_after = await contracts.rangePair.getReserves();
		var virtualReserve0_after = await contracts.rangePair.virtualReserve0();
		var virtualReserve1_after = await contracts.rangePair.virtualReserve1();
		var K_after = reserves_after._reserve0*reserves_after._reserve1;
		var Q0_after = K_after/(virtualReserve0_after*virtualReserve0_after);
		var Q1_after = K_after/(virtualReserve1_after*virtualReserve1_after);
		console.log("virtualReserve0_after:"+virtualReserve0_after);
		console.log("virtualReserve1_after:"+virtualReserve1_after);
		console.log("K_after              :"+K_after);
		console.log("Q0_after             :"+Q0_after);
		console.log("Q1_after             :"+Q1_after);
		//expect(Q0).to.be.closeTo(Q0_after,0.000001);
		expect(Q1).to.be.closeTo(Q1_after,0.000001);
	});


	it("swaps", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		//var amounts = [BigInt("1000000"),BigInt("1000000000"),BigInt("1000000000000"),BigInt("1000000000000000")];
		var amounts = [BigInt("1000000")];
		for (var a=0;a<amounts.length;a++) {
			for (var b=0;b<amounts.length;b++) {
				for (var c=0;c<amounts.length;c++) {
					for (var d=0;d<amounts.length;d++) {
						var contracts = await setupContracts(amounts[c]*PRECISION/amounts[d],amounts[b]*PRECISION/amounts[d],30);
						// Add initial liquidity
						await contracts.token0.transfer(contracts.rangePair.address,amounts[a]);
						await contracts.token1.transfer(contracts.rangePair.address,amounts[b]);
						await contracts.rangePair.mint(owner.address);

						var tradeAmount = amounts[a]/BigInt(1000); //0.1%
						var reserves = await contracts.rangePair.getReserves();
						var expectedOutput = getExpectedOutput(reserves._reserve0,reserves._reserve1,tradeAmount,30);
						var virtualReserve0 = await contracts.rangePair.virtualReserve0();
						var virtualReserve1 = await contracts.rangePair.virtualReserve1();
						var actualBalances0 = await contracts.token0.balanceOf(contracts.rangePair.address)
						var actualBalances1 = await contracts.token1.balanceOf(contracts.rangePair.address)

						if (expectedOutput>0 && expectedOutput+BigInt(1)<=actualBalances1) {
							console.log("a:"+a+" b:"+b+" c:"+c+" d:"+d);
							console.log("virtualReserve0:"+virtualReserve0);
							console.log("actualBalances0:"+actualBalances0);
							console.log("_reserve0      :"+reserves._reserve0);
							console.log("virtualReserve1:"+virtualReserve1);
							console.log("actualBalances1:"+actualBalances1);
							console.log("_reserve1      :"+reserves._reserve1);
							console.log("tradeAmount    :"+tradeAmount);
							console.log("expectedOutput :"+expectedOutput);

							await contracts.token0.connect(user1).transfer(contracts.rangePair.address,tradeAmount);
							// Swap fails if you ask for too much
							await expect(contracts.rangePair.swap(0,expectedOutput+BigInt(1),user1.address,[])).to.be.revertedWith("UniswapV2: K");

							// Swap succeeds
							await contracts.rangePair.swap(0,expectedOutput,user1.address,[]);
							console.log("----------------");
						}
					}
				}
			}
		}
		}).timeout(10000000);
});

async function waitTill(time) {
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var waitPeriod = time-currentblock.timestamp;
	if (waitPeriod>0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
}

async function setupContracts(centerPrice,rangeSize,fee) {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy token0/token1 token and distribute
	const DummyToken = await ethers.getContractFactory("DummyToken");
	var token0 = await DummyToken.deploy();
	var token1 = await DummyToken.deploy();
	if (token1.address.toUpperCase()<token0.address.toUpperCase()) {
		var temp=token1;
		token1=token0;
		token0=temp;
	}
	await token0.mint(owner.address,"1000000000000000000000");
	await token0.mint(user1.address,"1000000000000000000000");
	await token0.mint(user2.address,"1000000000000000000000");
	await token0.mint(user3.address,"1000000000000000000000");
	await token1.mint(owner.address,"1000000000000000000000");
	await token1.mint(user1.address,"1000000000000000000000");
	await token1.mint(user2.address,"1000000000000000000000");
	await token1.mint(user3.address,"1000000000000000000000");

	// Deploy FraxswapRangeFactory
	const FraxswapRangeFactory = await ethers.getContractFactory("FraxswapRangeFactory");
	var factory = await FraxswapRangeFactory.deploy(owner.address);

	// Create FraxswapRangePair
	const FraxswapRangePair = await ethers.getContractFactory("FraxswapRangePair");
	await factory.createPair(token0.address,token1.address,centerPrice,rangeSize,fee);
	var rangePair = FraxswapRangePair.attach(await factory.allPairs(0));

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.rangePair = rangePair;
    result.factory = factory;
    return result;
}

function getExpectedOutput(_reserve0,_reserve1,tradeAmount,fee) {
	return (tradeAmount*BigInt(10000-fee)*BigInt(_reserve1))/(BigInt(_reserve0)*BigInt(10000)+tradeAmount*BigInt(10000-fee));
}

function sqrt(value) {
    if (value < 0n) {
        throw 'square root of negative numbers is not supported'
    }

    if (value < 2n) {
        return value;
    }

    function newtonIteration(n, x0) {
        const x1 = ((n / x0) + x0) >> 1n;
        if (x0 === x1 || x0 === (x1 - 1n)) {
            return x0;
        }
        return newtonIteration(n, x1);
    }

    return newtonIteration(value, 1n);
}