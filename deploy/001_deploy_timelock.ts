import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const TIMELOCK_DELAY = 2 * 86400; // 2 days
  const {deploy} = deployments;

  const {deployer, TIMELOCK_ADMIN} = await getNamedAccounts();

  const result = await deploy('Timelock', {
    from: deployer,
    args: [TIMELOCK_ADMIN, TIMELOCK_DELAY],
    log: true,
  });
  hre.deployments.log(
    `🚀 contract Timelock deployed at ${result.address} using ${result.receipt?.gasUsed} gas`
  );
};
export default func;
func.tags = ['Timelock'];
