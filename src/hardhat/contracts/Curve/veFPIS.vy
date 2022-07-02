# @version 0.3.2
"""
@title Voting Escrow
@author Curve Finance
@license MIT
@notice Votes have a weight depending on time, so that users are
        committed to the future of (whatever they are voting for)
@dev Vote weight decays linearly over time. Lock time cannot be
     more than `MAXTIME` (4 years).
"""

# ====================================================================
# |     ______                   _______                             |
# |    / _____________ __  __   / ____(_____  ____ _____  ________   |
# |   / /_  / ___/ __ `| |/_/  / /_  / / __ \/ __ `/ __ \/ ___/ _ \  |
# |  / __/ / /  / /_/ _>  <   / __/ / / / / / /_/ / / / / /__/  __/  |
# | /_/   /_/   \__,_/_/|_|  /_/   /_/_/ /_/\__,_/_/ /_/\___/\___/   |
# |                                                                  |
# ====================================================================
# ============================== veFPIS ==============================
# ====================================================================
# Frax Finance: https://github.com/FraxFinance

# Original idea and credit:
# Curve Finance's veCRV
# https://resources.curve.fi/faq/vote-locking-boost
# https://github.com/curvefi/curve-dao-contracts/blob/master/contracts/VotingEscrow.vy
# veFPIS is basically a fork, with the key difference that 1 FPIS locked for 1 second would be ~ 1 veFPIS,
# As opposed to ~ 0 veFPIS (as it is with veCRV)

# Frax Primary Forker(s) / Modifier(s) 
# Travis Moore: https://github.com/FortisFortuna

# Frax Reviewer(s) / Contributor(s)
# Dennis: https://github.com/denett
# Drake Evans: https://github.com/DrakeEvans
# Rich Gee: https://github.com/zer0blockchain
# Sam Kazemian: https://github.com/samkazemian
# Jack Corddry: https://github.com/corddry

# Voting escrow to have time-weighted votes
# Votes have a weight depending on time, so that users are committed
# to the future of (whatever they are voting for).
# The weight in this implementation is linear, and lock cannot be more than maxtime:
# w ^
# 1 +        /
#   |      /
#   |    /
#   |  /
#   |/
# 0 +--------+------> time
#       maxtime (4 years?)

struct Point:
    bias: int128 # principal FPIS amount locked
    slope: int128  # - dweight / dt
    ts: uint256
    blk: uint256  # block
    fpis_amt: uint256
# We cannot really do block numbers per se b/c slope is per time, not per block
# and per block could be fairly bad b/c Ethereum changes blocktimes.
# What we can do is to extrapolate ***At functions

struct LockedBalance:
    amount: int128
    end: uint256

interface ERC20:
    def decimals() -> uint256: view
    def balanceOf(addr: address) -> uint256: view
    def name() -> String[64]: view
    def symbol() -> String[32]: view
    def transfer(to: address, amount: uint256) -> bool: nonpayable
    def transferFrom(spender: address, to: address, amount: uint256) -> bool: nonpayable


# Interface for checking whether address belongs to a whitelisted
# type of a smart wallet.
# When new types are added - the whole contract is changed
# The check() method is modifying to be able to use caching
# for individual wallet addresses
interface SmartWalletChecker:
    def check(addr: address) -> bool: nonpayable

DEPOSIT_FOR_TYPE: constant(int128) = 0
CREATE_LOCK_TYPE: constant(int128) = 1
INCREASE_LOCK_AMOUNT: constant(int128) = 2
INCREASE_UNLOCK_TIME: constant(int128) = 3
USER_WITHDRAW: constant(int128) = 4
PROXY_TRANSFER: constant(int128) = 5
PROXY_PAYBACK: constant(int128) = 6
PROXY_LIQUIDATION: constant(int128) = 7

event CommitOwnership:
    admin: address

event ApplyOwnership:
    admin: address

event Deposit:
    provider: indexed(address)
    payer_addr: indexed(address)
    value: uint256
    locktime: indexed(uint256)
    type: int128
    ts: uint256

event Withdraw:
    provider: indexed(address)
    to_addr: indexed(address)
    value: uint256
    ts: uint256

event Supply:
    prevSupply: uint256
    supply: uint256

event TransferToProxy:
    staker_addr: indexed(address)
    proxy_addr: indexed(address)
    transfer_amt: uint256

event ProxyPaybackOrLiquidation:
    staker_addr: indexed(address)
    proxy_addr: indexed(address)
    payback_amt: uint256
    liquidation_amt: uint256
    liquidation_fee: uint256

event SmartWalletCheckerComitted:
    future_smart_wallet_checker: address

event SmartWalletCheckerApplied:
    smart_wallet_checker: address

event EmergencyUnlockToggled:
    emergencyUnlockActive: bool

event ProxyTransferTosToggled:
    proxyTransferTosEnabled: bool

event ProxyPaybackOrLiquidationsToggled:
    proxyPaybackOrLiquidationsEnabled: bool

event LendingProxySet:
    proxy_address: address

event StakerProxySet:
    proxy_address: address


WEEK: constant(uint256) = 7 * 86400  # all future times are rounded by week
MAXTIME: constant(uint256) = 4 * 365 * 86400  # 4 years
MAXTIME_I128: constant(int128) = 4 * 365 * 86400  # 4 years
MULTIPLIER: constant(uint256) = 10 ** 18

VOTE_WEIGHT_MULTIPLIER: constant(uint256) = 4 - 1 # 4x gives 300% boost at 4 years
VOTE_WEIGHT_MULTIPLIER_I128: constant(int128) = 4 - 1 # 4x gives 300% boost at 4 years

token: public(address)
supply: public(uint256) # Tracked FPIS in the contract

locked: public(HashMap[address, LockedBalance])

epoch: public(uint256)
point_history: public(Point[100000000000000000000000000000])  # epoch -> unsigned point
user_point_history: public(HashMap[address, Point[1000000000]])  # user -> Point[user_epoch]
user_point_epoch: public(HashMap[address, uint256])
slope_changes: public(HashMap[uint256, int128])  # time -> signed slope change

# Misc
controller: public(address)
transfersEnabled: public(bool)
proxyTransferTosEnabled: public(bool)
proxyPaybackOrLiquidationsEnabled: public(bool)

# Emergency Unlock
emergencyUnlockActive: public(bool)

# Proxies (allow withdrawal / deposits for lending protocols, etc.)
lending_proxy: public(address) # Set by admin
staker_whitelisted_proxy: public(HashMap[address, address])  # user -> proxy. Set by user
user_fpis_in_proxy: public(HashMap[address, uint256]) # user -> amount held in proxy

# ERC20 related
name: public(String[64])
symbol: public(String[32])
version: public(String[32])
decimals: public(uint256)

# Checker for whitelisted (smart contract) wallets which are allowed to deposit
# The goal is to prevent tokenizing the escrow
future_smart_wallet_checker: public(address)
smart_wallet_checker: public(address)

admin: public(address)  # Can and will be a smart contract
future_admin: public(address)


@external
def __init__(token_addr: address, _name: String[64], _symbol: String[32], _version: String[32]):
    """
    @notice Contract constructor
    @param token_addr `ERC20CRV` token address
    @param _name Token name
    @param _symbol Token symbol
    @param _version Contract version - required for Aragon compatibility
    """
    self.admin = msg.sender
    self.token = token_addr
    self.point_history[0].blk = block.number
    self.point_history[0].ts = block.timestamp
    self.point_history[0].fpis_amt = 0
    self.controller = msg.sender
    self.transfersEnabled = True
    self.proxyTransferTosEnabled = True
    self.proxyPaybackOrLiquidationsEnabled = True

    _decimals: uint256 = ERC20(token_addr).decimals()
    assert _decimals <= 255
    self.decimals = _decimals

    self.name = _name
    self.symbol = _symbol
    self.version = _version


@external
def commit_transfer_ownership(addr: address):
    """
    @notice Transfer ownership of VotingEscrow contract to `addr`
    @param addr Address to have ownership transferred to
    """
    assert msg.sender == self.admin  # dev: admin only
    self.future_admin = addr
    log CommitOwnership(addr)


@external
def apply_transfer_ownership():
    """
    @notice Apply ownership transfer
    """
    assert msg.sender == self.admin  # dev: admin only
    _admin: address = self.future_admin
    assert _admin != ZERO_ADDRESS  # dev: admin not set
    self.admin = _admin
    log ApplyOwnership(_admin)


@external
def commit_smart_wallet_checker(addr: address):
    """
    @notice Set an external contract to check for approved smart contract wallets
    @param addr Address of Smart contract checker
    """
    assert msg.sender == self.admin
    self.future_smart_wallet_checker = addr

    log SmartWalletCheckerComitted(self.future_smart_wallet_checker)


@external
def apply_smart_wallet_checker():
    """
    @notice Apply setting external contract to check approved smart contract wallets
    """
    assert msg.sender == self.admin
    self.smart_wallet_checker = self.future_smart_wallet_checker

    log SmartWalletCheckerApplied(self.smart_wallet_checker)

@external
def recoverERC20(token_addr: address, amount: uint256):
    """
    @dev Used to recover non-FPIS ERC20 tokens
    """
    assert msg.sender == self.admin  # dev: admin only
    assert token_addr != self.token  # Cannot recover FPIS. Use toggleEmergencyUnlock instead and have users pull theirs out individually
    ERC20(token_addr).transfer(self.admin, amount)

@internal
def assert_not_contract(addr: address):
    """
    @notice Check if the call is from a whitelisted smart contract, revert if not
    @param addr Address to be checked
    """
    if addr != tx.origin:
        checker: address = self.smart_wallet_checker
        if checker != ZERO_ADDRESS:
            if SmartWalletChecker(checker).check(addr):
                return
        raise "Smart contract depositors not allowed"

@external
@view
def get_last_user_slope(addr: address) -> int128:
    """
    @notice Get the most recently recorded rate of voting power decrease for `addr`
    @param addr Address of the user wallet
    @return Value of the slope
    """
    uepoch: uint256 = self.user_point_epoch[addr]
    return self.user_point_history[addr][uepoch].slope

@external
@view
def get_last_user_bias(addr: address) -> int128:
    """
    @notice Get the most recently recorded bias (principal)
    @param addr Address of the user wallet
    @return Value of the bias
    """
    uepoch: uint256 = self.user_point_epoch[addr]
    return self.user_point_history[addr][uepoch].bias

@external
@view
def get_last_user_point(addr: address) -> Point:
    """
    @notice Get the most recently recorded Point for `addr`
    @param addr Address of the user wallet
    @return Latest Point for the user
    """
    uepoch: uint256 = self.user_point_epoch[addr]
    return self.user_point_history[addr][uepoch]

@external
@view
def user_point_history__ts(_addr: address, _idx: uint256) -> uint256:
    """
    @notice Get the timestamp for checkpoint `_idx` for `_addr`
    @param _addr User wallet address
    @param _idx User epoch number
    @return Epoch time of the checkpoint
    """
    return self.user_point_history[_addr][_idx].ts

@external
@view
def get_last_point() -> Point:
    """
    @notice Get the most recently recorded Point for the contract
    @return Latest Point for the contract
    """
    return self.point_history[self.epoch]

@external
@view
def locked__end(_addr: address) -> uint256:
    """
    @notice Get timestamp when `_addr`'s lock finishes
    @param _addr User wallet
    @return Epoch time of the lock end
    """
    return self.locked[_addr].end

@external
@view
def locked__amount(_addr: address) -> int128:
    """
    @notice Get amount of `_addr`'s locked FPIS
    @param _addr User wallet
    @return FPIS amount locked by `_addr`
    """
    return self.locked[_addr].amount

@external
@view
def curr_period_start() -> uint256:
    """
    @notice Get the start timestamp of this week's period
    @return Epoch time of the period start
    """
    return (block.timestamp / WEEK * WEEK)

@external
@view
def next_period_start() -> uint256:
    """
    @notice Get the start timestamp of next week's period
    @return Epoch time of next week's period start
    """
    return (WEEK + (block.timestamp / WEEK * WEEK))


@internal
def _checkpoint(addr: address, old_locked: LockedBalance, new_locked: LockedBalance, flag: int128):
    """
    @notice Record global and per-user data to checkpoint
    @param addr User's wallet address. No user checkpoint if 0x0
    @param old_locked Previous locked amount / end lock time for the user
    @param new_locked New locked amount / end lock time for the user
    """
    u_old: Point = empty(Point)
    u_new: Point = empty(Point)
    old_dslope: int128 = 0
    new_dslope: int128 = 0
    _epoch: uint256 = self.epoch

    if addr != ZERO_ADDRESS:
        # Calculate slopes and biases
        # Kept at zero when they have to


        # ==============================================================================
        # -------------------------------- veCRV method --------------------------------
        # if old_locked.end > block.timestamp and old_locked.amount > 0:
        #     u_old.slope = old_locked.amount / MAXTIME_I128
        #     u_old.bias = u_old.slope * convert(old_locked.end - block.timestamp, int128)
        # if new_locked.end > block.timestamp and new_locked.amount > 0:
        #     u_new.slope = new_locked.amount / MAXTIME_I128
        #     u_new.bias = u_new.slope * convert(new_locked.end - block.timestamp, int128)

        # -------------------------------- New method A --------------------------------
        # if old_locked.end > block.timestamp and old_locked.amount > 0:
        #     u_old.slope = (old_locked.amount / MAXTIME_I128) * VOTE_WEIGHT_MULTIPLIER_I128
        #     u_old.bias = u_old.slope * convert(old_locked.end - block.timestamp, int128)
        # if new_locked.end > block.timestamp and new_locked.amount > 0:
        #     u_new.slope = (new_locked.amount / MAXTIME_I128) * VOTE_WEIGHT_MULTIPLIER_I128
        #     u_new.bias = u_new.slope * convert(new_locked.end - block.timestamp, int128)

        # -------------------------------- New method B --------------------------------
        if old_locked.end > block.timestamp and old_locked.amount > 0:
            u_old.slope = (old_locked.amount * VOTE_WEIGHT_MULTIPLIER_I128) / MAXTIME_I128 
            u_old.bias = old_locked.amount + (u_old.slope * convert(old_locked.end - block.timestamp, int128))
        if new_locked.end > block.timestamp and new_locked.amount > 0:
            u_new.slope = (new_locked.amount * VOTE_WEIGHT_MULTIPLIER_I128) / MAXTIME_I128
            u_new.bias = new_locked.amount + (u_new.slope * convert(new_locked.end - block.timestamp, int128))

        # ==============================================================================

        # Read values of scheduled changes in the slope
        # old_locked.end can be in the past and in the future
        # new_locked.end can ONLY by in the FUTURE unless everything expired: than zeros
        old_dslope = self.slope_changes[old_locked.end]
        if new_locked.end != 0:
            if new_locked.end == old_locked.end:
                new_dslope = old_dslope
            else:
                new_dslope = self.slope_changes[new_locked.end]

    last_point: Point = Point({bias: 0, slope: 0, ts: block.timestamp, blk: block.number, fpis_amt: 0})
    if _epoch > 0:
        last_point = self.point_history[_epoch]
    # else:
    #     last_point.fpis_amt = ERC20(self.token).balanceOf(self) # saves gas by only calling once
    last_checkpoint: uint256 = last_point.ts
    # initial_last_point is used for extrapolation to calculate block number
    # (approximately, for *At methods) and save them
    # as we cannot figure that out exactly from inside the contract
    initial_last_point: Point = last_point
    block_slope: uint256 = 0  # dblock/dt
    if block.timestamp > last_point.ts:
        block_slope = MULTIPLIER * (block.number - last_point.blk) / (block.timestamp - last_point.ts)
    # If last point is already recorded in this block, slope=0
    # But that's ok b/c we know the block in such case

    # Go over weeks to fill history and calculate what the current point is
    t_i: uint256 = (last_checkpoint / WEEK) * WEEK
    for i in range(255):
        # Hopefully it won't happen that this won't get used in 5 years!
        # If it does, users will be able to withdraw but vote weight will be broken
        t_i += WEEK
        d_slope: int128 = 0
        if t_i > block.timestamp:
            t_i = block.timestamp
        else:
            d_slope = self.slope_changes[t_i]
        last_point.bias -= last_point.slope * convert(t_i - last_checkpoint, int128)
        last_point.slope += d_slope
        if last_point.bias < 0:  # This can happen
            last_point.bias = 0
        if last_point.slope < 0:  # This cannot happen - just in case
            last_point.slope = 0
        last_checkpoint = t_i
        last_point.ts = t_i
        last_point.blk = initial_last_point.blk + block_slope * (t_i - initial_last_point.ts) / MULTIPLIER
        _epoch += 1

        # Fill for the current block, if applicable
        if t_i == block.timestamp:
            last_point.blk = block.number
            # last_point.fpis_amt = ERC20(self.token).balanceOf(self)
            break
        else:
            self.point_history[_epoch] = last_point

    self.epoch = _epoch
    # Now point_history is filled until t=now

    if addr != ZERO_ADDRESS:
        # If last point was in this block, the slope change has been applied already
        # But in such case we have 0 slope(s)
        last_point.slope += (u_new.slope - u_old.slope)
        last_point.bias += (u_new.bias - u_old.bias)
        

        # ==============================================================================
        # Handle FPIS balance change (withdrawals and deposits)
        # -------------------------------- veFXS method --------------------------------
        # Nothing

        # -------------------------------- New method A --------------------------------
        # if (new_locked.amount > old_locked.amount):
        #     last_point.fpis_amt += convert(new_locked.amount - old_locked.amount, uint256)

        # # Withdraw condition. Need to reduce the total bias (we use the locked amount as the floor, as opposed to veCRV using 0)
        # if (new_locked.amount == 0 and new_locked.end == 0):
        #     last_point.fpis_amt -= convert(old_locked.amount, uint256)

        #     # Remove the offset
        #     # Corner case to fix issue because emergency unlock allows withdrawal before expiry and disrupts the math
        #     if not (self.emergencyUnlockActive):
        #         last_point.bias -= old_locked.amount
            
        # --------------- New method B [veFPIS changes on proxy activity] --------------
        # if (new_locked.amount > old_locked.amount):
        #     last_point.fpis_amt += convert(new_locked.amount - old_locked.amount, uint256)

        #     # Add the bias back if you are paying back after expiry
        #     if ((flag == PROXY_PAYBACK) and (new_locked.end < block.timestamp)):
        #         last_point.bias -= old_locked.amount

        # elif (new_locked.amount < old_locked.amount):
        #     last_point.fpis_amt -= convert(old_locked.amount - new_locked.amount, uint256)

        #     # Subtract the bias if you are liquidating after expiry
        #     if ((flag == PROXY_LIQUIDATION) and (new_locked.end < block.timestamp)):
        #         last_point.bias -= old_locked.amount

        #     # Remove the offset
        #     # Corner case to fix issue because emergency unlock allows withdrawal before expiry and disrupts the math
        #     if (new_locked.amount == 0):
        #         if (not (self.emergencyUnlockActive)):
        #             last_point.bias -= old_locked.amount

        # ---------- New method C [No veFPIS changes except for liquidations] ----------
        if (new_locked.amount > old_locked.amount):
            last_point.fpis_amt += convert(new_locked.amount - old_locked.amount, uint256)

        if (new_locked.amount < old_locked.amount):
            last_point.fpis_amt -= convert(old_locked.amount - new_locked.amount, uint256)

            # Subtract the bias if you are liquidating after expiry
            if ((flag == PROXY_LIQUIDATION) and (new_locked.end < block.timestamp)):
                last_point.bias -= old_locked.amount

            # Remove the offset
            # Corner case to fix issue because emergency unlock allows withdrawal before expiry and disrupts the math
            if (new_locked.amount == 0):
                if (not (self.emergencyUnlockActive)):
                    last_point.bias -= old_locked.amount

        # ==============================================================================

        # Check for zeroes
        if last_point.slope < 0:
            last_point.slope = 0
        if last_point.bias < 0:
            last_point.bias = 0


    # Record the changed point into history
    self.point_history[_epoch] = last_point

    if addr != ZERO_ADDRESS:
        # Schedule the slope changes (slope is going down)
        # We subtract new_user_slope from [new_locked.end]
        # and add old_user_slope to [old_locked.end]
        if old_locked.end > block.timestamp:
            # old_dslope was <something> - u_old.slope, so we cancel that
            old_dslope += u_old.slope
            if new_locked.end == old_locked.end:
                old_dslope -= u_new.slope  # It was a new deposit, not extension
            self.slope_changes[old_locked.end] = old_dslope

        if new_locked.end > block.timestamp:
            if new_locked.end > old_locked.end:
                new_dslope -= u_new.slope  # old slope disappeared at this point
                self.slope_changes[new_locked.end] = new_dslope
            # else: we recorded it already in old_dslope

        # Now handle user history
        user_epoch: uint256 = self.user_point_epoch[addr] + 1

        self.user_point_epoch[addr] = user_epoch
        u_new.ts = block.timestamp
        u_new.blk = block.number
        u_new.fpis_amt = convert(self.locked[addr].amount, uint256)
        self.user_point_history[addr][user_epoch] = u_new


@internal
def _deposit_for(_staker_addr: address, _payer_addr: address, _value: uint256, unlock_time: uint256, locked_balance: LockedBalance, type: int128):
    """
    @notice Deposit and lock tokens for a user
    @param _staker_addr User's wallet address
    @param _payer_addr Payer address for the deposit
    @param _value Amount to deposit
    @param unlock_time New time when to unlock the tokens, or 0 if unchanged
    @param locked_balance Previous locked amount / timestamp
    """
    # Get the staker's balance and the total supply
    _locked: LockedBalance = locked_balance
    supply_before: uint256 = self.supply

    # Increase the supply
    self.supply = supply_before + _value

    # Not the old position
    old_locked: LockedBalance = _locked

    # Adding to existing lock, or if a lock is expired - creating a new one
    _locked.amount += convert(_value, int128)
    if unlock_time != 0:
        _locked.end = unlock_time
    self.locked[_staker_addr] = _locked

    # Possibilities:
    # Both old_locked.end could be current or expired (>/< block.timestamp)
    # value == 0 (extend lock) or value > 0 (add to lock or extend lock)
    # _locked.end > block.timestamp (always)
    self._checkpoint(_staker_addr, old_locked, _locked, type)

    if _value != 0:
        assert ERC20(self.token).transferFrom(_payer_addr, self, _value)

    log Deposit(_staker_addr, _payer_addr, _value, _locked.end, type, block.timestamp)
    log Supply(supply_before, supply_before + _value)


@external
def checkpoint():
    """
    @notice Record global data to checkpoint
    """
    self._checkpoint(ZERO_ADDRESS, empty(LockedBalance), empty(LockedBalance), 0)


@external
@nonreentrant('lock')
def create_lock(_value: uint256, _unlock_time: uint256):
    """
    @notice Deposit `_value` tokens for `msg.sender` and lock until `_unlock_time`
    @param _value Amount to deposit
    @param _unlock_time Epoch time when tokens unlock, rounded down to whole weeks
    """
    self.assert_not_contract(msg.sender)
    unlock_time: uint256 = (_unlock_time / WEEK) * WEEK  # Locktime is rounded down to weeks
    _locked: LockedBalance = self.locked[msg.sender]

    assert _value > 0, "Value must be > 0"  # dev: need non-zero value
    assert _locked.amount == 0, "Withdraw old tokens first"
    assert unlock_time > block.timestamp, "Can only lock until time in the future"
    assert unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 4 years max"

    self._deposit_for(msg.sender, msg.sender, _value, unlock_time, _locked, CREATE_LOCK_TYPE)



@external
@nonreentrant('lock')
def increase_amount(_value: uint256):
    """
    @notice Deposit `_value` additional tokens for `msg.sender`
            without modifying the unlock time
    @param _value Amount of tokens to deposit and add to the lock
    """
    self.assert_not_contract(msg.sender)
    _locked: LockedBalance = self.locked[msg.sender]

    assert _value > 0, "Value must be > 0"  # dev: need non-zero value
    assert _locked.amount > 0, "No existing lock found"
    assert _locked.end > block.timestamp, "Cannot add to expired lock. Withdraw"

    self._deposit_for(msg.sender, msg.sender, _value, 0, _locked, INCREASE_LOCK_AMOUNT)


@external
@nonreentrant('lock')
def increase_unlock_time(_unlock_time: uint256):
    """
    @notice Extend the unlock time for `msg.sender` to `_unlock_time`
    @param _unlock_time New epoch time for unlocking
    """
    self.assert_not_contract(msg.sender)
    _locked: LockedBalance = self.locked[msg.sender]
    unlock_time: uint256 = (_unlock_time / WEEK) * WEEK  # Locktime is rounded down to weeks

    assert _locked.end > block.timestamp, "Lock expired"
    assert _locked.amount > 0, "Nothing is locked"
    assert unlock_time > _locked.end, "Can only increase lock duration"
    assert unlock_time <= block.timestamp + MAXTIME, "Voting lock can be 4 years max"

    self._deposit_for(msg.sender, msg.sender, 0, unlock_time, _locked, INCREASE_UNLOCK_TIME)


@internal
def _withdraw(staker_addr: address, addr_out: address, locked_in: LockedBalance, amount_in: int128, flag: int128):
    """
    @notice Withdraw tokens for `staker_addr`
    @dev Must be greater than 0 and less than the user's locked amount
    @dev Only special users can withdraw less than the full locked amount (namely lending platforms, etc)
    """
    assert ((amount_in >= 0) and (amount_in <= locked_in.amount)), "Cannot withdraw more than the user has"
    _locked: LockedBalance = locked_in
    value: uint256 = convert(amount_in, uint256)

    old_locked: LockedBalance = _locked
    if (amount_in == _locked.amount):
        _locked.end = 0 # End the position if doing a full withdrawal
    _locked.amount -= amount_in

    self.locked[staker_addr] = _locked
    supply_before: uint256 = self.supply
    self.supply = supply_before - value

    # old_locked can have either expired <= timestamp or zero end
    # _locked has only 0 end
    # Both can have >= 0 amount
    # addr: address, old_locked: LockedBalance, new_locked: LockedBalance
    self._checkpoint(staker_addr, old_locked, _locked, flag)

    assert ERC20(self.token).transfer(addr_out, value), "ERC20 transfer out failed"

    log Withdraw(staker_addr, addr_out, value, block.timestamp)
    log Supply(supply_before, supply_before - value)

@external
@nonreentrant('lock')
def proxy_payback_or_liquidate(
    _staker_addr: address, 
    _payback_amt: uint256, 
    _liquidation_amt: uint256,
    _liquidation_fee_amt: uint256
):
    """
    @notice Proxy pays back `_staker_addr`'s loan and increases the veFPIS base / bias. 
    @dev Also optionally liquidates part of the staker's core veFPIS position to cover bad debt
    @dev E.g. $10K loan is now worth $8K and staker wants to close it out (or the proxy wants to liquidate it)
    @dev Then call with _payback_amt = $8K and _liquidation_amt = $2K
    @dev Usually triggered by the staker at the dapp level
    """
    # Make sure that the function isn't disabled, and also that the proxy is valid
    assert (self.proxyPaybackOrLiquidationsEnabled), "Currently disabled"
    assert (self.lending_proxy == msg.sender), "Proxy not whitelisted [admin level]"
    assert (self.staker_whitelisted_proxy[_staker_addr] == msg.sender), "Proxy not whitelisted [staker level]"

    # Get the staker's locked position and proxy balance
    _locked: LockedBalance = self.locked[_staker_addr]
    _proxy_balance: uint256 = self.user_fpis_in_proxy[_staker_addr]

    # Validate some things
    assert _locked.amount > 0, "No existing lock found"
    assert (_payback_amt + _liquidation_amt) > 0, "Amounts must be non-zero"

    # Handle the payback (returns FPIS back to the user's veFPIS position)
    if (_payback_amt > 0):
        # Make sure there is actually something to pay back
        assert _proxy_balance > 0, "Nothing to pay back for this proxy"

        # Cannot pay back more than what was borrowed
        assert _payback_amt <= _proxy_balance, "Trying to pay back too much"

        # Proxy gives back FPIS
        # NOTE: Proxy needs to approve() to the veFPIS contract first
        # _staker_addr, _payer_addr, _value, unlock_time, locked_balance, type
        # self._deposit_for(_staker_addr, msg.sender, _payback_amt, _locked.end, _locked, PROXY_PAYBACK)
        # self._deposit_for(_staker_addr, msg.sender, _payback_amt, 0, _locked, PROXY_PAYBACK)
        if _payback_amt != 0:
            assert ERC20(self.token).transferFrom(msg.sender, self, _payback_amt)

        # Checkpoint
        # Amount doesn't change
        self._checkpoint(_staker_addr, _locked, _locked, PROXY_PAYBACK)

        # Lower the loaned balance 
        self.user_fpis_in_proxy[_staker_addr] -= _payback_amt

        # Refresh the locked and proxy balances
        _locked = self.locked[_staker_addr]
        _proxy_balance = self.user_fpis_in_proxy[_staker_addr]

    # Handle the liquidation (proxy takes FPIS from the user's veFPIS position)
    if (_liquidation_amt > 0): 
        # Prevents unknown exploits from wiping the entire veFPIS contract
        # assert (_liquidation_amt + _liquidation_fee_amt) <= convert(_locked.amount, uint256), "Cannot liquidate more than the user has"

        # Withdraw the amount to liquidate from the staker's core position and give it to the proxy
        # Also add the fee, if any
        self._withdraw(_staker_addr, msg.sender, _locked, convert(_liquidation_amt + _liquidation_fee_amt, int128), PROXY_LIQUIDATION)

    log ProxyPaybackOrLiquidation(_staker_addr, msg.sender, _payback_amt, _liquidation_amt, _liquidation_fee_amt)


@external
@nonreentrant('lock')
def withdraw():
    """
    @notice Withdraw all tokens for `msg.sender`
    @dev Only possible if the lock has expired or the emergency unlock is active
    @dev Also need to make sure all debts to the proxy, if any, are paid off first
    """
    # Get the staker's locked position
    _locked: LockedBalance = self.locked[msg.sender]

    # Validate some things
    assert ((block.timestamp >= _locked.end) or (self.emergencyUnlockActive)), "The lock didn't expire"
    assert (self.user_fpis_in_proxy[msg.sender] == 0), "Outstanding FPIS in proxy. Have proxy use proxy_payback_or_liquidate"
    
    # Allow the withdrawal
    self._withdraw(msg.sender, msg.sender, _locked, _locked.amount, USER_WITHDRAW)


@external
@nonreentrant('lock')
def transfer_to_proxy(_staker_addr: address, _transfer_amt: int128):
    """
    @notice Transfer tokens for `_staker_addr` to the proxy, to be loaned or otherwise used
    @dev Only possible for whitelisted proxies, both by the admin and by the staker
    """
    # Make sure that the function isn't disabled, and also that the proxy is valid
    assert (self.proxyTransferTosEnabled), "Currently disabled"
    assert (self.lending_proxy == msg.sender), "Proxy not whitelisted [admin level]"
    assert (self.staker_whitelisted_proxy[_staker_addr] == msg.sender), "Proxy not whitelisted [staker level]"
    
    # Get the staker's locked position
    _locked: LockedBalance = self.locked[_staker_addr]

    # Make sure the position isn't expired
    assert (block.timestamp < _locked.end), "No transfers after expiration"

    # Note the amount moved to the proxy 
    _value: uint256 = convert(_transfer_amt, uint256)
    self.user_fpis_in_proxy[_staker_addr] += _value

    # Allow the transfer to the proxy.
    # This will reduce the user's veFPIS balance
    # self._withdraw(_staker_addr, msg.sender, _locked, _transfer_amt, PROXY_TRANSFER)
    # This will not reduce the user's veFPIS balance
    assert ERC20(self.token).transfer(msg.sender, _value)

    # Checkpoint
    self._checkpoint(_staker_addr, _locked, _locked, PROXY_TRANSFER)

    log TransferToProxy(_staker_addr, msg.sender, _value)


@internal
@view
def find_block_epoch(_block: uint256, max_epoch: uint256) -> uint256:
    """
    @notice Binary search to estimate timestamp for block number
    @param _block Block to find
    @param max_epoch Don't go beyond this epoch
    @return Approximate timestamp for block
    """
    # Binary search
    _min: uint256 = 0
    _max: uint256 = max_epoch
    for i in range(128):  # Will be always enough for 128-bit numbers
        if _min >= _max:
            break
        _mid: uint256 = (_min + _max + 1) / 2
        if self.point_history[_mid].blk <= _block:
            _min = _mid
        else:
            _max = _mid - 1
    return _min


@external
@view
def balanceOf(addr: address, _t: uint256 = block.timestamp) -> uint256:
    """
    @notice Get the current voting power for `msg.sender`
    @dev Adheres to the ERC20 `balanceOf` interface for Aragon compatibility
    @param addr User wallet address
    @param _t Epoch time to return voting power at
    @return User voting power
    """
    _epoch: uint256 = self.user_point_epoch[addr]
    if _epoch == 0:
        return 0
    else:
        # Just leave this alone. It is fine if it decays to 1 veFPIS = 1 bias
        # Otherwise it would be inconsistent with totalSupply and totalSupplyAt
        # _locked: LockedBalance = self.locked[addr]
        # if (block.timestamp >= _locked.end): return 0

        last_point: Point = self.user_point_history[addr][_epoch]
        last_point.bias -= last_point.slope * convert(_t - last_point.ts, int128)
        if last_point.bias < 0:
            last_point.bias = 0

        # ==============================================================================
        # -------------------------------- veCRV method --------------------------------
        # weighted_supply: uint256 = convert(last_point.bias, uint256)

        # -------------------------------- veFXS method --------------------------------
        # unweighted_supply: uint256 = convert(last_point.bias, uint256)
        # weighted_supply: uint256 = last_point.fpis_amt + (VOTE_WEIGHT_MULTIPLIER * unweighted_supply)

        # -------------------------------- New method A --------------------------------
        # unweighted_supply: uint256 = last_point.fpis_amt
        # weighted_supply: uint256 = unweighted_supply + convert(last_point.bias, uint256)

        # -------------------------------- New method B --------------------------------
        # unweighted_supply: uint256 = last_point.fpis_amt
        # weighted_supply: uint256 = convert(last_point.bias, uint256)
        # if weighted_supply < last_point.fpis_amt:
        #     weighted_supply = last_point.fpis_amt

        # -------------------------------- veFPIS --------------------------------
        # Mainly used to counter negative biases
        weighted_supply: uint256 = convert(last_point.bias, uint256)
        if weighted_supply < last_point.fpis_amt:
            weighted_supply = last_point.fpis_amt
        

        # ==============================================================================

        return weighted_supply


@external
@view
def balanceOfAt(addr: address, _block: uint256) -> uint256:
    """
    @notice Measure voting power of `addr` at block height `_block`
    @dev Adheres to MiniMe `balanceOfAt` interface: https://github.com/Giveth/minime
    @param addr User's wallet address
    @param _block Block to calculate the voting power at
    @return Voting power
    """
    # Copying and pasting totalSupply code because Vyper cannot pass by
    # reference yet
    assert _block <= block.number

    # Binary search
    _min: uint256 = 0
    _max: uint256 = self.user_point_epoch[addr]
    for i in range(128):  # Will be always enough for 128-bit numbers
        if _min >= _max:
            break
        _mid: uint256 = (_min + _max + 1) / 2
        if self.user_point_history[addr][_mid].blk <= _block:
            _min = _mid
        else:
            _max = _mid - 1

    upoint: Point = self.user_point_history[addr][_min]

    max_epoch: uint256 = self.epoch
    _epoch: uint256 = self.find_block_epoch(_block, max_epoch)
    point_0: Point = self.point_history[_epoch]
    d_block: uint256 = 0
    d_t: uint256 = 0
    if _epoch < max_epoch:
        point_1: Point = self.point_history[_epoch + 1]
        d_block = point_1.blk - point_0.blk
        d_t = point_1.ts - point_0.ts
    else:
        d_block = block.number - point_0.blk
        d_t = block.timestamp - point_0.ts
    block_time: uint256 = point_0.ts
    if d_block != 0:
        block_time += d_t * (_block - point_0.blk) / d_block

    upoint.bias -= upoint.slope * convert(block_time - upoint.ts, int128)

    # ==============================================================================
    # -------------------------------- veCRV method --------------------------------
    # if upoint.bias >= 0:
    #     return convert(upoint.bias, uint256)
    # else:
    #     return 0

    # -------------------------------- veFXS method --------------------------------
    # unweighted_supply: uint256 = convert(upoint.bias, uint256) # Original from veCRV
    # weighted_supply: uint256 = upoint.fxs_amt + (VOTE_WEIGHT_MULTIPLIER * unweighted_supply)

    # -------------------------------- New method A --------------------------------
    # unweighted_supply: uint256 = upoint.fpis_amt
    # weighted_supply: uint256 = unweighted_supply + convert(upoint.bias, uint256)

    # -------------------------------- New method B --------------------------------
    # unweighted_supply: uint256 = upoint.fpis_amt
    # weighted_supply: uint256 = convert(upoint.bias, uint256)
    # if weighted_supply < upoint.fpis_amt:
    #     weighted_supply = upoint.fpis_amt

    # ----------------------------------- veFPIS -----------------------------------
    if ((upoint.bias >= 0) or (upoint.fpis_amt >= 0)):
        return convert(upoint.bias, uint256)
    else:
        return 0
    # ==============================================================================

        
@internal
@view
def supply_at(point: Point, t: uint256) -> uint256:
    """
    @notice Calculate total voting power at some point in the past
    @param point The point (bias/slope) to start search from
    @param t Time to calculate the total voting power at
    @return Total voting power at that time
    """
    last_point: Point = point
    t_i: uint256 = (last_point.ts / WEEK) * WEEK
    for i in range(255):
        t_i += WEEK
        d_slope: int128 = 0
        if t_i > t:
            t_i = t
        else:
            d_slope = self.slope_changes[t_i]
        last_point.bias -= last_point.slope * convert(t_i - last_point.ts, int128)
        if t_i == t:
            break
        last_point.slope += d_slope
        last_point.ts = t_i

    if last_point.bias < 0:
        last_point.bias = 0

    # ==============================================================================
    # ----------------------------------- veCRV ------------------------------------
    # weighted_supply: uint256 = convert(last_point.bias, uint256)

    # ----------------------------------- veFXS ------------------------------------
    # unweighted_supply: uint256 = convert(last_point.bias, uint256)
    # weighted_supply: uint256 = last_point.fpis_amt + (VOTE_WEIGHT_MULTIPLIER * unweighted_supply)

    # -------------------------------- New method A --------------------------------
    # unweighted_supply: uint256 = last_point.fpis_amt
    # weighted_supply: uint256 = unweighted_supply + convert(last_point.bias, uint256)

    # -------------------------------- New method B --------------------------------
    # unweighted_supply: uint256 = last_point.fpis_amt
    # weighted_supply: uint256 = convert(last_point.bias, uint256)
    # if weighted_supply < last_point.fpis_amt:
    #     weighted_supply = last_point.fpis_amt

    # ----------------------------------- veFPIS -----------------------------------
    weighted_supply: uint256 = convert(last_point.bias, uint256)
    if weighted_supply < last_point.fpis_amt:
        weighted_supply = last_point.fpis_amt

    # ==============================================================================

    return weighted_supply


@external
@view
def totalSupply(t: uint256 = block.timestamp) -> uint256:
    """
    @notice Calculate total voting power
    @dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
    @return Total voting power
    """
    _epoch: uint256 = self.epoch
    last_point: Point = self.point_history[_epoch]
    return self.supply_at(last_point, t)


@external
@view
def totalSupplyAt(_block: uint256) -> uint256:
    """
    @notice Calculate total voting power at some point in the past
    @param _block Block to calculate the total voting power at
    @return Total voting power at `_block`
    """
    assert _block <= block.number
    _epoch: uint256 = self.epoch
    target_epoch: uint256 = self.find_block_epoch(_block, _epoch)

    point: Point = self.point_history[target_epoch]
    dt: uint256 = 0
    if target_epoch < _epoch:
        point_next: Point = self.point_history[target_epoch + 1]
        if point.blk != point_next.blk:
            dt = (_block - point.blk) * (point_next.ts - point.ts) / (point_next.blk - point.blk)
    else:
        if point.blk != block.number:
            dt = (_block - point.blk) * (block.timestamp - point.ts) / (block.number - point.blk)
    # Now dt contains info on how far are we beyond point

    return self.supply_at(point, point.ts + dt)

# Dummy methods for compatibility with Aragon

@external
@view
def totalFPISSupply() -> uint256:
    """
    @notice Calculate FPIS supply
    @dev Adheres to the ERC20 `totalSupply` interface for Aragon compatibility
    @return Total FPIS supply
    """
    return self.supply # Don't use ERC20(self.token).balanceOf(self)

@external
@view
def totalFPISSupplyAt(_block: uint256) -> uint256:
    """
    @notice Calculate total FPIS at some point in the past
    @param _block Block to calculate the total voting power at
    @return Total FPIS supply at `_block`
    """
    assert _block <= block.number
    _epoch: uint256 = self.epoch
    target_epoch: uint256 = self.find_block_epoch(_block, _epoch)
    point: Point = self.point_history[target_epoch]
    return point.fpis_amt

@external
def changeController(_newController: address):
    """
    @dev Dummy method required for Aragon compatibility
    """
    assert msg.sender == self.controller
    self.controller = _newController


@external
def toggleEmergencyUnlock():
    """
    @dev Used to allow early withdrawals of veFPIS back into FPIS, in case of an emergency
    """
    assert msg.sender == self.admin  # dev: admin only
    self.emergencyUnlockActive = not (self.emergencyUnlockActive)
    self._checkpoint(ZERO_ADDRESS, empty(LockedBalance), empty(LockedBalance), 0)

    log EmergencyUnlockToggled(self.emergencyUnlockActive)

@external
def toggleProxyTransferTos():
    """
    @dev Toggles the ability to send FPIS to proxies
    """
    assert msg.sender == self.admin  # dev: admin only
    self.proxyTransferTosEnabled = not (self.proxyTransferTosEnabled)
    self._checkpoint(ZERO_ADDRESS, empty(LockedBalance), empty(LockedBalance), 0)

    log ProxyTransferTosToggled(self.proxyTransferTosEnabled)

@external
def toggleProxyPaybackOrLiquidations():
    """
    @dev Toggles the ability for the proxy to pay back or liquidate a user 
    """
    assert msg.sender == self.admin  # dev: admin only
    self.proxyPaybackOrLiquidationsEnabled = not (self.proxyPaybackOrLiquidationsEnabled)
    self._checkpoint(ZERO_ADDRESS, empty(LockedBalance), empty(LockedBalance), 0)

    log ProxyPaybackOrLiquidationsToggled(self.proxyPaybackOrLiquidationsEnabled)

@external
def adminSetProxy(_proxy: address):
    """
    @dev Admin sets the lending proxy
    @param _proxy The lending proxy address 
    """
    assert msg.sender == self.admin, "Admin only"  # dev: admin only
    self.lending_proxy = _proxy

    log LendingProxySet(_proxy)


@external
def stakerSetProxy(_proxy: address):
    """
    @dev Staker lets a particular address do activities on their behalf
    @dev Each staker can only have one proxy, to keep things / collateral / LTC calculations simple
    @param _proxy The address the staker will let withdraw/deposit for them 
    """
    # Do some checks
    assert (_proxy == ZERO_ADDRESS or self.lending_proxy == _proxy), "Proxy not whitelisted [admin level]"
    assert (self.user_fpis_in_proxy[msg.sender] == 0), "Outstanding FPIS in proxy. Have proxy use proxy_payback_or_liquidate"

    # Set the proxy
    self.staker_whitelisted_proxy[msg.sender] = _proxy

    log StakerProxySet(_proxy)