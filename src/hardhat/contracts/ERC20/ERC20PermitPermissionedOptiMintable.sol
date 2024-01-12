//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import { IERC165 } from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import { ILegacyMintableERC20, IOptimismMintableERC20 } from "./IOptimismMintableERC20.sol";
import { ISemver } from "./ISemver.sol";
import "../Staking/OwnedV2.sol";

/// @title Parent contract for frxETH.sol, but also CrossChainCanonicalV2
/** @notice Combines Openzeppelin's ERC20Permit and ERC20Burnable with Synthetix's Owned and Optimism's OptimismMintableERC20. 
    Also includes a list of authorized minters */
/// @dev ERC20PermitPermissionedOptiMintable adheres to EIP-712/EIP-2612 and can use permits
contract ERC20PermitPermissionedOptiMintable is ERC20Permit, ERC20Burnable, OwnedV2, IOptimismMintableERC20, ILegacyMintableERC20, ISemver {
    
    /// @notice The timelock address
    address public timelock_address;

    /// @notice Address of the L2 StandardBridge on this network.
    address public immutable BRIDGE;

    /// @notice Address of the corresponding version of this token on the remote chain.
    address public immutable REMOTE_TOKEN;
    
    /// @notice Version
    string public constant version = "1.0.0";

    /// @notice Array of the non-bridge minters
    address[] public minters_array;

    /// @notice Mapping of the non-bridge minters
    /// @dev Mapping is used for faster verification
    mapping(address => bool) public minters;

    /* ========== CONSTRUCTOR ========== */

    /// @custom:semver 1.0.0
    /// @param _creator_address The contract creator
    /// @param _timelock_address The timelock
    /// @param _bridge Address of the L2 standard bridge
    /// @param _remoteToken Address of the corresponding L1 token
    /// @param _name ERC20 name
    /// @param _symbol ERC20 symbol
    constructor(
        address _creator_address,
        address _timelock_address,
        address _bridge,
        address _remoteToken,
        string memory _name,
        string memory _symbol
    ) 
    ERC20(_name, _symbol)
    ERC20Permit(_name) 
    OwnedV2(_creator_address)
    {
        REMOTE_TOKEN = _remoteToken;
        BRIDGE = _bridge;
        timelock_address = _timelock_address;
    }


    /* ========== MODIFIERS ========== */

    /// @notice A modifier that only allows the contract owner or the timelock to call
    modifier onlyByOwnGov() {
        require(msg.sender == timelock_address || msg.sender == owner, "Not owner or timelock");
        _;
    }

    /// @notice A modifier that only allows a non-bridge minter to call
    modifier onlyMinters() {
       require(minters[msg.sender] == true, "Only minters");
        _;
    } 

    /// @notice A modifier that only allows the bridge to call
    modifier onlyBridge() {
        require(msg.sender == BRIDGE, "OptimismMintableERC20: only bridge can mint and burn");
        _;
    }

    /* ========== LEGACY VIEWS ========== */

    /// @custom:legacy
    /// @notice Legacy getter for the remote token. Use REMOTE_TOKEN going forward.
    /// @return address The L1 remote token address
    function l1Token() public view returns (address) {
        return REMOTE_TOKEN;
    }

    /// @custom:legacy
    /// @notice Legacy getter for the bridge. Use BRIDGE going forward.
    /// @return address The bridge address
    function l2Bridge() public view returns (address) {
        return BRIDGE;
    }

    /// @custom:legacy
    /// @notice Legacy getter for REMOTE_TOKEN
    /// @return address The L1 remote token address
    function remoteToken() public view returns (address) {
        return REMOTE_TOKEN;
    }

    /// @custom:legacy
    /// @notice Legacy getter for BRIDGE
    /// @return address The bridge address
    function bridge() public view returns (address) {
        return BRIDGE;
    }

    /// @notice ERC165 interface check function.
    /// @param _interfaceId Interface ID to check.
    /// @return Whether or not the interface is supported by this contract.
    function supportsInterface(bytes4 _interfaceId) external pure virtual returns (bool) {
        bytes4 iface1 = type(IERC165).interfaceId;
        // Interface corresponding to the legacy L2StandardERC20.
        bytes4 iface2 = type(ILegacyMintableERC20).interfaceId;
        // Interface corresponding to the updated OptimismMintableERC20 (this contract).
        bytes4 iface3 = type(IOptimismMintableERC20).interfaceId;
        return _interfaceId == iface1 || _interfaceId == iface2 || _interfaceId == iface3;
    }


    /* ========== RESTRICTED FUNCTIONS [BRIDGE] ========== */

    /// @notice Allows the StandardBridge on this network to mint tokens.
    /// @param _to     Address to mint tokens to.
    /// @param _amount Amount of tokens to mint.
    function mint(address _to, uint256 _amount)
        external
        virtual
        override(IOptimismMintableERC20, ILegacyMintableERC20)
        onlyBridge
    {
        _mint(_to, _amount);
        emit Mint(_to, _amount);
    }

    /// @notice Allows the StandardBridge on this network to burn tokens.
    /// @param _from   Address to burn tokens from.
    /// @param _amount Amount of tokens to burn.
    function burn(address _from, uint256 _amount)
        external
        virtual
        override(IOptimismMintableERC20, ILegacyMintableERC20)
        onlyBridge
    {
        _burn(_from, _amount);
        emit Burn(_from, _amount);
    }

    /* ========== RESTRICTED FUNCTIONS [NON-BRIDGE MINTERS] ========== */

    /// @notice Used by non-bridge minters to burn tokens
    /// @param b_address Address of the account to burn from
    /// @param b_amount Amount of tokens to burn
    function minter_burn_from(address b_address, uint256 b_amount) public onlyMinters {
        super.burnFrom(b_address, b_amount);
        emit TokenMinterBurned(b_address, msg.sender, b_amount);
    }

    /// @notice Used by non-bridge minters to mint new tokens
    /// @param m_address Address of the account to mint to
    /// @param m_amount Amount of tokens to mint
    function minter_mint(address m_address, uint256 m_amount) public onlyMinters {
        super._mint(m_address, m_amount);
        emit TokenMinterMinted(msg.sender, m_address, m_amount);
    }

    /// @notice Adds a non-bridge minter
    /// @param minter_address Address of minter to add
    function addMinter(address minter_address) public onlyByOwnGov {
        require(minter_address != address(0), "Zero address detected");

        require(minters[minter_address] == false, "Address already exists");
        minters[minter_address] = true; 
        minters_array.push(minter_address);

        emit MinterAdded(minter_address);
    }

    /// @notice Removes a non-bridge minter
    /// @param minter_address Address of minter to remove
    function removeMinter(address minter_address) public onlyByOwnGov {
        require(minter_address != address(0), "Zero address detected");
        require(minters[minter_address] == true, "Address nonexistant");
        
        // Delete from the mapping
        delete minters[minter_address];

        // 'Delete' from the array by setting the address to 0x0
        for (uint i = 0; i < minters_array.length; i++){ 
            if (minters_array[i] == minter_address) {
                minters_array[i] = address(0); // This will leave a null in the array and keep the indices the same
                break;
            }
        }

        emit MinterRemoved(minter_address);
    }


    /* ========== RESTRICTED FUNCTIONS [ADMIN-RELATED] ========== */

    /// @notice Sets the timelock address
    /// @param _timelock_address Address of the timelock
    function setTimelock(address _timelock_address) public onlyByOwnGov {
        require(_timelock_address != address(0), "Zero address detected"); 
        timelock_address = _timelock_address;
        emit TimelockChanged(_timelock_address);
    }

    /* ========== EVENTS ========== */
    
    /// @notice Emitted whenever the bridge burns tokens from an account
    /// @param account Address of the account tokens are being burned from
    /// @param amount  Amount of tokens burned
    event Burn(address indexed account, uint256 amount);

    /// @notice Emitted whenever the bridge mints tokens to an account
    /// @param account Address of the account tokens are being minted for
    /// @param amount  Amount of tokens minted.
    event Mint(address indexed account, uint256 amount);

    /// @notice Emitted when a non-bridge minter is added
    /// @param minter_address Address of the new minter
    event MinterAdded(address minter_address);

    /// @notice Emitted when a non-bridge minter is removed
    /// @param minter_address Address of the removed minter
    event MinterRemoved(address minter_address);

    /// @notice Emitted when the timelock address changes
    /// @param timelock_address Address of the removed timelock
    event TimelockChanged(address timelock_address);

    /// @notice Emitted when a non-bridge minter burns tokens
    /// @param from The account whose tokens are burned
    /// @param to The minter doing the burning
    /// @param amount Amount of tokens burned
    event TokenMinterBurned(address indexed from, address indexed to, uint256 amount);

    /// @notice Emitted when a non-bridge minter mints tokens
    /// @param from The minter doing the minting
    /// @param to The account that gets the newly minted tokens
    /// @param amount Amount of tokens minted
    event TokenMinterMinted(address indexed from, address indexed to, uint256 amount);
}