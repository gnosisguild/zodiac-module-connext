import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const deploy: DeployFunction = async function ({ deployments, getNamedAccounts, ethers }: HardhatRuntimeEnvironment) {
  console.log("Deploying 'external' dependencies")
  const { deploy } = deployments
  const { dependenciesDeployer } = await getNamedAccounts()

  const testAvatarDeployment = await deploy("TestAvatar", {
    from: dependenciesDeployer,
  })
  console.log("TestAvatar deployed to:", testAvatarDeployment.address)

  const buttonDeployment = await deploy("Button", {
    from: dependenciesDeployer,
  })
  console.log("Button deployed to:", buttonDeployment.address)

  // Make the TestAvatar the owner of the button
  const dependenciesDeployerSigner = await ethers.getSigner(dependenciesDeployer)
  const buttonContract = await ethers.getContractAt("Button", buttonDeployment.address, dependenciesDeployerSigner)
  const currentOwner = await buttonContract.owner()
  if (currentOwner !== testAvatarDeployment.address) {
    const tx = await buttonContract.transferOwnership(testAvatarDeployment.address)
    tx.wait()
    console.log("TestAvatar set as owner of the button")
  } else {
    console.log("Owner of button is already set correctly")
  }
}

deploy.tags = ["dependencies"]
export default deploy
