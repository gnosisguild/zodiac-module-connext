import { expect } from "chai"
import { ethers, deployments, getNamedAccounts } from "hardhat"

const setup = async () => {
  await deployments.fixture(["ConnextModule"])
  const { tester } = await getNamedAccounts()
  const testSigner = await ethers.getSigner(tester)
  const buttonDeployment = await deployments.get("Button")
  const connextModuleDeployment = await deployments.get("ConnetModule")
  const buttonContract = await ethers.getContractAt("Button", buttonDeployment.address, testSigner)
  const connextModuleContract = await ethers.getContractAt("MyModule", connextModuleDeployment.address, testSigner)
  return { buttonContract, connextModuleContract }
}

describe("ConnextModule", function () {
  it("Should be possible to update greeter through ConnextModule", async function () {
    const { buttonContract, connextModuleContract } = await setup()
    expect(await buttonContract.pushes()).to.equal(0)
    await connextModuleContract.pushButton()
    expect(await buttonContract.pushes()).to.equal(1)
  })
  it("Should NOT be possible to 'press the button' directly on the Button contract", async function () {
    const { buttonContract } = await setup()
    expect(buttonContract.pushButton()).to.revertedWith("Ownable: caller is not the owner")
  })
})
