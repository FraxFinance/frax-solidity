const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BAMM! (Normal)", function () {
	var PRECISION = BigInt(1e18);

	it("Setup contracts", async function () {
		var contracts = await setupContracts(9970, 1e18);
	});

	it("Mint", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		var beforeBalance = BigInt(await contracts.pair.balanceOf(owner.address));

		// Mint once
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(1e18));
		expect(await contracts.bamm.balanceOf(owner.address)).to.equals(BigInt(1e18));
		expect(await contracts.pair.balanceOf(owner.address)).to.equals(beforeBalance - BigInt(1e18));

		// Mint again
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(1e18));
		expect(await contracts.bamm.balanceOf(owner.address)).to.equals(BigInt(2e18));
		expect(await contracts.pair.balanceOf(owner.address)).to.equals(beforeBalance - BigInt(2e18));
	});

	it("Redeem", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		var beforeBalance = BigInt(await contracts.pair.balanceOf(owner.address));

		// Mint once, then redeem half
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(2e18));
		await contracts.bamm.redeem(owner.address, BigInt(1e18));
		expect(await contracts.bamm.balanceOf(owner.address)).to.equals(BigInt(1e18));
		expect(await contracts.pair.balanceOf(owner.address)).to.equals(beforeBalance - BigInt(1e18));
		expect(await contracts.pair.balanceOf(contracts.bamm.address)).to.equals(BigInt(1e18));

		// Redeem the other half
		await contracts.bamm.redeem(owner.address, BigInt(1e18));
		expect(await contracts.bamm.balanceOf(owner.address)).to.equals(0);
		expect(await contracts.pair.balanceOf(owner.address)).to.equals(beforeBalance);
		expect(await contracts.pair.balanceOf(contracts.bamm.address)).to.equals(0);
	});

	it("Redeem failure checks", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		var beforeBalance = BigInt(await contracts.pair.balanceOf(owner.address));

		// Mint with the owner, then have a second user with nothing try to redeem (fails)
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(1e18));
		await expect(contracts.bamm.connect(user1).redeem(owner.address, BigInt(1e18))).to.be.revertedWith("ERC20: burn amount exceeds balance");

		// Give the second user 1 LP, they mint BAMM with it successfully, then try to redeem twice the amount (fails)
		await contracts.pair.transfer(user1.address, BigInt(1e18));
		await contracts.pair.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).mint(user1.address, BigInt(1e18));
		await expect(contracts.bamm.connect(user1).redeem(user1.address, BigInt(2e18))).to.be.revertedWith("ERC20: burn amount exceeds balance");

		// Check that the BAMM has the correct amount of LP, then have both users redeem.
		// Afterwards, the BAMM should have no LP
		expect(await contracts.pair.balanceOf(contracts.bamm.address)).to.equals(BigInt(2e18));
		await contracts.bamm.connect(user1).redeem(user1.address, BigInt(1e18));
		await contracts.bamm.connect(owner).redeem(owner.address, BigInt(1e18));
		expect(await contracts.pair.balanceOf(contracts.bamm.address)).to.equals(0);
	});

	it("Deposit", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// User deposts 1 token0 to the BAMM
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		expect(await contracts.token0.balanceOf(contracts.bamm.address)).to.equals(BigInt(0));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18) 
			})
		);
		expect(await contracts.token0.balanceOf(contracts.bamm.address)).to.equals(BigInt(1e18));

		// Make sure the user's vault was correctly updated for token0
		var vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(1e18));
		expect(vault.token1).to.equals(BigInt(0));
		expect(vault.rented).to.equals(BigInt(0));

		// User deposts 1 token1 to the BAMM
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		expect(await contracts.token1.balanceOf(contracts.bamm.address)).to.equals(BigInt(0));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(1e18) 
			})
		);
		expect(await contracts.token1.balanceOf(contracts.bamm.address)).to.equals(BigInt(1e18));

		// Make sure the user's vault was correctly updated for token1
		vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(1e18));
		expect(vault.token1).to.equals(BigInt(1e18));
		expect(vault.rented).to.equals(BigInt(0));
	});

	it("Withdraw", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		var beforeBalance0 = BigInt(await contracts.token0.balanceOf(user1.address));
		var beforeBalance1 = BigInt(await contracts.token1.balanceOf(user1.address));

		// User deposits 1 token0 and 1 token1 to their vault
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18) 
			})
		);
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(1e18) 
			})
		);

		// Make sure the user's vault was correctly updated for the two tokens
		var vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(1e18));
		expect(vault.token1).to.equals(BigInt(1e18));
		expect(vault.rented).to.equals(BigInt(0));

		// User withdraws token0 from their vault
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-1e18) 
			})
		);
		expect(await contracts.token0.balanceOf(contracts.bamm.address)).to.equals(BigInt(0));
		expect(await contracts.token0.balanceOf(user1.address)).to.equals(beforeBalance0);
		vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(0));
		expect(vault.token1).to.equals(BigInt(1e18));
		expect(vault.rented).to.equals(BigInt(0));

		// User withdraws token1 from their vault
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(-1e18) 
			})
		);
		expect(await contracts.token1.balanceOf(contracts.bamm.address)).to.equals(BigInt(0));
		expect(await contracts.token1.balanceOf(user1.address)).to.equals(beforeBalance1);
		vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(0));
		expect(vault.token1).to.equals(BigInt(0));
		expect(vault.rented).to.equals(BigInt(0));
	});

	it("Withdraw failure checks", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		var beforeBalance0 = BigInt(await contracts.token0.balanceOf(user1.address));
		var beforeBalance1 = BigInt(await contracts.token1.balanceOf(user1.address));

		// User deposits 1 token0 and 1 token1 to their vault
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18) 
			})
		);
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(1e18) 
			})
		);

		// User tries (and fails) to withdraw more tokens than they have in their vault
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-2e18) 
			})
		)).to.be.revertedWith("ERC20: transfer amount exceeds balance");
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(-2e18) 
			})
		)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

		// Owner (NOT the user before) deposits both tokens to his vault
		await contracts.token0.connect(owner).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(owner).executeActions(
			createAction({ 
				token0Amount: BigInt(10e18) 
			})
		);
		await contracts.token1.connect(owner).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(owner).executeActions(
			createAction({ 
				token1Amount: BigInt(10e18) 
			})
		);

		// Original user should not be able to withdraw more tokens just because OWNER made a deposit
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-2e18) 
			})
		)).to.be.revertedWith("Negative positions not allowed");
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(-2e18) 
			})
		)).to.be.revertedWith("Negative positions not allowed");

		// User successfully removes both of their tokens from his vault
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-1e18), 
				token1Amount: BigInt(-1e18) 
			})
		);
	});

	it("Rent", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User (not Owner) deposits token0 as collateral, then rents 1 unit
		// Since the pair is 1-to-1 and rentMultiplier is still 1: rent = sqrt(tk0 * tk1) -> 1 of each token
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18) 
			})
		);
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				rent: BigInt(1e18) 
			})
		);
		expect(await contracts.token0.balanceOf(contracts.bamm.address)).to.equals(BigInt(2e18));
		expect(await contracts.token1.balanceOf(contracts.bamm.address)).to.equals(BigInt(1e18));
		var vault = await contracts.bamm.userVaults(user1.address);
		expect(vault.token0).to.equals(BigInt(2e18));
		expect(vault.token1).to.equals(BigInt(1e18));
		expect(vault.rented).to.equals(BigInt(1e18));

		// User rents another 1 unit. rentMultiplier is no longer 1 (tiny amount of interest)
		// so it will only be approximately 1 token each now instead of exactly 1-to-1
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				rent: BigInt(1e18) 
			})
		);
		vault = await contracts.bamm.userVaults(user1.address);
		expect(Number(BigInt(vault.token0) - BigInt(3e18))).to.be.closeTo(0, 1e12);
		expect(Number(BigInt(vault.token1) - BigInt(2e18))).to.be.closeTo(0, 1e12);
		expect(vault.rented).to.equals(BigInt(2e18));
	});

	it("Rent failure checks", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User deposits some tokens as collateral, but then tries (and fails) to rent
		// over the max utility for the pair
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18),
				token1Amount: BigInt(1e18) 
			})
		);
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				rent: BigInt(91e17) // Max utility is (10 LP (from owner's mint)) * 90% = 9
			})
		)).to.be.revertedWith("MAX_UTILITY_RATE");

		// User rents near the max utility, but still under it
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				rent: BigInt(9e18) 
			})
		);

		// User tries to pull out rented tokens, but fails as that would leave him insolvent
		await expect(contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-8164e14),
				token1Amount: BigInt(-8164e14) 
			})
		)).to.be.revertedWith("Not solvent");

		// User successfully pulls out fewer rented tokens then he originally wanted
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(-8163e14),
				token1Amount: BigInt(-8163e14) 
			})
		);
	});

	it("Return rented LP tokens with interest", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Set User2 as owner to get the protocol FEE_SHARE
		await contracts.bamm.nominateNewOwner(user2.address);
		await contracts.bamm.connect(user2).acceptOwnership();

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		var lpTokensStart = BigInt(await contracts.pair.balanceOf(owner.address));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User1 deposits some tokens and also rents, in the same transaction
		// User1 keeps the rented tokens in the vault and doesn't do anything with them
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18),
				token1Amount: BigInt(1e18),
				rent: BigInt(1e18) 
			})
		);

		// Wait some time to accrue interest. Sync in the middle to avoid a gas limit
		wait(60 * 60 * 24 * 200);
		await contracts.pair.sync();
		wait(60 * 60 * 24 * 165);

		// User1 repays the rent with tokens from his vault
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				rent: BigInt(-1e18) 
			})
		);

		// User1 should have fewer tokens than he started with because he had to pay interest
		var vault = await contracts.bamm.userVaults(user1.address);
		var expectedTokens = BigInt(2e18) - (BigInt(101e16) + (BigInt(9e16) / BigInt(7)));
		var paidInterest = BigInt(1e18) - BigInt(vault.token0);
		expect(Number(expectedTokens - BigInt(vault.token0))).to.be.closeTo(0, 1e12);
		expect(Number(expectedTokens - BigInt(vault.token1))).to.be.closeTo(0, 1e12);
		expect(vault.rented).to.equals(BigInt(0));

		// User2 redeems the BAMM they recieved as fees and gets LP back
		await contracts.bamm.connect(user2).redeem(user2.address, await contracts.bamm.balanceOf(user2.address));
		var fee = BigInt(await contracts.pair.balanceOf(user2.address));

		// When Owner redeems his BAMM tokens, he should get more LP back than he put in because of interest
		await contracts.bamm.redeem(owner.address, BigInt(10e18));
		var lpTokensEnd = BigInt(await contracts.pair.balanceOf(owner.address));
		var earned = lpTokensEnd - lpTokensStart;
		expect(paidInterest).to.equals(earned + fee);
		expect(Number(fee - (paidInterest / BigInt(10)))).to.be.closeTo(0, 1e12);
	});

	it("One call borrow", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User1 deposits some token0, rents, then pulls out token1. All in a single transaction
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18),
				rent: BigInt(1e18),
				token1Amount: BigInt(-4e17) 
			})
		);
		wait(60 * 60 * 24);
	});

	it("One call close", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		
		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User1 deposits some token0, rents, then pulls out token1. All in a single transaction
		await contracts.token0.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token0Amount: BigInt(1e18),
				rent: BigInt(1e18),
				token1Amount: BigInt(-4e17) 
			})
		);

		// Wait some time and accrue interest
		wait(60 * 60 * 24);

		// User1 closes out their position. 
		// token1 is pre-approved to be pulled in to make up for any deficiencies
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				closePosition: true
			})
		);
	});

	it("Swap", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User1 deposits some token1 and then rents, in a single transaction
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.connect(user1).executeActions(
			createAction({ 
				token1Amount: BigInt(1e18),
				rent: BigInt(1e18) 
			})
		);

		// User1 swaps some token0 in their vault for some more token1
		var swapParams = createSwapParams({
			tokenIn: contracts.token0.address,
			amountIn: BigInt(45e16),
			tokenOut: contracts.token1.address,
			amountOutMinimum: BigInt(45e16) 
		});
	   	await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({}), 
			swapParams
		);
	});

	it("One call leverage", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);

		// Owner provides LP to the BAMM and gets BAMM tokens back.
		// BAMM now has some liquidity
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));

		// User1 deposits some token1, rents, and swaps token0 for token1. In a single transaction
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		var swapParams = createSwapParams({
			tokenIn: contracts.token0.address,
			amountIn: BigInt(45e16),
			tokenOut: contracts.token1.address,
			amountOutMinimum: BigInt(45e16) 
		});
		await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({ 
				token1Amount: BigInt(1e18),
				rent: BigInt(1e18) 
			}),
			swapParams
		);
	});

	it("One call deleverage", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(10e18));
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		var swapParams1 = createSwapParams({
			tokenIn: contracts.token0.address,
			amountIn: BigInt(45e16),
			tokenOut: contracts.token1.address,
			amountOutMinimum: BigInt(45e16) 
		});
		await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({ 
				token1Amount: BigInt(1e18),
				rent:BigInt(1e18) 
			}),
			swapParams1
		);
		var swapParams2 = createSwapParams({
			tokenIn:contracts.token1.address,
			amountIn:BigInt(44e16),
			tokenOut:contracts.token0.address,
			amountOutMinimum:BigInt(46e16) 
		});
		await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({
				closePosition:true
			}),
			swapParams2
		);
	});

	it("Liquidate", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9970, 100e18);
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(1e18));
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		var swapParams = createSwapParams({
			tokenIn: contracts.token0.address,
			amountIn: BigInt(49e16),
			tokenOut: contracts.token1.address,
			amountOutMinimum: BigInt(49e16) 
		});
		await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({ 
				token1Amount: BigInt(1e18),
				rent: BigInt(90e16) 
			}),
			swapParams
		);
		await simulateSwaps(contracts, 1, 1e10, 60); // Do a swap and wait, because the oracle needs at least one price
		wait(30 * 60);
		await expect(contracts.bamm.connect(user2).liquidate(user1.address)).to.be.revertedWith("User solvent");
		wait(6 * 60 * 60 * 24);
		await contracts.bamm.connect(user2).liquidate(user1.address);
	});

	it("Liquidate ammPriceCheck", async function () {
		const [owner, user1, user2, user3, user4] = await ethers.getSigners();
		var contracts = await setupContracts(9999, 100e18);
		await contracts.pair.approve(contracts.bamm.address, BigInt(100e18));
		await contracts.bamm.mint(owner.address, BigInt(1e18));
		await contracts.token1.connect(user1).approve(contracts.bamm.address, BigInt(100e18));
		var swapParams = createSwapParams({
			tokenIn: contracts.token0.address,
			amountIn: BigInt(49e16),
			tokenOut: contracts.token1.address,
			amountOutMinimum: BigInt(49e16) 
		});
		await contracts.bamm.connect(user1).executeActionsAndSwap(
			createAction({ 
				token1Amount: BigInt(1e18),
				rent: BigInt(90e16) 
			}),
			swapParams
		);
		await simulateSwaps(contracts, 1, 1e10, 60); // Do a swap and wait, because the oracle needs at least one price
		wait(30 * 60);
		await expect(contracts.bamm.connect(user2).liquidate(user1.address)).to.be.revertedWith("User solvent");

		wait(6 * 60 * 60 * 24);
		await simulateSwaps(contracts, 25, 1e18,60);
		await simulateSwaps(contracts, 25, -1e18,60);
		await expect(contracts.bamm.connect(user2).liquidate(user1.address)).to.be.revertedWith("ammPriceCheck"); // Oracle price differs too much
		wait(30 * 60);
		await contracts.bamm.connect(user2).liquidate(user1.address); // Liquidation now works
	});
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

async function simulateSwaps(contracts, no, amount, waitPeriod) {
	const [owner, user1, user2, user3, user4] = await ethers.getSigners();
	for (var i = 0; i < no; i++) {
		wait(waitPeriod);
		await swap(contracts,owner, BigInt(amount));
	}
}

async function swap(contracts, user, swapAmount) {
	if (swapAmount > 0) {
		var amount1Out = BigInt(await contracts.pair.getAmountOut(swapAmount, contracts.token0.address));
		//console.log("amount1Out: " + amount1Out);
		await contracts.token0.connect(user).transfer(contracts.pair.address, swapAmount);
		await contracts.pair.swap(0, amount1Out, user.address, []);
	} else if (swapAmount < 0) {
		var amount0Out = BigInt(await contracts.pair.getAmountOut(-swapAmount, contracts.token1.address));
		//console.log("amount0Out: " + amount0Out);
		await contracts.token1.connect(user).transfer(contracts.pair.address, -swapAmount);
		await contracts.pair.swap(amount0Out, 0, user.address, []);
	}
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

async function setupContracts(fee, mintAmount) {
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
