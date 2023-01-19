// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

/*//////////////////////////////////////////////////////////////////////////////////////////////////////////
    veFPISProxy.t.sol
    Foundry tests for the veFPISProxy contract
    Authored by Jack Corddry: https://github.com/corddry
    Frax Finance: https://github.com/FraxFinance
    Usage: source .env && forge test --match-contract veFPISProxyTest --rpc-url $ETHEREUM_NETWORK_ENDPOINT
    Note: relies on forking mainnet for FPIS and veFPIS
//////////////////////////////////////////////////////////////////////////////////////////////////////////*/

import { console } from "forge-std/console.sol";
import "forge-std/Test.sol";
import "../../hardhat/contracts/Curve/veFPISProxy.sol";
// import "../../contracts/Curve/IveFPIS.sol";

address constant FPIS_COMPTROLLER = 0x6A7efa964Cf6D9Ab3BC3c47eBdDB853A8853C502;
address constant TIMELOCK = 0x8412ebf45bAC1B340BbE8F318b928C466c4E39CA;
address constant VEFPIS = 0xcc2495115cFA117763E26B83e45114A852c3361F;
address constant FPIS = 0xc2544A32872A91F4A553b404C6950e89De901fdb;

address constant ALICE = address(0xA11CE);
address constant BOB = address (0xB0B);
address constant CADE = address (0xCADE);

uint256 constant MAXTIME = 4 * 365 * 86400;  // 4 years
uint256 constant WEEK = 7 * 86400;
uint256 constant PRECISION = 1e6;

interface IFPIS {
    event Approval(address indexed owner, address indexed spender, uint value);
    event Transfer(address indexed from, address indexed to, uint value);

    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
    function totalSupply() external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function allowance(address owner, address spender) external view returns (uint);

    function approve(address spender, uint value) external returns (bool);
    function transfer(address to, uint value) external returns (bool);
    function transferFrom(address from, address to, uint value) external returns (bool);

    function addMinter(address minter_address) external;
    function minter_mint(address m_address, uint256 m_amount) external;
}

struct AppViewRtn {
    address app_address;
    uint256 maxUsageAllowedPct; // What percent of a user's locked FPIS an app is able to control at max, 1e6 precision
}

contract MockApp {
    veFPISProxy public proxy;
    IERC20 public fpis;
    constructor(address _proxyAddr) {
        proxy = veFPISProxy(_proxyAddr);
        fpis = IERC20(FPIS);
    }
    function take(address user, uint256 amount) public {
        proxy.transferFromVeFPISToApp(user, amount);
    }
    function repay(address user, uint256 amount) public {
        fpis.approve(address(VEFPIS), amount);
        proxy.transferFromAppToVeFPIS(user, amount);
    }
    function slash(address user, uint256 amount) public {
        proxy.appSlash(user, amount);
    }
    function add(address user, uint256 amount) public {
        (,,uint maxUsage) = proxy.getUserAppMaxUsages(address(this), user);
        uint surplus = 0;
        if (amount > maxUsage) {
            surplus = amount - maxUsage;
        }
        fpis.approve(address(VEFPIS), surplus);
        proxy.appAdd(user, amount);
    }
}

contract veFPISProxyTest is Test {
    veFPISProxy public proxy;
    IveFPIS public veFPIS;
    IFPIS public fpis;

    function setUp() public {
        proxy = new veFPISProxy(FPIS_COMPTROLLER, TIMELOCK, VEFPIS);
        veFPIS = IveFPIS(VEFPIS);
        fpis = IFPIS(FPIS);

        // // Send some FPIS to Alice
        // vm.startPrank(FPIS_COMPTROLLER);
        // fpis.transfer(ALICE, 1000);
        // fpis.transfer(BOB, 1000);
        // vm.stopPrank();

        // // Have Alice lock in veFPIS
        // vm.startPrank(ALICE, ALICE); // First param is msg.sender, 2nd param tx.origin
        // fpis.approve(address(veFPIS), 1000);
        // veFPIS.create_lock(1000, block.timestamp + MAXTIME);  
        // vm.stopPrank();

        // // Have Bob lock in veFPIS
        // vm.startPrank(BOB, BOB); // First param is msg.sender, 2nd param tx.origin
        // fpis.approve(address(veFPIS), 1000);
        // veFPIS.create_lock(1000, block.timestamp + MAXTIME);
        // vm.stopPrank();

        // Whitelist proxy at admin and staker level
        vm.prank(FPIS_COMPTROLLER);
        veFPIS.adminSetProxy(address(proxy));
        vm.prank(ALICE);
        veFPIS.stakerSetProxy(address(proxy));
        vm.prank(BOB);
        veFPIS.stakerSetProxy(address(proxy));

        vm.prank(FPIS_COMPTROLLER);
        fpis.addMinter(FPIS_COMPTROLLER);
    }

    function deployApp(uint256 maxUsageAllowedPct) public returns(address){
        MockApp app = new MockApp(address(proxy));
        vm.startPrank(FPIS_COMPTROLLER);
        proxy.addNewApp(address(app), maxUsageAllowedPct, false);
        vm.stopPrank();
        return address(app);
    }

    function testInit() public {
        assertEq(proxy.owner(), FPIS_COMPTROLLER);
        assertEq(proxy.timelock(), TIMELOCK);
        // assertEq(veFPIS.locked__amount(address(ALICE)), 1000);
    }

    // Testing transferFromVeFPISToApp
    function testTransferFromVeFPISToApp(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        giveVeFPIS(address(ALICE), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage\

        vm.expectEmit(true, false, false, true);
        emit UserSetAppMaxFPISUsage(address(app), amountFPIS);
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit TransferredFromVeFPISToApp(address(app), ALICE, amountFPIS);
        app.take(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), amountFPIS);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountFPIS);
    }
    
    function testMultiTransferFromVeFPISToApp(uint256 amount1, uint256 amount2, uint256 amount3, uint256 amount4) public {
        vm.assume(amount1 < 1000000000000000000000000000);
        vm.assume(amount2 < 1000000000000000000000000000);
        vm.assume(amount3 < 1000000000000000000000000000);
        vm.assume(amount4 < 1000000000000000000000000000);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
        uint sum = amount1 + amount2 + amount3 + amount4;
        giveVeFPIS(address(ALICE), sum);

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), sum);

        app.take(ALICE, amount1);
        assertEq(fpis.balanceOf(address(app)), amount1);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount1);

        app.take(ALICE, amount2);
        assertEq(fpis.balanceOf(address(app)), amount1 + amount2);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount1 + amount2);

        app.take(ALICE, amount3);
        assertEq(fpis.balanceOf(address(app)), amount1 + amount2 + amount3);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount1 + amount2 + amount3);

        app.take(ALICE, amount4);
        assertEq(fpis.balanceOf(address(app)), sum);
        assertEq(veFPIS.user_proxy_balance(ALICE), sum);
    }

    function testAppExceedsUserLimit(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        giveVeFPIS(address(ALICE), amountFPIS + 100);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.expectRevert(bytes("max_usage_to_use limit"));
        app.take(ALICE, amountFPIS + 1);

        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testAppExceedsAppLimit(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        giveVeFPIS(address(ALICE), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION / 10)); // 10% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.expectRevert(bytes("max_usage_to_use limit"));
        app.take(ALICE, (amountFPIS / 10) + 1);

        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testMultiAppExceedsLimit(uint256 amount1, uint256 amount2, uint256 lockedAmount) public {
        vm.assume(amount1 < 1000000000000000000000000000);
        vm.assume(amount2 < 1000000000000000000000000000);
        uint256 sum = amount1 + amount2;
        vm.assume(lockedAmount < sum);
        vm.assume(lockedAmount > amount1);
        giveVeFPIS(address(ALICE), lockedAmount);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
        MockApp app2 = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.startPrank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), sum);
        vm.stopPrank();

        app.take(ALICE, amount1);

        vm.expectRevert(bytes("Amount exceeds locked balance"));
        app2.take(ALICE, amount2);

        assertEq(fpis.balanceOf(address(app)), amount1);
        assertEq(fpis.balanceOf(address(app2)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount1);
    }

    // Testing transferFromAppToVeFPIS 
    function testTransferFromAppToVeFPIS(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        giveVeFPIS(address(ALICE), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit TransferredFromAppToVeFPIS(address(app), ALICE, amountFPIS);
        app.repay(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testMultiTransferFromAppToVeFPIS(uint256 amount1, uint256 amount2, uint256 amount3) public {
        vm.assume(amount1 < 1000000000000000000000000000);
        vm.assume(amount2 < 1000000000000000000000000000);
        vm.assume(amount3 < 1000000000000000000000000000);
        uint256 sum = amount1 + amount2 + amount3;
        giveVeFPIS(address(ALICE), sum);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), sum);

        app.take(ALICE, sum);

        app.repay(ALICE, amount1);
        assertEq(fpis.balanceOf(address(app)), sum - amount1);
        assertEq(veFPIS.user_proxy_balance(ALICE), sum - amount1);

        app.repay(ALICE, amount2);
        assertEq(fpis.balanceOf(address(app)), amount3);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount3);

        app.repay(ALICE, amount3);
        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testOverTransferFromAppToVeFPIS(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        giveVeFPIS(address(ALICE), amountFPIS);
        giveVeFPIS(address(BOB), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.prank(BOB);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountFPIS);
        app.take(BOB, amountFPIS);

        vm.expectRevert(bytes("Payback amount exceeds usage"));
        app.repay(ALICE, amountFPIS + 1);

        assertEq(fpis.balanceOf(address(app)), amountFPIS * 2);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountFPIS);
        assertEq(veFPIS.user_proxy_balance(BOB), amountFPIS);
    }

    // Testing appAdd
    function testAppAdd(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountFPIS > 0); // Required in veFPIS functions
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(FPIS_COMPTROLLER);
        fpis.minter_mint(address(app), amountFPIS);

        giveVeFPIS(address(ALICE), amountFPIS);
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit AppAdds(address(app), ALICE, amountFPIS, 0);
        app.add(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), amountFPIS);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountFPIS);

        app.repay(ALICE, amountFPIS); // this is causing fail
        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testUserSurplusAdd(uint256 amountFPIS, uint256 maxUsage) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountFPIS > 0); // Required in veFPIS functions
        vm.assume(maxUsage < amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(FPIS_COMPTROLLER);
        fpis.minter_mint(address(app), amountFPIS);

        giveVeFPIS(address(ALICE), amountFPIS);
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), maxUsage);

        vm.expectEmit(true, true, false, true);
        emit AppAdds(address(app), ALICE, amountFPIS, amountFPIS - maxUsage);
        app.add(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), maxUsage);
        assertEq(veFPIS.user_proxy_balance(ALICE), maxUsage);

        app.repay(ALICE, maxUsage);
        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testAppSurplusAdd(uint256 amountFPIS, uint256 maxUsagePct) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountFPIS > 0); // Required in veFPIS functions
        vm.assume(maxUsagePct < PRECISION);
        MockApp app = MockApp(deployApp(maxUsagePct));

        uint256 maxUsage = amountFPIS * maxUsagePct / PRECISION;

        vm.prank(FPIS_COMPTROLLER);
        fpis.minter_mint(address(app), amountFPIS);

        giveVeFPIS(address(ALICE), amountFPIS);
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit AppAdds(address(app), ALICE, amountFPIS, amountFPIS - maxUsage);
        app.add(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), maxUsage);
        assertEq(veFPIS.user_proxy_balance(ALICE), maxUsage);

        app.repay(ALICE, maxUsage);
        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    // Testing appSlash
    function testAppSlash(uint256 amountFPIS, uint256 amountSlash) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountSlash > 0); // Required in veFPIS functions
        vm.assume(amountSlash < amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        giveVeFPIS(address(ALICE), amountFPIS);

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit AppSlashes(address(app), ALICE, amountSlash);
        app.slash(ALICE, amountSlash);

        assertEq(fpis.balanceOf(address(app)), amountFPIS);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountFPIS - amountSlash);
    }

    function testAppOverSlash(uint256 amountFPIS, uint256 amountUsage, uint256 amountSlash) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountSlash > 0); // Required in veFPIS functions
        vm.assume(amountFPIS > amountUsage);
        vm.assume(amountSlash > amountUsage);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        giveVeFPIS(address(ALICE), amountFPIS);

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountUsage);

        vm.expectRevert(bytes("Slash amount exceeds usage"));
        app.slash(ALICE, amountSlash);

        assertEq(fpis.balanceOf(address(app)), amountUsage);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountUsage);
    }

    // Testing admin functionality
    function testSetUsage(uint256 newPrecision) public {
        vm.assume(newPrecision <= PRECISION);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
        assertEq(proxy.getAppMaxUsagePct(address(app)), PRECISION);

        vm.expectEmit(true, false, false, true);
        emit SetAppMaxUsagePct(address(app), newPrecision);
        vm.prank(FPIS_COMPTROLLER);
        proxy.setAppMaxUsagePct(address(app), newPrecision);
        assertEq(proxy.getAppMaxUsagePct(address(app)), newPrecision);
    }

    function testRecoverFundsAfterDisableApp(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountFPIS > 0); // Required in veFPIS functions
        giveVeFPIS(address(ALICE), amountFPIS);

        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
        
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountFPIS);

        vm.prank(FPIS_COMPTROLLER);
        proxy.setAppMaxUsagePct(address(app), 0);

        app.repay(ALICE, amountFPIS);

        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testUnableToTransferToAppAfterDisableApp(uint256 amount1, uint256 amount2) public {
        vm.assume(amount1 < 1000000000000000000000000000);
        vm.assume(amount2 < 1000000000000000000000000000); // Required in veFPIS functions
        vm.assume(amount2 > 0); // Amount of 0 won't revert
        uint256 sum = amount1 + amount2;
        giveVeFPIS(address(ALICE), sum);
        
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
        
        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), sum);

        app.take(ALICE, amount1);

        vm.prank(FPIS_COMPTROLLER);
        proxy.setAppMaxUsagePct(address(app), 0);

        vm.expectRevert(bytes("max_usage_to_use limit"));
        app.take(ALICE, amount2);

        assertEq(fpis.balanceOf(address(app)), amount1);
        assertEq(veFPIS.user_proxy_balance(ALICE), amount1);
    }

    function testAddApp(uint256 maxUsagePct) public {
        vm.assume(maxUsagePct < PRECISION);
        MockApp app = new MockApp(address(proxy));

        vm.expectEmit(true, false, false, true);
        emit AddNewApp(address(app), maxUsagePct);

        vm.prank(FPIS_COMPTROLLER);
        proxy.addNewApp(address(app), maxUsagePct, false);
        
        assertEq(proxy.getAppMaxUsagePct(address(app)), maxUsagePct);
        assertTrue(proxy.isApp(address(app)));
    }

    function testUserSlashAfterLosingFunds(uint256 amountFPIS) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountFPIS > 0); // Required in veFPIS functions
        giveVeFPIS(address(ALICE), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountFPIS);

        app.take(ALICE, amountFPIS);

        vm.prank(address(app));
        fpis.transfer(address(0xFFF), amountFPIS); //Lose Alice's funds

        vm.expectEmit(true, false, false, true);
        emit SetAppAllowUserSlashes(address(app), true);
        vm.prank(FPIS_COMPTROLLER);
        proxy.setAppAllowUserSlashes(address(app), true);

        assertEq(veFPIS.user_proxy_balance(ALICE), amountFPIS);

        vm.expectEmit(true, true, false, true);
        emit UserSlashes(address(app), ALICE, amountFPIS);
        vm.prank(ALICE);
        proxy.userSlash(address(app), amountFPIS);

        assertEq(fpis.balanceOf(address(app)), 0);
        assertEq(veFPIS.user_proxy_balance(ALICE), 0);
    }

    function testNoUserSlashWhenDisabled(uint256 amountFPIS, uint256 amountSlash) public {
        vm.assume(amountFPIS < 1000000000000000000000000000);
        vm.assume(amountSlash < 1000000000000000000000000000);
        vm.assume(amountSlash < amountFPIS);
        giveVeFPIS(address(ALICE), amountFPIS);
        MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage

        vm.prank(ALICE);
        proxy.userSetAppMaxFPISUsage(address(app), amountSlash);

        app.take(ALICE, amountSlash);

        vm.expectRevert(bytes("User slashes not allowed"));
        proxy.userSlash(address(app), amountSlash);

        assertEq(fpis.balanceOf(address(app)), amountSlash);
        assertEq(veFPIS.user_proxy_balance(ALICE), amountSlash);
    }

    function giveVeFPIS(address user, uint amountFPIS) internal {
        if(amountFPIS == 0) {
            amountFPIS = 1;
        }
        vm.prank(FPIS_COMPTROLLER);
        fpis.minter_mint(user, amountFPIS);
        // assertEq(fpis.balanceOf(user), amountFPIS);

        vm.startPrank(user, user); // First param is msg.sender, 2nd param tx.origin
        fpis.approve(address(veFPIS), amountFPIS);
        veFPIS.create_lock(amountFPIS, block.timestamp + MAXTIME);  
        vm.stopPrank();
        // assertEq(fpis.balanceOf(user), 0);
    }

    // function flipCoin(uint seed) internal returns(bool) {
    //     uint hashNum = uint(keccak256(seed)) % 2;
    //     return (hashNum % 2 == 0);
    // }

    // function testFuzzWalk(uint amountFPIS, uint seed) {

    // }


    // function testTryBreak(uint amountFPIS, uint pctAllow1, uint pctAllow2, uint pctAllow3, uint usrAllow1, uint usrAllow2, uint usrAllow3) public {
    //     vm.assume(amountFPIS < 1000000000000000000000000000);
    //     vm.assume(pctAllow1 < PRECISION);
    //     vm.assume(pctAllow2 < PRECISION);
    //     vm.assume(pctAllow3 < PRECISION);
    //     vm.assume(allow1 < 1000000000000000000000000000);
    //     vm.assume(allow2 < 1000000000000000000000000000);
    //     vm.assume(allow3 < 1000000000000000000000000000);

    //     MockApp app1 = MockApp(deployApp(appUse1));
    //     MockApp app1 = MockApp(deployApp(appUse1));
    //     MockApp app1 = MockApp(deployApp(appUse1));


    //     vm.startPrank(FPIS_COMPTROLLER);
    //     fpis.addMinter(FPIS_COMPTROLLER);
    //     fpis.minter_mint(CADE, amountFPIS);
    //     vm.stopPrank();
    //     assertEq(fpis.balanceOf(CADE), amountFPIS);

    //     vm.startPrank(CADE, CADE); // First param is msg.sender, 2nd param tx.origin
    //     fpis.approve(address(veFPIS), amountFPIS);
    //     veFPIS.create_lock(amountFPIS, block.timestamp + MAXTIME);  
    //     vm.stopPrank();
    //     assertEq(fpis.balanceOf(CADE), 0);

        
    // }

    // function testManyApp(uint numApps, uint fpisPerApp) public {
    //     uint fpisPerApp = amountFPIS / numApps;
    //     for(int i = 0; i < numApps; i++) {
    //         MockApp app = MockApp(deployApp(PRECISION)); // 100% Max allowed usage
    //         app.take(ALICE, amountFPIS);
    //     }
    // }
    
    event TransferredFromAppToVeFPIS(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event TransferredFromVeFPISToApp(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event AppAdds(address indexed app_address, address indexed user_address, uint256 fpis_amount, uint256 surplus_amt);
    event AppSlashes(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event UserSlashes(address indexed app_address, address indexed user_address, uint256 fpis_amount);
    event AddNewApp(address indexed app_address, uint256 newMaxUsageAllowedPct);
    event SetAppMaxAllowancePercent(address indexed app_address, uint256 maxAllowancePercent);
    event SetAppMaxUsagePct(address indexed app_address, uint256 newMaxUsageAllowedPct);
    event SetAppAllowUserSlashes(address indexed appAddr, bool allowUserSlashes);
    event UserSetAppMaxFPISUsage(address indexed app_address, uint256 max_fpis);
}
