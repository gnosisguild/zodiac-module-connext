// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.9;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";

contract MyModule is Module {
    address public button;

    constructor(address _owner, address _button) {
        bytes memory initializeParams = abi.encode(_owner, _button);
        setUp(initializeParams);
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        (address _owner, address _button) = abi.decode(initializeParams, (address, address));

        button = _button;
        setAvatar(_owner);
        setTarget(_owner);
        transferOwnership(_owner);
    }

    function pushButton() external {
        exec(button, 0, abi.encodePacked(bytes4(keccak256("pushButton()"))), Enum.Operation.Call);
    }
}
