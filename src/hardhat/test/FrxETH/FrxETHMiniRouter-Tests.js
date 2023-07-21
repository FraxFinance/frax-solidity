/*
** Run test while genache is running on localhost: npx hardhat --network localhost test test/Fraxoracle-test.js
*/

const { expect } = require("chai");
const { ethers } = require("hardhat");
const { BigNumber } = require("@ethersproject/bignumber");

describe("FrxETHMiniRouter-Tests", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("ETH -> frxETH", async function () {
		const [owner] = await ethers.getSigners();
		const provider = ethers.provider;
		const { mini_router, frxeth, sfrxeth } = await setupContracts();
		
		// Get ETH, frxETH, and sfrxETH balances before
		const eth_before = BigNumber.from(await provider.getBalance(owner.address));
		const frxeth_before = BigNumber.from(await frxeth.balanceOf(owner.address));
		const sfrxeth_before = BigNumber.from(await sfrxeth.balanceOf(owner.address));

		// Get some frxETH
		const params = [
			owner.address,
			false,
			0,
			{ value: ethers.utils.parseEther("0.1") }
		];

		const expected_out = await mini_router.connect(owner).callStatic.sendETH(...params);
		await mini_router.connect(owner).sendETH(...params);

		// Get ETH, frxETH, and sfrxETH balances after
		const eth_after = BigNumber.from(await provider.getBalance(owner.address));
		const frxeth_after = BigNumber.from(await frxeth.balanceOf(owner.address));
		const sfrxeth_after = BigNumber.from(await sfrxeth.balanceOf(owner.address));

		// Calculate changes
		const eth_delta = eth_before.sub(eth_after);
		const frxeth_delta = frxeth_after.sub(frxeth_before);
		const sfrxeth_delta = sfrxeth_after.sub(sfrxeth_before);

		// Print deltas
		console.log("ETH Used: ", eth_delta.toString()); // Will have gas too
		console.log("frxETH Generated: ", frxeth_delta.toString());
		console.log("sfrxETH Generated: ", sfrxeth_delta.toString());

		// Do checks
		expect(frxeth_delta).to.be.closeTo(ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.005"));
		expect(sfrxeth_delta).to.be.equal(BigNumber.from(0));
	});

	it("ETH -> sfrxETH", async function () {
		const [owner] = await ethers.getSigners();
		const provider = ethers.provider;
		const { mini_router, frxeth, sfrxeth } = await setupContracts();
		
		// Get ETH, frxETH, and sfrxETH balances before
		const eth_before = BigNumber.from(await provider.getBalance(owner.address));
		const sfrxeth_before = BigNumber.from(await sfrxeth.balanceOf(owner.address));

		// Get some sfrxETH
		const params = [
			owner.address,
			true,
			0,
			{ value: ethers.utils.parseEther("0.1") }
		];

		const expected_out = await mini_router.connect(owner).callStatic.sendETH(...params);
		await mini_router.connect(owner).sendETH(...params);

		// Get ETH, frxETH, and sfrxETH balances after
		const eth_after = BigNumber.from(await provider.getBalance(owner.address));
		const sfrxeth_after = BigNumber.from(await sfrxeth.balanceOf(owner.address));

		// Calculate changes
		const eth_delta = eth_before.sub(eth_after);
		const frxeth_delta = expected_out.frxeth_used;
		const sfrxeth_delta = sfrxeth_after.sub(sfrxeth_before);

		// Print deltas
		console.log("ETH Used: ", eth_delta.toString()); // Will have gas too
		console.log("frxETH Used: ", frxeth_delta.toString());
		console.log("sfrxETH Generated: ", sfrxeth_delta.toString());

		// Do checks
		expect(frxeth_delta).to.be.closeTo(ethers.utils.parseEther("0.1"), ethers.utils.parseEther("0.005"));
		expect(sfrxeth_delta.gt("0"));

		// Do checks
		console.log("ETH Used: ", eth_before.sub(eth_after).toString()); // Will have gas too
	});


});


async function setupContracts() {
	const [owner,user1,user2,user3,user4] = await ethers.getSigners();

	const ERC20 = await ethers.getContractFactory("contracts/ERC20/ERC20.sol:ERC20");
	const frxeth = await ERC20.attach("0x5E8422345238F34275888049021821E8E08CAa1f");
	const sfrxeth = await ERC20.attach("0xac3E018457B222d93114458476f3E3416Abbe38F");

	const FrxETHMiniRouter = await ethers.getContractFactory("FrxETHMiniRouter");
	const mini_router = await FrxETHMiniRouter.deploy();

	// Pack contracts in an object
	var result = {
		mini_router,
		frxeth,
		sfrxeth
	};

	return result;
}
