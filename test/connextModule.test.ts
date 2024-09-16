import hre, { ethers } from "hardhat"
import { deployFactories, deployMastercopy, deployProxy } from "@gnosis-guild/zodiac-core"
import { AbiCoder, ZeroHash } from "ethers"
import { expect } from "chai"

import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers"

import createAdapter from "./createEIP1193"

import { ConnextModule__factory } from "../typechain-types"

const AddressOne = "0x0000000000000000000000000000000000000001"
const transferId = "0x0000000000000000000000000000000000000000000000000000000000000001"

const setup = async () => {
  const [deployer, owner, connext, other] = await ethers.getSigners()
  const eip1193Provider = createAdapter({
    provider: hre.network.provider,
    signer: deployer,
  })
  const Avatar = await ethers.getContractFactory("TestAvatar")
  const Token = await ethers.getContractFactory("TestToken")
  const ConnextModule = await ethers.getContractFactory("ConnextModule")
  const Button = await ethers.getContractFactory("Button")

  const avatar = await Avatar.deploy()
  const avatarAddress = await avatar.getAddress()
  const token = await Token.deploy(18)
  const params = {
    owner: owner.address,
    avatar: avatarAddress,
    target: avatarAddress,
    originSender: AddressOne,
    origin: 1337,
    connextAddress: connext.address,
  }
  const paramTypes = ["address", "address", "address", "address", "uint32", "address"]

  const connextModule = await ConnextModule.deploy(
    params.owner,
    params.avatar,
    params.target,
    params.originSender,
    params.origin,
    params.connextAddress,
  )
  // const connextModAddress = await connextModule.address()
  const button = await Button.deploy()
  await button.waitForDeployment()
  await avatar.enableModule(await connextModule.getAddress())

  return {
    signers: {
      owner,
      connext,
      other,
    },
    button,
    connextModule: connextModule.connect(owner),
    avatar,
    token,
    params,
    paramTypes,
    eip1193Provider,
  }
}

async function setUpWithProxy() {
  const { eip1193Provider, params, paramTypes } = await loadFixture(setup)
  const values = [params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress]

  await deployFactories({ provider: eip1193Provider })
  const { address: mastercopy } = await deployMastercopy({
    bytecode: (await ethers.getContractFactory("ConnextModule")).bytecode,
    constructorArgs: {
      types: ["address", "address", "address", "address", "uint32", "address"],
      values: [AddressOne, AddressOne, AddressOne, AddressOne, 1, AddressOne],
    },
    salt: ZeroHash,
    provider: eip1193Provider,
  })

  const { address } = await deployProxy({
    mastercopy,
    setupArgs: {
      types: paramTypes,
      values,
    },
    saltNonce: "0xfa",
    provider: eip1193Provider,
  })

  return {
    eip1193Provider,
    params,
    paramTypes,
    proxyAddress: address,
    mastercopyAddress: mastercopy,
  }
}

describe("ConnextModule", function () {
  describe("xReceive()", function () {
    it("Should successfully transfer token balance to avatar and tell avatar to push button", async function () {
      const {
        signers: { connext },
        connextModule,
        button,
        params,
        token,
        avatar,
      } = await loadFixture(setup)

      const tx = await button.push.populateTransaction()
      const buttonAddress = await button.getAddress()
      const data = new AbiCoder().encode(
        ["address", "uint256", "bytes", "bool"],
        [
          buttonAddress, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )

      // send some tokens to the connext module, simulates what the connext contract would do.
      await token.transfer(await connextModule.getAddress(), 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      // ensure it emits buttonPushed event with avatar as pusher.
      expect(
        await connextModule.connect(connext).xReceive(
          transferId, // _transferId
          1000, // _amount
          await token.getAddress(), // _asset
          params.originSender, // _originSender
          params.origin, // _origin
          data, // _callData
        ),
      )
        .to.emit(button, "ButtonPushed")
        .withArgs([1, await avatar.getAddress()])
      // make sure button has been pushed.
      expect(await button.pushes()).to.equal(1)
      // check that tokens have been transferred to the avatar.
      expect(await token.balanceOf(await avatar.getAddress())).to.equal(1000)
    })

    it("Should revert if origin is incorrect", async function () {
      const {
        signers: { connext },
        params,
        button,
        connextModule,
        token,
      } = await loadFixture(setup)

      const tx = await button.push.populateTransaction()
      const buttonAddress = await button.getAddress()
      const data = new AbiCoder().encode(
        ["address", "uint256", "bytes", "bool"],
        [
          buttonAddress, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(connext).xReceive(
          transferId,
          0, // _amount
          await token.getAddress(),
          params.originSender,
          0xdead, // incorrect origin
          data,
        ),
      ).to.be.revertedWithCustomError(connextModule, "OriginOnly()")
    })

    it("Should revert if originSender is incorrect", async function () {
      const {
        signers: { connext, other },
        params,
        connextModule,
        button,
        token,
      } = await loadFixture(setup)

      const tx = await button.push.populateTransaction()
      const buttonAddress = await button.getAddress()
      const data = new AbiCoder().encode(
        ["address", "uint256", "bytes", "bool"],
        [
          buttonAddress, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(connext).xReceive(
          transferId,
          0, // _amount
          await token.getAddress(),
          other.address, // originSender incorrect
          params.origin, // ok
          data,
        ),
      ).to.be.revertedWithCustomError(connextModule, "OriginSenderOnly()")
    })

    it("Should revert if called by account other than connext", async function () {
      const {
        signers: { other },
        connextModule,
        button,
        token,
      } = await loadFixture(setup)

      const tx = await button.push.populateTransaction()
      const buttonAddress = await button.getAddress()
      const tokenAddress = await token.getAddress()
      const data = new AbiCoder().encode(
        ["address", "uint256", "bytes", "bool"],
        [
          buttonAddress, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(other).xReceive(
          transferId, // _transferId
          0, // _amount
          tokenAddress, // _asset
          AddressOne, // _originSender
          1337, // _origin
          data, // _callData
        ),
      ).to.be.revertedWithCustomError(connextModule, "ConnextOnly()")
    })
    it("Should revert if token balance is less than _amount", async function () {
      const {
        signers: { connext },
        params,
        connextModule,
        button,
        token,
      } = await loadFixture(setup)

      const tx = await button.push.populateTransaction()
      const buttonAddress = await button.getAddress()
      const data = new AbiCoder().encode(
        ["address", "uint256", "bytes", "bool"],
        [
          buttonAddress, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)

      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(connext).xReceive(
          transferId,
          1000, // _amount
          await token.getAddress(),
          params.originSender,
          params.origin,
          data,
        ),
      ).to.be.reverted //handle de specific error
    })

    it("Should revert if module transaction fails", async function () {
      const {
        signers: { connext },
        params,
        connextModule,
        button,
        token,
      } = await loadFixture(setup)

      const moduleModAddress = await connextModule.getAddress()
      // send some tokens to the connext module, simulates what the connext contract would do.
      await token.transfer(moduleModAddress, 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass bad data to the module, it should revert.
      await expect(
        connextModule.connect(connext).xReceive(
          transferId, // _transferId
          1000, // _amount
          await token.getAddress(), // _asset
          params.originSender, // _originSender
          params.origin, // _origin
          "0xbaddad", // _callData
        ),
      ).to.be.reverted
    })
  })

  describe("setOriginSender()", function () {
    it("Should revert if caller is not owner", async function () {
      const {
        signers: { other },
        connextModule,
      } = await loadFixture(setup)

      await expect(connextModule.connect(other).setOriginSender(AddressOne)).to.be.revertedWithCustomError(
        connextModule,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const { connextModule } = await loadFixture(setup)
      await expect(connextModule.setOriginSender(AddressOne)).to.emit(connextModule, "OriginSenderSet")
    })
  })

  describe("setOrigin()", function () {
    it("Should revert if caller is not owner", async function () {
      const {
        signers: { other },
        connextModule,
      } = await loadFixture(setup)

      const nonOwnerConnextMod = connextModule.connect(other)
      await expect(nonOwnerConnextMod.setOrigin("0x1234")).to.be.revertedWithCustomError(
        nonOwnerConnextMod,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set origin and emit OriginSet event", async function () {
      const { connextModule } = await loadFixture(setup)

      await expect(connextModule.setOrigin("0x1234")).to.emit(connextModule, "OriginSet")
    })
  })

  describe("setConnext()", function () {
    it("Should revert if caller is not owner", async function () {
      const {
        signers: { other },
        connextModule,
      } = await loadFixture(setup)

      await expect(connextModule.connect(other).setConnext(AddressOne)).to.be.revertedWithCustomError(
        connextModule,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const {
        signers: { owner },
        connextModule,
      } = await loadFixture(setup)
      await expect(connextModule.connect(owner).setConnext(AddressOne)).to.emit(connextModule, "ConnextSet")
    })
  })

  describe("constructor()", function () {
    it("Should setup correct state", async function () {
      const { connextModule, params } = await loadFixture(setup)
      expect(await connextModule.owner()).to.equal(params.owner)
      expect(await connextModule.avatar()).to.equal(params.avatar)
      expect(await connextModule.originSender()).to.equal(params.originSender)
      expect(await connextModule.origin()).to.equal(params.origin)
      expect(await connextModule.connext()).to.equal(params.connextAddress)
    })
    it("Should emit ModuleSetUp() event with correct params", async function () {
      const { params } = await loadFixture(setup)
      const connextModuleFactory = await ethers.getContractFactory("ConnextModule")
      const connextModule = await connextModuleFactory.deploy(
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      )

      const tx = connextModule.deploymentTransaction()
      const receipt = await tx?.wait()
      await expect(receipt)
        .to.emit(connextModule, "ModuleSetUp")
        .withArgs(params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress)
    })
  })

  describe("setUp()", function () {
    it("Should initialize proxy with correct state", async function () {
      const { proxyAddress, params } = await loadFixture(setUpWithProxy)

      // retrieve new address from event
      const moduleProxy = await ConnextModule__factory.connect(proxyAddress, hre.ethers.provider)

      expect(await moduleProxy.owner()).to.be.equal(params.owner)
      expect(await moduleProxy.avatar()).to.be.equal(params.avatar)
      expect(await moduleProxy.originSender()).to.equal(params.originSender)
      expect(await moduleProxy.origin()).to.equal(params.origin)
      expect(await moduleProxy.connext()).to.equal(params.connextAddress)
    })
    it("Should emit ModuleSetUp() event with correct params", async function () {
      const { params } = await loadFixture(setup)
      const ConnextModule = await ethers.getContractFactory("ConnextModule")
      const module = await ConnextModule.deploy(
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      )
      await module.waitForDeployment()
      const tx = module.deploymentTransaction()

      expect(tx)
        .to.emit(module, "ModuleSetUp")
        .withArgs(params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress)
    })

    it("Should revert if called more than once", async function () {
      const { eip1193Provider, proxyAddress, mastercopyAddress, params, paramTypes } = await loadFixture(setUpWithProxy)

      const { address, noop } = await deployProxy({
        mastercopy: mastercopyAddress,
        setupArgs: {
          types: paramTypes,
          values: [
            params.owner,
            params.avatar,
            params.target,
            params.originSender,
            params.origin,
            params.connextAddress,
          ],
        },
        saltNonce: "0xfa",
        provider: eip1193Provider,
      })
      expect(noop).to.be.equal(true)
      expect(address).to.be.equal(proxyAddress)
    })
  })
})
