const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Fraxferry", function () {
   var PRECISION=BigInt(1e18);
   it("setupContracts", async function () {
      var contracts = await setupContracts();
   });

   it("embark", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var userBalanceBefore = BigInt(await contracts.token0.balanceOf(user.address));
      var contractBalanceBefore = BigInt(await contracts.token0.balanceOf(contracts.ferryAB.address));
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      var blockNumber = (await contracts.ferryAB.connect(user).embark(bridgeAmount)).blockNumber;
      var confirmedTime = (await ethers.provider.getBlock(blockNumber)).timestamp;
      var userBalanceAfter = BigInt(await contracts.token0.balanceOf(user.address));
      var contractBalanceAfter = BigInt(await contracts.token0.balanceOf(contracts.ferryAB.address));
      expect(userBalanceBefore-userBalanceAfter).to.equal(bridgeAmount);
      expect(contractBalanceAfter-contractBalanceBefore).to.equal(bridgeAmount);
      expect(BigInt(await contracts.ferryAB.noTransactions())).to.equal(BigInt(1));
      var transaction = await contracts.ferryAB.transactions(0);
      var fee = BigInt(await contracts.ferryAB.FEE());
      var reducedDecimals = BigInt(await contracts.ferryAB.REDUCED_DECIMALS());
      expect(transaction.user).to.equal(user.address);
      expect(BigInt(transaction.amount)*reducedDecimals).to.equal(bridgeAmount-fee);
      expect(transaction.timestamp).to.equal(confirmedTime);
   });

   it("embark checks", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await expect(contracts.ferryAB.connect(user).embark(bridgeAmount)).to.be.revertedWith("STF");
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      await expect(contracts.ferryAB.connect(user).embark(1000)).to.be.revertedWith("Amount too low");
      await expect(contracts.ferryAB.connect(user).embark(BigInt(1e39))).to.be.revertedWith("Amount too high");
   });

   it("embarkWithRecipient", async function () {
		const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();
		var contracts = await setupContracts();
		var bridgeAmount = BigInt(1000*1e18);
		await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
		await contracts.ferryAB.connect(user).embarkWithRecipient(bridgeAmount,user2.address);
		wait(100*60);
		var nextBatch = await contracts.ferryAB.getNextBatch(0,10);
		await contracts.ferryBA.connect(captain).depart(nextBatch.start,nextBatch.end,nextBatch.hash);
		wait(100*60);
		var fee = BigInt(await contracts.ferryAB.FEE());
		var batch = await contracts.ferryAB.getBatchData(nextBatch.start,nextBatch.end);
		var userBalanceBefore = BigInt(await contracts.token1.balanceOf(user2.address));
      await contracts.ferryBA.connect(firstOfficer).disembark(batch);
      var userBalanceAfter = BigInt(await contracts.token1.balanceOf(user2.address));
		expect(userBalanceAfter-userBalanceBefore).to.equal(bridgeAmount-fee);
   });

   it("depart", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var hash = "0x1111111111111111111111111111111111111111111111111111111111111111";
      var blockNumber = (await contracts.ferryBA.connect(captain).depart(0,0,hash)).blockNumber;
      var confirmedTime = (await ethers.provider.getBlock(blockNumber)).timestamp;
      expect(BigInt(await contracts.ferryBA.noBatches())).to.equal(BigInt(1));
      var batch = await contracts.ferryBA.batches(0);
      expect(batch.start).to.equal(0);
      expect(batch.end).to.equal(0);
      expect(batch.departureTime).to.equal(confirmedTime);
      expect(batch.status).to.equal(0);
      expect(batch.hash).to.equal(hash);
   });

   it("depart checks", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var hash = "0x1111111111111111111111111111111111111111111111111111111111111111";
      await expect(contracts.ferryBA.connect(captain).depart(1,2,hash)).to.be.revertedWith("Wrong start");
      await expect(contracts.ferryBA.connect(user).depart(0,0,hash)).to.be.revertedWith("Not captain");
      await expect(contracts.ferryBA.connect(firstOfficer).depart(0,0,hash)).to.be.revertedWith("Not captain");
      await expect(contracts.ferryBA.connect(crewmember).depart(0,0,hash)).to.be.revertedWith("Not captain");
      await expect(contracts.ferryBA.connect(owner).depart(0,0,hash)).to.be.revertedWith("Not captain");
      await contracts.ferryBA.connect(captain).depart(0,0,hash)
      await expect(contracts.ferryBA.connect(captain).depart(0,0,hash)).to.be.revertedWith("Wrong start");
      await expect(contracts.ferryBA.connect(captain).depart(1,0,hash)).to.be.revertedWith("Wrong end");
   });

   it("disembark", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      var hash =  await contracts.ferryAB.getTransactionsHash(0,0);
      var batch = await contracts.ferryAB.getBatchData(0,0);
      await contracts.ferryBA.connect(captain).depart(0,0,hash);
      wait(60*60);
      var fee = BigInt(await contracts.ferryAB.FEE());
      var userBalanceBefore = BigInt(await contracts.token1.balanceOf(user.address));
      var contractBalanceBefore = BigInt(await contracts.token1.balanceOf(contracts.ferryBA.address));
      await contracts.ferryBA.connect(firstOfficer).disembark(batch);
      var userBalanceAfter = BigInt(await contracts.token1.balanceOf(user.address));
      var contractBalanceAfter = BigInt(await contracts.token1.balanceOf(contracts.ferryBA.address));
      expect(BigInt(await contracts.ferryBA.executeIndex())).to.equal(BigInt(1));
      expect(userBalanceAfter-userBalanceBefore).to.equal(bridgeAmount-fee);
      expect(contractBalanceBefore-contractBalanceAfter).to.equal(bridgeAmount-fee);
   });

   it("disembark check", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount*BigInt(10));
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(2));
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(4));
      var batch1 = await contracts.ferryAB.getBatchData(0,0);
      var batch2 = await contracts.ferryAB.getBatchData(0,2);
      var batch3 = await contracts.ferryAB.getBatchData(1,1);
      var hash1 =  await contracts.ferryAB.getTransactionsHash(0,0);
      var hash3 =  await contracts.ferryAB.getTransactionsHash(1,1);
      await contracts.ferryBA.connect(captain).depart(0,0,hash1);
      await contracts.ferryBA.connect(captain).depart(1,1,hash3);
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch1)).to.be.revertedWith("Too soon");
      wait(60*60);
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch2)).to.be.revertedWith("Wrong size");
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch3)).to.be.revertedWith("Wrong start");
      var batch4=[0,batch3[1],batch3[2],batch3[3]];
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch4)).to.be.revertedWith("Wrong hash");

      await expect(contracts.ferryBA.connect(user).disembark(batch1)).to.be.revertedWith("Not first officer");
      await expect(contracts.ferryBA.connect(crewmember).disembark(batch1)).to.be.revertedWith("Not first officer");
      await expect(contracts.ferryBA.connect(captain).disembark(batch1)).to.be.revertedWith("Not first officer");
      await expect(contracts.ferryBA.connect(owner).disembark(batch1)).to.be.revertedWith("Not first officer");
      await contracts.ferryBA.connect(firstOfficer).disembark(batch1);
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch1)).to.be.revertedWith("Wrong start");
      await contracts.ferryBA.connect(firstOfficer).disembark(batch3);
   });

   it("multiple trips", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      var pos=0;
      for (var i=0;i<10;i++) {
			await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount*BigInt(10));
			await contracts.ferryAB.connect(user).embark(bridgeAmount);
			await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(2));
			await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(4));
			wait(100*60);
			var nextBatch = await contracts.ferryAB.getNextBatch(pos,10);
			if (pos!=0) await expect(contracts.ferryBA.connect(captain).depart(BigInt(nextBatch.start)-BigInt(1),BigInt(nextBatch.end)-BigInt(1),nextBatch.hash)).to.be.revertedWith("Wrong start");
			await expect(contracts.ferryBA.connect(captain).depart(BigInt(nextBatch.start)+BigInt(1),BigInt(nextBatch.end)+BigInt(1),nextBatch.hash)).to.be.revertedWith("Wrong start");
			await contracts.ferryBA.connect(captain).depart(nextBatch.start,nextBatch.end,nextBatch.hash);
			wait(60*60);
			var transactionsHash = await contracts.ferryAB.getTransactionsHash(nextBatch.start,nextBatch.end);
			await expect(transactionsHash).to.equal(nextBatch.hash);
      	var batch = await contracts.ferryAB.getBatchData(nextBatch.start,nextBatch.end);
         await contracts.ferryBA.connect(firstOfficer).disembark(batch);
         pos=BigInt(nextBatch.end)+BigInt(1);
		}
   });

   it("jettison", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount*BigInt(10));
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(2));
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(4));
      var batch = await contracts.ferryAB.getBatchData(0,2);
      var hash =  await contracts.ferryAB.getTransactionsHash(0,2);
      await contracts.ferryBA.connect(captain).depart(0,2,hash);
      wait(60*60);
      expect(await contracts.ferryBA.cancelled(1)).to.equal(false);
      await contracts.ferryBA.connect(owner).jettison(1,true);
      expect(await contracts.ferryBA.cancelled(1)).to.equal(true);
      await contracts.ferryBA.connect(owner).jettison(1,false);
      expect(await contracts.ferryBA.cancelled(1)).to.equal(false);
      await contracts.ferryBA.connect(owner).jettison(1,true);

      var userBalanceBefore = BigInt(await contracts.token1.balanceOf(user.address));
      var contractBalanceBefore = BigInt(await contracts.token1.balanceOf(contracts.ferryBA.address));
      await contracts.ferryBA.connect(firstOfficer).disembark(batch);
      var userBalanceAfter = BigInt(await contracts.token1.balanceOf(user.address));
      var contractBalanceAfter = BigInt(await contracts.token1.balanceOf(contracts.ferryBA.address));
      var fee = BigInt(await contracts.ferryAB.FEE());
      var expectedTransfered = bridgeAmount*BigInt(5)-fee*BigInt(2);
      expect(userBalanceAfter-userBalanceBefore).to.equal(expectedTransfered);
      expect(contractBalanceBefore-contractBalanceAfter).to.equal(expectedTransfered);
   });

   it("jettison checks", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount*BigInt(10));
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(2));
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(4));
      var batch = await contracts.ferryAB.getBatchData(0,0);
      var hash =  await contracts.ferryAB.getTransactionsHash(0,0);
      await contracts.ferryBA.connect(captain).depart(0,0,hash);
      wait(60*60);
      await contracts.ferryBA.connect(firstOfficer).disembark(batch);
      await expect(contracts.ferryBA.connect(owner).jettison(0,true)).to.be.revertedWith("Transaction already executed");
      await expect(contracts.ferryBA.connect(user).jettison(1,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(captain).jettison(1,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(firstOfficer).jettison(1,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(crewmember).jettison(1,true)).to.be.revertedWith("Not owner");

      await contracts.ferryBA.connect(owner).jettison(1,true)
   });

   it("disputeBatch/removeBatches", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount*BigInt(10));
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      var hash =  await contracts.ferryAB.getTransactionsHash(0,0);
      await contracts.ferryAB.connect(user).embark(bridgeAmount*BigInt(2));
      var badHash = "0x1111111111111111111111111111111111111111111111111111111111111111";
      var hash1 =  await contracts.ferryAB.getTransactionsHash(0,0);
      var hash2 =  await contracts.ferryAB.getTransactionsHash(1,1);
      var batch1 = await contracts.ferryAB.getBatchData(0,0);
      var batch2 = await contracts.ferryAB.getBatchData(1,1);

      await contracts.ferryBA.connect(captain).depart(0,0,badHash);
      await expect(contracts.ferryBA.connect(crewmember).disputeBatch(0,"0x2222222222222222222222222222222222222222222222222222222222222222")).to.be.revertedWith("Wrong hash");
      await expect(contracts.ferryBA.connect(crewmember).disputeBatch(1,hash2)).to.be.reverted; // Not yet departed
      await contracts.ferryBA.connect(captain).depart(1,1,hash2);
      await expect(contracts.ferryBA.connect(user).disputeBatch(0,hash1)).to.be.revertedWith("Not crewmember");
      await contracts.ferryBA.connect(crewmember).disputeBatch(0,badHash);
      await expect(contracts.ferryBA.connect(crewmember).disputeBatch(0,badHash)).to.be.revertedWith("Batch already disputed");
      wait(60*60);
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch1)).to.be.revertedWith("Paused");
      await contracts.ferryBA.connect(owner).unPause();
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch1)).to.be.revertedWith("Batch disputed");

      expect(BigInt(await contracts.ferryBA.noBatches())).to.equal(BigInt(2));
      await expect(contracts.ferryBA.connect(user).removeBatches(0)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(captain).removeBatches(0)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(firstOfficer).removeBatches(0)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(crewmember).removeBatches(0)).to.be.revertedWith("Not owner");
      await contracts.ferryBA.connect(owner).removeBatches(0);
      expect(BigInt(await contracts.ferryBA.noBatches())).to.equal(BigInt(0));

      await contracts.ferryBA.connect(captain).depart(0,0,hash1);
      wait(60*60);
      await contracts.ferryBA.connect(firstOfficer).disembark(batch1);
   });

   it("pause", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await expect(contracts.ferryBA.connect(user).pause()).to.be.revertedWith("Not crewmember");
      expect(await contracts.ferryBA.paused()).to.equal(false);
      await contracts.ferryBA.connect(crewmember).pause()
      expect(await contracts.ferryBA.paused()).to.equal(true);
      await contracts.ferryBA.connect(firstOfficer).pause()
      await contracts.ferryBA.connect(captain).pause()
      await contracts.ferryBA.connect(owner).pause()
      expect(await contracts.ferryBA.paused()).to.equal(true);

      await expect(contracts.ferryBA.connect(user).unPause()).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(crewmember).unPause()).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(firstOfficer).unPause()).to.be.revertedWith("Not owner");
      await expect(contracts.ferryBA.connect(captain).unPause()).to.be.revertedWith("Not owner");
      await contracts.ferryBA.connect(owner).unPause();
      expect(await contracts.ferryBA.paused()).to.equal(false);


      var bridgeAmount = BigInt(1000*1e18);
      await contracts.ferryAB.connect(owner).pause();
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      await expect(contracts.ferryAB.connect(user).estimateGas.embark(bridgeAmount)).to.be.revertedWith("Paused");
      await contracts.ferryAB.connect(owner).unPause();

      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      var hash = await contracts.ferryAB.getTransactionsHash(0,0);


      await contracts.ferryBA.connect(owner).pause();
      await expect(contracts.ferryBA.connect(captain).depart(0,0,hash)).to.be.revertedWith("Paused");
      await contracts.ferryBA.connect(owner).unPause();
      await contracts.ferryBA.connect(captain).depart(0,0,hash);

      wait(60*60);

      await contracts.ferryBA.connect(owner).pause();
      var batch = await contracts.ferryAB.getBatchData(0,0);
      await expect(contracts.ferryBA.connect(firstOfficer).disembark(batch)).to.be.revertedWith("Paused");
      await contracts.ferryBA.connect(owner).unPause();
      await contracts.ferryBA.connect(firstOfficer).disembark(batch);
   });


   it("getBatchData", async function () {
      const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      var fee = BigInt(await contracts.ferryAB.FEE());
      var reducedDecimals = BigInt(await contracts.ferryAB.REDUCED_DECIMALS());
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      var blockNumber1 = (await contracts.ferryAB.connect(user).embark(bridgeAmount)).blockNumber;
      var confirmedTime1 = (await ethers.provider.getBlock(blockNumber1)).timestamp;
      wait(60);
      await contracts.token0.connect(user2).approve(contracts.ferryAB.address,bridgeAmount*BigInt(2));
      var blockNumber2 = (await contracts.ferryAB.connect(user2).embark(bridgeAmount*BigInt(2))).blockNumber;
      var confirmedTime2 = (await ethers.provider.getBlock(blockNumber2)).timestamp;
      var batch = await contracts.ferryAB.getBatchData(0,1);
      expect(batch.startTransactionNo).to.be.equal(0);
      expect(batch.transactions.length).to.be.equal(2);
      expect(batch.transactions[0].user).to.be.equal(user.address);
      expect(BigInt(batch.transactions[0].amount)*reducedDecimals).to.be.equal(bridgeAmount-fee);
      expect(batch.transactions[0].timestamp).to.be.equal(confirmedTime1);
      expect(batch.transactions[1].user).to.be.equal(user2.address);
      expect(BigInt(batch.transactions[1].amount)*reducedDecimals).to.be.equal(bridgeAmount*BigInt(2)-fee);
      expect(batch.transactions[1].timestamp).to.be.equal(confirmedTime2);
      expect(await contracts.ferryAB.getBatchAmount(0,1)).to.be.equals(bridgeAmount*BigInt(3)-fee*BigInt(2));
   });

   it("getNextBatch", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var batchInfo = await contracts.ferryAB.getNextBatch(0,10);
      var zeroHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
      expect(batchInfo.hash).to.be.equal(zeroHash);
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.approve(contracts.ferryAB.address,bridgeAmount);
      await contracts.ferryAB.embark(bridgeAmount);
      var batchInfo = await contracts.ferryAB.getNextBatch(0,10);
      expect(batchInfo.hash).to.be.equal(zeroHash); // No  batch yet
      wait(60*60);
      await contracts.token0.approve(contracts.ferryAB.address,bridgeAmount);
      await contracts.ferryAB.embark(bridgeAmount);
      var batchInfo = await contracts.ferryAB.getNextBatch(0,10);
      expect(batchInfo.start).to.be.equal(0);
      expect(batchInfo.end).to.be.equal(0);
      expect(batchInfo.hash).to.not.equal(zeroHash); // Batch with 1 transaction
      wait(30*60);
      var batchInfo = await contracts.ferryAB.getNextBatch(0,10);
      expect(batchInfo.start).to.be.equal(0);
      expect(batchInfo.end).to.be.equal(0);
      expect(batchInfo.hash).to.not.equal(zeroHash); // Batch with 1 transaction
      wait(60*60);
      var batchInfo2 = await contracts.ferryAB.getNextBatch(0,10);
      expect(batchInfo2.start).to.be.equal(0);
      expect(batchInfo2.end).to.be.equal(1);
      expect(batchInfo2.hash).to.not.equal(zeroHash);
      expect(batchInfo2.hash).to.not.equal(batchInfo.hash); // Batch with 2 transactions
   });

   it("getTransactionsHash", async function () {
      const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();
      var contracts = await setupContracts();
      var fee = BigInt(await contracts.ferryAB.FEE());
      var bridgeAmount = BigInt(5*1e10)+fee;
      await contracts.token0.connect(user).approve(contracts.ferryAB.address,bridgeAmount);
      await contracts.ferryAB.connect(user).embark(bridgeAmount);
      await contracts.token0.connect(user2).approve(contracts.ferryAB.address,bridgeAmount*BigInt(2));
      await contracts.ferryAB.connect(user2).embark(bridgeAmount);
      var hash =  await contracts.ferryAB.getTransactionsHash(0,0);
      var str = "0x0000000000000000000000000000000000000000000000000000000000000000";
      str+=(""+contracts.token0.address).substring(2);
      str+="0000000000000000000000000000000000000000000000000000000000000001";
      str+=(""+contracts.token1.address).substring(2);
      str+="0000000000000000";
      var hash2 = ethers.utils.keccak256(str);
      str = hash2;
      str+=(""+user.address).substring(2);
      str+="0000000000000005"; // amount is 5*1e10
      var hash3 = ethers.utils.keccak256(str);
      expect(hash).to.equal(hash3);
   });

   it("Roles management", async function () {
		const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();
      var contracts = await setupContracts();

      // setCrewmember
      await expect(contracts.ferryAB.connect(user).setCrewmember(user2.address,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(captain).setCrewmember(user2.address,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(firstOfficer).setCrewmember(user2.address,true)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(crewmember).setCrewmember(user2.address,true)).to.be.revertedWith("Not owner");

      expect(await contracts.ferryAB.crewmembers(user2.address)).to.equals(false);
      await contracts.ferryAB.connect(owner).setCrewmember(user2.address,true);
      expect(await contracts.ferryAB.crewmembers(user2.address)).to.equals(true);

		//setCaptain
      await expect(contracts.ferryAB.connect(user).setCaptain(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(captain).setCaptain(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(firstOfficer).setCaptain(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(crewmember).setCaptain(user2.address)).to.be.revertedWith("Not owner");

		expect(await contracts.ferryAB.captain()).to.not.equals(user2.address);
		await contracts.ferryAB.connect(owner).setCaptain(user2.address);
      expect(await contracts.ferryAB.captain()).to.equals(user2.address);

		//setFirstOfficer
      await expect(contracts.ferryAB.connect(user).setFirstOfficer(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(captain).setFirstOfficer(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(firstOfficer).setFirstOfficer(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(crewmember).setFirstOfficer(user2.address)).to.be.revertedWith("Not owner");

		expect(await contracts.ferryAB.firstOfficer()).to.not.equals(user2.address);
		await contracts.ferryAB.connect(owner).setFirstOfficer(user2.address);
      expect(await contracts.ferryAB.firstOfficer()).to.equals(user2.address);

		//nominateNewOwner
		expect(await contracts.ferryAB.nominatedOwner()).to.equals("0x0000000000000000000000000000000000000000");
		await expect(contracts.ferryAB.connect(user).nominateNewOwner(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(captain).nominateNewOwner(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(firstOfficer).nominateNewOwner(user2.address)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(crewmember).nominateNewOwner(user2.address)).to.be.revertedWith("Not owner");
		expect(await contracts.ferryAB.owner()).to.not.equals(user2.address);
		await contracts.ferryAB.connect(owner).nominateNewOwner(user2.address);
		expect(await contracts.ferryAB.nominatedOwner()).to.equals(user2.address);

		//acceptOwnership
		await expect(contracts.ferryAB.connect(user).acceptOwnership()).to.be.revertedWith("You must be nominated before you can accept ownership");
		await expect(contracts.ferryAB.connect(captain).acceptOwnership()).to.be.revertedWith("You must be nominated before you can accept ownership");
		await expect(contracts.ferryAB.connect(firstOfficer).acceptOwnership()).to.be.revertedWith("You must be nominated before you can accept ownership");
		await expect(contracts.ferryAB.connect(crewmember).acceptOwnership()).to.be.revertedWith("You must be nominated before you can accept ownership");
		await contracts.ferryAB.connect(user2).acceptOwnership();
      expect(await contracts.ferryAB.owner()).to.equals(user2.address);
      expect(await contracts.ferryAB.nominatedOwner()).to.equals("0x0000000000000000000000000000000000000000");
   });

   it("Parameters management", async function () {
		const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();
      var contracts = await setupContracts();

      // setFee
      var newFee = BigInt(2e18);
      await expect(contracts.ferryAB.connect(user).setFee(newFee)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(captain).setFee(newFee)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(firstOfficer).setFee(newFee)).to.be.revertedWith("Not owner");
      await expect(contracts.ferryAB.connect(crewmember).setFee(newFee)).to.be.revertedWith("Not owner");

      expect(await contracts.ferryAB.FEE()).to.not.equals(newFee);
      await contracts.ferryAB.connect(owner).setFee(newFee);
      expect(await contracts.ferryAB.FEE()).to.equals(newFee);

      //setMinWaitPeriods
      var newWaitPeriodsAdd = BigInt(120*60);
      var newWaitPeriodsExecute = BigInt(240*60);
		await expect(contracts.ferryAB.connect(user).setMinWaitPeriods(newWaitPeriodsAdd,newWaitPeriodsExecute)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(captain).setMinWaitPeriods(newWaitPeriodsAdd,newWaitPeriodsExecute)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(firstOfficer).setMinWaitPeriods(newWaitPeriodsAdd,newWaitPeriodsExecute)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(crewmember).setMinWaitPeriods(newWaitPeriodsAdd,newWaitPeriodsExecute)).to.be.revertedWith("Not owner");

		expect(await contracts.ferryAB.MIN_WAIT_PERIOD_ADD()).to.not.equals(newWaitPeriodsAdd);
		expect(await contracts.ferryAB.MIN_WAIT_PERIOD_EXECUTE()).to.not.equals(newWaitPeriodsExecute);
		await contracts.ferryAB.connect(owner).setMinWaitPeriods(newWaitPeriodsAdd,newWaitPeriodsExecute);
      expect(await contracts.ferryAB.MIN_WAIT_PERIOD_ADD()).to.equals(newWaitPeriodsAdd);
      expect(await contracts.ferryAB.MIN_WAIT_PERIOD_EXECUTE()).to.equals(newWaitPeriodsExecute);
   });

	it("sendTokens", async function () {
		var contracts = await setupContracts();
		const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
		var sendAmount = BigInt(1e18);
		await expect(contracts.ferryAB.connect(user).sendTokens(user.address,sendAmount)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(captain).sendTokens(user.address,sendAmount)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(firstOfficer).sendTokens(user.address,sendAmount)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(crewmember).sendTokens(user.address,sendAmount)).to.be.revertedWith("Not owner");
		await expect(contracts.ferryAB.connect(owner).sendTokens("0x0000000000000000000000000000000000000000",sendAmount)).to.be.revertedWith("Zero address not allowed");
		var userBalanceBefore = BigInt(await contracts.token0.balanceOf(user.address));
      var contractBalanceBefore = BigInt(await contracts.token0.balanceOf(contracts.ferryAB.address));
      await contracts.ferryAB.connect(owner).sendTokens(user.address,sendAmount)
      var userBalanceAfter = BigInt(await contracts.token0.balanceOf(user.address));
      var contractBalanceAfter = BigInt(await contracts.token0.balanceOf(contracts.ferryAB.address));
		expect(userBalanceAfter-userBalanceBefore).to.equal(sendAmount);
      expect(contractBalanceBefore-contractBalanceAfter).to.equal(sendAmount);
   });

   it("estimateGas", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.approve(contracts.ferryAB.address,bridgeAmount);

      console.log("estimateGas transfer:"+(await contracts.token0.estimateGas.transfer(contracts.ferryAB.address, bridgeAmount)));
      console.log("estimateGas embark:"+(await contracts.ferryAB.estimateGas.embark(bridgeAmount)));

      var transactions = [];
        transactions.push({
         user:owner.address,
         amount:bridgeAmount
        });

      for (var i=0;i<transactions.length;i++) await contracts.ferryAB.embark(bridgeAmount);
      var hash = await contracts.ferryAB.getTransactionsHash(0,transactions.length-1);
      console.log("estimateGas depart:"+(await contracts.ferryBA.connect(captain).estimateGas.depart(0,transactions.length-1,hash)));
      await contracts.ferryBA.connect(captain).depart(0,transactions.length-1,hash)
      wait(60*60);
      var batch = await contracts.ferryAB.getBatchData(0,transactions.length-1);
      console.log("estimateGas disembark:"+(await contracts.ferryBA.connect(firstOfficer).estimateGas.disembark(batch)));
   });

   it("estimateGas 10x", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var addresses =await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.approve(contracts.ferryAB.address,bridgeAmount*BigInt(100));
      var transactions = [];
      for (var i=0;i<10;i++) {
         transactions.push({
               user:addresses[i].address,
               amount:bridgeAmount,
            });
      }
      for (var i=0;i<transactions.length;i++) {
         await contracts.token0.mint(addresses[i].address,bridgeAmount);
         await contracts.token0.connect(addresses[i]).approve(contracts.ferryAB.address,bridgeAmount);
         await contracts.ferryAB.connect(addresses[i]).embark(bridgeAmount);
      }
      var hash = await contracts.ferryAB.getTransactionsHash(0,transactions.length-1);
      console.log("estimateGas depart 10x:"+(await contracts.ferryBA.connect(captain).estimateGas.depart(0,transactions.length-1,hash)));
      await contracts.ferryBA.connect(captain).depart(0,transactions.length-1,hash)
      wait(60*60);
      var batch = await contracts.ferryAB.getBatchData(0,transactions.length-1);
      console.log("estimateGas disembark 10x:"+(await contracts.ferryBA.connect(firstOfficer).estimateGas.disembark(batch)));
   }).timeout(10000000);


   it("estimateGas 20x", async function () {
      const [owner,user,captain,firstOfficer,crewmember] = await ethers.getSigners();
      var addresses =await ethers.getSigners();
      var contracts = await setupContracts();
      var bridgeAmount = BigInt(1000*1e18);
      await contracts.token0.approve(contracts.ferryAB.address,bridgeAmount*BigInt(100));

      var transactions = [];
      for (var i=0;i<20;i++) {
         transactions.push({
               user:addresses[i].address,
               amount:bridgeAmount,
            });
      }
      for (var i=0;i<transactions.length;i++) {
         await contracts.token0.mint(addresses[i].address,bridgeAmount);
         await contracts.token0.connect(addresses[i]).approve(contracts.ferryAB.address,bridgeAmount);
         await contracts.ferryAB.connect(addresses[i]).embark(bridgeAmount);
      }
      var hash = await contracts.ferryAB.getTransactionsHash(0,transactions.length-1);
      console.log("estimateGas depart 20x:"+(await contracts.ferryBA.connect(captain).estimateGas.depart(0,transactions.length-1,hash)));
      await contracts.ferryBA.connect(captain).depart(0,transactions.length-1,hash)
      wait(60*60);
      var batch = await contracts.ferryAB.getBatchData(0,transactions.length-1);
      console.log("estimateGas disembark 20x:"+(await contracts.ferryBA.connect(firstOfficer).estimateGas.disembark(batch)));
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

async function wait(waitPeriod) {
   if (waitPeriod>0) {
      ethers.provider.send("evm_increaseTime", [waitPeriod]); // wait waitPeriod
      ethers.provider.send("evm_mine"); // mine the next block
   }
}

async function setupContracts() {
   const [owner,user,captain,firstOfficer,crewmember,user2] = await ethers.getSigners();

   // Deploy token and distribute
   const DummyToken = await ethers.getContractFactory("DummyToken");
   var token0 = await DummyToken.deploy();
   var token1 = await DummyToken.deploy();

   await token0.mint(owner.address,"100000000000000000000000000");
   await token0.mint(user.address,"100000000000000000000000000");
   await token0.mint(user2.address,"100000000000000000000000000");

   await token1.mint(owner.address,"100000000000000000000000000");
   await token1.mint(user.address,"100000000000000000000000000");
   await token1.mint(user2.address,"100000000000000000000000000");

   // Deploy Fraxferry contracts
   const Fraxferry = await ethers.getContractFactory("Fraxferry");
   var ferryAB = await Fraxferry.deploy(token0.address,0,token1.address,1);
   var ferryBA = await Fraxferry.deploy(token1.address,1,token0.address,0);

   await token0.mint(ferryAB.address,"100000000000000000000000000");
   await token1.mint(ferryBA.address,"100000000000000000000000000");
   await ferryAB.setCaptain(captain.address);
   await ferryAB.setFirstOfficer(firstOfficer.address);
   await ferryAB.setCrewmember(crewmember.address,true);

   await ferryBA.setCaptain(captain.address);
   await ferryBA.setFirstOfficer(firstOfficer.address);
   await ferryBA.setCrewmember(crewmember.address,true);

   // Pack contracts in an object
   var result = {};
    result.token0 = token0;
    result.token1 = token1;
    result.ferryAB = ferryAB;
    result.ferryBA = ferryBA;
    return result;
}
