import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const timeLock = await hre.deployments.get('Timelock');

  const {deployer, COLLATERAL_FRAX_AND_FXS_OWNER} = await getNamedAccounts();

  const result = await deploy('FRAXStablecoin', {
    from: deployer,
    args: ['Frax', 'FRAX', COLLATERAL_FRAX_AND_FXS_OWNER, timeLock.address],
    log: true,
  });
  hre.deployments.log(
    `🚀 contract FRAXStablecoin deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );
};
export default func;
func.tags = ['FRAXStablecoin'];
func.dependencies = ['Timelock'];
