import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const fraxShares = await hre.deployments.get('FRAXShares');

  const {deployer} = await getNamedAccounts();

  const result = await deploy('veFXS', {
    from: deployer,
    args: [fraxShares.address, 'veFXS', 'veFXS', '1.0.0'],
    log: true,
  });
  hre.deployments.log(
    `🚀 contract FRAXShares deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );
};
export default func;
func.tags = ['veFXS'];
func.dependencies = ['FRAXShares'];
