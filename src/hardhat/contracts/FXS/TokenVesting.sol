// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.6.11;

import "../ERC20/ERC20Custom.sol";
import "../ERC20/ERC20.sol";
import "../Math/SafeMath.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 * 
 * Modified from OpenZeppelin's TokenVesting.sol draft
 */
contract TokenVesting {
    // The vesting schedule is time-based (i.e. using block timestamps as opposed to e.g. block numbers), and is
    // therefore sensitive to timestamp manipulation (which is something miners can do, to a certain degree). Therefore,
    // it is recommended to avoid using short time durations (less than a minute). Typical vesting schemes, with a
    // cliff period of a year and a duration of four years, are safe to use.
    // solhint-disable not-rely-on-time

    using SafeMath for uint256;

    event TokensReleased(uint256 amount);
    event TokenVestingRevoked();

    // beneficiary of tokens after they are released
    address private _beneficiary;

    // owner (grantor) of the tokens
    address private _owner;

    // Durations and timestamps are expressed in UNIX time, the same units as block.timestamp.
    uint256 private _cliff;
    uint256 private _start;
    uint256 private _duration;

    address public _FXS_contract_address;
    ERC20 FXS;
    address public _timelock_address;
    bool public _revocable;

    uint256 private _released;
    bool public _revoked;

    /**
     * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
     * beneficiary, gradually in a linear fashion until start + duration. By then all
     * of the balance will have vested.
     * @param beneficiary address of the beneficiary to whom vested tokens are transferred
     * @param cliffDuration duration in seconds of the cliff in which tokens will begin to vest
     * @param start the time (as Unix time) at which point vesting starts
     * @param duration duration in seconds of the period in which the tokens will vest
     * @param revocable whether the vesting is revocable or not
     */

    constructor (
        address beneficiary,
        uint256 start,
        uint256 cliffDuration,
        uint256 duration,
        bool revocable
    ) public {
        require(beneficiary != address(0), "TokenVesting: beneficiary is the zero address");
        // solhint-disable-next-line max-line-length
        require(cliffDuration <= duration, "TokenVesting: cliff is longer than duration");
        require(duration > 0, "TokenVesting: duration is 0");
        // solhint-disable-next-line max-line-length
        require(start.add(duration) > block.timestamp, "TokenVesting: final time is before current time");

        _beneficiary = beneficiary;
        _revocable = revocable;
        _duration = duration;
        _cliff = start.add(cliffDuration);
        _start = start;
        _owner = msg.sender;
    }

    function setFXSAddress(address FXS_address) public {
        require(msg.sender == _owner, "must be set by the owner");
        _FXS_contract_address = FXS_address;
        FXS = ERC20(FXS_address);
    }

    function setTimelockAddress(address timelock_address) public {
        require(msg.sender == _owner, "must be set by the owner");
        _timelock_address = timelock_address;
    }

    /**
     * @return the beneficiary of the tokens.
     */
    function getBeneficiary() public view returns (address) {
        return _beneficiary;
    }

    /**
     * @return the cliff time of the token vesting.
     */
    function getCliff() public view returns (uint256) {
        return _cliff;
    }

    /**
     * @return the start time of the token vesting.
     */
    function getStart() public view returns (uint256) {
        return _start;
    }

    /**
     * @return the duration of the token vesting.
     */
    function getDuration() public view returns (uint256) {
        return _duration;
    }

    /**
     * @return true if the vesting is revocable.
     */
    function getRevocable() public view returns (bool) {
        return _revocable;
    }

    /**
     * @return the amount of the token released.
     */
    function getReleased() public view returns (uint256) {
        return _released;
    }

    /**
     * @return true if the token is revoked.
     */
    function getRevoked() public view returns (bool) {
        return _revoked;
    }

    /**
     * @notice Transfers vested tokens to beneficiary.
     */
    function release() public {
        require(msg.sender == _beneficiary, "must be the beneficiary to release tokens");
        uint256 unreleased = _releasableAmount();

        require(unreleased > 0, "TokenVesting: no tokens are due");

        _released = _released.add(unreleased);

        FXS.transfer(_beneficiary, unreleased);

        emit TokensReleased(unreleased);
    }

    /**
     * @notice Allows the owner to revoke the vesting. Tokens already vested
     * remain in the contract, the rest are returned to the owner.
     */
    function revoke() public {
        require(msg.sender == _timelock_address, "Must be called by the timelock contract");
        require(_revocable, "TokenVesting: cannot revoke");
        require(!_revoked, "TokenVesting: token already revoked");

        uint256 balance = FXS.balanceOf(address(this));

        uint256 unreleased = _releasableAmount();
        uint256 refund = balance.sub(unreleased);

        _revoked = true;

        FXS.transfer(_owner, refund);

        emit TokenVestingRevoked();
    }

    // Added to support recovering possible airdrops
    function recoverERC20(address tokenAddress, uint256 tokenAmount) external {
        require(msg.sender == _beneficiary, "Must be called by the beneficiary");

        // Cannot recover the staking token or the rewards token
        require(tokenAddress != _FXS_contract_address, "Cannot withdraw the FXS through this function");
        ERC20(tokenAddress).transfer(_beneficiary, tokenAmount);
    }


    /**
     * @dev Calculates the amount that has already vested but hasn't been released yet.
     */
    function _releasableAmount() private view returns (uint256) {
        return _vestedAmount().sub(_released);
    }

    /**
     * @dev Calculates the amount that has already vested.
     */
    function _vestedAmount() private view returns (uint256) {
        uint256 currentBalance = FXS.balanceOf(address(this));
        uint256 totalBalance = currentBalance.add(_released);
        if (block.timestamp < _cliff) {
            return 0;
        } else if (block.timestamp >= _start.add(_duration) || _revoked) {
            return totalBalance;
        } else {
            return totalBalance.mul(block.timestamp.sub(_start)).div(_duration);
        }
    }

    uint256[44] private __gap;
}
