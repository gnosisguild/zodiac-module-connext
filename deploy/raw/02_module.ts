import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deploy: DeployFunction = async function ({ deployments, getNamedAccounts, ethers }: HardhatRuntimeEnvironment) {
  console.log("Deploying MyModule")
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const buttonDeployment = await deployments.get("Button")
  const testAvatarDeployment = await deployments.get("TestAvatar")

  const myModuleDeployment = await deploy("MyModule", {
    from: deployer,
    args: [testAvatarDeployment.address, buttonDeployment.address],
  })
  console.log("MyModule deployed to:", myModuleDeployment.address)

  // Enable MyModule as a module on the safe to give it access to the safe's execTransactionFromModule() function
  const deployerSigner = await ethers.getSigner(deployer)
  const testAvatarContract = await ethers.getContractAt("TestAvatar", testAvatarDeployment.address, deployerSigner)
  const currentActiveModule = await testAvatarContract.module()
  if (currentActiveModule !== myModuleDeployment.address) {
    const tx = await testAvatarContract.enableModule(myModuleDeployment.address)
    tx.wait()
    console.log("MyModule enabled on the TestAvatar")
  } else {
    console.log("MyModule already enabled on the TestAvatar")
  }
}

deploy.tags = ["MyModule"]
deploy.dependencies = ["dependencies"]

export default deploy
