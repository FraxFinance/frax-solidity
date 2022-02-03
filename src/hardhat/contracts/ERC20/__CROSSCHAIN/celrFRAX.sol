// SPDX-License-Identifier: GPL-3.0-only

pragma solidity >=0.8.0;

import "../ERC20Virtual.sol";
import "../IERC20.sol";
import "../SafeERC20.sol";

interface IFraxCanoToken {
    function exchangeOldForCanonical(address, uint256) external returns (uint256);

    function exchangeCanonicalForOld(address, uint256) external returns (uint256);
}

abstract contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor() {
        _setOwner(_msgSender());
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        _setOwner(address(0));
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        _setOwner(newOwner);
    }

    function _setOwner(address newOwner) private {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }
}

/**
 * @title Intermediary bridge token that supports swapping with the canonical Frax token.
 */
contract celrFRAX is ERC20Virtual, Ownable {
    using SafeERC20 for IERC20;

    // The PeggedTokenBridge
    address public bridge;
    // The canonical Frax token that supports swapping
    address public immutable canonical;

    event BridgeUpdated(address bridge);

    modifier onlyBridge() {
        require(msg.sender == bridge, "caller is not bridge");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        address bridge_,
        address canonical_
    ) ERC20Virtual(name_, symbol_) {
        bridge = bridge_;
        canonical = canonical_;
    }

    function mint(address _to, uint256 _amount) external onlyBridge returns (bool) {
        _mint(address(this), _amount); // add amount to myself so exchangeOldForCanonical can transfer amount
        _approve(address(this), canonical, _amount);
        uint256 got = IFraxCanoToken(canonical).exchangeOldForCanonical(address(this), _amount);
        // now this has canonical token, next step is to transfer to user
        IERC20(canonical).safeTransfer(_to, got);
        return true;
    }

    function burn(address _from, uint256 _amount) external onlyBridge returns (bool) {
        IERC20(canonical).safeTransferFrom(_from, address(this), _amount);
        uint256 got = IFraxCanoToken(canonical).exchangeCanonicalForOld(address(this), _amount);
        _burn(address(this), got);
        return true;
    }

    function updateBridge(address _bridge) external onlyOwner {
        bridge = _bridge;
        emit BridgeUpdated(bridge);
    }

    function decimals() public view virtual override returns (uint8) {
        return ERC20Virtual(canonical).decimals();
    }

    // to make compatible with BEP20
    function getOwner() external view returns (address) {
        return owner();
    }
}