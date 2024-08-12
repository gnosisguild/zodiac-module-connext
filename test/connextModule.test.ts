import { expect } from "chai"
import "@nomicfoundation/hardhat-ethers"
import hre, { ethers, deployments, getNamedAccounts } from "hardhat"
import createAdapter from "./createEIP1193"
import { deployFactories, deployMastercopy, deployProxy } from "zodiac-core"
import { AbiCoder, ZeroHash } from "ethers"
import { ConnextModule__factory } from "../typechain-types"

const AddressOne = "0x0000000000000000000000000000000000000001"
const transferId = "0x0000000000000000000000000000000000000000000000000000000000000001"

const setup = async () => {
  const [deployer] = await ethers.getSigners()
  const eip1193Provider = createAdapter({
    provider: hre.network.provider,
    signer: deployer,
  })
  const testSigner = deployer
  const Avatar = await ethers.getContractFactory("TestAvatar")
  const Token = await ethers.getContractFactory("TestToken")
  const ConnextModule = await ethers.getContractFactory("ConnextModule")
  const Button = await ethers.getContractFactory("Button")

  const avatar = await Avatar.deploy()
  const avatarAddress = await avatar.getAddress()
  const token = await Token.deploy(18)
  const params = {
    owner: testSigner.address,
    avatar: avatarAddress,
    target: avatarAddress,
    originSender: AddressOne,
    origin: 1337,
    connextAddress: testSigner.address,
  }
  const paramTypes = ["address", "address", "address", "address", "uint32", "address"]

  await deployFactories({ provider: eip1193Provider })

  const connextModule = await deployMastercopy({
    bytecode: ConnextModule.bytecode,
    constructorArgs: {
      types: paramTypes,
      values: [params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress],
    },
    salt: ZeroHash,
    provider: eip1193Provider,
  })

  // const connextModule = await ConnextModule.deploy(
  //   params.owner,
  //   params.avatar,
  //   params.target,
  //   params.originSender,
  //   params.origin,
  //   params.connextAddress,
  // )
  // const connextModAddress = await connextModule.address()
  const button = await Button.deploy()
  await button.waitForDeployment()
  await avatar.enableModule(connextModule.address)

  const ModuleProxyFactory = await ethers.getContractFactory("ModuleProxyFactory")
  const moduleProxyFactory = await ModuleProxyFactory.deploy()

  return {
    button,
    connextModule,
    avatar,
    token,
    testSigner,
    masterCopy: ConnextModule__factory.connect(connextModule.address, deployer),
    params,
    paramTypes,
    eip1193Provider,
  }
}
describe("ConnextModule", function () {
  describe("xReceive()", function () {
    it("Should successfully transfer token balance to avatar and tell avatar to push button", async function () {
      const { button, masterCopy, testSigner, token, avatar } = await setup()

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
      await token.transfer(await masterCopy.getAddress(), 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      // ensure it emits buttonPushed event with avatar as pusher.
      const tokenAddress = await token.getAddress()
      expect(
        await masterCopy.connect(testSigner).xReceive(
          transferId, // _transferId
          1000, // _amount
          tokenAddress, // _asset
          AddressOne, // _originSender
          1337, // _origin
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
      const { button, masterCopy, testSigner, token } = await setup()

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
      const tokenAddress = await token.getAddress()
      await expect(
        masterCopy.connect(testSigner).xReceive(
          transferId, // _transferId
          0, // _amount
          tokenAddress, // _asset
          AddressOne, // _originSender
          0xdead, // _origin
          data, // _callData
        ),
      ).to.be.revertedWithCustomError(masterCopy, "OriginOnly()")
    }),
      it("Should revert if originSender is incorrect", async function () {
        const { button, masterCopy, testSigner, token } = await setup()

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
        const tokenAddress = await token.getAddress()
        await expect(
          masterCopy.connect(testSigner).xReceive(
            transferId, // _transferId
            0, // _amount
            tokenAddress, // _asset
            testSigner.address, // _originSender
            1337, // _origin
            data, // _callData
          ),
        ).to.be.revertedWithCustomError(masterCopy, "OriginSenderOnly()")
      })

    it("Should revert if called by account other than connext", async function () {
      const { button, masterCopy, token } = await setup()
      const [, nonConnextAccount] = await ethers.getSigners()

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
        masterCopy.connect(nonConnextAccount).xReceive(
          transferId, // _transferId
          0, // _amount
          tokenAddress, // _asset
          AddressOne, // _originSender
          1337, // _origin
          data, // _callData
        ),
      ).to.be.revertedWithCustomError(masterCopy, "ConnextOnly()")
    }),
      it("Should revert if token balance is less than _amount", async function () {
        const { button, masterCopy, testSigner, token } = await setup()

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
        const tokenAddress = await token.getAddress()
        // pass token transfer instructions and button push message to connext module.
        await expect(
          masterCopy.connect(testSigner).xReceive(
            transferId, // _transferId
            1000, // _amount
            tokenAddress, // _asset
            AddressOne, // _originSender
            1337, // _origin
            data, // _callData
          ),
        ).to.be.reverted //handle de specific error
      })

    it("Should revert if module transaction fails", async function () {
      const { button, masterCopy, testSigner, token } = await setup()

      const moduleModAddress = await masterCopy.getAddress()
      // send some tokens to the connext module, simulates what the connext contract would do.
      await token.transfer(moduleModAddress, 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass bad data to the module, it should revert.
      const tokenAddress = await token.getAddress()
      await expect(
        masterCopy.connect(testSigner).xReceive(
          transferId, // _transferId
          1000, // _amount
          tokenAddress, // _asset
          AddressOne, // _originSender
          1337, // _origin
          "0xbaddad", // _callData
        ),
      ).to.be.reverted
    })
  })

  describe("setOriginSender()", function () {
    it("Should revert if caller is not owner", async function () {
      const { connextModule } = await setup()
      const [_, nonOwner] = await ethers.getSigners()
      const nonOwnerMasterCopy = ConnextModule__factory.connect(connextModule.address, nonOwner)
      await expect(nonOwnerMasterCopy.setOriginSender(AddressOne)).to.be.revertedWithCustomError(
        nonOwnerMasterCopy,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const { masterCopy, testSigner } = await setup()
      await expect(masterCopy.connect(testSigner).setOriginSender(AddressOne)).to.emit(masterCopy, "OriginSenderSet")
    })
  })

  describe("setOrigin()", function () {
    it("Should revert if caller is not owner", async function () {
      const { connextModule } = await setup()
      const [_, nonOwner] = await ethers.getSigners()
      const nonOwnerMasterCopy = ConnextModule__factory.connect(connextModule.address, nonOwner)
      await expect(nonOwnerMasterCopy.setOrigin("0x1234")).to.be.revertedWithCustomError(
        nonOwnerMasterCopy,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set origin and emit OriginSet event", async function () {
      const { masterCopy, testSigner } = await setup()
      await expect(masterCopy.connect(testSigner).setOrigin("0x1234")).to.emit(masterCopy, "OriginSet")
    })
  })

  describe("setConnext()", function () {
    it("Should revert if caller is not owner", async function () {
      const { connextModule } = await setup()
      const [_, nonOwner] = await ethers.getSigners()
      const nonOwnerMasterCopy = ConnextModule__factory.connect(connextModule.address, nonOwner)
      await expect(nonOwnerMasterCopy.setConnext(AddressOne)).to.be.revertedWithCustomError(
        nonOwnerMasterCopy,
        "OwnableUnauthorizedAccount",
      )
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const { masterCopy, testSigner } = await setup()
      await expect(masterCopy.connect(testSigner).setConnext(AddressOne)).to.emit(masterCopy, "ConnextSet")
    })
  })

  describe("constructor()", function () {
    it("Should setup correct state", async function () {
      const { masterCopy, params } = await setup()
      expect(await masterCopy.owner()).to.equal(params.owner)
      expect(await masterCopy.avatar()).to.equal(params.avatar)
      // expect(await masterCopy.target).to.equal(params.target)
      expect(await masterCopy.originSender()).to.equal(params.originSender)
      expect(await masterCopy.origin()).to.equal(params.origin)
      expect(await masterCopy.connext()).to.equal(params.connextAddress)
    })
    it("Should emit ModuleSetUp() event with correct params", async function () {
      const { masterCopy, params } = await setup()

      const deployTransaction = await masterCopy.deploymentTransaction

      expect(await deployTransaction)
        .to.emit(masterCopy, "ModuleSetUp")
        .withArgs(params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress)
    })
  })

  describe("setUp()", function () {
    it("Should initialize proxy with correct state", async function () {
      const { eip1193Provider, masterCopy, params, paramTypes } = await setup()
      const values = [
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      ]

      const { address } = await deployProxy({
        mastercopy: await masterCopy.getAddress(),
        setupArgs: {
          types: paramTypes,
          values,
        },
        saltNonce: "0xfa",
        provider: eip1193Provider,
      })

      // retrieve new address from event
      const moduleProxy = await hre.ethers.getContractAt("ConnextModule", address)

      expect(await moduleProxy.owner()).to.be.equal(params.owner)
      expect(await moduleProxy.avatar()).to.be.equal(params.avatar)
      // expect(await moduleProxy.target()).to.be.eq(params.target);
      expect(await moduleProxy.originSender()).to.equal(params.originSender)
      expect(await moduleProxy.origin()).to.equal(params.origin)
      expect(await moduleProxy.connext()).to.equal(params.connextAddress)
    }),
      it("Should emit ModuleSetUp() event with correct params", async function () {
        const { params } = await setup()
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
          .withArgs(
            params.owner,
            params.avatar,
            params.target,
            params.originSender,
            params.origin,
            params.connextAddress,
          )
      })
    it("Should revert if called more than once", async function () {
      const { params, paramTypes, masterCopy, eip1193Provider } = await setup()
      const deploySetupArgs = {
        mastercopy: await masterCopy.getAddress(),
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
      }
      await deployProxy(deploySetupArgs)
      const redeployProxy = await deployProxy(deploySetupArgs)
      expect(redeployProxy.noop).to.be.equal(true)
    })
  })
})
