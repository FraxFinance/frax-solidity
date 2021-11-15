// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "./IERC20.sol";


contract LeveragePool { 
    address public admin;
    IERC20 public collateralToken;
    IOracle public oracle;
    IFundingRateModel public fundingRateModel;
    uint256 public epochStartTime;
    uint256 public epoch;
    int256 public price;
    int256 public adminFees;
    
    int256 public constant PRECISION = 10**18; // 1
    int256 public constant SECONDS_PER_YEAR = 31556952;
    
    int256 public TRANSACTION_FEE = 3*10**15; // 0.3% fee
    int256 public ADMIN_FEES = 2*10**17; // 20%
    int256 public LIQUIDITYPOOL_FEES = 8*10**17; // 80%
    int256 public CHANGE_CAP = 5*10**16; // 5%
    uint256 public epochPeriod=15; //60*60; // 1 hour (15 seconds for testing)
    uint256 public waitPeriod= 5; //6*60; // 6 minutes (5 seconds for testing)

    mapping(address => UserInfo) public userInfo;
    Pool[] public pools;
    
    mapping(uint256 => mapping (uint256 => PoolEpochData)) public poolEpochData;

    struct UserInfo {
        uint256 index;
        Action[] actions;
        int256 withdrawableCollateral;
        mapping(uint256 =>int256) shares;
    }
    
    struct Action {
        uint256 epoch;
        uint256 pool;
        int256 depositAmount;
        int256 withdrawAmount;
    }
    
    struct Pool {
        int256 shares;
        int256 collateral;
        int256 leverage;
        int256 rebalanceMultiplier;
        bool isLiquidityPool;
    }
    
    struct PoolEpochData {
        int256 sharesPerCollateralDeposit;
        int256 collateralPerShareWithdraw;
        int256 deposits;
        int256 withdrawals;
    }

    struct PoolAmounts {
        int256 longAmount;
        int256 shortAmount;
        int256 liquidityPoolAmount;
        int256 rebalanceAmount;
        int256 longLeverage;
        int256 shortLeverage;
        int256 liquidityPoolLeverage;
    }
    
    struct Rates {
        int256 longFundingRate;
        int256 shortFundingRate;
        int256 liquidityPoolFundingRate;
        int256 rebalanceRate;
        int256 rebalanceLiquidityPoolRate;
    }
    
    constructor(
            IERC20 _collateralToken,
            IOracle _oracle,
            IFundingRateModel _fundingRateModel,
            uint256 _inception
        ) {
            collateralToken = _collateralToken;
            oracle = _oracle;
            fundingRateModel = _fundingRateModel;
            price = int256(getPrice());
            admin = msg.sender;
            epochStartTime = _inception==0?block.timestamp:_inception;
            
    }
    
    /* ========== EXTERNAL STATE CHANGING ========== */
    
    /**
     *  Schedule a deposit for the next epoch
     **/
    function deposit(int256 amount, uint256 pool) external  {
        require (pool<pools.length,"Pool not initialized");
        require (amount>=0,"amount needs to be positive");
        _bookKeeping(msg.sender);
        
        UserInfo storage info = userInfo[msg.sender];
        
        // Try to pay from the withdrawableCollateral first
        int256 transferAmount = amount;
        if (info.withdrawableCollateral>0) {
            if (transferAmount>info.withdrawableCollateral) {
                transferAmount-=info.withdrawableCollateral;
                info.withdrawableCollateral=0;
            } else {
                info.withdrawableCollateral-=transferAmount;
                transferAmount=0;
            }
        }
        if (transferAmount>0 && address(collateralToken)!=address(0x0)) require(collateralToken.transferFrom(msg.sender,address(this),uint256(transferAmount)),"Transfer failed");

        Action memory action;
        action.epoch = _getNextEpoch();
        action.pool = pool;
        action.depositAmount = amount;
        info.actions.push(action);
        
        PoolEpochData storage data = poolEpochData[action.epoch][action.pool];
        data.deposits+=amount;
        emit DepositInPool(msg.sender,amount,pool,action.epoch);
    }
    
    /**
     *  Schedule a withdraw for the next epoch
     **/
    function withdraw(int256 amount, uint256 pool) external  {
        require (pool<pools.length,"Pool not initialized");
        require (amount>=0,"amount needs to be positive");
        _bookKeeping(msg.sender);
        
        UserInfo storage  info =  userInfo[msg.sender];
        require(info.shares[pool]>=amount,"No enough shares");
        
        info.shares[pool]-=amount;
        Action memory action;
        action.epoch = _getNextEpoch();
        action.pool = pool;
        action.withdrawAmount = amount;
        info.actions.push(action);
        
        PoolEpochData storage data = poolEpochData[action.epoch][action.pool];
        data.withdrawals+=amount;
        emit WithdrawFromPool(msg.sender,amount,pool,action.epoch);
    } 
    
     /**
     *  Withdraw available collateral to the user
     **/
    function withdrawCollateral(int256 amount) external  {
        require (amount>=0,"amount needs to be positive");
        _bookKeeping(msg.sender);
        UserInfo storage  info =  userInfo[msg.sender];
        if (amount<=0) amount = info.withdrawableCollateral; // withdraw all
        
        require (info.withdrawableCollateral>=amount,"Balance to low");
        info.withdrawableCollateral-=amount;
        
        if (amount>0 && address(collateralToken)!=address(0x0)) require(collateralToken.transfer(msg.sender,uint256(amount)),"Transfer failed");
    }
    
    /**
     *  Start a new epoch external call, free to call
     **/
    function startNextEpoch() external  {
        _startNextEpoch();
    }
    
    /**
     *  Withdraw admin fees
     **/
    function withdrawAdminFees(int256 amount) external {
        require (msg.sender==admin,"Only admin");
        require (amount<=adminFees,"Not enough funds");
        adminFees-=amount;
        if (address(collateralToken)!=address(0x0)) require(collateralToken.transfer(msg.sender,uint256(amount)),"Transfer failed");
    }

    
    /**
     *  Do the bookkeeping for a user (for testing)
     **/
    function bookKeeping() external {
        _bookKeeping(msg.sender);
    }
    
    /**
     *  Add a new pool
     **/
    function addPool(int256 leverage,bool isLiquidityPool) internal {
        _addPool(leverage,isLiquidityPool);
    }
    
    /**
     *  Set epoch period and waiting period
     **/
    function setEpochPeriods(uint256 _epochPeriod, uint256 _waitPeriod) external {
        require (msg.sender==admin,"Only admin");
        require (_epochPeriod>0 && _waitPeriod>0,"Periods can not be 0");
        require (_waitPeriod<=_epochPeriod,"Wait period too long");
        epochPeriod = _epochPeriod;
        waitPeriod = _waitPeriod;
        emit SetEpochPeriods(_epochPeriod,_waitPeriod);
    }
    
    /**
     *  Set transaction fees and division between the admin and the liquidity pools
     **/
    function setFees(int256 _TRANSACTION_FEE, int256 _ADMIN_FEES, int256 _LIQUIDITYPOOL_FEES) external {
        require (msg.sender==admin,"Only admin");
        require (_TRANSACTION_FEE>=0 && _ADMIN_FEES>=0 && _LIQUIDITYPOOL_FEES>=0,"Fees can not be negative");
        require (_TRANSACTION_FEE<=2*10**16,"Transaction fee too high"); // max 2%
        require (_ADMIN_FEES + _LIQUIDITYPOOL_FEES == PRECISION,"Fees not correct");
        TRANSACTION_FEE = _TRANSACTION_FEE;
        ADMIN_FEES = _ADMIN_FEES;
        LIQUIDITYPOOL_FEES = _LIQUIDITYPOOL_FEES;
        emit SetFees(_TRANSACTION_FEE,_ADMIN_FEES,_LIQUIDITYPOOL_FEES);
    }
    
    /**
     *  Set a new Admin
     **/
    function setAdmin(address newAdmin) external {
        require (msg.sender==admin,"Only admin");
        require (newAdmin!=address(0x0),"Admin can not be zero");
        admin = newAdmin;
    }
    
    /**
     *  Set a new CHANGE_CAP
     **/
    function setChangeCap(int256 _CHANGE_CAP) external {
        require (msg.sender==admin,"Only admin");
        CHANGE_CAP = _CHANGE_CAP;
    }
    
    /**
     *  Set a new Oracle
     **/
    function setOracle(address newOracle) external {
        require (msg.sender==admin,"Only admin");
        oracle = IOracle(newOracle);
    }
    
    /**
     *  Set a new funding rate model
     **/
    function setFundingRateModel(address newFundingRateModel) external {
        require (msg.sender==admin,"Only admin");
        fundingRateModel = IFundingRateModel(newFundingRateModel);
    }
    
     /**
    *  Add pools default pools
    **/
    function initializePools() external {
        require (pools.length==0,"Pools allready initialized");
        _addPool(1,true);
        _addPool(1,false);
        _addPool(-1,false);
        _addPool(2,true);
        _addPool(2,false);
        _addPool(-2,false);
        _addPool(3,true);
        _addPool(3,false);
        _addPool(-3,false);
    }
    
    /* ========== EXTERNAL "VIEWS" ========== */
    
    /**
     *  Calculate the total amounts over all pools and the leverage for longs/shorts/liquidity pool
     **/
    function calculatePoolAmounts() external view returns (PoolAmounts memory amounts) {
        amounts = _calculatePoolAmounts();
    }
    
    /**
     *  Get the number of shares for the given user per pool.
     *  This is not a view, because we do bookkeeping first, but hopfully we can used it as such.
     **/
    function getUserShares(address user) external returns (int256[] memory shares) {
        _bookKeeping(user);
        return _getUserShares(user);
    }
    function getUserSharesView(address user) external view returns (int256[] memory shares) {
        return _getUserShares(user);
    }
    function _getUserShares(address user) internal view returns (int256[] memory shares) {
        UserInfo storage info = userInfo[user];
        shares = new int256[](pools.length);
        for (uint256 i=0;i<pools.length;i++) {
            shares[i] = info.shares[i];
        }
        return shares;
    }
    
    /**
     *  Get the collateral owned for the given user per pool.
     *  This is not a view, because we do bookkeeping first, but hopfully we can used it as such.
     **/
    function getUserDeposits(address user) external returns (int256[] memory deposits) {
        _bookKeeping(user);
        return _getUserDeposits(user);
    }
    function getUserDepositsView(address user) external view returns (int256[] memory deposits) {
        return _getUserDeposits(user);
    }
    function _getUserDeposits(address user) internal view returns (int256[] memory deposits) {
        UserInfo storage info = userInfo[user];
        deposits = new int256[](pools.length);
        for (uint256 i=0;i<pools.length;i++) {
            if (pools[i].shares>0) deposits[i] = info.shares[i]*pools[i].collateral/pools[i].shares;
        }
    }
    
     /**
     *  Get the pernding actions for the given user.
     *  This is not a view, because we do bookkeeping first, but hopfully we can used it as such.
     **/
    function getUserActions(address user) external returns (Action[] memory) {
        _bookKeeping(user);
        return _getUserActionsView(user);
    }
    function getUserActionsView(address user) external view returns (Action[] memory) {
        return _getUserActionsView(user);
    }
    function _getUserActionsView(address user) internal view returns (Action[] memory actions) {
        UserInfo storage info = userInfo[user];
        actions = new Action[](info.actions.length-info.index);
        for (uint256 i=info.index;i<info.actions.length;i++) {
            actions[i-info.index]=info.actions[i];
        }
    }
    
    /**
     *  Get the withdrawable collateral for the given user.
     *  This is not a view, because we do bookkeeping first, but hopfully we can used it as such.
     **/
    function getWithdrawableCollateral(address user)  external returns (int256) {
        _bookKeeping(user);
        UserInfo storage info = userInfo[user];
        return info.withdrawableCollateral;
    }
    function getWithdrawableCollateralView(address user) external view returns (int256) {
        UserInfo storage info = userInfo[user];
        return info.withdrawableCollateral;
    }
    
    
    /**
     *  Get current funding and rebalancing rates.
     **/
    function getRates() external view returns (Rates memory rates) {
        return getRates(_calculatePoolAmounts());
    }
    
    /**
     *  Return the number of pools
     **/
    function getNoPools() external view returns (uint256) {
        return pools.length;
    }
    
    
    /* ========== INTERNAL STATE CHANGING ========== */
    
    /**
     *  Do the bookkeeping for the current user, by applying the deposits and withdrawels of all epochs that have past.
     */
    function _bookKeeping(address user) internal {
        UserInfo storage info = userInfo[user];
        while (info.index<info.actions.length) {
            Action storage action = info.actions[info.index];
            if (action.epoch<=epoch) {
                PoolEpochData storage data = poolEpochData[action.epoch][action.pool];
                if (action.depositAmount>0) {
                    int256 newShares = (action.depositAmount*data.sharesPerCollateralDeposit/PRECISION);
                    info.shares[action.pool]+=newShares;
                } else if (action.withdrawAmount>0) {
                    int256 withdrawn = (action.withdrawAmount*data.collateralPerShareWithdraw/PRECISION);
                    info.withdrawableCollateral+=withdrawn;
                }
                delete info.actions[info.index];
                info.index++;
            } else break;
        }
    }

    
    /**
     *  Start a new epoch if the time is up.
     *  Step 1: Apply the price change over the last period to all the pools, do it multiple times if price has change more than the CHANGE_CAP.
     *  Step 2: Apply the funding and rebalance rates for all the pools.
     *  Step 3: Do all deposits/withdrawels.
     *  Step 4: Distribute the fees among the liquidity pools.
     **/
    function _startNextEpoch() internal  {
        // check for next epoch time
        if (block.timestamp>=epochStartTime+epochPeriod) {
            epoch++;
            emit Epoch(epoch,price);
            epochStartTime+=epochPeriod;
            { // Apply the price change to all the pools
                int256 prevPrice=price;
                price = int256(getPrice());
                bool lastLoop;
                while (!lastLoop) {
                    int256 change = (price-prevPrice)*PRECISION/prevPrice;
                    if (change>CHANGE_CAP) change = CHANGE_CAP;
                    else if (change<-CHANGE_CAP) change = -CHANGE_CAP;
                    else lastLoop=true;
                    
                    PoolAmounts memory amounts = _calculatePoolAmounts();
    
                    int256 longChange=change*amounts.longLeverage/PRECISION;
                    int256 shortChange=change*amounts.shortLeverage/PRECISION;
                    int256 liquidityPoolChange = change*amounts.liquidityPoolLeverage/PRECISION;

                    for (uint256 i=0;i<pools.length;i++) {
                        Pool storage pool = pools[i];
                        if (pool.isLiquidityPool) {
                            pool.collateral+= (pool.collateral*pool.leverage*liquidityPoolChange/PRECISION);
                        } else if (pool.leverage>0) {
                            pool.collateral+= (pool.collateral*pool.leverage*longChange/PRECISION);
                        } else {
                            pool.collateral+= (pool.collateral*pool.leverage*shortChange/PRECISION);
                        }
                    }
                    if (!lastLoop) { // Change was capped, continue with appliying the rest of the change
                        prevPrice=prevPrice+prevPrice*change/PRECISION;
                    } 
                }
            }

            
            { // Handle the funding and rebalance rates
                PoolAmounts memory amounts = _calculatePoolAmounts();
                Rates memory rates = getRates(amounts);
    
                for (uint256 i=0;i<pools.length;i++) {
                    Pool storage pool = pools[i];
                    if (pool.isLiquidityPool) {
                        pool.collateral-= (pool.collateral*pool.leverage*rates.liquidityPoolFundingRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION)) + (pool.collateral*pool.leverage)*rates.rebalanceLiquidityPoolRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION);
                    } else if (pool.leverage>0) {
                        pool.collateral-= (pool.collateral*pool.leverage*rates.longFundingRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION)) + (pool.collateral*pool.rebalanceMultiplier)*rates.rebalanceRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION);
                    } else {
                        pool.collateral-= (-pool.collateral*pool.leverage*rates.shortFundingRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION)) + (pool.collateral*pool.rebalanceMultiplier)*rates.rebalanceRate*int256(epochPeriod)/(SECONDS_PER_YEAR*PRECISION);
                    }
                }
            }
            int256 sumFees=0;
            { // Do the deposits/withdrawels
                PoolAmounts memory amounts = _calculatePoolAmounts();
                for (uint256 i=0;i<pools.length;i++) {
                    Pool storage pool = pools[i];
                    PoolEpochData storage data = poolEpochData[epoch][i];
                    
                    int256 actualLeverage;
                    if (pool.isLiquidityPool) {
                        actualLeverage = pool.leverage*amounts.liquidityPoolLeverage/PRECISION;
                        if (actualLeverage<0) actualLeverage=-actualLeverage;
                    } else if (pool.leverage>0) {
                        actualLeverage = pool.leverage*amounts.longLeverage/PRECISION;
                    } else {
                        actualLeverage = -pool.leverage*amounts.shortLeverage/PRECISION;
                    }
                    
                    int256 depositAmount = data.deposits;
                    if (depositAmount>0) {
                        // Fee is relative to actual leverage 
                        int256 fees = depositAmount*TRANSACTION_FEE*actualLeverage/PRECISION;
                        if (pool.shares>0) data.sharesPerCollateralDeposit=(pool.shares*PRECISION/pool.collateral)*(depositAmount-fees)/depositAmount;
                        else data.sharesPerCollateralDeposit = PRECISION*(depositAmount-fees)/depositAmount;
                        pool.shares+=depositAmount*data.sharesPerCollateralDeposit/PRECISION;
                        pool.collateral+=depositAmount-fees;
                        sumFees+=fees;
                    }
                    int256 withdrawAmount = data.withdrawals;
                    if (withdrawAmount>0) {
                        // Fee is relative to actual leverage
                        int256 fees = withdrawAmount*TRANSACTION_FEE*actualLeverage/PRECISION;
                        int256 collateralPerShare = pool.collateral*PRECISION/pool.shares;
                        data.collateralPerShareWithdraw=collateralPerShare*(withdrawAmount-fees)/withdrawAmount;
                        pool.shares-=withdrawAmount;
                        pool.collateral-=withdrawAmount*collateralPerShare/PRECISION;
                        sumFees+=fees;
                    }
                }
            }
            
            { // Distribute the fees among the liquidity pools and the admin
                PoolAmounts memory amounts = _calculatePoolAmounts();
                if (amounts.liquidityPoolAmount>0) {
                    adminFees+=sumFees*ADMIN_FEES/PRECISION;
                    int256 liquidityPoolFees=sumFees*LIQUIDITYPOOL_FEES/PRECISION;
                    for (uint256 i=0;i<pools.length;i++) {
                        Pool storage pool = pools[i];
                        if (pool.isLiquidityPool) {
                            pool.collateral+=liquidityPoolFees*pool.collateral*pool.leverage/amounts.liquidityPoolAmount;
                        }
                    }
                } else {
                    adminFees+=sumFees;
                }
            }
            
            // Emit logs (removed, costing too much gas)
            /*for (uint256 i=0;i<pools.length;i++) {
                Pool storage pool = pools[i];
                PoolEpochData storage data = poolEpochData[epoch][i];
                emit EpochPool(epoch,i,pool.shares,pool.collateral,data.sharesPerCollateralDeposit,data.collateralPerShareWithdraw);
            }*/
        }
    }

    /**
    *  Add a new Pool
    **/
    function _addPool(int256 leverage,bool isLiquidityPool) internal {
        require (msg.sender==admin,"Only admin");
        require (leverage!=0,"Leverage can not be zero");
        require (!isLiquidityPool || leverage>0,"Liquidity pool leverage must be positive");
        for (uint256 i=0;i<pools.length;i++) {
            require (leverage!=pools[i].leverage || isLiquidityPool!=pools[i].isLiquidityPool,"Pool already exists");
        }
        
        Pool memory pool;
        pool.leverage = leverage;
        pool.isLiquidityPool = isLiquidityPool;
        if (!isLiquidityPool) pool.rebalanceMultiplier = (leverage*leverage - leverage)/2;
        pools.push(pool);
        emit AddPool(leverage,isLiquidityPool);
    }
    

     /* ========== INTERNAL VIEWS ========== */

    /**
    *  Calculate the total amounts over all pools and the leverage for longs/shorts/liquidity pool
    **/
    function _calculatePoolAmounts() internal  view returns (PoolAmounts memory amounts) {
        for (uint256 i=0;i<pools.length;i++) {
            Pool storage pool = pools[i];
            if (pool.isLiquidityPool) {
                amounts.liquidityPoolAmount+= pool.collateral*pool.leverage;
            } else if (pool.leverage>0) {
                amounts.longAmount+= pool.collateral*pool.leverage;
                amounts.rebalanceAmount+= pool.collateral*pool.rebalanceMultiplier;
            } else {
                amounts.shortAmount-= pool.collateral*pool.leverage;
                amounts.rebalanceAmount+= pool.collateral*pool.rebalanceMultiplier;
            }
        }
        if (amounts.longAmount>amounts.shortAmount) {
            int256 missingAmount=amounts.longAmount-amounts.shortAmount;
            if (missingAmount<amounts.liquidityPoolAmount) {
                if (missingAmount>0) amounts.liquidityPoolLeverage = -missingAmount*PRECISION/amounts.liquidityPoolAmount;
                amounts.longLeverage = amounts.shortLeverage = PRECISION;
            } else {
                if (amounts.longAmount>0) amounts.longLeverage = (amounts.shortAmount+amounts.liquidityPoolAmount)*PRECISION/amounts.longAmount;
                else amounts.longLeverage = PRECISION;
                amounts.shortLeverage = PRECISION;
                amounts.liquidityPoolLeverage = -PRECISION;
            }
        } else {
            int256 missingAmount=amounts.shortAmount-amounts.longAmount;
            if (missingAmount<amounts.liquidityPoolAmount) {
                if (missingAmount>0) {
                    amounts.liquidityPoolLeverage = missingAmount*PRECISION/amounts.liquidityPoolAmount;
                }
                amounts.longLeverage = amounts.shortLeverage = PRECISION;
            } else {
                if (amounts.shortAmount>0) amounts.shortLeverage = (amounts.longAmount+amounts.liquidityPoolAmount)*PRECISION/amounts.shortAmount;
                else amounts.shortLeverage = PRECISION;
                amounts.longLeverage = amounts.liquidityPoolLeverage = PRECISION;
            }
        }
    }

    /**
     *  Determine the next epoch a user can deposit/withdraw in
     **/
    function _getNextEpoch() view internal returns (uint256 nextEpoch) {
        if (block.timestamp>=epochStartTime+epochPeriod-waitPeriod) nextEpoch = epoch+2;
        else nextEpoch = epoch+1;
    } 
    
    /**
     *  Get the price from the oracle
     **/
    function getPrice() internal view returns (uint256 _price) {
        if (address(oracle)!=address(0)) _price = oracle.getPrice();
        else _price = block.timestamp; //for testing
    }
    
    /**
     *  Get all the rates from the funding rate model
     **/
    function getRates(PoolAmounts memory amounts) internal view returns (Rates memory rates) {
        if (address(fundingRateModel)!=address(0x0)) {
            (rates.longFundingRate,rates.shortFundingRate,rates.liquidityPoolFundingRate,rates.rebalanceRate,rates.rebalanceLiquidityPoolRate) = fundingRateModel.getFundingRate(amounts.longAmount,amounts.shortAmount,amounts.liquidityPoolAmount,amounts.rebalanceAmount);
        }
    }
    
    event DepositInPool(address adr,int256 amount,uint256 poolNo,uint256 epoch);
    event WithdrawFromPool(address adr,int256 amount,uint256 poolNo,uint256 epoch);
    event Epoch(uint256 epoch,int256 price);
    event EpochPool(uint256 epoch,uint256 pool,int256 shares,int256 collateral,int256 sharesPerCollateralDeposit,int256 collateralPerShareWithdraw);
    event AddPool(int256 leverage,bool isLiquidityPool);
    event SetFees(int256 TRANSACTION_FEE, int256 ADMIN_FEES, int256 LIQUIDITYPOOL_FEES);
    event SetEpochPeriods(uint256 epochPeriod, uint256 waitPeriod);
    
}

interface IOracle {
    function getPrice() external view returns (uint256);
}

contract TestOracle is IOracle {
    address admin;
    uint256 price=10**18;
    
    constructor() {
        admin = msg.sender;
    }
    
    function getPrice() override external view returns (uint256) {
        return price;
    }
    function setPrice(uint256 _price) external {
        require(admin==msg.sender,"Only admin");
        price = _price;
    }
}

interface IFundingRateModel {
    function getFundingRate(int256 _longAmount,int256 _shortAmount,int256 _liquidityPoolAmount,int256 _rebalanceAmount) external view returns (int256,int256,int256,int256,int256);
}

contract BaseInterestRateModel is IFundingRateModel { 
    address admin;
    int256 public constant PRECISION = 10**18;
    int256 public FUNDING_MULTIPLIER = PRECISION;
    int256 public REBALANCING_MULTIPLIER = PRECISION;
    int256 public MAX_REBALANCE_RATE = 10**18;
    
    constructor() {
        admin = msg.sender;
    }
    
    function setMultipliers(int256 _FUNDING_MULTIPLIER, int256  _REBALANCING_MULTIPLIER) external {
        require(admin==msg.sender,"Only admin");
        FUNDING_MULTIPLIER=_FUNDING_MULTIPLIER;
        REBALANCING_MULTIPLIER = _REBALANCING_MULTIPLIER;
    }
    
    function setMaxRebalanceRate(int256 _MAX_REBALANCE_RATE) external {
	require(admin==msg.sender,"Only admin");
	MAX_REBALANCE_RATE =_MAX_REBALANCE_RATE;
    }

    function getFundingRate(int256 _longAmount,int256 _shortAmount,int256 _liquidityPoolAmount,int256 _rebalanceAmount) override external view returns (int256 longFundingRate,int256 shortFundingRate,int256 liquidityPoolFundingRate,int256 rebalanceRate,int256 rebalanceLiquidityPoolRate) {
        if (_shortAmount>0 && _longAmount>_shortAmount) { // longs pay shorts
            longFundingRate = ((_longAmount-_shortAmount)*PRECISION/_longAmount)*FUNDING_MULTIPLIER/PRECISION;
            int256 missingAmount = _longAmount-_shortAmount;
            if (missingAmount>_liquidityPoolAmount) {
                shortFundingRate = liquidityPoolFundingRate = -longFundingRate*_longAmount/(_shortAmount+_liquidityPoolAmount);
            } else {
                shortFundingRate = -longFundingRate;
                if (_liquidityPoolAmount>0) liquidityPoolFundingRate = shortFundingRate*missingAmount/_liquidityPoolAmount;
            }
        } else if (_longAmount>0 && _shortAmount>_longAmount) { // Shorts pay longs
            shortFundingRate = ((_shortAmount-_longAmount)*PRECISION/_shortAmount)*FUNDING_MULTIPLIER/PRECISION;
            int256 missingAmount = _shortAmount-_longAmount;
            if (missingAmount>_liquidityPoolAmount) {
                longFundingRate = liquidityPoolFundingRate = -shortFundingRate*_shortAmount/(_longAmount+_liquidityPoolAmount);
            } else {
                longFundingRate = -shortFundingRate;
                if (_liquidityPoolAmount>0) liquidityPoolFundingRate = longFundingRate*missingAmount/_liquidityPoolAmount;
            }
        }
        if (_liquidityPoolAmount>0) { // calculate the rebalancing rates
            rebalanceRate = (_rebalanceAmount*REBALANCING_MULTIPLIER/_liquidityPoolAmount);
            if (_rebalanceAmount>0) {
            	if (rebalanceRate>MAX_REBALANCE_RATE) rebalanceRate=MAX_REBALANCE_RATE;
            	rebalanceLiquidityPoolRate = -rebalanceRate*_rebalanceAmount/_liquidityPoolAmount;
            }
        }
    }
}
