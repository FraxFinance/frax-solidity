import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;
  const timeLock = await hre.deployments.get('Timelock');

  const {deployer, ORACLE_ADDRESS, COLLATERAL_FRAX_AND_FXS_OWNER} =
    await getNamedAccounts();

  const result = await deploy('FRAXShares', {
    from: deployer,
    args: [
      'Frax Share',
      'FXS',
      ORACLE_ADDRESS,
      COLLATERAL_FRAX_AND_FXS_OWNER,
      timeLock.address,
    ],
    log: true,
  });
  hre.deployments.log(
    `🚀 contract FRAXShares deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );
};
export default func;
func.tags = ['FRAXShares'];
func.dependencies = ['Timelock'];
