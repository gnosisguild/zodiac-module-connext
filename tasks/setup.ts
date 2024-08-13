import { HardhatRuntimeEnvironment } from "hardhat/types"
import { task, types } from "hardhat/config"
import "@nomicfoundation/hardhat-ethers"

import { encodeDeployProxy, readMastercopyArtifact, predictProxyAddress } from "@gnosis-guild/zodiac-core"

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

const deployConnextModule = async (taskArgs: ConnextModuleTaskArgs, hre: HardhatRuntimeEnvironment) => {
  if (taskArgs.proxied) {
    await deployConnextModuleProxy(taskArgs, hre)
  } else {
    await deployConnextModuleFull(taskArgs, hre)
  }
}

const deployConnextModuleFull = async (taskArgs: ConnextModuleTaskArgs, { ethers }: HardhatRuntimeEnvironment) => {
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
  const connextModAddress = await connextModule.getAddress()
  console.log("Connext Module deployed to:", connextModAddress)
}

const deployConnextModuleProxy = async (taskArgs: ConnextModuleTaskArgs, hre: HardhatRuntimeEnvironment) => {
  console.log("Deploying Connext Module Proxy")
  const [signer] = await hre.ethers.getSigners()
  const nonce = await signer.getNonce()
  console.log("Using the account:", signer.address)
  const masterCopyArtifact = await readMastercopyArtifact({
    contractName: "ConnextModule",
  })
  const mastercopy = masterCopyArtifact.address
  const setupArgs = {
    types: ["address", "address", "address", "address", "uint32", "address"],
    values: [taskArgs.owner, taskArgs.avatar, taskArgs.target, taskArgs.sender, taskArgs.origin, taskArgs.connext],
  }
  const transaction = encodeDeployProxy({
    mastercopy,
    setupArgs,
    saltNonce: nonce,
  })
  const deploymentTransaction = await signer.sendTransaction(transaction)
  await deploymentTransaction.wait()
  console.log("Connext module proxy deployed to:", predictProxyAddress({ mastercopy, setupArgs, saltNonce: nonce }))
  return
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

export {}
