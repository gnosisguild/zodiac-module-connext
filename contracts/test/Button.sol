// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.15;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IConnext} from "@connext/nxtp-contracts/contracts/core/connext/interfaces/IConnext.sol";

contract Button {
    event ButtonPushed(address originSender, uint32 origin, uint256 pushes);

    uint256 public pushes;

    // The Domain ID where the source contract is deployed
    uint32 public originDomain;

    // The address of the source contract
    address public source;

    // The address of the Connext contract on the this domain
    IConnext public connext;

    /** @notice A modifier for authenticated calls.
    *  This is an important security consideration. If the target contract
    *  function should be authenticated, it must check three things:
    *    1) The originating call comes from the expected origin domain.
    *    2) The originating call comes from the expected source contract.
    *    3) The call to this contract comes from Connext.
    */
    modifier onlySource(address _originSender, uint32 _origin) {
        require(
        _origin == originDomain &&
            _originSender == source &&
            msg.sender == address(connext),
        "Expected source contract on origin domain called by Connext"
        );
        _;
    }

    // In the constructor we pass information that the modifier will check
    constructor(
        uint32 _originDomain,
        address _source,
        IConnext _connext
    ) {
        originDomain = _originDomain;
        source = _source;
        connext = _connext;
    }

    // UpdateGreeting updates the public greeting variable if test tokens are paid to the contract
    function pushButton(
        uint256 _amount, 
        address _asset,
        address _originSender,
        uint32 _origin
    ) public onlySource(_originSender, _origin) {
        IERC20 _token = IERC20(_asset);
        require(_token.transferFrom(msg.sender, address(this), _amount));

        pushes++;
        emit ButtonPushed(_originSender, _origin, pushes);
    }
}
