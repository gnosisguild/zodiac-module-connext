// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.16;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import {IXReceiver} from "./interfaces/IXReceiver.sol";

contract ConnextModule is Module, IXReceiver {
    event ModuleSetUp(
        address owner,
        address avatar,
        address target,
        address originAddress,
        uint32 origin,
        address connext
    );
    event OriginAddressSet(address originAddress);
    event OriginSet(uint32 origin);
    event ConnextSet(address connext);

    error ConnextOnly();
    error ModuleTransactionFailed();
    error OriginAddressOnly();
    error OriginOnly();

    // The ConnextHandler contract on this domain
    address public connext;

    // Address of the sender from origin;
    address public originAddress;

    // Origin Domain ID
    uint32 public origin;

    constructor(
        address _owner,
        address _avatar,
        address _target,
        address _originAddress,
        uint32 _origin,
        address _connext
    ) {
        bytes memory initializeParams = abi.encode(_owner, _avatar, _target, _originAddress, _origin, _connext);
        setUp(initializeParams);
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams Parameters of initialization encoded
    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        (
            address _owner,
            address _avatar,
            address _target,
            address _originAddress,
            uint32 _origin,
            address _connext
        ) = abi.decode(initializeParams, (address, address, address, address, uint32, address));

        setAvatar(_avatar);
        setTarget(_target);
        setOriginAddress(_originAddress);
        setOrigin(_origin);
        setConnext(_connext);
        transferOwnership(_owner);

        emit ModuleSetUp(owner(), avatar, target, originAddress, origin, connext);
    }

    modifier onlyConnext(address _originSender, uint32 _origin) {
        if (msg.sender != connext) revert ConnextOnly();
        if (_originSender != originAddress) revert OriginAddressOnly();
        if (_origin != origin) revert OriginOnly();
        _;
    }

    function xReceive(
        bytes32 _transferId,
        uint256 _amount,
        address _asset,
        address _originSender,
        uint32 _origin,
        bytes memory _callData
    ) 
        external onlyConnext(_originSender, _origin)
        returns (bytes memory) {
            _execute(_callData);
        
    }

    function _execute(bytes calldata _message) internal {
        (address _to, uint256 _value, bytes memory _data, Enum.Operation _operation) = abi.decode(
            _message,
            (address, uint256, bytes, Enum.Operation)
        );
        if (!exec(_to, _value, _data, _operation)) revert ModuleTransactionFailed();
    }

    function setOriginAddress(address _originAddress) public onlyOwner {
        require(_originAddress != address(0), "Sender should not be address(0)");
        originAddress = _originAddress;
        emit OriginAddressSet(originAddress);
    }

    function setConnext(address _connext) public onlyOwner {
        connext = _connext;
        emit ConnextSet(connext);
    }

    function setOrigin(uint32 _origin) public onlyOwner {
        origin = _origin;
        emit OriginSet(origin);
    }
}
