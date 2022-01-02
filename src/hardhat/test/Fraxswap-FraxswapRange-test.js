const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FraxswapRange AMM", function () {
	/*it("setupContracts", async function () {
		var contracts = await setupContracts();
	});*/

	it("initialMint", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.initialMint("100000000000000000000","100000000000000000000",owner.address);
		expect(await contracts.token0.balanceOf(contracts.rangePair.address)).to.equal("100000000000000000000");
		expect(await contracts.token1.balanceOf(contracts.rangePair.address)).to.equal("100000000000000000000");
		expect(await contracts.rangePair.balanceOf(owner.address)).to.equal(BigInt("200000000000000000000")-BigInt(1000));
	});

	it("mint", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.initialMint("100000000000000000000","100000000000000000000",owner.address);

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
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.token1.transfer(contracts.rangePair.address,"100000000000000000000");
		await contracts.rangePair.initialMint("100000000000000000000","100000000000000000000",owner.address);

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

	it("swap 1", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,BigInt("1000000"));
		await contracts.token1.transfer(contracts.rangePair.address,BigInt("1000000"));
		await contracts.rangePair.initialMint("1000000000000","1000000000000",owner.address);

		var tradeAmount = BigInt("1000");
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = (tradeAmount*BigInt(997)*BigInt(reserves._reserve1))/(BigInt(reserves._reserve0)*BigInt(1000)+tradeAmount*BigInt(997));
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

	it("swap 2", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,BigInt("1000000"));
		await contracts.token1.transfer(contracts.rangePair.address,BigInt("1000000"));
		await contracts.rangePair.initialMint("1000000000000","1000000000000",owner.address);

		var tradeAmount = BigInt("1000");
		var reserves = await contracts.rangePair.getReserves();
		var expectedOutput = (tradeAmount*BigInt(997)*BigInt(reserves._reserve0))/(BigInt(reserves._reserve1)*BigInt(1000)+tradeAmount*BigInt(997));
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

	it("virtualReserve donate check", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add initial liquidity
		await contracts.token0.transfer(contracts.rangePair.address,BigInt("100000000"));
		await contracts.token1.transfer(contracts.rangePair.address,BigInt("100000000"));
		await contracts.rangePair.initialMint("2000000000000","1000000000000",owner.address);
		var donation = BigInt("100000000");
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
		var amounts = [BigInt("1000000"),BigInt("1000000000"),BigInt("1000000000000"),BigInt("1000000000000000")];
		for (var a=0;a<amounts.length;a++) {
			for (var b=0;b<amounts.length;b++) {
				for (var c=0;c<amounts.length;c++) {
					for (var d=0;d<amounts.length;d++) {
						var contracts = await setupContracts();
						// Add initial liquidity
						await contracts.token0.transfer(contracts.rangePair.address,amounts[a]);
						await contracts.token1.transfer(contracts.rangePair.address,amounts[b]);
						await contracts.rangePair.initialMint(amounts[c],amounts[d],owner.address);

						var tradeAmount = amounts[a]/BigInt(1000); //0.1%
						var reserves = await contracts.rangePair.getReserves();
						var expectedOutput = (tradeAmount*BigInt(997)*BigInt(reserves._reserve1))/(BigInt(reserves._reserve0)*BigInt(1000)+tradeAmount*BigInt(997));
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

async function setupContracts() {
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
	await factory.createPair(token0.address,token1.address);
	var rangePair = FraxswapRangePair.attach(await factory.allPairs(0));

	// Pack contracts in an object
	var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.rangePair = rangePair;
    result.factory = factory;
    return result;
}





