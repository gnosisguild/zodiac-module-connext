import "hardhat-deploy"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import "@nomiclabs/hardhat-ethers"
import { task, types } from "hardhat/config"
import { deployAndSetUpCustomModule } from "@gnosis.pm/zodiac"
import { deployModuleFactory } from "@gnosis.pm/zodiac/dist/src/factory/deployModuleFactory"
import { deployMastercopy } from "@gnosis.pm/zodiac/dist/src/factory/mastercopyDeployer"

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
    await deployConnextModuleProxy(taskArgs, hre)
  } else {
    await deployConnextModuleFull(taskArgs, hre)
  }
}

const deployConnextModuleFull = async (
  taskArgs: ConnextModuleTaskArgs,
  { ethers, deployments, getNamedAccounts }: HardhatRuntimeEnvironment,
) => {
  console.log("Deploying Connext Module")
  const ConnextModule = await ethers.getContractFactory("ConnextModule")
  const connextModule = await ConnextModule.deploy(
    taskArgs.owner,
    taskArgs.avatar,
    taskArgs.target,
    taskArgs.sender,
    taskArgs.origin,
    taskArgs.connext,
  )
  console.log("Connext Module deployed to:", connextModule.address)
}

const deployConnextModuleProxy = async (taskArgs: ConnextModuleTaskArgs, hre: HardhatRuntimeEnvironment) => {
  console.log("Deploying Connext Module Proxy")
  const { deployer } = await hre.getNamedAccounts()
  const deployerSigner = await hre.ethers.getSigner(deployer)

  const mastercopy = await deployConnextModuleMasterCopy(hre)
  const chainId = await hre.getChainId()
  const artifact = await hre.artifacts.readArtifact("ConnextModule")

  const factory = await deployModuleFactory(hre)

  const { transaction } = await deployAndSetUpCustomModule(
    mastercopy,
    artifact.abi,
    {
      types: ["address", "address", "address", "address", "uint32", "address"],
      values: [taskArgs.owner, taskArgs.avatar, taskArgs.target, taskArgs.sender, taskArgs.origin, taskArgs.connext],
    },
    hre.ethers.provider,
    Number(chainId),
    Date.now().toString(),
  )

  // Should be able to remove this line in future, waiting on a fix in the Zodiac repo
  transaction.to = factory

  const deploymentTransaction = await deployerSigner.sendTransaction(transaction)
  const receipt = await deploymentTransaction.wait()
  const connextModuleProxyAddress = receipt.logs[1].address
  console.log("Proxy deployed to:      ", connextModuleProxyAddress)
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

const deployConnextModuleMasterCopy = async (hre: HardhatRuntimeEnvironment) => {
  const ConnextModule = await hre.ethers.getContractFactory("ConnextModule")
  const mastercopy = await deployMastercopy(hre, ConnextModule, [
    firstAddress,
    firstAddress,
    firstAddress,
    firstAddress,
    0,
    firstAddress,
  ])
  console.log("ConnextModule mastercopy deployed to:", mastercopy)
  return mastercopy
}
task("deployMasterCopy", "Deploys the mastercopy of the connext module").setAction(deployConnextModuleMasterCopy)

export {}
