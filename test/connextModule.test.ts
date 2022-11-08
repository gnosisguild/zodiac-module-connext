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

describe("Button", function () {
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

describe("ConnextModule", function () {
  it("Should be pushable", async function () {
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

    // send some tokens to the connext module
    await token.transfer(connextModule.address, 1000)

    expect(await button.pushes()).to.equal(0)
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
    expect(await button.pushes()).to.equal(1)
    expect(await token.balanceOf(avatar.address)).to.equal(1000)
  })
})
