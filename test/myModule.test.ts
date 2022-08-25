import { expect } from "chai"
import { ethers, deployments, getNamedAccounts } from "hardhat"

const setup = async () => {
  await deployments.fixture(["MyModule"])
  const { tester } = await getNamedAccounts()
  const testSigner = await ethers.getSigner(tester)
  const buttonDeployment = await deployments.get("Button")
  const myModuleDeployment = await deployments.get("MyModule")
  const buttonContract = await ethers.getContractAt("Button", buttonDeployment.address, testSigner)
  const myModuleContract = await ethers.getContractAt("MyModule", myModuleDeployment.address, testSigner)
  return { buttonContract, myModuleContract }
}

describe("MyModule", function () {
  it("Should be possible to 'press the button' through MyModule", async function () {
    const { buttonContract, myModuleContract } = await setup()
    expect(await buttonContract.pushes()).to.equal(0)
    await myModuleContract.pushButton()
    expect(await buttonContract.pushes()).to.equal(1)
  })
  it("Should NOT be possible to 'press the button' directly on the Button contract", async function () {
    const { buttonContract } = await setup()
    expect(buttonContract.pushButton()).to.revertedWith("Ownable: caller is not the owner")
  })
})
