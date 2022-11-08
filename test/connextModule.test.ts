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
  const connextModule = await ConnextModule.deploy(
    testSigner.address, // owner
    avatar.address, // avatar
    avatar.address, // target
    AddressOne, // originSender
    1337, // origin ID
    testSigner.address, // connext address
  )
  const button = await Button.deploy()

  await avatar.enableModule(connextModule.address)

  const params = {
    amout: 10,
    asset: 10,
  }
  return { button, connextModule, avatar, token, params, testSigner }
}

describe("Button.push()", function () {
  it("Should be pushable", async function () {
    const { button } = await setup()
    expect(await button.pushes()).to.equal(0)
    await button.push()
    expect(await button.pushes()).to.equal(1)
  })
  it("Should emit ButtonPushed event with correct pusher param", async function () {
    const { button, testSigner } = await setup()
    expect(await button.pushes()).to.equal(0)
    expect(await button.push())
      .to.emit(button, "ButtonPushed")
      .withArgs([1, testSigner.address])
    expect(await button.pushes()).to.equal(1)
  })
})

describe("ConnextModule.xReceive()", function () {
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
    ).to.be.revertedWith("OriginAddressOnly()")
  })
  it("Should revert if called by account other than connext", async function () {
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
    const { avatar, button, connextModule, testSigner, token } = await setup()

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

describe("ConnextModule.setOriginAddress()", function () {
  it("Should revert if origin is incorrect")
  it("Should revert if originSender is incorrect")
  it("Should revert if called by account other than connext")
  it("Should set origin address")
  it("Should emit OriginAddressSet() event with correct params")
})

describe("ConnextModule.setOrigin()", function () {
  it("Should revert if origin is incorrect")
  it("Should revert if originSender is incorrect")
  it("Should revert if called by account other than connext")
  it("Should set origin")
  it("Should emit OriginSet() event with correct params")
})

describe("ConnextModule.setConnext()", function () {
  it("Should revert if origin is incorrect")
  it("Should revert if originSender is incorrect")
  it("Should revert if called by account other than connext")
  it("Should set connext address")
  it("Should emit ConnextSet() event with correct params")
})

describe("connextModule.constructor()", function () {
  it("Should setup correct state")
  it("Should emit ModuleSetUp() event with correct params")
})

describe("ConnextModule.setUp()", function () {
  it("Should initialize proxy with correct state")
  it("Should emit ModuleSetUp() event with correct params")
  it("Should revert if called more than once")
})
