import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const fraxShares = await hre.deployments.get('FRAXShares');
  const fraxStablecoin = await hre.deployments.get('FRAXStablecoin');
  const veFXS = await hre.deployments.get('veFXS');
  const timeLock = await hre.deployments.get('Timelock');
  const {deployer, stakingToken} = await getNamedAccounts();

  const result = await deploy('StakingRewardsDualV3', {
    from: deployer,
    args: [deployer, fraxStablecoin.address, fraxShares.address, stakingToken, fraxStablecoin.address, timeLock.address, veFXS.address ], // TODO: owner should not be deployer / fake pool FXS / FRAX
    log: true,
  });
  hre.deployments.log(
    `🚀 contract StakingRewardsDualV3 deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );
};
export default func;
func.tags = ['StakingRewardsDualV3'];
func.dependencies = ['veFXS'];
