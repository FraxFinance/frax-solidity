const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FPI", function () {
	it("setupTWAMMSwapContracts", async function () {
		var contracts = await setupTWAMMSwapContracts();
	});

	it("add liquidity", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupTWAMMSwapContracts();

		// Add initial liquidity
		await contracts.fraxToken.approve(contracts.twammSwap.address,"200000000000000000000");
		await contracts.sFPIToken.approve(contracts.twammSwap.address,"100000000000000000000");
		await contracts.twammSwap.addLiquidity("200000000000000000000","100000000000000000000","100000000000000000000","100000000000000000000");
		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("200000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("100000000000000000000");
	});

	it("user trade", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupTWAMMSwapContracts();

		// Add initial liquidity
		await contracts.fraxToken.approve(contracts.twammSwap.address,"200000000000000000000");
		await contracts.sFPIToken.approve(contracts.twammSwap.address,"100000000000000000000");
		await contracts.twammSwap.addLiquidity("200000000000000000000","100000000000000000000","100000000000000000000","100000000000000000000");

		// User Trade
		await contracts.fraxToken.connect(user1).approve(contracts.twammSwap.address,"1000000000000000000");
		await contracts.twammSwap.connect(user1).swapExactTokensForTokens("1000000000000000000", "495000000000000000", contracts.fraxToken.address, contracts.sFPIToken.address, user1.address, 0);

		expect(await contracts.fraxToken.balanceOf(user1.address)).to.equal("999000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(user1.address)).to.equal("1000496027303890107812");

		// Trade back
		await contracts.sFPIToken.connect(user2).approve(contracts.twammSwap.address,"1000000000000000000");
		await contracts.twammSwap.connect(user2).swapExactTokensForTokens("1000000000000000000", "1980000000000000000", contracts.sFPIToken.address, contracts.fraxToken.address, user2.address, 0);

		expect(await contracts.fraxToken.balanceOf(user2.address)).to.equal("1001993980701121679789");
		expect(await contracts.sFPIToken.balanceOf(user2.address)).to.equal("999000000000000000000");

		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("199006019298878320211");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("100503972696109892188");

		var reserves = await contracts.twammSwap.getReserves();
		expect(reserves._reserve0).to.equal("199006019298878320211");
		expect(reserves._reserve1).to.equal("100503972696109892188");
	});

	it("twamm trade", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupTWAMMSwapContracts();

		// Add initial liquidity
		await contracts.fraxToken.approve(contracts.twammSwap.address,"200000000000000000000");
		await contracts.sFPIToken.approve(contracts.twammSwap.address,"100000000000000000000");
		await contracts.twammSwap.addLiquidity("200000000000000000000","100000000000000000000","100000000000000000000","100000000000000000000");

		// setTWAMMTrade
		var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
		var buyEndTime = currentblock.timestamp+1000;
		await contracts.twammSwap.setTWAMMTrade(0,0,"1000000000000000",buyEndTime); // buy sFPI

		await waitTill(buyEndTime);

		await contracts.twammSwap.sync();

		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("200000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("100000000000000000000");

		expect(await contracts.fraxToken.balanceOf(owner.address)).to.equal("800000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("900000000000000000000");

		// execute TWAMM trade

		await contracts.fraxToken.approve(contracts.twammSwap.address,"2030000000000000000");
		await contracts.twammSwap.executeTWAMMSwap();

		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("202024234135118155347");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("99001000000000000000");

		expect(await contracts.fraxToken.balanceOf(owner.address)).to.equal("797975765864881844653");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("900999000000000000000");

	});

	it("twamm + user trade", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupTWAMMSwapContracts();

		// Add initial liquidity
		await contracts.fraxToken.approve(contracts.twammSwap.address,"200000000000000000000");
		await contracts.sFPIToken.approve(contracts.twammSwap.address,"100000000000000000000");
		await contracts.twammSwap.addLiquidity("200000000000000000000","100000000000000000000","100000000000000000000","100000000000000000000");

		// setTWAMMTrade
		var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
		var buyEndTime = currentblock.timestamp+1000;
		var halfWayTime = currentblock.timestamp+500;
		await contracts.twammSwap.setTWAMMTrade(0,0,"1000000000000000",buyEndTime); // buy sFPI

		await waitTill(halfWayTime);

		// Do user Trade
		await contracts.fraxToken.connect(user1).approve(contracts.twammSwap.address,"1000000000000000000");
		await contracts.twammSwap.connect(user1).swapExactTokensForTokens("1000000000000000000", "485000000000000000", contracts.fraxToken.address, contracts.sFPIToken.address, user1.address, 0);

		await waitTill(buyEndTime);

		await contracts.twammSwap.sync();

		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("201000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("99508925602022015642");

		expect(await contracts.fraxToken.balanceOf(owner.address)).to.equal("800000000000000000000");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("900000000000000000000");

		// execute TWAMM trade
		await contracts.fraxToken.approve(contracts.twammSwap.address,"2040000000000000000");
		await contracts.twammSwap.executeTWAMMSwap();

		expect(await contracts.fraxToken.balanceOf(contracts.twammSwap.address)).to.equal("203034375645353236362");
		expect(await contracts.sFPIToken.balanceOf(contracts.twammSwap.address)).to.equal("98509925602022015642");

		expect(await contracts.fraxToken.balanceOf(owner.address)).to.equal("797965624354646763638");
		expect(await contracts.sFPIToken.balanceOf(owner.address)).to.equal("900999000000000000000");

	});

});

async function waitTill(time) {
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var waitPeriod = time-currentblock.timestamp;
	if (waitPeriod>0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
}

async function setupTWAMMSwapContracts() {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy FPI token and distribute
	const FPI = await ethers.getContractFactory("FPI");
	var sFPIToken = await FPI.deploy(); // usd FPI contract as dummy
	await sFPIToken.mint(owner.address,"1000000000000000000000");
	await sFPIToken.mint(user1.address,"1000000000000000000000");
	await sFPIToken.mint(user2.address,"1000000000000000000000");
	await sFPIToken.mint(user3.address,"1000000000000000000000");

	// Deploy FRAX token and distribute
	var fraxToken = await FPI.deploy(); // usd FPI contract as dummy
	await fraxToken.mint(owner.address,"1000000000000000000000");
	await fraxToken.mint(user1.address,"1000000000000000000000");
	await fraxToken.mint(user2.address,"1000000000000000000000");
	await fraxToken.mint(user3.address,"1000000000000000000000");

	// Deploy TWAPPSwap
	const TWAMMSwap = await ethers.getContractFactory("TWAMMSwap");
	var twammSwap = await TWAMMSwap.deploy(fraxToken.address,sFPIToken.address);

	// Pack contracts in an object
	var result = {};
    result.sFPIToken = sFPIToken;
    result.fraxToken = fraxToken;
    result.twammSwap = twammSwap;
    return result;
}





