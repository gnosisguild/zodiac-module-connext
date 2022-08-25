import "hardhat-deploy"
import { DeployFunction } from "hardhat-deploy/types"
import { HardhatRuntimeEnvironment } from "hardhat/types"
import { deployAndSetUpCustomModule } from "@gnosis.pm/zodiac/dist/src/factory/factory"

const deploy: DeployFunction = async function ({
  deployments,
  getNamedAccounts,
  ethers,
  getChainId,
}: HardhatRuntimeEnvironment) {
  console.log("Deploying MyModule Proxy")
  const { deployer } = await getNamedAccounts()
  const deployerSigner = await ethers.getSigner(deployer)

  const buttonDeployment = await deployments.get("Button")
  const testAvatarDeployment = await deployments.get("TestAvatar")

  const myModuleMastercopyDeployment = await deployments.get("MyModule")

  const chainId = await getChainId()

  const { transaction } = deployAndSetUpCustomModule(
    myModuleMastercopyDeployment.address,
    myModuleMastercopyDeployment.abi,
    {
      values: [testAvatarDeployment.address, buttonDeployment.address],
      types: ["address", "address"],
    },
    ethers.provider,
    Number(chainId),
    Date.now().toString(),
  )
  const deploymentTransaction = await deployerSigner.sendTransaction(transaction)
  const receipt = await deploymentTransaction.wait()
  console.log(receipt)
  const myModuleProxyAddress = receipt.logs[1].address
  console.log("MyModule minimal proxy deployed to:", myModuleProxyAddress)

  // Enable MyModule as a module on the safe to give it access to the safe's execTransactionFromModule() function
  const testAvatarContract = await ethers.getContractAt("TestAvatar", testAvatarDeployment.address, deployerSigner)
  const currentActiveModule = await testAvatarContract.module()
  if (currentActiveModule !== myModuleProxyAddress) {
    const tx = await testAvatarContract.enableModule(myModuleProxyAddress)
    tx.wait()
    console.log("MyModule proxy enabled on the TestAvatar")
  } else {
    console.log("MyModule proxy already enabled on the TestAvatar")
  }
}

deploy.tags = ["moduleProxy"]
deploy.dependencies = ["moduleMastercopy", "testDependencies"]

export default deploy
