import {expect} from './chai-setup';
import {
  deployments,
  ethers,
  getNamedAccounts,
  getUnnamedAccounts,
} from 'hardhat';
import {setupUser, setupUsers} from './utils';
import {FRAXShares} from '../typechain/FRAXShares';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('FRAXShares');
  const {deployer} = await getNamedAccounts();
  const contracts = {
    FRAXShares: <FRAXShares>await ethers.getContract('FRAXShares'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    users,
    deployer: await setupUser(deployer, contracts),
  };
});

describe('FXS', function () {
  it('owner can mint', async function () {
    const {users, deployer} = await setup();
    await expect(deployer.FRAXShares.mint(users[0].address, 1000)).to.be.not
      .reverted;
    await expect(
      users[3].FRAXShares.mint(users[0].address, 1000)
    ).to.be.revertedWith('You are not owner or minter');
    await expect(users[0].FRAXShares.transfer(users[1].address, 1000)).to.be.not
      .reverted;
    expect(await users[0].FRAXShares.balanceOf(users[1].address)).to.equal(
      1000
    );
  });
});
