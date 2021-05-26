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
  await deployments.fixture('StakingRewardsDualV3');
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
  });
});
