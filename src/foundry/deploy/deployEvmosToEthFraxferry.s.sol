//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import {console} from "forge-std/console.sol";
import { Script } from "forge-std/Script.sol"; // Gives vm and console
import { Fraxferry } from "../../hardhat/contracts/Fraxferry/Fraxferry.sol";


contract Deploy is Script {
    function run() public {
        vm.startBroadcast();

        // // If new contract
        // console.log("Deploy ferry contract");
        // Fraxferry ferry = new Fraxferry(
        //     0xE03494D0033687543a80c9B1ca7D6237F2EA8BD8,
        //     9001,
        //     0x853d955aCEf822Db058eb8505911ED77F175b99e,
        //     1
        // );

        // If already deployed
        console.log("Connect ferry contract");
        Fraxferry ferry = Fraxferry(0xa47F0E10D832c9c35b9E733dedaAc2316fF47192);

        console.log("Set crew");
        ferry.setCaptain(0xBB437059584e30598b3AF0154472E47E6e2a45B9);
        ferry.setFirstOfficer(0xBB437059584e30598b3AF0154472E47E6e2a45B9);
        ferry.setCrewmember(0xBB437059584e30598b3AF0154472E47E6e2a45B9, true);

        console.log("Set min wait periods");
        ferry.setMinWaitPeriods(3600, 79200);

        console.log("Nominate the eventual owner (ferry contract)");
        ferry.nominateNewOwner(0x18B34258F0972b19C3B757B2169b42b4D5b0856A);

        vm.stopBroadcast();
    }
}
