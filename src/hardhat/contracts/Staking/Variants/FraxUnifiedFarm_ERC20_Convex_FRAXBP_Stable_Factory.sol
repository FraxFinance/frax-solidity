// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "./FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable.sol";
import "./FraxUnifiedFarm_ERC20_Convex_FRAXBP_Volatile.sol";
import "../Owned.sol";

contract FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable_Factory {

    constructor() {}

    /// @notice Creates a Stable FraxBP farm
    /// @param _owner Eventual owner of the farm
    /// @param _rewardTokens List of reward tokens. Usually FXS, CRV, then CVX
    /// @param _rewardManagers Addresses that can manually set reward rates
    /// @param _rewardRates Override reward rates. In tokens per second
    /// @param _gaugeControllers Addresses of gauge controllers for each reward token
    /// @param _rewardDistributors Addresses of reward distributors for each reward token
    /// @param _stakingToken The stkcvx<ABCXYZ>FRAXBP token that will be the LP
    function createFXBPStableFarm(
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _stakingToken
    ) external returns (address farm_address) {
        // Get a salt
        bytes32 salt = keccak256(abi.encodePacked(
            _owner,
            _rewardTokens,
            _rewardManagers,
            _rewardRates,
            _gaugeControllers,
            _rewardDistributors,
            _stakingToken
        ));

        // Deploy the contract
        farm_address = address(new FraxUnifiedFarm_ERC20_Convex_FRAXBP_Stable{salt: salt}(
            _owner,
            _rewardTokens,
            _rewardManagers,
            _rewardRates,
            _gaugeControllers,
            _rewardDistributors,
            _stakingToken
        ));

        emit FXBPStableFarmCreated(msg.sender, _owner, farm_address);

    }

    
    /* ========== EVENTS ========== */
    event FXBPStableFarmCreated(address indexed deployer, address indexed farm_owner, address indexed farm_address);
}
