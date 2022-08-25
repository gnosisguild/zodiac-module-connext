import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"

const firstAddress = "0x0000000000000000000000000000000000000001"

const deploy: DeployFunction = async function ({ deployments, getNamedAccounts }: HardhatRuntimeEnvironment) {
  console.log("Deploying MyModule mastercopy")
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const myModuleDeployment = await deploy("MyModule", {
    from: deployer,
    args: [firstAddress, firstAddress],
    deterministicDeployment: true,
  })
  console.log("MyModule mastercopy deployed to:", myModuleDeployment.address)
}

deploy.tags = ["moduleMastercopy"]

export default deploy
