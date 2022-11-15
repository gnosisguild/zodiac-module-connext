// SPDX-License-Identifier: LGPL-3.0-only
pragma solidity ^0.8.15;

import "@gnosis.pm/zodiac/contracts/core/Module.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IXReceiver} from "./interfaces/IXReceiver.sol";

contract ConnextModule is Module, IXReceiver {
    using SafeERC20 for IERC20;
    
    event ModuleSetUp(
        address owner,
        address avatar,
        address target,
        address originSender,
        uint32 origin,
        address connext
    );
    event OriginSenderSet(address originSender);
    event OriginSet(uint32 origin);
    event ConnextSet(address connext);

    error ConnextOnly();
    error ModuleTransactionFailed();
    error OriginSenderOnly();
    error OriginOnly();

    /// The ConnextHandler contract on this domain.
    address public connext;
    /// Address of the sender from origin.
    address public originSender;
    /// Origin Domain ID.
    uint32 public origin;

    /// @param _owner Address that will be able to call functions protected onlyOwner() functions.
    /// @param _avatar Address that will receive all token transfered along with xReceive calls and that will ultimately execute messages passed.
    /// @param _target Address on which this contract will call `execTransactionFromModule()`.
    /// @param _originSender Address which is allowed to send calls to this contract from `origin` via `connext`.
    /// @param _origin Identifier for the foreign chain form which this module sould receive messages.
    /// @param _connext Address of the connext contract.
    constructor(
        address _owner,
        address _avatar,
        address _target,
        address _originSender,
        uint32 _origin,
        address _connext
    ) {
        bytes memory initializeParams = abi.encode(_owner, _avatar, _target, _originSender, _origin, _connext);
        setUp(initializeParams);
    }

    /// @dev Initialize function, will be triggered when a new proxy is deployed
    /// @param initializeParams ABI encoded initialization params, in the same order as the parameters for this contract's constructor.
    /// @notice Only callable once.
    function setUp(bytes memory initializeParams) public override initializer {
        __Ownable_init();
        (
            address _owner,
            address _avatar,
            address _target,
            address _originSender,
            uint32 _origin,
            address _connext
        ) = abi.decode(initializeParams, (address, address, address, address, uint32, address));

        setAvatar(_avatar);
        setTarget(_target);
        setOriginSender(_originSender);
        setOrigin(_origin);
        setConnext(_connext);
        transferOwnership(_owner);

        emit ModuleSetUp(owner(), avatar, target, originSender, origin, connext);
    }

    /// @dev Validates calls to ensure they were sent by the correct `connext` contract and that the `origin` and `originSender` are correct.
    /// @param _originSender Address which is allowed to send calls to this contract from `origin` via `connext`.
    /// @param _origin Identifier for the foreign chain form which this module sould receive messages.
    modifier onlyConnext(address _originSender, uint32 _origin) {
        if (msg.sender != connext) revert ConnextOnly();
        if (_originSender != originSender) revert OriginSenderOnly();
        if (_origin != origin) revert OriginOnly();
        _;
    }

    /// @dev Receives xCalls from Connext.
    /// @param _amount The ammount of `_asset` to be transferred to `avatar` with this call.
    /// @param _asset Address of the asset to be transferred with this call.
    /// @param _originSender The foreign address which sent this message.
    /// @param _origin The identifier for the foreign chain where this message originated.
    /// @return Returns `bytes memory returnData` if the call was successful.
    /// @notice Only callable by `connext` address.
    function xReceive(
        bytes32,
        uint256 _amount,
        address _asset,
        address _originSender,
        uint32 _origin,
        bytes memory _callData
    ) 
        external override onlyConnext(_originSender, _origin)
        returns (bytes memory) {
        // Decode message
        (address _to, uint256 _value, bytes memory _data, Enum.Operation _operation) = abi.decode(
            _callData,
            (address, uint256, bytes, Enum.Operation)
        );

        // Approve token transfer if tokens were passed in
        IERC20 _token = IERC20(_asset);
        if(_amount > 0) _token.safeTransfer(avatar, _amount);

        // Execute transaction against target
        (bool success, bytes memory returnData) = execAndReturnData(_to, _value, _data, _operation);
        if(!success) revert ModuleTransactionFailed();
        return returnData;
    }

    /// @dev Sets `originSender` address.
    /// @param _originSender Address that will be allowed to send calls to this contract from `origin` via `connext`.
    /// @notice Only callable by `owner`.
    function setOriginSender(address _originSender) public onlyOwner {
        require(_originSender != address(0), "Sender should not be address(0)");
        originSender = _originSender;
        emit OriginSenderSet(originSender);
    }

    /// @dev Sets `connext` address.
    /// @param _connext Address that will be allowed to call `xReceive()` on this contract.
    /// @notice Only callable by `owner`.
    function setConnext(address _connext) public onlyOwner {
        connext = _connext;
        emit ConnextSet(connext);
    }

    /// @dev Sets `origin`.
    /// @param _origin Uint32 identifier of the foreign chain where `originSender` will be able to initiate messages to this contract.
    /// @notice Only callable by `owner`.
    function setOrigin(uint32 _origin) public onlyOwner {
        origin = _origin;
        emit OriginSet(origin);
    }
}
