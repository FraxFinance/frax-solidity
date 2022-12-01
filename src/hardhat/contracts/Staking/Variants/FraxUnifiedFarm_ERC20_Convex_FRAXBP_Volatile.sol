// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.8.0;

import "../FraxUnifiedFarm_ERC20.sol";
import "../../Misc_AMOs/convex/IConvexStakingWrapperFrax.sol";
import "../../Misc_AMOs/convex/IDepositToken.sol";
import "../../Misc_AMOs/curve/I2pool.sol";
import "../../Misc_AMOs/curve/I2poolToken.sol";

contract FraxUnifiedFarm_ERC20_Convex_FRAXBP_Volatile is FraxUnifiedFarm_ERC20 {

    constructor (
        address _owner,
        address[] memory _rewardTokens,
        address[] memory _rewardManagers,
        uint256[] memory _rewardRates,
        address[] memory _gaugeControllers,
        address[] memory _rewardDistributors,
        address _stakingToken 
    ) 
    FraxUnifiedFarm_ERC20(_owner , _rewardTokens, _rewardManagers, _rewardRates, _gaugeControllers, _rewardDistributors, _stakingToken)
    {
        // Convex stkcvxFPIFRAX and stkcvxFRAXBP. Also Volatile/FRAXBP
        // stakingToken = IConvexStakingWrapperFrax(_stakingToken);
        // curveToken = I2poolToken(stakingToken.curveToken());
        // curvePool = I2pool(curveToken.minter());
        // address token0 = curvePool.coins(0);
        // frax_is_token0 = (token0 == frax_address);
    }

    function fraxPerLPToken() public view override returns (uint256) {
        // // Get the amount of FRAX 'inside' of the lp tokens
        // uint256 frax_per_lp_token;

        // Convex Volatile/FRAXBP
        // ============================================
        // {
        //     // Half of the LP is FRAXBP. Half of that should be FRAX.
        //     // Using 0.25 * lp price for gas savings
        //     frax_per_lp_token = (curvePool.lp_price() * (1e18)) / (4 * curvePool.price_oracle()); 
        // }

        // return frax_per_lp_token;
    }

    /// @notice Transfer a portion of a locked stake to `destination_address`
    /// @param kek_id The kek_id of the locked stake to transfer
    /// @param rewardee The address to send staker's rewards to
    /// @param destination_address The address to transfer the stake to
    /// @param transfer_amount The amount of the stake to transfer
    /// @return sender_stake_balance_remaining Balance remaining in the sender's locked stake
    /// @return recipient_stake_balance The balance of the recipient's locked stake
    function transferLocked(
        bytes32 kek_id,
        address rewardee,
        address destination_address,
        uint256 transfer_amount
    ) external nonReentrant returns (uint256, uint256) {
        require(withdrawalsPaused == false, "Withdrawals paused");
        return
            _transferLocked(
                msg.sender,
                rewardee,
                destination_address,
                kek_id,
                transfer_amount
            );
    }

    /// @notice Transfer a portion of a locked stake to a new address
    /// @param staker_address The address of the staker transferring assets
    /// @param rewardee The address of the staker's reward address
    /// @param destination_address The address to transfer the locked assets to
    /// @param kek_id The kek_id of the locked stake
    /// @param transfer_amount The amount of the locked stake to transfer
    /// @return sender_stake_balance_remaining Balance remaining in the sender's locked stake
    /// @return recipient_stake_balance The balance of the recipient's locked stake
    function _transferLocked(
        address staker_address,
        address rewardee,
        address destination_address,
        bytes32 kek_id,
        uint256 transfer_amount
    ) internal returns (uint256, uint256) {
        // Collect rewards first and then update the balances, current staker's specified address
        _getReward(staker_address, rewardee, true);

        // Get the stake and its index
        (LockedStake memory thisStake, uint256 theArrayIndex) = _getStake(
            staker_address,
            kek_id
        );

        // perform checks
        require(
            block.timestamp < thisStake.ending_timestamp ||
                stakesUnlocked == true,
            "!locked"
        );
        require(
            transfer_amount <= thisStake.liquidity && transfer_amount > 0,
            "Invalid transfer amount"
        );

        // Update the liquidities
        _locked_liquidity[staker_address] -= transfer_amount;
        _locked_liquidity[destination_address] += transfer_amount;
        {
            address the_proxy = getProxyFor(staker_address);
            if (the_proxy != address(0))
                proxy_lp_balances[the_proxy] -= transfer_amount;
        }
        {
            address the_proxy = getProxyFor(destination_address);
            if (the_proxy != address(0))
                proxy_lp_balances[the_proxy] += transfer_amount;
        }

        /** @dev
         *   The original stake should be reduced by the transfer amount.
         *   All other valaues can remain the same.
         *   - this would make the kek_id not recoverable to the actual parameters,
         *     but that's not a problem since the kek_id is not used for anything else
         *   The recipient should get a new stake with the transfer amount.
         *   The kek_id can be used, since that is where it originally came from, since that
         */
        // Update the existing staker's stake
        uint256 sender_stake_balance_remaining = thisStake.liquidity -
            transfer_amount;
        lockedStakes[staker_address][theArrayIndex] = LockedStake(
            kek_id,
            thisStake.start_timestamp,
            sender_stake_balance_remaining,
            thisStake.ending_timestamp,
            thisStake.lock_multiplier
        );

        /** @dev
            If the recipient already has the same kek_id, then we can just add back the amt transferred
                otherwise, we need to create a new stake, and we can retain the same kek_id since the address
                doesn't already have a stake with that kek_id
        */
        // Check if the recipient already has a stake with the same kek_id
        uint256 recipient_stake_balance;
        for (uint256 i; i < lockedStakes[destination_address].length; i++) {
            if (lockedStakes[destination_address][i].kek_id == kek_id) {
                // Get the stake
                (
                    LockedStake memory thatStake,
                    uint256 thatArrayIndex
                ) = _getStake(destination_address, kek_id);

                recipient_stake_balance = thatStake.liquidity + transfer_amount;

                // Update the existing staker's stake
                lockedStakes[destination_address][thatArrayIndex] = LockedStake(
                    kek_id,
                    thatStake.start_timestamp,
                    recipient_stake_balance,
                    thatStake.ending_timestamp,
                    thatStake.lock_multiplier
                );
                break;
            } else {
                // Create a new stake for the recipient
                lockedStakes[destination_address].push(
                    LockedStake(
                        kek_id,
                        thisStake.start_timestamp,
                        transfer_amount,
                        thisStake.ending_timestamp,
                        thisStake.lock_multiplier
                    )
                );
                recipient_stake_balance = transfer_amount;
            }
        }

        // Need to call again to make sure everything is correct
        updateRewardAndBalance(staker_address, true);
        updateRewardAndBalance(destination_address, true);

        emit TransferLocked(
            staker_address,
            destination_address,
            transfer_amount,
            kek_id
        );

        return (sender_stake_balance_remaining, recipient_stake_balance);
    }
}
