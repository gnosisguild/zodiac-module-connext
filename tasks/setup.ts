import "hardhat-deploy"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import "@nomiclabs/hardhat-ethers"
import { task, types } from "hardhat/config"
import { deployAndSetUpCustomModule } from "@gnosis.pm/zodiac/dist/src/factory/factory"

interface FactoryTaskArgs {
  proxied: boolean
}

interface ConnextModuleTaskArgs extends FactoryTaskArgs {
  owner: string
  avatar: string
  target: string
  sender: string
  origin: bigint
  connext: string
}

const firstAddress = "0x0000000000000000000000000000000000000001"

const deployConnextModule = async (taskArgs: ConnextModuleTaskArgs, hre: HardhatRuntimeEnvironment) => {
  if (taskArgs.proxied) {
    deployConnextModuleProxy(taskArgs, hre)
  } else {
    deployConnextModuleFull(taskArgs, hre)
  }
}

const deployConnextModuleFull = async (
  taskArgs: ConnextModuleTaskArgs,
  { ethers, deployments, getNamedAccounts }: HardhatRuntimeEnvironment,
) => {
  console.log("Deploying Connext Module")
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  const connextModule = await deploy("ConnextModule", {
    from: deployer,
    args: [taskArgs.owner, taskArgs.avatar, taskArgs.target, taskArgs.sender, taskArgs.origin, taskArgs.connext],
    deterministicDeployment: true,
  })
  console.log("Connext Module deployed to:", connextModule.address)
}

const deployConnextModuleProxy = async (
  taskArgs: ConnextModuleTaskArgs,
  { ethers, deployments, getNamedAccounts, getChainId }: HardhatRuntimeEnvironment,
) => {
  console.log("Deploying Connext Module Proxy")
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await ethers.getSigner(deployer)

  const connextModuleMasterCopyDeployment = await deployments.get("ConnextModuleMasterCopy")
  const chainId = await getChainId()
  const { transaction } = deployAndSetUpCustomModule(
    connextModuleMasterCopyDeployment.address,
    connextModuleMasterCopyDeployment.abi,
    {
      values: [taskArgs.owner, taskArgs.avatar, taskArgs.target, taskArgs.sender, taskArgs.origin, taskArgs.connext],
      types: ["address", "address", "address", "address", "bytes32", "address"],
    },
    ethers.provider,
    Number(chainId),
    Date.now().toString(),
  )
  const deploymentTransaction = await deployerSigner.sendTransaction(transaction)
  const receipt = await deploymentTransaction.wait()
  console.log(receipt)
  const connextModuleProxyAddress = receipt.logs[1].address
  console.log("MyModule minimal proxy deployed to:", connextModuleProxyAddress)
}

task("setup", "deploy a Connext Module")
  .addParam("owner", "Address of the owner", undefined, types.string)
  .addParam("avatar", "Address of the avatar (e.g. Safe)", undefined, types.string)
  .addParam("target", "Address of the target", undefined, types.string)
  .addParam(
    "sender",
    "Address which is allowed to send calls to this contract from origin network",
    undefined,
    types.string,
  )
  .addParam("origin", "ID of origin network", undefined, types.string)
  .addParam("connext", "Address of the connext contract that will call this contract", undefined, types.string)
  .addParam("proxied", "Deploy module through proxy", false, types.boolean)
  .setAction(deployConnextModule)

deployConnextModule.tags = ["ConnextModule"]
deployConnextModule.dependencies = ["ConnextModuleMasterCopy"]

const deployConnextModuleMasterCopy = async (
  taskArgs: ConnextModuleTaskArgs,
  { ethers, deployments, getNamedAccounts }: HardhatRuntimeEnvironment,
) => {
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()
  console.log("Deploying Connext Module Master Copy")

  const mastercopy = await deploy("ConnextModule", {
    from: deployer,
    args: [firstAddress, firstAddress, firstAddress, firstAddress, 0, firstAddress],
    deterministicDeployment: true,
  })
  console.log("ConnextModule mastercopy deployed to:", mastercopy.address)
}
task("deployMasterCopy", "Deploys the mastercopy of the connext module").setAction(deployConnextModuleMasterCopy)
deployConnextModuleMasterCopy.tags = ["ConnextModuleMasterCopy"]

export {}
