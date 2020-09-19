// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0 <0.7.0;
pragma experimental ABIEncoderV2;

import "../Common/Context.sol";
import "../ERC20/ERC20Custom.sol";
import "../ERC20/IERC20.sol";
import "../Frax/Frax.sol";
import "../Math/SafeMath.sol";

contract FRAXShares is ERC20Custom {
    using SafeMath for uint256;

    /* ========== STATE VARIABLES ========== */

    string public symbol;
    uint8 public decimals = 18;
    address public FRAXStablecoinAdd;
    
    uint256 genesis_supply;
    uint256 public maximum_supply; // No FXS can be minted under any condition past this number
    uint256 public FXS_DAO_min; // Minimum FXS required to join DAO groups 

    address owner_address;
    address oracle_address;
    FRAXStablecoin FRAX;

    // A checkpoint for marking number of votes from a given block
    struct Checkpoint {
        uint32 fromBlock;
        uint96 votes;
    }

    // A record of votes checkpoints for each account, by index
    mapping (address => mapping (uint32 => Checkpoint)) public checkpoints;

    // The number of checkpoints for each account
    mapping (address => uint32) public numCheckpoints;

    /* ========== MODIFIERS ========== */

    modifier onlyPools() {
       require(FRAX.frax_pools(msg.sender) == true, "Only frax pools can mint new FRAX");
        _;
    } 
    
    modifier onlyByOracle() {
        require(msg.sender == oracle_address, "You're not the oracle :p");
        _;
    }

    /* ========== CONSTRUCTOR ========== */

    constructor(
        string memory _symbol, 
        uint256 _genesis_supply,
        uint256 _maximum_supply,
        address _oracle_address,
        address _owner_address
    ) public {
        symbol = _symbol;
        genesis_supply = _genesis_supply;
        maximum_supply = _maximum_supply; 
        owner_address = _owner_address;
        oracle_address = _oracle_address;
        _mint(owner_address, genesis_supply);
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    function setOracle(address new_oracle) public onlyByOracle {
        oracle_address = new_oracle;
    }
    
    function setFRAXAddress(address frax_contract_address) public onlyByOracle {
        FRAX = FRAXStablecoin(frax_contract_address);
    }
    
    function setFXSMinDAO(uint256 min_FXS) public onlyByOracle {
        FXS_DAO_min = min_FXS;
    }

    function mint(address to, uint256 amount) public onlyPools {
        require(totalSupply() + amount < maximum_supply, "No more FXS can be minted, max supply reached");
        _mint(to, amount);
    }
    
    // This function is what other frax pools will call to mint new FXS (similar to the FRAX mint) 
    function pool_mint(address m_address, uint256 m_amount) public onlyPools {
        require(totalSupply() + m_amount < maximum_supply, "No more FXS can be minted, max supply reached");
        super._mint(m_address, m_amount);
    }

    // This function is what other frax pools will call to burn FXS 
    function pool_burn_from(address b_address, uint256 b_amount) public onlyPools {
        super._burnFrom(b_address, b_amount);
        emit FXSBurned(b_address, msg.sender, b_amount);
    }

    /* ========== PUBLIC FUNCTIONS ========== */

    /**
     * @notice Gets the current votes balance for `account`
     * @param account The address to get votes balance
     * @return The number of current votes for `account`
     */
    function getCurrentVotes(address account) external view returns (uint96) {
        uint32 nCheckpoints = numCheckpoints[account];
        return nCheckpoints > 0 ? checkpoints[account][nCheckpoints - 1].votes : 0;
    }

    /**
     * @notice Determine the prior number of votes for an account as of a block number
     * @dev Block number must be a finalized block or else this function will revert to prevent misinformation.
     * @param account The address of the account to check
     * @param blockNumber The block number to get the vote balance at
     * @return The number of votes the account had as of the given block
     */
    function getPriorVotes(address account, uint blockNumber) public view returns (uint96) {
        require(blockNumber < block.number, "Comp::getPriorVotes: not yet determined");

        uint32 nCheckpoints = numCheckpoints[account];
        if (nCheckpoints == 0) {
            return 0;
        }

        // First check most recent balance
        if (checkpoints[account][nCheckpoints - 1].fromBlock <= blockNumber) {
            return checkpoints[account][nCheckpoints - 1].votes;
        }

        // Next check implicit zero balance
        if (checkpoints[account][0].fromBlock > blockNumber) {
            return 0;
        }

        uint32 lower = 0;
        uint32 upper = nCheckpoints - 1;
        while (upper > lower) {
            uint32 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            Checkpoint memory cp = checkpoints[account][center];
            if (cp.fromBlock == blockNumber) {
                return cp.votes;
            } else if (cp.fromBlock < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }
        return checkpoints[account][lower].votes;
    }

    /* ========== INTERNAL FUNCTIONS ========== */

    function _writeCheckpoint(address voter, uint32 nCheckpoints, uint96 oldVotes, uint96 newVotes) internal {
      uint32 blockNumber = safe32(block.number, "Comp::_writeCheckpoint: block number exceeds 32 bits");

      if (nCheckpoints > 0 && checkpoints[voter][nCheckpoints - 1].fromBlock == blockNumber) {
          checkpoints[voter][nCheckpoints - 1].votes = newVotes;
      } else {
          checkpoints[voter][nCheckpoints] = Checkpoint(blockNumber, newVotes);
          numCheckpoints[voter] = nCheckpoints + 1;
      }

      emit VoterVotesChanged(voter, oldVotes, newVotes);
    }

    function safe32(uint n, string memory errorMessage) internal pure returns (uint32) {
        require(n < 2**32, errorMessage);
        return uint32(n);
    }

    function safe96(uint n, string memory errorMessage) internal pure returns (uint96) {
        require(n < 2**96, errorMessage);
        return uint96(n);
    }

    function add96(uint96 a, uint96 b, string memory errorMessage) internal pure returns (uint96) {
        uint96 c = a + b;
        require(c >= a, errorMessage);
        return c;
    }

    function sub96(uint96 a, uint96 b, string memory errorMessage) internal pure returns (uint96) {
        require(b <= a, errorMessage);
        return a - b;
    }

    function getChainId() internal pure returns (uint) {
        uint256 chainId;
        assembly { chainId := chainid() }
        return chainId;
    }

    /* ========== EVENTS ========== */
    
    /// @notice An event thats emitted when a voters account's vote balance changes
    event VoterVotesChanged(address indexed voter, uint previousBalance, uint newBalance);

    // Track FXS burned
    event FXSBurned(address indexed from, address indexed to, uint256 amount);

}
