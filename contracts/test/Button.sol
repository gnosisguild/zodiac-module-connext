// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.15;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract Button is Ownable {
    event ButtonPushed(uint8 pushes, address pusher);

    uint8 public pushes;


    // UpdateGreeting updates the public greeting variable if test tokens are paid to the contract
    function push() public {
        pushes++;
        emit ButtonPushed(pushes, msg.sender);
    }
}
