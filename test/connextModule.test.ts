import { expect } from "chai"
import { PopulatedTransaction } from "ethers"
import { ethers, deployments, getNamedAccounts } from "hardhat"

const AddressOne = "0x0000000000000000000000000000000000000001"
const transferId = "0x0000000000000000000000000000000000000000000000000000000000000001"

const setup = async () => {
  await deployments.fixture(["ConnextModule", "Button", "TestAvatar", "TestToken"])

  const { tester } = await getNamedAccounts()
  const testSigner = await ethers.getSigner(tester)

  const Avatar = await ethers.getContractFactory("TestAvatar")
  const Token = await ethers.getContractFactory("TestToken")
  const ConnextModule = await ethers.getContractFactory("ConnextModule")
  const Button = await ethers.getContractFactory("Button")

  const avatar = await Avatar.deploy()
  const token = await Token.deploy(18)

  const params = {
    owner: testSigner.address,
    avatar: avatar.address,
    target: avatar.address,
    originSender: AddressOne,
    origin: 1337,
    connextAddress: testSigner.address,
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
  const button = await Button.deploy()

  await avatar.enableModule(connextModule.address)

  const ModuleProxyFactory = await ethers.getContractFactory("ModuleProxyFactory")
  const moduleProxyFactory = await ModuleProxyFactory.deploy()

  return { button, connextModule, avatar, token, testSigner, moduleProxyFactory, params, paramTypes }
}
describe("ConnextModule", function () {
  describe("xReceive()", function () {
    it("Should successfully transfer token balance to avatar and tell avatar to push button", async function () {
      const { avatar, button, connextModule, testSigner, token } = await setup()

      const tx: PopulatedTransaction = await button.populateTransaction.push()
      const data = await ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bool"],
        [
          button.address, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )

      // send some tokens to the connext module, simulates what the connext contract would do.
      await token.transfer(connextModule.address, 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      // ensure it emits buttonPushed event with avatar as pusher.
      expect(
        await connextModule.connect(testSigner).xReceive(
          transferId, // _transferId
          1000, // _amount
          token.address, // _asset
          AddressOne, // _originSender
          1337, // _origin
          data, // _callData
        ),
      )
        .to.emit(button, "ButtonPushed")
        .withArgs([1, avatar.address])
      // make sure button has been pushed.
      expect(await button.pushes()).to.equal(1)
      // check that tokens have been transferred to the avatar.
      expect(await token.balanceOf(avatar.address)).to.equal(1000)
    })

    it("Should revert if origin is incorrect", async function () {
      const { button, connextModule, testSigner, token } = await setup()

      const tx: PopulatedTransaction = await button.populateTransaction.push()
      const data = await ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bool"],
        [
          button.address, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(testSigner).xReceive(
          transferId, // _transferId
          0, // _amount
          token.address, // _asset
          AddressOne, // _originSender
          0xdead, // _origin
          data, // _callData
        ),
      ).to.be.revertedWith("OriginOnly()")
    })

    it("Should revert if originSender is incorrect", async function () {
      const { button, connextModule, testSigner, token } = await setup()

      const tx: PopulatedTransaction = await button.populateTransaction.push()
      const data = await ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bool"],
        [
          button.address, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(testSigner).xReceive(
          transferId, // _transferId
          0, // _amount
          token.address, // _asset
          testSigner.address, // _originSender
          1337, // _origin
          data, // _callData
        ),
      ).to.be.revertedWith("OriginSenderOnly()")
    })

    it("Should revert if called by account other than connext", async function () {
      const { button, connextModule, token } = await setup()

      const tx: PopulatedTransaction = await button.populateTransaction.push()
      const data = await ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bool"],
        [
          button.address, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.xReceive(
          transferId, // _transferId
          0, // _amount
          token.address, // _asset
          AddressOne, // _originSender
          1337, // _origin
          data, // _callData
        ),
      ).to.be.revertedWith("ConnextOnly()")
    })

    it("Should revert if token balance is less than _amount", async function () {
      const { button, connextModule, testSigner, token } = await setup()

      const tx: PopulatedTransaction = await button.populateTransaction.push()
      const data = await ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bool"],
        [
          button.address, // to
          0, // value
          tx.data, // data
          0, // operation
        ],
      )
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass token transfer instructions and button push message to connext module.
      await expect(
        connextModule.connect(testSigner).xReceive(
          transferId, // _transferId
          1000, // _amount
          token.address, // _asset
          AddressOne, // _originSender
          1337, // _origin
          data, // _callData
        ),
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance")
    })

    it("Should revert if module transaction fails", async function () {
      const { button, connextModule, testSigner, token } = await setup()

      // send some tokens to the connext module, simulates what the connext contract would do.
      await token.transfer(connextModule.address, 1000)
      // check current number of pushes
      expect(await button.pushes()).to.equal(0)
      // pass bad data to the module, it should revert.
      await expect(
        connextModule.connect(testSigner).xReceive(
          transferId, // _transferId
          1000, // _amount
          token.address, // _asset
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
      await expect(connextModule.setOriginSender(AddressOne)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const { connextModule, testSigner } = await setup()
      await expect(connextModule.connect(testSigner).setOriginSender(AddressOne)).to.emit(
        connextModule,
        "OriginSenderSet",
      )
    })
  })

  describe("setOrigin()", function () {
    it("Should revert if caller is not owner", async function () {
      const { connextModule } = await setup()
      await expect(connextModule.setOrigin("0x1234")).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should set origin and emit OriginSet event", async function () {
      const { connextModule, testSigner } = await setup()
      await expect(connextModule.connect(testSigner).setOrigin("0x1234")).to.emit(connextModule, "OriginSet")
    })
  })

  describe("setConnext()", function () {
    it("Should revert if caller is not owner", async function () {
      const { connextModule } = await setup()
      await expect(connextModule.setConnext(AddressOne)).to.be.revertedWith("Ownable: caller is not the owner")
    })

    it("Should set originSender and emit OriginSenderSet event", async function () {
      const { connextModule, testSigner } = await setup()
      await expect(connextModule.connect(testSigner).setConnext(AddressOne)).to.emit(connextModule, "ConnextSet")
    })
  })

  describe("constructor()", function () {
    it("Should setup correct state", async function () {
      const { connextModule, params } = await setup()
      expect(await connextModule.owner()).to.equal(params.owner)
      expect(await connextModule.avatar()).to.equal(params.avatar)
      expect(await connextModule.target()).to.equal(params.target)
      expect(await connextModule.originSender()).to.equal(params.originSender)
      expect(await connextModule.origin()).to.equal(params.origin)
      expect(await connextModule.connext()).to.equal(params.connextAddress)
    })
    it("Should emit ModuleSetUp() event with correct params", async function () {
      const { connextModule, params } = await setup()

      const deployTransaction = await connextModule.deployTransaction

      expect(await deployTransaction)
        .to.emit(connextModule, "ModuleSetUp")
        .withArgs(params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress)
    })
  })

  describe("setUp()", function () {
    it("Should initialize proxy with correct state", async function () {
      const { connextModule, moduleProxyFactory, params, paramTypes } = await setup()
      const initData = await ethers.utils.defaultAbiCoder.encode(paramTypes, [
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      ])
      const initParams = (await connextModule.populateTransaction.setUp(initData)).data
      if (!initParams) {
        throw console.error("error")
      }
      const receipt = await moduleProxyFactory
        .deployModule(connextModule.address, initParams, 0)
        .then((tx: any) => tx.wait())
      // retrieve new address from event
      const {
        args: [newProxyAddress],
      } = receipt.events.find(({ event }: { event: string }) => event === "ModuleProxyCreation")
      const moduleProxy = await ethers.getContractAt("ConnextModule", newProxyAddress)

      expect(await moduleProxy.owner()).to.equal(params.owner)
      expect(await moduleProxy.avatar()).to.equal(params.avatar)
      expect(await moduleProxy.target()).to.equal(params.target)
      expect(await moduleProxy.originSender()).to.equal(params.originSender)
      expect(await moduleProxy.origin()).to.equal(params.origin)
      expect(await moduleProxy.connext()).to.equal(params.connextAddress)
    })
    it("Should emit ModuleSetUp() event with correct params", async function () {
      const { connextModule, moduleProxyFactory, params, paramTypes } = await setup()
      const initData = await ethers.utils.defaultAbiCoder.encode(paramTypes, [
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      ])
      const initParams = (await connextModule.populateTransaction.setUp(initData)).data
      if (!initParams) {
        throw console.error("error")
      }
      const receipt = await moduleProxyFactory
        .deployModule(connextModule.address, initParams, 0)
        .then((tx: any) => tx.wait())

      expect(receipt)
        .to.emit(connextModule, "ModuleSetUp")
        .withArgs(params.owner, params.avatar, params.target, params.originSender, params.origin, params.connextAddress)
    })
    it("Should revert if called more than once", async function () {
      const { connextModule, moduleProxyFactory, params, paramTypes } = await setup()
      const initData = await ethers.utils.defaultAbiCoder.encode(paramTypes, [
        params.owner,
        params.avatar,
        params.target,
        params.originSender,
        params.origin,
        params.connextAddress,
      ])
      const initParams = (await connextModule.populateTransaction.setUp(initData)).data
      if (!initParams) {
        throw console.error("error")
      }
      await moduleProxyFactory.deployModule(connextModule.address, initParams, 0)
      await expect(moduleProxyFactory.deployModule(connextModule.address, initParams, 0)).to.be.revertedWith(
        'TakenAddress("0x0000000000000000000000000000000000000000")',
      )
    })
  })
})
