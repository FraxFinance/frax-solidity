const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FPI PermissionedSend", function () {
	it("setupContracts", async function () {
		var contracts = await setupContracts();
	});

	it("setOperator", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();
		// Only owner can update the operator
		await expect(contracts.permissionedSend.connect(user3).setOperator(user1.address)).to.be.revertedWith("Ownable: caller is not the owner");

		// update operator
		await contracts.permissionedSend.connect(owner).setOperator(user1.address);

		// check result
		expect(await contracts.permissionedSend.operator()).to.be.equal(user1.address);
	});

	it("addTarget", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();
		// Only owner can add target
		await expect(contracts.permissionedSend.connect(user3).addTarget(user2.address,contracts.fpiToken.address)).to.be.revertedWith("Ownable: caller is not the owner");

		// Check if not set before
		expect(await contracts.permissionedSend.sendAllowed(user2.address,contracts.fpiToken.address)).to.be.equal(false);

		// Add target
		await contracts.permissionedSend.connect(owner).addTarget(user2.address,contracts.fpiToken.address);

		// Check if set
		expect(await contracts.permissionedSend.sendAllowed(user2.address,contracts.fpiToken.address)).to.be.equal(true);

	});

	it("removeTarget", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add target
		await contracts.permissionedSend.connect(owner).addTarget(user2.address,contracts.fpiToken.address);

		// Check if set
		expect(await contracts.permissionedSend.sendAllowed(user2.address,contracts.fpiToken.address)).to.be.equal(true);

		// Only owner can remove target
		await expect(contracts.permissionedSend.connect(user3).removeTarget(user2.address,contracts.fpiToken.address)).to.be.revertedWith("Ownable: caller is not the owner");

		// Remove target
		await contracts.permissionedSend.connect(owner).removeTarget(user2.address,contracts.fpiToken.address);

		// Check if set
		expect(await contracts.permissionedSend.sendAllowed(user2.address,contracts.fpiToken.address)).to.be.equal(false);

	});

	it("sendERC20", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		// Add target
		await contracts.permissionedSend.connect(owner).addTarget(user2.address,contracts.fpiToken.address);

		// Check if set
		expect(await contracts.permissionedSend.sendAllowed(user2.address,contracts.fpiToken.address)).to.be.equal(true);

		// update operator
		await contracts.permissionedSend.connect(owner).setOperator(user1.address);

		// Only operator can send ERC20
		await expect(contracts.permissionedSend.connect(user3).sendERC20(user2.address,contracts.fpiToken.address,1000000)).to.be.revertedWith("PermissionedSend:Caller is not the operator");

		// Can only send approved token
		await expect(contracts.permissionedSend.connect(user1).sendERC20(user2.address,contracts.fraxToken.address,1000000)).to.be.revertedWith("Send not allowed");

		expect(await contracts.fpiToken.balanceOf(user2.address)).to.be.equal(0);

		// Send ERC20
		await contracts.permissionedSend.connect(user1).sendERC20(user2.address,contracts.fpiToken.address,1000000);

		// Check if tokens arrived
		expect(await contracts.fpiToken.balanceOf(user2.address)).to.be.equal(1000000);

	});

	it("sendETH", async function () {
		const [owner,user1,user2,user3] = await ethers.getSigners();
		var contracts = await setupContracts();

		const zeroAddress = "0x0000000000000000000000000000000000000000";

		// Add target
		await contracts.permissionedSend.connect(owner).addTarget(user2.address,zeroAddress);

		// Check if set
		expect(await contracts.permissionedSend.sendAllowed(user2.address,zeroAddress)).to.be.equal(true);

		// update operator
		await contracts.permissionedSend.connect(owner).setOperator(user1.address);

		// Only operator can send ETH
		await expect(contracts.permissionedSend.connect(user3).sendETH(user2.address,1000000)).to.be.revertedWith("PermissionedSend:Caller is not the operator");

		const balanceBefore = BigInt(await ethers.provider.getBalance(user2.address));

		// Send ERC20
		await contracts.permissionedSend.connect(user1).sendETH(user2.address,1000000);

		const balanceAfter = BigInt(await ethers.provider.getBalance(user2.address));

		// Check if ETH arrived
		expect(balanceAfter-balanceBefore).to.be.equal(BigInt(1000000));

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

async function setupContracts() {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy FPI token
	const FPI = await ethers.getContractFactory("FPI");
	var fpiToken = await FPI.deploy();
	// Deploy FRAX token
	var fraxToken = await FPI.deploy(); // usd FPI contract as dummy


	// Deploy PermissionedSend
	const PermissionedSend = await ethers.getContractFactory("PermissionedSend");
	var permissionedSend = await PermissionedSend.deploy();

	await fpiToken.mint(permissionedSend.address,"1000000000000000000000");

	const tx = await owner.sendTransaction({ to: permissionedSend.address, value: ethers.utils.parseEther("1.0")});

	// Pack contracts in an object
	var result = {};
    result.fpiToken = fpiToken;
    result.fraxToken = fraxToken;
    result.permissionedSend = permissionedSend;
    return result;
}





