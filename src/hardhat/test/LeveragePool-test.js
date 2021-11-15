const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LeveragePool", function () {
  it("Deploy LeveragePool", async function () {
	var leveragePool = await setupLeveragePool();
  });
  it("setEpochPeriods", async function () {
	var leveragePool = await setupLeveragePool();
    await leveragePool.setEpochPeriods(60*60,6*60);
    await expect(await leveragePool.epochPeriod()).to.equal(60*60);
    await expect(await leveragePool.waitPeriod()).to.equal(6*60);
  });
  it("setFees", async function () {
    var leveragePool = await setupLeveragePool();
    await expect(leveragePool.setFees("1000000000000000","400000000000000000","700000000000000000")).to.be.reverted; // 0.1%,40%,70% --> Fees do not sum
    await expect(leveragePool.setFees("-1000000000000000","300000000000000000","700000000000000000")).to.be.reverted; // -0.1%,30%,70% --> No negatives
    await expect(leveragePool.setFees("1000000000000000","-300000000000000000","700000000000000000")).to.be.reverted; // 0.1%,-30%,70% --> No negatives
    await expect(leveragePool.setFees("1000000000000000","300000000000000000","-700000000000000000")).to.be.reverted; // 0.1%,30%,-70% --> No negatives
    await leveragePool.setFees("20000000000000000","300000000000000000","700000000000000000"); // 2%,30%,70%
    await expect(leveragePool.setFees("20000000000000001","300000000000000000","700000000000000000")).to.be.reverted; // 2.0000000000000001%,30%,70% --> Fee to high
    await leveragePool.setFees("1000000000000000","300000000000000000","700000000000000000"); // 0.1%,30%,70%
	await expect(await leveragePool.TRANSACTION_FEE()).to.equal("1000000000000000");
	await expect(await leveragePool.ADMIN_FEES()).to.equal("300000000000000000");
    await expect(await leveragePool.LIQUIDITYPOOL_FEES()).to.equal("700000000000000000");
  });

  it("setChangeCap", async function () {
      var leveragePool = await setupLeveragePool();
      await expect(await leveragePool.CHANGE_CAP()).to.equal("50000000000000000");
      await leveragePool.setChangeCap("60000000000000000"); // 6%
      await expect(await leveragePool.CHANGE_CAP()).to.equal("60000000000000000");
  });

  it("setOracle", async function () {
	var leveragePool = await setupLeveragePool()
	const TestOracle = await ethers.getContractFactory("TestOracle");
	var newOracle = await TestOracle.deploy();
	await expect(await leveragePool.oracle()).to.not.equal(newOracle.address);
	await leveragePool.setOracle(newOracle.address);
	await expect(await leveragePool.oracle()).to.equal(newOracle.address);
  });

  it("setFundingRateModel", async function () {
  	var leveragePool = await setupLeveragePool();
  	const BaseInterestRateModel = await ethers.getContractFactory("BaseInterestRateModel");
	var newFundingRateModel = await BaseInterestRateModel.deploy();
  	await expect(await leveragePool.fundingRateModel()).to.not.equal(newFundingRateModel.address);
  	await leveragePool.setFundingRateModel(newFundingRateModel.address);
  	await expect(await leveragePool.fundingRateModel()).to.equal(newFundingRateModel.address);
  });

  it("setAdmin", async function () {
	var leveragePool = await setupLeveragePool();
	const [owner,newOwner] = await ethers.getSigners();
	await expect(await leveragePool.admin()).to.equal(owner.address);
	await expect(leveragePool.setAdmin(0)).to.be.reverted;
	await leveragePool.setAdmin(newOwner.address);
	await expect(await leveragePool.admin()).to.equal(newOwner.address);
	await expect(leveragePool.setAdmin(owner.address)).to.be.reverted;
	await leveragePool.connect(newOwner).setAdmin(owner.address);
	await expect(await leveragePool.admin()).to.equal(owner.address);
  });


  it("initializePools", async function () {
	var leveragePool = await setupLeveragePool();
	checkPool(await leveragePool.pools(0),0,0,1,0,true);
	checkPool(await leveragePool.pools(1),0,0,1,0,false);
	checkPool(await leveragePool.pools(2),0,0,-1,1,false);
	checkPool(await leveragePool.pools(3),0,0,2,0,true);
	checkPool(await leveragePool.pools(4),0,0,2,1,false);
	checkPool(await leveragePool.pools(5),0,0,-2,3,false);
	checkPool(await leveragePool.pools(6),0,0,3,0,true);
	checkPool(await leveragePool.pools(7),0,0,3,3,false);
	checkPool(await leveragePool.pools(8),0,0,-3,6,false);
	await expect(leveragePool.pools(9)).to.be.reverted;
  });
  it("startNextEpoch", async function () {
  	var leveragePool = await setupLeveragePool();
  	await expect(await leveragePool.epoch()).to.equal(0);

  	// No new epoch, too soon
  	await leveragePool.startNextEpoch();
  	await expect(await leveragePool.epoch()).to.equal(0);

  	await startNextEpoch(leveragePool);
  	await expect(await leveragePool.epoch()).to.equal(1);
  });

  it("deposit into liquidity pool", async function () {
	var leveragePool = await setupLeveragePool();
	var collateralToken = await leveragePool.collateralToken();
	const [owner] = await ethers.getSigners();

	var actions = await leveragePool.getUserActionsView(owner.address);
	expect(actions[0]).to.be.an('undefined'); // no action yet
	var poolEpochData = await leveragePool.poolEpochData.call(0,1,0);
	checkPoolEpochData(poolEpochData,0,0,0,0); // no deposits yet

	await expect(leveragePool.deposit("1000000000000000000",0)).to.be.reverted; // no approve
	await expect(leveragePool.deposit(-1,0)).to.be.reverted; // no negative amount
	await expect(leveragePool.deposit("1000000000000000000",10)).to.be.reverted; // pool not found

	await leveragePool._collateralToken.approve(leveragePool.address,"1000000000000000000");

	await leveragePool.deposit("1000000000000000000",0);
	expect(await leveragePool._collateralToken.balanceOf(leveragePool.address)).to.equal("1000000000000000000");

	actions = await leveragePool.getUserActionsView(owner.address);
	checkAction(actions[0],1,0,"1000000000000000000",0);
	expect(actions[1]).to.be.an('undefined'); // just one action

	var poolEpochData = await leveragePool.poolEpochData.call(0,1,0);
	checkPoolEpochData(poolEpochData,0,0,"1000000000000000000",0);

	await startNextEpoch(leveragePool); // wait for next epoch

	poolEpochData = await leveragePool.poolEpochData.call(0,1,0);
	checkPoolEpochData(poolEpochData,"997000000000000000",0,"1000000000000000000",0);

	actions = await leveragePool.getUserActionsView(owner.address);
	checkAction(actions[0],1,0,"1000000000000000000",0); // actions not yet processed

	await leveragePool.bookKeeping();

	actions = await leveragePool.getUserActionsView(owner.address);
	expect(actions[0]).to.be.an('undefined'); // all actions have been processed

	var userShares = actions = await leveragePool.getUserSharesView(owner.address);
	expect(userShares[0]).to.equal("997000000000000000");

	var userDeposits = await leveragePool.getUserDepositsView(owner.address);
	expect(userDeposits[0]).to.equal("999400000000000000"); // 0.3% fee, but you get 80% back, because you are the first in the liquidity pool.

	expect(await leveragePool.adminFees()).to.equals("600000000000000"); // 20% of the 0.3% fee goes to the admin
  });

  it("deposit into leverage pool", async function () {
  	var leveragePool = await setupLeveragePool();
  	var collateralToken = await leveragePool.collateralToken();
  	const [owner] = await ethers.getSigners();

  	var actions = await leveragePool.getUserActionsView(owner.address);
  	expect(actions[0]).to.be.an('undefined'); // no action yet
  	var poolEpochData = await leveragePool.poolEpochData.call(0,1,1);
  	checkPoolEpochData(poolEpochData,0,0,0,0); // no deposits yet

  	await leveragePool._collateralToken.approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.deposit("1000000000000000000",1);
  	expect(await leveragePool._collateralToken.balanceOf(leveragePool.address)).to.equal("1000000000000000000");

  	actions = await leveragePool.getUserActionsView(owner.address);
  	checkAction(actions[0],1,1,"1000000000000000000",0);
  	expect(actions[1]).to.be.an('undefined'); // just one action

  	var poolEpochData = await leveragePool.poolEpochData.call(0,1,1);
  	checkPoolEpochData(poolEpochData,0,0,"1000000000000000000",0);

  	await startNextEpoch(leveragePool); // wait for next epoch

  	poolEpochData = await leveragePool.poolEpochData.call(0,1,1);
  	checkPoolEpochData(poolEpochData,"997000000000000000",0,"1000000000000000000",0);

  	actions = await leveragePool.getUserActionsView(owner.address);
  	checkAction(actions[0],1,1,"1000000000000000000",0); // actions not yet processed

  	await leveragePool.bookKeeping();

  	actions = await leveragePool.getUserActionsView(owner.address);
  	expect(actions[0]).to.be.an('undefined'); // all actions have been processed

  	var userShares = actions = await leveragePool.getUserSharesView(owner.address);
  	expect(userShares[1]).to.equal("997000000000000000");

  	var userDeposits = actions = await leveragePool.getUserDepositsView(owner.address);
  	expect(userDeposits[1]).to.equal("997000000000000000"); // 0.3% fee.

  	expect(await leveragePool.adminFees()).to.equals("3000000000000000"); // 100% of the 0.3% fee goes to the admin, because there is no liquidty pool yet
  });

  it("withdraw", async function () {
	var leveragePool = await setupLeveragePool();
	var collateralToken = await leveragePool.collateralToken();
	const [owner] = await ethers.getSigners();

	await leveragePool._collateralToken.approve(leveragePool.address,"1000000000000000000");
	await leveragePool.deposit("1000000000000000000",0);
	await startNextEpoch(leveragePool); // wait for next epoch

	await leveragePool.withdraw("100000000000000000",0); // partial withdraw

	var poolEpochData = await leveragePool.poolEpochData.call(0,2,0);
	checkPoolEpochData(poolEpochData,0,0,0,"100000000000000000");

	await startNextEpoch(leveragePool); // wait for next epoch

	poolEpochData = await leveragePool.poolEpochData.call(0,2,0);
	checkPoolEpochData(poolEpochData,0,"1002407221664994984",0,"100000000000000000"); //There are 0.9994 shares with total 0.997 collateral, making 0.9994/0.997=1.002407 collateral per share

	var withdrawableCollateral = await leveragePool.getWithdrawableCollateralView(owner.address);
	expect(withdrawableCollateral).to.equal(0); // need to call bookkeeping before the result is shown in withdrawableCollateral
	await leveragePool.bookKeeping();
	withdrawableCollateral = await leveragePool.getWithdrawableCollateralView(owner.address);
	expect(withdrawableCollateral).to.equal("100240722166499498");


	expect(await leveragePool._collateralToken.balanceOf(owner.address)).to.equal("999000000000000000000"); // balance before
	await leveragePool.withdrawCollateral("50000000000000000");
	withdrawableCollateral = await leveragePool.getWithdrawableCollateralView(owner.address);
	expect(withdrawableCollateral).to.equal("50240722166499498"); // some withdrawable collateral left
	expect(await leveragePool._collateralToken.balanceOf(owner.address)).to.equal("999050000000000000000"); // balance after
  });

  it("withdrawAdminFees", async function () {
  	var leveragePool = await setupLeveragePool();
  	var collateralToken = await leveragePool.collateralToken();
  	const [owner,user1] = await ethers.getSigners();

  	await leveragePool._collateralToken.connect(user1).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user1).deposit("1000000000000000000",0);
  	await startNextEpoch(leveragePool); // wait for next epoch

  	var adminFees = await leveragePool.adminFees();
  	expect(adminFees).to.equal("600000000000000");
  	expect(await leveragePool._collateralToken.balanceOf(owner.address)).to.equal("1000000000000000000000"); // balance before
	await expect(leveragePool.connect(user1).withdrawAdminFees()).to.be.reverted; // only owner can withdraw
	await leveragePool.connect(owner).withdrawAdminFees("600000000000000");
	expect(await leveragePool._collateralToken.balanceOf(owner.address)).to.equal("1000000600000000000000"); // balance after
  });

  it("funding and rebalance rates", async function () {
	const [owner,user1,user2,user3] = await ethers.getSigners();
	var leveragePool = await setupLeveragePool();
	await leveragePool.setEpochPeriods(60*60,6*60);
	await leveragePool._collateralToken.connect(user1).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user1).deposit("1000000000000000000",0);
	await leveragePool._collateralToken.connect(user2).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user2).deposit("1000000000000000000",1);
	await leveragePool._collateralToken.connect(user3).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user3).deposit("1000000000000000000",2);
	leveragePool._oracle.setPrice("1000000000000000000"); // 1.00
	await startNextEpoch(leveragePool); // wait for next epoch
	await leveragePool.connect(user1).bookKeeping();
	await leveragePool.connect(user2).bookKeeping();
	await leveragePool.connect(user3).bookKeeping();
	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[0]).to.equal("1004200000000000000"); // pay 0.3% fee, but collect 80% of total fees
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[1]).to.equal("997000000000000000"); // 0.3% fee.
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[2]).to.equal("997000000000000000"); // 0.3% fee.

	var poolAmounts = await leveragePool.calculatePoolAmounts();
	checkPoolAmounts(poolAmounts,"997000000000000000","997000000000000000","1004200000000000000","997000000000000000","1000000000000000000","1000000000000000000",0);

	var rates = await leveragePool.getRates();
	// longFundingRate=0%, shortFundingRate=0%, liquidityPoolFundingRate=0%, rebalanceRate=99.28%, rebalanceLiquidityPoolRate=-98.57% (rates are per year)
	checkRates(rates,0,0,0,"992830113523202549","-985711634318495261");

	leveragePool._oracle.setPrice("1000000000000000000"); // keep price at 1.00
	await startNextEpoch(leveragePool); // wait for next epoch

	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[0]).to.equal("1004312921737291278"); // small rebalance fee collected
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[1]).to.equal("997000000000000000"); // no fees
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[2]).to.equal("996887078262708722"); // small rebalance fee paid. fee = 0.997*(0.99283*60*60/31556952)

	var poolAmounts = await leveragePool.calculatePoolAmounts();
	checkPoolAmounts(poolAmounts,"997000000000000000","996887078262708722","1004312921737291278","996887078262708722","1000000000000000000","1000000000000000000","-112436806145979");

	var rates = await leveragePool.getRates();
	// longFundingRate=0.0113%, shortFundingRate=0.0113%, liquidityPoolFundingRate=0.0000012%, rebalanceRate=99.26%, rebalanceLiquidityPoolRate=-98.52%
	checkRates(rates,"113261521856848","-113261521856848","-12734763776","992606046070046470","-985266762694811216");

	leveragePool._oracle.setPrice("1000000000000000000"); // keep price at 1.00
	await startNextEpoch(leveragePool); // wait for next epoch

	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[0]).to.equal("1004425805204430958"); // small rebalance fee collected, plus miniscule funding rate
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[1]).to.equal("996999987117949343"); // miniscule funding rate paid
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[2]).to.equal("996774207677619698"); // small rebalance fee paid, plus miniscule funding rate collected

  });

  it("Price change 1x leverage", async function () {
  	const [owner,user1,user2,user3] = await ethers.getSigners();
  	var leveragePool = await setupLeveragePool();
  	await leveragePool.setEpochPeriods(60*60,6*60);
  	await leveragePool._fundingRateModel.setMultipliers("0","0"); // set fees to zero for easier calculations

  	await leveragePool._collateralToken.connect(user1).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user1).deposit("1000000000000000000",0);
  	await leveragePool._collateralToken.connect(user2).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user2).deposit("1000000000000000000",1);
  	await leveragePool._collateralToken.connect(user3).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user3).deposit("1000000000000000000",2);
  	leveragePool._oracle.setPrice("1000000000000000000"); // 1.00
  	await startNextEpoch(leveragePool); // wait for next epoch
  	await leveragePool.connect(user1).bookKeeping();
  	await leveragePool.connect(user2).bookKeeping();
  	await leveragePool.connect(user3).bookKeeping();
  	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[0]).to.equal("1004200000000000000"); // pay 0.3% fee, but collect 80% of total fees
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
  	expect(userDeposits2[1]).to.equal("997000000000000000"); // 0.3% fee.
  	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[2]).to.equal("997000000000000000"); // 0.3% fee.

  	var poolAmounts = await leveragePool.calculatePoolAmounts();
  	checkPoolAmounts(poolAmounts,"997000000000000000","997000000000000000","1004200000000000000","997000000000000000","1000000000000000000","1000000000000000000",0);

  	var rates = await leveragePool.getRates();
  	checkRates(rates,0,0,0,0,0);

  	leveragePool._oracle.setPrice("1010000000000000000"); // set price to 1.01  = +1%
  	await startNextEpoch(leveragePool); // wait for next epoch

  	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[0]).to.equal("1004200000000000000"); // no change
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
  	expect(userDeposits2[1]).to.equal("1006970000000000000"); // 1% gain
  	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[2]).to.equal("987030000000000000"); // 1% loss

  	var poolAmounts = await leveragePool.calculatePoolAmounts();
  	checkPoolAmounts(poolAmounts,"1006970000000000000","987030000000000000","1004200000000000000","987030000000000000","1000000000000000000","1000000000000000000","-19856602270464050");

  	var rates = await leveragePool.getRates();
  	checkRates(rates,0,0,0,0,0);

  	leveragePool._oracle.setPrice("1030200000000000000"); // set price at 1.0302 = +2%
  	await startNextEpoch(leveragePool); // wait for next epoch

  	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[0]).to.equal("1003801200000000001"); // small loss, liquidity pool is short
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
  	expect(userDeposits2[1]).to.equal("1027109400000000000"); // 2% gain
  	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[2]).to.equal("967289400000000000"); // 2% loss

  	var poolAmounts = await leveragePool.calculatePoolAmounts();
	checkPoolAmounts(poolAmounts,"1027109400000000000","967289400000000000","1003801200000000001","967289400000000000","1000000000000000000","1000000000000000000","-59593473289332588");

	var rates = await leveragePool.getRates();
	checkRates(rates,0,0,0,0,0);
	leveragePool._oracle.setPrice("1092012000000000000"); // set price at 1.092012 = +6%
	await startNextEpoch(leveragePool); // wait for next epoch
	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[0]).to.equal("999290772000000003"); // small loss, liquidity pool is short
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[1]).to.equal("1088735963999999999"); // 6% gain
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[2]).to.equal("910173264000000001"); // a loss of 5.9048% (a little less than a 6% loss, because of the rebalancing after the change cap of 5%)

  });

  it("Price change 2x leverage", async function () {
	const [owner,user1,user2,user3] = await ethers.getSigners();
	var leveragePool = await setupLeveragePool();
	await leveragePool.setEpochPeriods(60*60,6*60);
	await leveragePool._fundingRateModel.setMultipliers(0,0); // set fees to zero for easier calculations

	await leveragePool._collateralToken.connect(user1).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user1).deposit("1000000000000000000",3);
	await leveragePool._collateralToken.connect(user2).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user2).deposit("1000000000000000000",4);
	await leveragePool._collateralToken.connect(user3).approve(leveragePool.address,"1000000000000000000");
	await leveragePool.connect(user3).deposit("1000000000000000000",5);
	leveragePool._oracle.setPrice("1000000000000000000"); // 1.00
	await startNextEpoch(leveragePool); // wait for next epoch
	await leveragePool.connect(user1).bookKeeping();
	await leveragePool.connect(user2).bookKeeping();
	await leveragePool.connect(user3).bookKeeping();
	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[3]).to.equal("1008400000000000000"); // pay 0.3% fee, but collect 80% of total fees
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[4]).to.equal("994000000000000000"); // 0.3% fee of 2x leverage
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[5]).to.equal("994000000000000000"); // 0.3% fee of 2x leverage

	var poolAmounts = await leveragePool.calculatePoolAmounts();
	checkPoolAmounts(poolAmounts,"1988000000000000000","1988000000000000000","2016800000000000000","3976000000000000000","1000000000000000000","1000000000000000000",0);

	var rates = await leveragePool.getRates();
	checkRates(rates,0,0,0,0,0);

	leveragePool._oracle.setPrice("1010000000000000000"); // set price to 1.01  = +1%
	await startNextEpoch(leveragePool); // wait for next epoch

	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[3]).to.equal("1008400000000000000"); // no change
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[4]).to.equal("1013880000000000000"); // 2% gain
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[5]).to.equal("974120000000000000"); // 2% loss

	var poolAmounts = await leveragePool.calculatePoolAmounts();
	checkPoolAmounts(poolAmounts,"2027760000000000000","1948240000000000000","2016800000000000000","3936240000000000000","1000000000000000000","1000000000000000000","-39428798095993653");

	var rates = await leveragePool.getRates();
	checkRates(rates,0,0,0,0,0);

	leveragePool._oracle.setPrice("1030200000000000000"); // set price at 1.0302 = +2%
	await startNextEpoch(leveragePool); // wait for next epoch

	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
	expect(userDeposits1[3]).to.equal("1006809600000000001"); // small loss, liquidity pool is short
	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[4]).to.equal("1054435200000000000"); // 4% gain
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
	expect(userDeposits3[5]).to.equal("935155200000000000"); // 4% loss

	var poolAmounts = await leveragePool.calculatePoolAmounts();
  	checkPoolAmounts(poolAmounts,"2108870400000000000","1870310400000000000","2013619200000000002","3859900800000000000","1000000000000000000","1000000000000000000","-118473244593615317");

  	var rates = await leveragePool.getRates();
  	checkRates(rates,0,0,0,0,0);
  	leveragePool._oracle.setPrice("1092012000000000000"); // set price at 1.092012 = +6%
  	await startNextEpoch(leveragePool); // wait for next epoch
  	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[3]).to.equal("988819904000000005"); // a loss, liquidity pool is short x 0.118
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
  	expect(userDeposits2[4]).to.equal("1181971647999999998"); // 12.095% gain (more than 12% because of the rebalance)
  	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[5]).to.equal("825608448000000002"); // a loss of 11.714% (a little less than 12% loss, because of the rebalancing after the change cap of 5%)
  });

  it("Low liquidity attack", async function () {
  	const [owner,user1,user2,user3] = await ethers.getSigners();
  	var leveragePool = await setupLeveragePool();
  	await leveragePool.setEpochPeriods(60*60,6*60);

	// Setting a high max rebalance rate allows the interest rate to be so high all pools can get drained.
	// Default is 100% per year
  	await leveragePool._fundingRateModel.setMaxRebalanceRate("1000000000000000000000000000000000000");

  	await leveragePool._collateralToken.connect(user2).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user2).deposit("1000000000000000000",4);
  	await leveragePool._collateralToken.connect(user3).approve(leveragePool.address,"1000000000000000000");
  	await leveragePool.connect(user3).deposit("1000000000000000000",5);
  	leveragePool._oracle.setPrice("1000000000000000000"); // 1.00
  	await startNextEpoch(leveragePool); // wait for next epoch
  	await leveragePool.connect(user1).bookKeeping();
  	await leveragePool.connect(user2).bookKeeping();
  	await leveragePool.connect(user3).bookKeeping();
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
  	expect(userDeposits2[4]).to.equal("994000000000000000"); // 0.3% fee of 2x leverage
  	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[5]).to.equal("994000000000000000"); // 0.3% fee of 2x leverage

  	await leveragePool._collateralToken.connect(user1).approve(leveragePool.address,"1");
  	await leveragePool.connect(user1).deposit("1",3);
  	await startNextEpoch(leveragePool); // wait for next epoch
  	await leveragePool.connect(user1).bookKeeping();
  	var userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[3]).to.equal("1"); // pay 0.3% fee, but collect 80% of total fees

  	await startNextEpoch(leveragePool); // wait for next epoch

  	userDeposits1 = await leveragePool.getUserDepositsView(user1.address);
  	expect(userDeposits1[3]).to.equal("453579927491096098254356124127578"); // Interest rate skyrocketed because of low liquidity
  	var userDeposits2 = await leveragePool.getUserDepositsView(user2.address);
	expect(userDeposits2[4]).to.equal("-113394981872773030563589031031894"); // Drained
	var userDeposits3 = await leveragePool.getUserDepositsView(user3.address);
  	expect(userDeposits3[5]).to.equal("-340184945618321079690767093095683"); // Drained


  });
});

async function startNextEpoch(leveragePool) {
	// Wait for next epoch
	var currentblock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
	var epochPeriod = parseInt(await leveragePool.epochPeriod());
	var epochStartTime = parseInt(await leveragePool.epochStartTime());
	var waitPeriod = epochStartTime+epochPeriod-currentblock.timestamp+1;
	if (waitPeriod>0) {
		ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
		ethers.provider.send("evm_mine"); // mine the next block
	}
	// Start Epoch
	await leveragePool.startNextEpoch();
}

async function setupLeveragePool() {
	const [owner,user1,user2,user3] = await ethers.getSigners();

	// Deploy collateral token
	const TestERC20 = await ethers.getContractFactory("TestERC20");
	var collateralToken = await TestERC20.deploy();
	await collateralToken.mint(owner.address,"1000000000000000000000");
	await collateralToken.mint(user1.address,"1000000000000000000000");
	await collateralToken.mint(user2.address,"1000000000000000000000");
	await collateralToken.mint(user3.address,"1000000000000000000000");

	// Deploy oracle
	const TestOracle = await ethers.getContractFactory("TestOracle");
	var oracle = await TestOracle.deploy();

	// Deploy fundingRateModel
	const BaseInterestRateModel = await ethers.getContractFactory("BaseInterestRateModel");
	var fundingRateModel = await BaseInterestRateModel.deploy();

	// Deploy leverage pool
	const LeveragePool = await ethers.getContractFactory("LeveragePool");
	var leveragePool = await LeveragePool.deploy(collateralToken.address,oracle.address,fundingRateModel.address,0);
    await leveragePool.deployed();

	// Check initialization
	await expect(await leveragePool.admin()).to.equal(owner.address);
	await expect(await leveragePool.collateralToken()).to.equal(collateralToken.address);
	await expect(await leveragePool.oracle()).to.equal(oracle.address);
	await expect(await leveragePool.fundingRateModel()).to.equal(fundingRateModel.address);
	await expect(await leveragePool.epoch()).to.equal(0);
	await expect(await leveragePool.price()).to.equal("1000000000000000000");

	// No pools yet
	await expect(leveragePool.pools(0)).to.be.reverted;

	// Init default pool
    await leveragePool.initializePools();

    leveragePool._collateralToken = collateralToken;
    leveragePool._fundingRateModel = fundingRateModel;
    leveragePool._oracle = oracle;
    return leveragePool;
}

function checkPool(pool,shares,collateral,leverage,rebalanceMultiplier,isLiquidityPool) {
	expect(pool.shares).to.equal(shares);
	expect(pool.collateral).to.equal(collateral);
	expect(pool.leverage).to.equal(leverage);
	expect(pool.rebalanceMultiplier).to.equal(rebalanceMultiplier);
	expect(pool.isLiquidityPool).to.equal(isLiquidityPool);
}

function checkAction(action,epoch,pool,depositAmount,withdrawAmount,isLiquidityPool) {
	expect(action.epoch).to.equal(epoch);
	expect(action.pool).to.equal(pool);
	expect(action.depositAmount).to.equal(depositAmount);
	expect(action.withdrawAmount).to.equal(withdrawAmount);
}

function checkPoolEpochData(data,sharesPerCollateralDeposit,collateralPerShareWithdraw,deposits,withdrawals) {
	expect(data.sharesPerCollateralDeposit).to.equal(sharesPerCollateralDeposit);
	expect(data.collateralPerShareWithdraw).to.equal(collateralPerShareWithdraw);
	expect(data.deposits).to.equal(deposits);
	expect(data.withdrawals).to.equal(withdrawals);
}

function checkRates(rates,longFundingRate,shortFundingRate,liquidityPoolFundingRate,rebalanceRate,rebalanceLiquidityPoolRate) {
	expect(rates.longFundingRate).to.equal(longFundingRate);
	expect(rates.shortFundingRate).to.equal(shortFundingRate);
	expect(rates.liquidityPoolFundingRate).to.equal(liquidityPoolFundingRate);
	expect(rates.rebalanceRate).to.equal(rebalanceRate);
	expect(rates.rebalanceLiquidityPoolRate).to.equal(rebalanceLiquidityPoolRate);
}

function checkPoolAmounts(poolAmounts,longAmount,shortAmount,liquidityPoolAmount,rebalanceAmount,longLeverage,shortLeverage,liquidityPoolLeverage) {
	expect(poolAmounts.longAmount).to.equal(longAmount);
	expect(poolAmounts.shortAmount).to.equal(shortAmount);
	expect(poolAmounts.liquidityPoolAmount).to.equal(liquidityPoolAmount);
	expect(poolAmounts.rebalanceAmount).to.equal(rebalanceAmount);
	expect(poolAmounts.longLeverage).to.equal(longLeverage);
	expect(poolAmounts.shortLeverage).to.equal(shortLeverage);
	expect(poolAmounts.liquidityPoolLeverage).to.equal(liquidityPoolLeverage);

}




